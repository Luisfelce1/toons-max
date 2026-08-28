import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { applyTestDbEnv } from './helpers/testDb.js';

applyTestDbEnv();

const { migrate } = await import('../src/migrate.js');
const { getPool, closePool } = await import('../src/db.js');
const { resetDb } = await import('./helpers/fixtures.js');
const repo = await import('../src/repo.js');
const { seed, CANALES } = await import('../src/seed.js');

describe('seed', () => {
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

  it('creates all the standard channels', async () => {
    await seed();
    const canales = await repo.listCanales();
    expect(canales).toHaveLength(CANALES.length);
  });

  it('creates several demo series spread across channels, each with episodes', async () => {
    await seed();
    const { total, series } = await repo.listSeries({});
    expect(total).toBeGreaterThanOrEqual(4);

    const distinctCanales = new Set(series.map((s) => s.canal_slug));
    expect(distinctCanales.size).toBeGreaterThan(1);

    for (const serie of series) {
      const episodios = await repo.listEpisodiosBySerie(serie.id);
      expect(episodios.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('leaves at least one episode without video and one with a youtube_id', async () => {
    await seed();
    const { series } = await repo.listSeries({});
    let hasVideo = false;
    let hasEmpty = false;
    for (const serie of series) {
      const episodios = await repo.listEpisodiosBySerie(serie.id);
      for (const ep of episodios) {
        if (ep.youtube_id) hasVideo = true;
        if (!ep.youtube_id && !ep.video_url) hasEmpty = true;
      }
    }
    expect(hasVideo).toBe(true);
    expect(hasEmpty).toBe(true);
  });

  it('is idempotent: running it twice does not duplicate series', async () => {
    await seed();
    await seed();
    const { total } = await repo.listSeries({});
    const { total: totalAgain } = await repo.listSeries({});
    expect(total).toBe(totalAgain);
  });
});
