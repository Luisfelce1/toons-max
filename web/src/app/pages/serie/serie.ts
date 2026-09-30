import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Episodio, SerieDetalle } from '../../models';
import { IconComponent } from '../../shared/icon';
import { UiNativeButton } from '../../ui/button';
import { UiBadge } from '../../ui/badge';
import { UiSkeleton } from '../../ui/skeleton';
import { UiAlert, UiAlertDescription, UiAlertTitle } from '../../ui/alert';
import { agruparPorTemporada, primerEpisodioConVideo, tieneVideo } from '../../utils/episodios';

@Component({
  selector: 'app-serie',
  imports: [
    RouterLink,
    IconComponent,
    UiNativeButton,
    UiBadge,
    UiSkeleton,
    UiAlert,
    UiAlertTitle,
    UiAlertDescription,
  ],
  templateUrl: './serie.html',
})
export class SeriePage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly serie = signal<SerieDetalle | null>(null);
  readonly episodios = signal<Episodio[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly temporadas = computed(() => agruparPorTemporada(this.episodios()));
  readonly primero = computed(() => primerEpisodioConVideo(this.episodios()));
  readonly tieneVideo = tieneVideo;

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.cargar(slug);
  }

  private async cargar(slug: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [serie, episodios] = await Promise.all([this.api.serie(slug), this.api.episodios(slug)]);
      this.serie.set(serie);
      this.episodios.set(episodios);
    } catch {
      this.error.set('No pudimos encontrar esta serie.');
    } finally {
      this.cargando.set(false);
    }
  }
}
