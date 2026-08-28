import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly familyKey = this.api.familyKey;

  cerrarSesion(): void {
    this.api.logout();
    this.router.navigateByUrl('/login');
  }
}
