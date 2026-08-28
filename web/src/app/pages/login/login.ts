import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class LoginPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly clave = signal('');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  async entrar(): Promise<void> {
    const clave = this.clave().trim();
    if (!clave) {
      this.error.set('Escribe la clave familiar.');
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      const ok = await this.api.login(clave);
      if (ok) {
        this.router.navigateByUrl('/');
      } else {
        this.error.set('Clave incorrecta. Intenta de nuevo.');
      }
    } catch {
      this.error.set('No se pudo conectar con el servidor.');
    } finally {
      this.cargando.set(false);
    }
  }
}
