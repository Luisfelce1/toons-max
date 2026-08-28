import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('POST /api/login', () => {
  it('returns 200 { ok: true } with the correct family key', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).post('/api/login').send({ key: 'demo' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 401 { ok: false } with an incorrect key', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).post('/api/login').send({ key: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false });
  });

  it('returns 400 when body is missing the key field', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).post('/api/login').send({});
    expect(res.status).toBe(400);
  });
});
