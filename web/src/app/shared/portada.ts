import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { motivoPara } from './motivos';

/**
 * Portada original generada para cada serie: una tele de los 90 sobre el color de su canal
 * y un patron Memphis que depende del slug. En la pantalla sale un motivo de referencia
 * (ver motivos.ts: objetos genericos dibujados desde cero) o, si no hay, sus iniciales.
 * Sin imagenes externas, sin personajes, sin logos, sin copyright de terceros.
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
        @if (motivo(); as m) {
          <g transform="translate(89 147)" [attr.stroke]="ink" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
            @switch (m) {
              @case ('rayo') {
                <rect x="-35" y="-35" width="14" height="70" fill="#e53935" stroke="none" />
                <rect x="-21" y="-35" width="14" height="70" fill="#1e88e5" stroke="none" />
                <rect x="-7" y="-35" width="14" height="70" fill="#fdd835" stroke="none" />
                <rect x="7" y="-35" width="14" height="70" fill="#2b2b2b" stroke="none" />
                <rect x="21" y="-35" width="14" height="70" fill="#ec407a" stroke="none" />
                <path d="M6 -30 L-12 4 L1 4 L-7 30 L15 -7 L2 -7 Z" fill="#fff" />
              }
              @case ('patineta') {
                <path d="M-38 26 q9.5 -10 19 0 t19 0 t19 0 t19 0" fill="none" stroke="#1e88e5" stroke-width="6" />
                <rect x="-32" y="-14" width="64" height="10" rx="5" fill="#ff4fa3" />
                <circle cx="-19" cy="4" r="6" fill="#fff6d6" />
                <circle cx="19" cy="4" r="6" fill="#fff6d6" />
              }
              @case ('autobus') {
                <rect x="-37" y="-22" width="74" height="36" rx="7" fill="#ffc107" />
                <rect x="-31" y="-16" width="14" height="12" rx="2" fill="#bde7ff" stroke-width="3" />
                <rect x="-13" y="-16" width="14" height="12" rx="2" fill="#bde7ff" stroke-width="3" />
                <rect x="5" y="-16" width="14" height="12" rx="2" fill="#bde7ff" stroke-width="3" />
                <rect x="23" y="-16" width="9" height="24" rx="2" fill="#bde7ff" stroke-width="3" />
                <path d="M-37 3 H23" stroke-width="3" />
                <circle cx="-20" cy="16" r="7" [attr.fill]="ink" />
                <circle cx="18" cy="16" r="7" [attr.fill]="ink" />
              }
              @case ('columpio') {
                <path d="M-34 34 L-22 -30 H22 L34 34" fill="none" stroke-width="5" />
                <path d="M-7 -30 V12 M7 -30 V12" stroke-width="3" />
                <rect x="-13" y="12" width="26" height="7" rx="3" fill="#ff7a00" />
              }
              @case ('nube') {
                <path d="M-24 14 a13 13 0 0 1 1 -25 a17 17 0 0 1 31 -7 a14 14 0 0 1 20 15 a12 12 0 0 1 -5 17 Z" fill="#fff" />
                <circle cx="-26" cy="24" r="5" fill="#fff" stroke-width="3" />
                <circle cx="-33" cy="32" r="3" fill="#fff" stroke-width="2" />
                <path d="M4 -12 L7 -5 L14 -4 L9 1 L10 8 L4 5 L-2 8 L-1 1 L-6 -4 L1 -5 Z" fill="#ffd400" stroke-width="2" />
              }
              @case ('tortuga') {
                <ellipse cx="-18" cy="14" rx="7" ry="6" fill="#b8e986" />
                <ellipse cx="16" cy="14" rx="7" ry="6" fill="#b8e986" />
                <circle cx="32" cy="2" r="10" fill="#b8e986" />
                <circle cx="35" cy="0" r="2" [attr.fill]="ink" stroke="none" />
                <path d="M-30 10 A30 28 0 0 1 28 10 Z" fill="#4caf50" />
                <path d="M-14 10 L-8 -6 L8 -6 L14 10 M-8 -6 L0 -18 L8 -6" fill="none" stroke-width="3" />
              }
              @case ('casa') {
                <path d="M-22 -34 a12 12 0 1 0 12 18 a10 10 0 1 1 -12 -18 Z" fill="#ffd400" stroke-width="3" />
                <path d="M-24 0 L2 -24 L28 0 V30 H-24 Z" fill="#1e6bff" />
                <rect x="-6" y="12" width="14" height="18" rx="2" fill="#ffd400" stroke-width="3" />
                <rect x="12" y="4" width="10" height="10" fill="#fff6d6" stroke-width="3" />
              }
              @case ('iglu') {
                <path d="M-34 24 A34 34 0 0 1 34 24 Z" fill="#fff" />
                <path d="M-30 10 H30 M-22 -4 H22 M-10 -16 H10 M-14 10 V24 M14 10 V24 M0 -4 V10" fill="none" stroke-width="2" />
                <path d="M-9 24 V14 A9 9 0 0 1 9 14 V24 Z" [attr.fill]="ink" />
                <path d="M26 -34 V-18 M19 -30 L33 -22 M19 -22 L33 -30" stroke="#fff" stroke-width="3" />
              }
              @case ('huellas') {
                @for (h of huellas; track $index) {
                  <g [attr.transform]="'translate(' + h[0] + ' ' + h[1] + ') rotate(' + h[2] + ')'" fill="#ff4fa3" stroke-width="2.5">
                    <ellipse cx="0" cy="3" rx="8" ry="7" />
                    <circle cx="-8" cy="-7" r="3.2" />
                    <circle cx="-3" cy="-11" r="3.2" />
                    <circle cx="3" cy="-11" r="3.2" />
                    <circle cx="8" cy="-7" r="3.2" />
                  </g>
                }
              }
              @case ('flor') {
                <path d="M0 16 V38" stroke="#2e7d32" stroke-width="6" />
                @for (p of petalos; track $index) {
                  <circle [attr.cx]="p[0]" [attr.cy]="p[1]" r="10" fill="#fff" stroke-width="3" />
                }
                <circle cx="0" cy="-6" r="11" fill="#ffd400" />
              }
              @case ('reloj') {
                <path d="M-18 -28 H18 L2 0 L18 28 H-18 L-2 0 Z" fill="#bde7ff" />
                <path d="M-11 -21 H11 L2 -5 H-2 Z" fill="#ffd400" stroke="none" />
                <path d="M-14 26 H14 L0 11 Z" fill="#ffd400" stroke="none" />
                <rect x="-25" y="-35" width="50" height="7" rx="3" fill="#8b3dff" />
                <rect x="-25" y="28" width="50" height="7" rx="3" fill="#8b3dff" />
              }
              @case ('ancla') {
                <circle cx="0" cy="-27" r="7" fill="none" stroke-width="5" />
                <path d="M0 -20 V28 M-15 -9 H15 M-27 8 Q-25 30 0 30 Q25 30 27 8" fill="none" stroke-width="6" />
                <path d="M-32 12 L-27 1 L-20 10 Z M32 12 L27 1 L20 10 Z" [attr.fill]="ink" />
              }
              @case ('fantasma') {
                <path d="M-22 30 V-6 A22 22 0 0 1 22 -6 V30 L14 23 L7 30 L0 23 L-7 30 L-14 23 Z" fill="#fff" />
                <ellipse cx="-8" cy="-6" rx="3.5" ry="5.5" [attr.fill]="ink" stroke="none" />
                <ellipse cx="8" cy="-6" rx="3.5" ry="5.5" [attr.fill]="ink" stroke="none" />
                <path d="M-6 8 q6 6 12 0" fill="none" stroke-width="3" />
              }
              @case ('pelota') {
                <circle r="30" fill="#3ec7ff" />
                <path d="M-29 -6 Q0 -26 29 -6" fill="none" stroke="#ffd400" stroke-width="9" />
                <path d="M-26 14 Q0 -4 26 14" fill="none" stroke="#fff" stroke-width="7" />
                <circle r="30" fill="none" />
              }
              @case ('hueso') {
                <g transform="rotate(-20)" fill="#fff">
                  <circle cx="-24" cy="-8" r="9" />
                  <circle cx="-24" cy="8" r="9" />
                  <circle cx="24" cy="-8" r="9" />
                  <circle cx="24" cy="8" r="9" />
                  <rect x="-25" y="-7" width="50" height="14" stroke="none" />
                  <path d="M-19 -7 H19 M-19 7 H19" fill="none" />
                </g>
              }
              @case ('corazones') {
                <path d="M0 12 C-18 -2 -15 -20 0 -12 C15 -20 18 -2 0 12 Z" transform="translate(-20 14)" fill="#ff4fa3" />
                <path d="M0 12 C-18 -2 -15 -20 0 -12 C15 -20 18 -2 0 12 Z" transform="translate(0 -12)" fill="#3ec7ff" />
                <path d="M0 12 C-18 -2 -15 -20 0 -12 C15 -20 18 -2 0 12 Z" transform="translate(20 14)" fill="#7ed321" />
              }
              @case ('ciudad') {
                <rect x="-36" y="-8" width="22" height="42" fill="#8b3dff" />
                <rect x="-12" y="-32" width="24" height="66" fill="#ff7a00" />
                <rect x="14" y="-2" width="22" height="36" fill="#3ec7ff" />
                <path d="M-30 2 h4 M-22 2 h4 M-30 14 h4 M-22 14 h4 M-5 -22 h4 M3 -22 h4 M-5 -10 h4 M3 -10 h4 M-5 2 h4 M3 2 h4 M20 8 h4 M28 8 h4" stroke="#fff" stroke-width="4" />
              }
              @case ('monedas') {
                <ellipse cx="-10" cy="26" rx="20" ry="7" fill="#ffd400" />
                <ellipse cx="-10" cy="17" rx="20" ry="7" fill="#ffd400" />
                <ellipse cx="-10" cy="8" rx="20" ry="7" fill="#ffd400" />
                <ellipse cx="-10" cy="-1" rx="20" ry="7" fill="#ffd400" />
                <circle cx="20" cy="-16" r="15" fill="#ffd400" />
                <circle cx="20" cy="-16" r="8" fill="none" stroke-width="3" />
              }
              @case ('telarana') {
                <g fill="none" stroke-width="2.5">
                  <circle r="11" />
                  <circle r="22" />
                  <circle r="33" />
                  <path d="M0 -36 V36 M-36 0 H36 M-25 -25 L25 25 M25 -25 L-25 25" />
                </g>
              }
              @case ('matraz') {
                <path d="M-8 -32 H8 V-8 L28 24 Q31 32 23 32 H-23 Q-31 32 -28 24 L-8 -8 Z" fill="#fff6d6" />
                <path d="M-17 10 H17 L25 25 Q27 29 22 29 H-22 Q-27 29 -25 25 Z" fill="#7ed321" stroke="none" />
                <circle cx="-4" cy="2" r="3" fill="#fff" stroke-width="2" />
                <circle cx="6" cy="-6" r="2" fill="#fff" stroke-width="2" />
              }
              @case ('gafas') {
                <rect x="-36" y="-12" width="30" height="22" rx="8" [attr.fill]="ink" />
                <rect x="6" y="-12" width="30" height="22" rx="8" [attr.fill]="ink" />
                <path d="M-6 -4 Q0 -9 6 -4" fill="none" stroke-width="4" />
                <path d="M-30 -6 l8 -3 M12 -6 l8 -3" stroke="#fff" stroke-width="3" />
              }
              @case ('biberon') {
                <path d="M-6 -22 Q0 -38 6 -22 Z" fill="#ffd9a0" />
                <rect x="-14" y="-22" width="28" height="9" rx="3" fill="#3ec7ff" />
                <rect x="-12" y="-13" width="24" height="44" rx="8" fill="#fff" />
                <path d="M-12 8 H12" stroke-width="2" />
                <path d="M4 -4 h5 M4 6 h5 M4 16 h5" stroke-width="2" />
              }
              @case ('libreta') {
                <rect x="-26" y="-33" width="54" height="66" rx="4" fill="#fff" />
                <path d="M-14 -16 H20 M-14 -6 H20 M-14 4 H20 M-14 14 H20 M-14 24 H10" stroke="#3ec7ff" stroke-width="2" />
                <circle cx="-26" cy="-22" r="3.5" fill="#fff6d6" stroke-width="2" />
                <circle cx="-26" cy="-8" r="3.5" fill="#fff6d6" stroke-width="2" />
                <circle cx="-26" cy="6" r="3.5" fill="#fff6d6" stroke-width="2" />
                <circle cx="-26" cy="20" r="3.5" fill="#fff6d6" stroke-width="2" />
              }
              @case ('claqueta') {
                <rect x="-32" y="-6" width="64" height="38" rx="3" [attr.fill]="ink" />
                <path d="M-32 -8 L29 -24 L32 -14 L-29 2 Z" fill="#fff" />
                <path d="M-18 -8 L-12 -16 M-4 -12 L2 -20 M10 -16 L16 -23" stroke-width="4" />
                <path d="M-24 8 H24 M-24 18 H10" stroke="#fff" stroke-width="3" />
              }
              @case ('planeta') {
                <circle r="30" fill="#3ec7ff" />
                <path d="M-18 -20 q10 -4 14 4 q2 8 -6 10 q-10 2 -12 10 q-6 -10 4 -24 Z M8 4 q12 -4 16 6 q-2 12 -12 14 q-8 -8 -4 -20 Z" fill="#7ed321" stroke-width="3" />
                <circle r="30" fill="none" />
              }
              @case ('libro') {
                <path d="M0 -18 Q-18 -27 -35 -20 V24 Q-18 17 0 26 Z" fill="#fff" />
                <path d="M0 -18 Q18 -27 35 -20 V24 Q18 17 0 26 Z" fill="#fff" />
                <path d="M-26 -8 Q-14 -12 -6 -8 M-26 2 Q-14 -2 -6 2 M6 -8 Q14 -12 26 -8 M6 2 Q14 -2 26 2" fill="none" stroke-width="2" />
              }
              @case ('charco') {
                <ellipse cx="0" cy="22" rx="36" ry="10" fill="#8d5a2b" />
                <path d="M-22 14 l-6 -12 M-10 10 l-2 -14 M10 10 l3 -14 M22 14 l7 -11" stroke="#8d5a2b" stroke-width="4" />
                <path d="M-24 -26 h12 v18 q0 4 5 4 h4 q6 0 6 6 v6 h-27 Z" fill="#e53935" />
                <path d="M4 -26 h12 v18 q0 4 5 4 h4 q6 0 6 6 v6 h-27 Z" fill="#e53935" />
              }
              @case ('cometa') {
                <path d="M4 -34 L28 -8 L4 18 L-20 -8 Z" fill="#ff7a00" />
                <path d="M4 -34 V18 M-20 -8 H28" stroke-width="3" />
                <path d="M4 18 q-10 8 -4 14 t-8 12" fill="none" stroke-width="3" />
                <path d="M-6 26 l-6 -4 l2 7 Z M-10 36 l-6 -2 l4 6 Z" fill="#3ec7ff" stroke-width="2" />
              }
              @case ('lupa') {
                <circle cx="-6" cy="-8" r="20" fill="#bde7ff" stroke-width="6" />
                <path d="M8 6 L30 28" stroke-width="10" />
                <path d="M-18 -16 q6 -8 14 -6" fill="none" stroke="#fff" stroke-width="4" />
                <path d="M-40 30 q10 -6 20 0 M22 -34 l4 8 l8 1 l-6 5 l2 8 l-8 -4 l-8 4 l2 -8 l-6 -5 l8 -1 Z" fill="#ff4fa3" stroke-width="2" />
              }
              @case ('ordenador') {
                <rect x="-34" y="-30" width="68" height="46" rx="5" fill="#2b2b2b" />
                <rect x="-28" y="-24" width="56" height="34" rx="3" fill="#3ec7ff" stroke-width="2" />
                <path d="M0 -18 L12 -11 V3 L0 10 L-12 3 V-11 Z M0 -18 V-4 M0 -4 L12 -11 M0 -4 L-12 -11" fill="#fff6d6" stroke-width="2" />
                <path d="M-8 16 L-12 30 H12 L8 16" fill="#8b3dff" />
              }
              @case ('bicho') {
                <ellipse cx="0" cy="6" rx="16" ry="22" fill="#8d5a2b" />
                <circle cx="0" cy="-20" r="10" fill="#8d5a2b" />
                <path d="M-4 -28 q-8 -10 -16 -8 M4 -28 q8 -10 16 -8 M-14 -2 L-30 -10 M-14 10 L-32 12 M-12 22 L-28 32 M14 -2 L30 -10 M14 10 L32 12 M12 22 L28 32" fill="none" stroke-width="3" />
                <circle cx="-4" cy="-21" r="2.5" fill="#fff" stroke="none" />
                <circle cx="4" cy="-21" r="2.5" fill="#fff" stroke="none" />
              }
              @case ('oso') {
                <circle cx="-20" cy="-20" r="10" fill="#a8693a" />
                <circle cx="20" cy="-20" r="10" fill="#a8693a" />
                <circle cx="-20" cy="-20" r="4" fill="#e8b58a" stroke="none" />
                <circle cx="20" cy="-20" r="4" fill="#e8b58a" stroke="none" />
                <circle cx="0" cy="2" r="28" fill="#a8693a" />
                <ellipse cx="0" cy="12" rx="13" ry="10" fill="#e8b58a" />
                <ellipse cx="0" cy="7" rx="5" ry="3.5" [attr.fill]="ink" stroke="none" />
                <path d="M0 10 V15 M-5 17 Q0 21 5 17" fill="none" stroke-width="2.5" />
                <circle cx="-10" cy="-6" r="3" [attr.fill]="ink" stroke="none" />
                <circle cx="10" cy="-6" r="3" [attr.fill]="ink" stroke="none" />
              }
              @case ('conejo') {
                <ellipse cx="-11" cy="-22" rx="7" ry="18" fill="#fff" transform="rotate(-10 -11 -22)" />
                <ellipse cx="11" cy="-22" rx="7" ry="18" fill="#fff" transform="rotate(10 11 -22)" />
                <ellipse cx="-11" cy="-22" rx="3" ry="11" fill="#ffb3d1" stroke="none" transform="rotate(-10 -11 -22)" />
                <ellipse cx="11" cy="-22" rx="3" ry="11" fill="#ffb3d1" stroke="none" transform="rotate(10 11 -22)" />
                <circle cx="0" cy="12" r="22" fill="#fff" />
                <circle cx="-8" cy="7" r="3" [attr.fill]="ink" stroke="none" />
                <circle cx="8" cy="7" r="3" [attr.fill]="ink" stroke="none" />
                <path d="M-3 15 L3 15 L0 19 Z" fill="#ff4fa3" stroke-width="2" />
                <path d="M-14 20 h-12 M-14 24 h-11 M14 20 h12 M14 24 h11" stroke-width="2" />
              }
              @case ('corona') {
                <path d="M-32 22 L-32 -14 L-16 4 L0 -24 L16 4 L32 -14 L32 22 Z" fill="#ffd400" />
                <rect x="-34" y="20" width="68" height="10" rx="3" fill="#ffd400" />
                <circle cx="0" cy="8" r="5" fill="#e53935" stroke-width="2.5" />
                <circle cx="-19" cy="12" r="4" fill="#3ec7ff" stroke-width="2.5" />
                <circle cx="19" cy="12" r="4" fill="#7ed321" stroke-width="2.5" />
              }
              @case ('palmera') {
                <circle cx="24" cy="-24" r="9" fill="#ffd400" stroke-width="3" />
                <path d="M6 34 Q0 10 -2 -10" fill="none" stroke="#8d5a2b" stroke-width="8" />
                <path d="M-2 -12 Q-20 -24 -34 -12 Q-18 -18 -2 -12 Z M-2 -12 Q14 -28 30 -16 Q12 -18 -2 -12 Z M-2 -12 Q-14 -2 -24 12 Q-14 -8 -2 -12 Z M-2 -12 Q12 -2 18 12 Q8 -6 -2 -12 Z" fill="#43a047" stroke-width="3" />
              }
            }
          </g>
        } @else {
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
        }
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
  protected readonly motivo = computed(() => motivoPara(this.titulo(), this.slug()));

  /** Tres huellas en diagonal (x, y, giro). */
  protected readonly huellas = [
    [-18, 22, -20],
    [0, 0, 10],
    [18, -22, -20],
  ];
  /** Seis petalos alrededor del centro (0, -6). */
  protected readonly petalos = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return [Math.round(Math.cos(a) * 16), Math.round(-6 + Math.sin(a) * 16)];
  });
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
