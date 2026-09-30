import { Component, ElementRef, OnDestroy, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { YoutubePlayerService } from '../../youtube-player.service';
import { anteriorEpisodio, siguienteEpisodio } from '../../utils/player-nav';
import type { Episodio, SerieDetalle } from '../../models';
import { IconComponent } from '../../shared/icon';
import { UiNativeButton } from '../../ui/button';
import { UiSkeleton } from '../../ui/skeleton';
import { UiSpinner } from '../../ui/spinner';
import { UiAlert, UiAlertDescription, UiAlertTitle } from '../../ui/alert';

@Component({
  selector: 'app-reproductor',
  imports: [
    RouterLink,
    IconComponent,
    UiNativeButton,
    UiSkeleton,
    UiSpinner,
    UiAlert,
    UiAlertTitle,
    UiAlertDescription,
  ],
  templateUrl: './reproductor.html',
})
export class ReproductorPage implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly yt = inject(YoutubePlayerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Signals: sin zone.js, los huecos del reproductor existen solo tras renderizar el
  // episodio; el effect de abajo monta el reproductor en cuanto aparecen.
  readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  readonly ytEl = viewChild<ElementRef<HTMLDivElement>>('ytEl');

  readonly slug = this.route.snapshot.paramMap.get('slug')!;

  readonly serie = signal<SerieDetalle | null>(null);
  readonly episodios = signal<Episodio[]>([]);
  readonly episodio = signal<Episodio | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  private ytPlayer: { destroy(): void } | null = null;
  /** Episodio cuyo reproductor ya esta montado (evita montar dos veces). */
  private montadoId: number | null = null;

  constructor() {
    effect(() => {
      const episodio = this.episodio();
      const yt = this.ytEl();
      const video = this.videoEl();
      if (!episodio || episodio.id === this.montadoId) return;
      if (episodio.youtube_id && yt) {
        this.montadoId = episodio.id;
        untracked(() => this.montarYoutube(episodio, yt.nativeElement));
      } else if (episodio.video_url && video) {
        this.montadoId = episodio.id;
        untracked(() => this.configurarMediaSession(episodio));
      }
    });

    this.cargar();
    this.route.paramMap.subscribe((params) => {
      const epiId = Number(params.get('epiId'));
      if (this.episodio() && epiId && epiId !== this.episodio()!.id) {
        this.cargarEpisodio(epiId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyYoutubePlayer();
    if (navigator.mediaSession) {
      navigator.mediaSession.metadata = null;
    }
  }

  get anterior(): Episodio | null {
    const actual = this.episodio();
    return actual ? anteriorEpisodio(this.episodios(), actual.id) : null;
  }

  get siguiente(): Episodio | null {
    const actual = this.episodio();
    return actual ? siguienteEpisodio(this.episodios(), actual.id) : null;
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [serie, episodios] = await Promise.all([this.api.serie(this.slug), this.api.episodios(this.slug)]);
      this.serie.set(serie);
      this.episodios.set(episodios);
      const epiId = Number(this.route.snapshot.paramMap.get('epiId'));
      await this.cargarEpisodio(epiId);
    } catch {
      this.error.set('No pudimos cargar este episodio.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarEpisodio(epiId: number): Promise<void> {
    this.destroyYoutubePlayer();
    this.montadoId = null;
    const episodio = await this.api.episodio(epiId);
    this.episodio.set(episodio);
  }

  private montarYoutube(episodio: Episodio, contenedor: HTMLElement): void {
    this.yt
      .createPlayer(contenedor, episodio.youtube_id!, () => this.irASiguiente())
      .then((player) => {
        // Si mientras cargaba la API se cambio de episodio, este reproductor sobra.
        if (this.episodio()?.id !== episodio.id) {
          player.destroy();
          return;
        }
        this.ytPlayer = player;
      })
      .catch(() => this.error.set('No se pudo cargar el reproductor de YouTube.'));
    this.configurarMediaSession(episodio);
  }

  private configurarMediaSession(episodio: Episodio): void {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: episodio.titulo ?? `Episodio ${episodio.numero}`,
      artist: this.serie()?.titulo ?? 'RetroToons',
      // Portada propia de la app: nunca imagenes externas con copyright.
      artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => this.irASiguiente());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.irAAnterior());
  }

  onVideoEnded(): void {
    this.irASiguiente();
  }

  irASiguiente(): void {
    const siguiente = this.siguiente;
    if (siguiente) {
      this.router.navigate(['/serie', this.slug, 'ver', siguiente.id]);
    }
  }

  irAAnterior(): void {
    const anterior = this.anterior;
    if (anterior) {
      this.router.navigate(['/serie', this.slug, 'ver', anterior.id]);
    }
  }

  private destroyYoutubePlayer(): void {
    this.ytPlayer?.destroy();
    this.ytPlayer = null;
  }
}
