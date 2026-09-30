import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
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

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('ytEl') ytEl?: ElementRef<HTMLDivElement>;

  readonly slug = this.route.snapshot.paramMap.get('slug')!;

  readonly serie = signal<SerieDetalle | null>(null);
  readonly episodios = signal<Episodio[]>([]);
  readonly episodio = signal<Episodio | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  private ytPlayer: { destroy(): void } | null = null;

  constructor() {
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
    const episodio = await this.api.episodio(epiId);
    this.episodio.set(episodio);
    queueMicrotask(() => this.montarReproductor());
  }

  private montarReproductor(): void {
    const episodio = this.episodio();
    if (!episodio) return;

    if (episodio.youtube_id && this.ytEl) {
      this.yt
        .createPlayer(this.ytEl.nativeElement, episodio.youtube_id, () => this.irASiguiente())
        .then((player) => {
          this.ytPlayer = player;
        });
    } else if (episodio.video_url && this.videoEl) {
      this.configurarMediaSession(episodio);
    }
  }

  private configurarMediaSession(episodio: Episodio): void {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: episodio.titulo ?? `Episodio ${episodio.numero}`,
      artist: this.serie()?.titulo ?? 'RetroToons',
      artwork: this.serie()?.poster ? [{ src: this.serie()!.poster!, sizes: '512x512', type: 'image/png' }] : [],
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
