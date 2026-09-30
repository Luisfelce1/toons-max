import type { Episodio } from '../models';
import { agruparPorTemporada, primerEpisodioConVideo, tieneVideo } from './episodios';

function ep(id: number, temporada: number, numero: number, video = true): Episodio {
  return {
    id,
    serie_id: 1,
    temporada,
    numero,
    titulo: `Ep ${numero}`,
    duracion: null,
    resumen: null,
    video_url: null,
    youtube_id: video ? `yt${id}` : null,
  };
}

describe('episodios utils', () => {
  it('tieneVideo detecta youtube_id o video_url', () => {
    expect(tieneVideo(ep(1, 1, 1))).toBe(true);
    expect(tieneVideo(ep(2, 1, 2, false))).toBe(false);
    expect(tieneVideo({ ...ep(3, 1, 3, false), video_url: 'https://x/v.mp4' })).toBe(true);
  });

  it('agruparPorTemporada agrupa y conserva el orden', () => {
    const grupos = agruparPorTemporada([ep(1, 1, 1), ep(2, 1, 2), ep(3, 2, 1)]);
    expect(grupos.map((g) => g.numero)).toEqual([1, 2]);
    expect(grupos[0].episodios.map((e) => e.id)).toEqual([1, 2]);
    expect(grupos[1].episodios.map((e) => e.id)).toEqual([3]);
  });

  it('agruparPorTemporada devuelve [] sin episodios', () => {
    expect(agruparPorTemporada([])).toEqual([]);
  });

  it('primerEpisodioConVideo salta los que no tienen video', () => {
    expect(primerEpisodioConVideo([ep(1, 1, 1, false), ep(2, 1, 2)])?.id).toBe(2);
    expect(primerEpisodioConVideo([ep(1, 1, 1, false)])).toBeNull();
  });
});
