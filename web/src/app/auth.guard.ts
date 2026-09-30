import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ApiService } from './api.service';

export const authGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  if (api.familyKey() !== null) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
