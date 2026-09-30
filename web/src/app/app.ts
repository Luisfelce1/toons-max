import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ApiService } from './api.service';
import { IconComponent } from './shared/icon';
import { UiNativeButton } from './ui/button';
import {
  UiDialogContent,
  UiDialogDescription,
  UiDialogOverlay,
  UiDialogRoot,
  UiDialogTitle,
} from './ui/dialog';

const LOGO_COLORS = ['#ff4fa3', '#ffd400', '#3ec7ff', '#7ed321', '#ff7a00', '#8b3dff'];

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    IconComponent,
    UiNativeButton,
    UiDialogRoot,
    UiDialogOverlay,
    UiDialogContent,
    UiDialogTitle,
    UiDialogDescription,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly familyKey = this.api.familyKey;
  readonly confirmarSalida = signal(false);

  readonly logo = 'RetroToons'.split('').map((letra, i) => ({
    letra,
    color: LOGO_COLORS[i % LOGO_COLORS.length],
    giro: i % 2 === 0 ? -4 : 4,
  }));

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** En la portada el boton "casa" no aporta nada: se oculta para no confundir. */
  readonly enPortada = computed(() => this.url() === '/' || this.url() === '');

  cerrarSesion(): void {
    this.confirmarSalida.set(false);
    this.api.logout();
    this.router.navigateByUrl('/login');
  }
}
