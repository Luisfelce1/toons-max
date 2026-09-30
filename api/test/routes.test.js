import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { applyTestDbEnv } from './helpers/testDb.js';

applyTestDbEnv();

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/migrate.js');
const { getPool, closePool } = await import('../src/db.js');
const { resetDb, seedFixtures } = await import('./helpers/fixtures.js');

const FAMILY_KEY = 'demo';
const app = createApp({ FAMILY_KEY });
const authHeader = { 'x-family-key': FAMILY_KEY };

describe('data routes', () => {
  let pool;
  let fixtures;

  beforeAll(async () => {
    await migrate();
    pool = getPool();
  });

  beforeEach(async () => {
    await resetDb(pool);
    fixtures = await seedFixtures(pool);
  });

  afterAll(async () => {
    await closePool();
  });

  describe('auth requirement', () => {
    it('GET /api/series without x-family-key -> 401', async () => {
      const res = await request(app).get('/api/series');
      expect(res.status).toBe(401);
    });

    it('GET /api/series with correct x-family-key -> 200', async () => {
      const res = await request(app).get('/api/series').set(authHeader);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/canales', () => {
    it('returns only channels with something playable', async () => {
      // Nickelodeon solo tiene Hey Arnold!, sin episodios con video.
      const res = await request(app).get('/api/canales').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.map((c) => c.slug)).toEqual(['cartoon-network']);
    });
  });

  describe('GET /api/series', () => {
    it('lists only series with at least one playable episode', async () => {
      const res = await request(app).get('/api/series').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.series.map((s) => s.slug)).toEqual(['coraje-el-perro-cobarde']);
    });

    it('filters by canal slug', async () => {
      const res = await request(app).get('/api/series?canal=cartoon-network').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.series[0].slug).toBe('coraje-el-perro-cobarde');
    });

    it('a channel whose series have no video returns nothing', async () => {
      const res = await request(app).get('/api/series?canal=nickelodeon').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it('searches by title with q', async () => {
      const res = await request(app).get('/api/series?q=coraje').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.series.some((s) => s.slug === 'coraje-el-perro-cobarde')).toBe(true);
    });

    it('shows a series as soon as one of its episodes gets a video', async () => {
      const [[{ id }]] = await pool.query("SELECT id FROM serie WHERE slug = 'hey-arnold'");
      await pool.query(
        "INSERT INTO episodio (serie_id, temporada, numero, titulo, video_url) VALUES (?, 1, 1, 'Ep', 'https://archive.org/download/x/x.mp4')",
        [id]
      );
      const res = await request(app).get('/api/series').set(authHeader);
      expect(res.body.total).toBe(2);
    });

    it('rejects a non-numeric limit with 400', async () => {
      const res = await request(app).get('/api/series?limit=abc').set(authHeader);
      expect(res.status).toBe(400);
    });

    it('caps limit at 200', async () => {
      const res = await request(app).get('/api/series?limit=9999').set(authHeader);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/series/:slug', () => {
    it('returns the series counting only playable episodes', async () => {
      const res = await request(app).get('/api/series/coraje-el-perro-cobarde').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe('Coraje el perro cobarde');
      expect(res.body.total_episodios).toBe(1);
    });

    it('404s for a series without playable episodes', async () => {
      const res = await request(app).get('/api/series/hey-arnold').set(authHeader);
      expect(res.status).toBe(404);
    });

    it('404s for an unknown slug', async () => {
      const res = await request(app).get('/api/series/no-existe').set(authHeader);
      expect(res.status).toBe(404);
    });

    it('400s for a slug with invalid characters', async () => {
      const res = await request(app).get('/api/series/Not_A-Valid!Slug').set(authHeader);
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/series/:slug/episodios', () => {
    it('returns only playable episodes, ordered', async () => {
      const res = await request(app).get('/api/series/coraje-el-perro-cobarde/episodios').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.map((e) => e.numero)).toEqual([1]);
      expect(res.body[0].youtube_id).toBe('dQw4w9WgXcQ');
    });
  });

  describe('GET /api/episodios/:id', () => {
    it('returns a single episode', async () => {
      const list = await request(app).get('/api/series/coraje-el-perro-cobarde/episodios').set(authHeader);
      const id = list.body[0].id;
      const res = await request(app).get(`/api/episodios/${id}`).set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(id);
    });

    it('404s for an episode without video', async () => {
      const [[{ id }]] = await pool.query('SELECT id FROM episodio WHERE numero = 2');
      const res = await request(app).get(`/api/episodios/${id}`).set(authHeader);
      expect(res.status).toBe(404);
    });

    it('404s for an unknown id', async () => {
      const res = await request(app).get('/api/episodios/999999').set(authHeader);
      expect(res.status).toBe(404);
    });

    it('400s for a non-numeric id', async () => {
      const res = await request(app).get('/api/episodios/abc').set(authHeader);
      expect(res.status).toBe(400);
    });
  });
});
