import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import type { Canal, SerieResumen } from '../../models';

const DEBOUNCE_MS = 300;

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.html',
})
export class HomePage {
  private readonly api = inject(ApiService);
  private debounceHandle?: ReturnType<typeof setTimeout>;

  readonly canales = signal<Canal[]>([]);
  readonly canalActivo = signal<string | null>(null);
  readonly query = signal('');
  readonly series = signal<SerieResumen[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.canales().then((canales) => this.canales.set(canales)).catch(() => undefined);
    this.cargarSeries();
  }

  seleccionarCanal(slug: string | null): void {
    this.canalActivo.set(slug === this.canalActivo() ? null : slug);
    this.cargarSeries();
  }

  onBuscar(texto: string): void {
    this.query.set(texto);
    clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.cargarSeries(), DEBOUNCE_MS);
  }

  private async cargarSeries(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const canal = this.canalActivo();
      const q = this.query().trim();
      const resp = await this.api.series({
        ...(canal ? { canal } : {}),
        ...(q ? { q } : {}),
      });
      this.series.set(resp.series);
      this.total.set(resp.total);
    } catch {
      this.error.set('No se pudo cargar el catalogo.');
    } finally {
      this.cargando.set(false);
    }
  }
}
