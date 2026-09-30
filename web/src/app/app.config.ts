import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Tras un despliegue, una pestaña abierta puede pedir trozos de la version anterior
      // que ya no existen: recargamos para traer la version nueva.
      withNavigationErrorHandler((error) => {
        if (/dynamically imported module|Loading chunk|Importing a module script failed/i.test(String(error.error))) {
          location.reload();
        }
      }),
    ),
  ],
};
