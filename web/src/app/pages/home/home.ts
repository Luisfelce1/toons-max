import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Canal, SerieResumen } from '../../models';
import { IconComponent } from '../../shared/icon';
import { PortadaComponent } from '../../shared/portada';
import { UiNativeButton } from '../../ui/button';
import { UiCard } from '../../ui/card';
import { UiBadge } from '../../ui/badge';
import { UiInput } from '../../ui/input';
import { UiSkeleton } from '../../ui/skeleton';
import { UiToggleGroup, UiToggleGroupItem } from '../../ui/toggle-group';
import { UiAlert, UiAlertDescription, UiAlertTitle } from '../../ui/alert';

const DEBOUNCE_MS = 300;
export const TODOS = 'todos';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    IconComponent,
    PortadaComponent,
    UiNativeButton,
    UiCard,
    UiBadge,
    UiInput,
    UiSkeleton,
    UiToggleGroup,
    UiToggleGroupItem,
    UiAlert,
    UiAlertTitle,
    UiAlertDescription,
  ],
  templateUrl: './home.html',
})
export class HomePage {
  private readonly api = inject(ApiService);
  private debounceHandle?: ReturnType<typeof setTimeout>;

  readonly TODOS = TODOS;
  readonly placeholders = Array.from({ length: 8 }, (_, i) => i);

  readonly canales = signal<Canal[]>([]);
  readonly canalActivo = signal<string | null>(null);
  readonly query = signal('');
  readonly buscadorAbierto = signal(false);
  readonly series = signal<SerieResumen[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  /** Valor para el toggle-group: siempre hay un "canal" sintonizado. */
  readonly seleccion = computed(() => [this.canalActivo() ?? TODOS]);

  readonly canalActivoNombre = computed(
    () => this.canales().find((c) => c.slug === this.canalActivo())?.nombre ?? null,
  );

  constructor() {
    this.api.canales().then((canales) => this.canales.set(canales)).catch(() => undefined);
    this.cargarSeries();
  }

  /** Numero de canal "de tele" (01, 02...) para que los ninos lo reconozcan sin leer. */
  numeroCanal(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  onCanalChange(valor: string[]): void {
    const slug = valor[0];
    const nuevo = !slug || slug === TODOS ? null : slug;
    if (nuevo === this.canalActivo()) return;
    this.canalActivo.set(nuevo);
    this.cargarSeries();
  }

  seleccionarCanal(slug: string | null): void {
    this.onCanalChange(slug ? [slug] : [TODOS]);
  }

  toggleBuscador(): void {
    const abierto = !this.buscadorAbierto();
    this.buscadorAbierto.set(abierto);
    if (!abierto && this.query()) {
      this.onBuscar('');
    }
  }

  onBuscar(texto: string): void {
    this.query.set(texto);
    clearTimeout(this.debounceHandle);
    this.debounceHandle = setTimeout(() => this.cargarSeries(), DEBOUNCE_MS);
  }

  verTodo(): void {
    this.buscadorAbierto.set(false);
    this.query.set('');
    this.canalActivo.set(null);
    this.cargarSeries();
  }

  reintentar(): void {
    this.cargarSeries();
  }

  async cargarSeries(): Promise<void> {
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
