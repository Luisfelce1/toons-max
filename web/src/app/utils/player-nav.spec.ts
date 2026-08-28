import { siguienteEpisodio, anteriorEpisodio } from './player-nav';
import type { Episodio } from '../models';

function ep(id: number, temporada: number, numero: number): Episodio {
  return { id, temporada, numero, titulo: `Ep ${numero}`, duracion: 20, resumen: '', video_url: null, youtube_id: null, serie_id: 1 };
}

describe('player-nav', () => {
  const episodios = [ep(10, 1, 1), ep(11, 1, 2), ep(12, 1, 3), ep(20, 2, 1)];

  describe('siguienteEpisodio', () => {
    it('returns the next episode in list order', () => {
      expect(siguienteEpisodio(episodios, 10)?.id).toBe(11);
      expect(siguienteEpisodio(episodios, 11)?.id).toBe(12);
    });

    it('crosses into the next season', () => {
      expect(siguienteEpisodio(episodios, 12)?.id).toBe(20);
    });

    it('returns null after the last episode', () => {
      expect(siguienteEpisodio(episodios, 20)).toBeNull();
    });

    it('returns null when the current episode id is not in the list', () => {
      expect(siguienteEpisodio(episodios, 999)).toBeNull();
    });
  });

  describe('anteriorEpisodio', () => {
    it('returns the previous episode in list order', () => {
      expect(anteriorEpisodio(episodios, 12)?.id).toBe(11);
    });

    it('returns null before the first episode', () => {
      expect(anteriorEpisodio(episodios, 10)).toBeNull();
    });

    it('returns null when the current episode id is not in the list', () => {
      expect(anteriorEpisodio(episodios, 999)).toBeNull();
    });
  });
});
