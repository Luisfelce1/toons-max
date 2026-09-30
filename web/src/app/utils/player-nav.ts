import type { Episodio } from '../models';

export function siguienteEpisodio(episodios: Episodio[], actualId: number): Episodio | null {
  const index = episodios.findIndex((e) => e.id === actualId);
  if (index === -1 || index === episodios.length - 1) return null;
  return episodios[index + 1];
}

export function anteriorEpisodio(episodios: Episodio[], actualId: number): Episodio | null {
  const index = episodios.findIndex((e) => e.id === actualId);
  if (index <= 0) return null;
  return episodios[index - 1];
}
