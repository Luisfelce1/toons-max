import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('createApp', () => {
  it('GET /api/health responds 200 without auth', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('enables trust proxy so rate limiting sees the real client IP', () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    expect(app.get('trust proxy')).toBe(1);
  });

  it('sends helmet security headers', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('sends a Content-Security-Policy allowing youtube-nocookie embeds and self scripts', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("media-src 'self' https://archive.org https://*.archive.org");
  });

  it('responds with a generic JSON error and no stack trace on unknown routes', async () => {
    const app = createApp({ FAMILY_KEY: 'demo' });
    const res = await request(app).get('/api/does-not-exist').set('x-family-key', 'demo');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toMatch(/at\s+.*\(.*:\d+:\d+\)/);
  });

  it('rate limits repeated POST /api/login attempts with 429', async () => {
    const app = createApp({ FAMILY_KEY: 'demo', LOGIN_RATE_LIMIT_MAX: '3', LOGIN_RATE_LIMIT_WINDOW_MS: '60000' });
    let lastStatus;
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/login').send({ key: 'wrong' });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
