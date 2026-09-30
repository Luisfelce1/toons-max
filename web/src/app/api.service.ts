import { Injectable, signal } from '@angular/core';
import type { Canal, Episodio, SerieDetalle, SeriesResponse } from './models';

const FAMILY_KEY_STORAGE = 'familyKey';

export interface SeriesFilter {
  canal?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly familyKeySignal = signal<string | null>(this.readStoredKey());
  readonly familyKey = this.familyKeySignal.asReadonly();

  private readStoredKey(): string | null {
    try {
      return localStorage.getItem(FAMILY_KEY_STORAGE);
    } catch {
      return null;
    }
  }

  private setKey(key: string | null): void {
    this.familyKeySignal.set(key);
    try {
      if (key) {
        localStorage.setItem(FAMILY_KEY_STORAGE, key);
      } else {
        localStorage.removeItem(FAMILY_KEY_STORAGE);
      }
    } catch {
      // localStorage no disponible (modo privado, etc): el estado en memoria sigue funcionando.
    }
  }

  async login(key: string): Promise<boolean> {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    if (res.ok) {
      this.setKey(key);
      return true;
    }
    return false;
  }

  logout(): void {
    this.setKey(null);
  }

  private async request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {};
    const key = this.familyKeySignal();
    if (key) {
      headers['x-family-key'] = key;
    }

    const res = await fetch(`/api${path}`, { headers });

    if (res.status === 401) {
      this.logout();
      throw new Error('No autorizado');
    }
    if (!res.ok) {
      throw new Error(`Error ${res.status} al consultar ${path}`);
    }
    return res.json() as Promise<T>;
  }

  canales(): Promise<Canal[]> {
    return this.request<Canal[]>('/canales');
  }

  series(filter: SeriesFilter = {}): Promise<SeriesResponse> {
    const params = new URLSearchParams();
    if (filter.canal) params.set('canal', filter.canal);
    if (filter.q) params.set('q', filter.q);
    if (filter.limit !== undefined) params.set('limit', String(filter.limit));
    if (filter.offset !== undefined) params.set('offset', String(filter.offset));
    const qs = params.toString();
    return this.request<SeriesResponse>(`/series${qs ? `?${qs}` : ''}`);
  }

  serie(slug: string): Promise<SerieDetalle> {
    return this.request<SerieDetalle>(`/series/${slug}`);
  }

  episodios(slug: string): Promise<Episodio[]> {
    return this.request<Episodio[]>(`/series/${slug}/episodios`);
  }

  episodio(id: number): Promise<Episodio> {
    return this.request<Episodio>(`/episodios/${id}`);
  }
}
