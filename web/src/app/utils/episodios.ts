import type { Episodio } from '../models';

export interface Temporada {
  numero: number;
  episodios: Episodio[];
}

export function tieneVideo(ep: Episodio): boolean {
  return Boolean(ep.youtube_id || ep.video_url);
}

/** Agrupa por temporada conservando el orden en que llegan (el API ya ordena). */
export function agruparPorTemporada(episodios: Episodio[]): Temporada[] {
  const mapa = new Map<number, Episodio[]>();
  for (const ep of episodios) {
    const lista = mapa.get(ep.temporada);
    if (lista) {
      lista.push(ep);
    } else {
      mapa.set(ep.temporada, [ep]);
    }
  }
  return [...mapa.entries()].map(([numero, eps]) => ({ numero, episodios: eps }));
}

/** El episodio que arranca el boton gigante de "Ver": el primero que se puede reproducir. */
export function primerEpisodioConVideo(episodios: Episodio[]): Episodio | null {
  return episodios.find(tieneVideo) ?? null;
}
