import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Episodio, SerieDetalle } from '../../models';

@Component({
  selector: 'app-serie',
  imports: [RouterLink],
  templateUrl: './serie.html',
})
export class SeriePage {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly serie = signal<SerieDetalle | null>(null);
  readonly episodios = signal<Episodio[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

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
