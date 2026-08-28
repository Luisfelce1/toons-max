import { describe, it, expect, vi } from 'vitest';
import { keyMatches, familyKeyMiddleware } from '../src/auth.js';

describe('keyMatches', () => {
  it('returns true for matching keys', () => {
    expect(keyMatches('demo', 'demo')).toBe(true);
  });

  it('returns false for non-matching keys', () => {
    expect(keyMatches('nope', 'demo')).toBe(false);
  });

  it('does not throw when comparing keys of different lengths', () => {
    expect(() => keyMatches('a', 'a-much-longer-key')).not.toThrow();
    expect(keyMatches('a', 'a-much-longer-key')).toBe(false);
  });

  it('handles empty strings without throwing', () => {
    expect(keyMatches('', '')).toBe(true);
    expect(keyMatches('', 'demo')).toBe(false);
  });
});

function buildReqRes(headers = {}) {
  const req = { headers, get(name) { return this.headers[name.toLowerCase()]; } };
  const res = {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('familyKeyMiddleware', () => {
  it('calls next() when FAMILY_KEY is not configured (open mode)', () => {
    const middleware = familyKeyMiddleware({});
    const { req, res, next } = buildReqRes();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects requests without x-family-key when FAMILY_KEY is configured', () => {
    const middleware = familyKeyMiddleware({ FAMILY_KEY: 'demo' });
    const { req, res, next } = buildReqRes();
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with the wrong x-family-key', () => {
    const middleware = familyKeyMiddleware({ FAMILY_KEY: 'demo' });
    const { req, res, next } = buildReqRes({ 'x-family-key': 'wrong' });
    middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('calls next() with the correct x-family-key', () => {
    const middleware = familyKeyMiddleware({ FAMILY_KEY: 'demo' });
    const { req, res, next } = buildReqRes({ 'x-family-key': 'demo' });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
