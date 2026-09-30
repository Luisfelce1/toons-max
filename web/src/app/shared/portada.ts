import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Portada original generada para cada serie: una tele de los 90 con la inicial de la
 * serie, sobre el color de su canal y un patron Memphis que depende del slug.
 * Sin imagenes externas, sin personajes, sin marcas de agua ni copyright de terceros.
 */
const PANTALLAS = ['#ffd400', '#3ec7ff', '#7ed321', '#ff4fa3', '#fff6d6', '#8b3dff'];
const INK = '#1b1340';

/** Hash FNV-1a: mismo slug, misma portada en todos los dispositivos. */
export function hashSlug(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Iniciales de la serie ignorando articulos: "The Magic School Bus" -> "MS". */
export function iniciales(titulo: string): string {
  const palabras = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter((p) => p && !/^(the|el|la|los|las|and|y|of|de|a)$/i.test(p));
  const letras = palabras.slice(0, 2).map((p) => p[0].toUpperCase());
  return letras.join('') || '?';
}

interface Forma {
  tipo: 'circulo' | 'triangulo' | 'zigzag' | 'estrella';
  x: number;
  y: number;
  giro: number;
}

@Component({
  selector: 'app-portada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" class="block size-full" role="img" [attr.aria-label]="titulo()">
      <rect width="200" height="300" [style.fill]="'var(--color-' + canal() + ', #22d3ee)'" />

      @for (f of formas(); track $index) {
        <g [attr.transform]="'translate(' + f.x + ' ' + f.y + ') rotate(' + f.giro + ')'" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
          @switch (f.tipo) {
            @case ('circulo') { <circle r="12" /> }
            @case ('triangulo') { <path d="M0 -14 L13 10 L-13 10 Z" /> }
            @case ('zigzag') { <path d="M-20 0 l7 -8 l7 8 l7 -8 l7 8 l7 -8" /> }
            @case ('estrella') { <path d="M0 -13 L4 -4 L13 -3 L6 3 L8 12 L0 7 L-8 12 L-6 3 L-13 -3 L-4 -4 Z" fill="#fff" stroke="none" /> }
          }
        </g>
      }

      <!-- Tele -->
      <g [attr.transform]="'rotate(' + giroTele() + ' 100 150)'">
        <path d="M78 78 L62 50 M122 78 L138 50" [attr.stroke]="ink" stroke-width="6" stroke-linecap="round" />
        <circle cx="62" cy="50" r="7" [attr.fill]="ink" />
        <circle cx="138" cy="50" r="7" [attr.fill]="ink" />
        <rect x="26" y="84" width="148" height="126" rx="26" [attr.fill]="ink" transform="translate(0 7)" />
        <rect x="26" y="84" width="148" height="126" rx="26" fill="#ff7a00" [attr.stroke]="ink" stroke-width="6" />
        <rect x="40" y="98" width="98" height="98" rx="18" [attr.fill]="pantalla()" [attr.stroke]="ink" stroke-width="6" />
        <circle cx="156" cy="118" r="8" fill="#ffd400" [attr.stroke]="ink" stroke-width="4" />
        <circle cx="156" cy="146" r="8" fill="#3ec7ff" [attr.stroke]="ink" stroke-width="4" />
        <rect x="149" y="170" width="14" height="6" rx="3" [attr.fill]="ink" />
        <text
          x="89"
          y="150"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="'Press Start 2P', system-ui, sans-serif"
          [attr.font-size]="letras().length > 1 ? 30 : 44"
          fill="#fff"
          [attr.stroke]="ink"
          stroke-width="5"
          paint-order="stroke"
        >{{ letras() }}</text>
        <path d="M50 108 q12 -6 22 -4" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.7" />
      </g>
    </svg>
  `,
})
export class PortadaComponent {
  readonly titulo = input.required<string>();
  readonly slug = input.required<string>();
  readonly canal = input<string>('otros');

  protected readonly ink = INK;

  private readonly hash = computed(() => hashSlug(this.slug()));
  protected readonly letras = computed(() => iniciales(this.titulo()));
  protected readonly pantalla = computed(() => PANTALLAS[this.hash() % PANTALLAS.length]);
  protected readonly giroTele = computed(() => ((this.hash() >> 3) % 7) - 3);

  protected readonly formas = computed<Forma[]>(() => {
    const tipos: Forma['tipo'][] = ['circulo', 'triangulo', 'zigzag', 'estrella'];
    const h = this.hash();
    // Posiciones fijas en los bordes (no tapan la tele); tipo y giro dependen del slug.
    const huecos = [
      [30, 30], [170, 28], [24, 250], [176, 256], [100, 262], [100, 30],
    ];
    return huecos.map(([x, y], i) => ({
      tipo: tipos[(h >> (i * 3)) % tipos.length],
      x,
      y,
      giro: ((h >> (i * 2)) % 60) - 30,
    }));
  });
}
