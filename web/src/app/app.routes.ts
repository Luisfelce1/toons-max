import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'serie/:slug',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/serie/serie').then((m) => m.SeriePage),
  },
  {
    path: 'serie/:slug/ver/:epiId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reproductor/reproductor').then((m) => m.ReproductorPage),
  },
  { path: '**', redirectTo: '' },
];
