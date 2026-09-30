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
    it('returns the seeded channels ordered by name', async () => {
      const res = await request(app).get('/api/canales').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.map((c) => c.slug)).toEqual(['cartoon-network', 'nickelodeon']);
    });
  });

  describe('GET /api/series', () => {
    it('lists all series with total/limit/offset', async () => {
      const res = await request(app).get('/api/series').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.series).toHaveLength(2);
    });

    it('filters by canal slug', async () => {
      const res = await request(app).get('/api/series?canal=nickelodeon').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.series[0].slug).toBe('hey-arnold');
    });

    it('searches by title with q', async () => {
      const res = await request(app).get('/api/series?q=arnold').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.series.some((s) => s.slug === 'hey-arnold')).toBe(true);
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
    it('returns the series with total_episodios', async () => {
      const res = await request(app).get('/api/series/coraje-el-perro-cobarde').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.titulo).toBe('Coraje el perro cobarde');
      expect(res.body.total_episodios).toBe(2);
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
    it('returns episodes ordered by temporada and numero', async () => {
      const res = await request(app).get('/api/series/coraje-el-perro-cobarde/episodios').set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.map((e) => e.numero)).toEqual([1, 2]);
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
