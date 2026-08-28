import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { applyTestDbEnv } from './helpers/testDb.js';

applyTestDbEnv();

const { migrate } = await import('../src/migrate.js');
const { getPool, closePool } = await import('../src/db.js');
const { resetDb } = await import('./helpers/fixtures.js');
const repo = await import('../src/repo.js');

describe('repo', () => {
  let pool;

  beforeAll(async () => {
    await migrate();
    pool = getPool();
  });

  beforeEach(async () => {
    await resetDb(pool);
  });

  afterAll(async () => {
    await closePool();
  });

  describe('upsertCanal', () => {
    it('inserts a channel and is idempotent by slug', async () => {
      const id1 = await repo.upsertCanal({ slug: 'disney', nombre: 'Disney' });
      const id2 = await repo.upsertCanal({ slug: 'disney', nombre: 'Disney Channel' });
      expect(id1).toBe(id2);
      const canales = await repo.listCanales();
      expect(canales).toHaveLength(1);
      expect(canales[0].nombre).toBe('Disney Channel');
    });
  });

  describe('upsertSerie', () => {
    it('inserts a series and is idempotent by slug', async () => {
      const canalId = await repo.upsertCanal({ slug: 'disney', nombre: 'Disney' });
      const id1 = await repo.upsertSerie({
        slug: 'ducktales', titulo: 'DuckTales', anio: 1987, sinopsis: '', poster: '', tipo: 'tv', canal_id: canalId,
      });
      const id2 = await repo.upsertSerie({
        slug: 'ducktales', titulo: 'DuckTales (remaster)', anio: 1987, sinopsis: '', poster: '', tipo: 'tv', canal_id: canalId,
      });
      expect(id1).toBe(id2);
      const { total, series } = await repo.listSeries({});
      expect(total).toBe(1);
      expect(series[0].titulo).toBe('DuckTales (remaster)');
    });
  });

  describe('upsertEpisodio', () => {
    let serieId;

    beforeEach(async () => {
      const canalId = await repo.upsertCanal({ slug: 'disney', nombre: 'Disney' });
      serieId = await repo.upsertSerie({
        slug: 'ducktales', titulo: 'DuckTales', anio: 1987, sinopsis: '', poster: '', tipo: 'tv', canal_id: canalId,
      });
    });

    it('inserts an episode and is idempotent by (serie_id, temporada, numero)', async () => {
      const id1 = await repo.upsertEpisodio({ serie_id: serieId, temporada: 1, numero: 1, titulo: 'Piloto', resumen: '' });
      const id2 = await repo.upsertEpisodio({ serie_id: serieId, temporada: 1, numero: 1, titulo: 'Piloto (editado)', resumen: '' });
      expect(id1).toBe(id2);
      const episodios = await repo.listEpisodiosBySerie(serieId);
      expect(episodios).toHaveLength(1);
      expect(episodios[0].titulo).toBe('Piloto (editado)');
    });

    it('accepts a valid https video_url', async () => {
      await expect(
        repo.upsertEpisodio({ serie_id: serieId, temporada: 1, numero: 1, video_url: 'https://example.org/v.mp4' })
      ).resolves.toBeDefined();
    });

    it('rejects a non-https video_url', async () => {
      await expect(
        repo.upsertEpisodio({ serie_id: serieId, temporada: 1, numero: 1, video_url: 'http://example.org/v.mp4' })
      ).rejects.toThrow(/video_url/i);
    });

    it('accepts a valid youtube_id', async () => {
      await expect(
        repo.upsertEpisodio({ serie_id: serieId, temporada: 1, numero: 1, youtube_id: 'dQw4w9WgXcQ' })
      ).resolves.toBeDefined();
    });

    it('rejects an invalid youtube_id', async () => {
      await expect(
        repo.upsertEpisodio({ serie_id: serieId, temporada: 1, numero: 1, youtube_id: 'not-valid!!' })
      ).rejects.toThrow(/youtube_id/i);
    });
  });
});
