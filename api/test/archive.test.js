import { describe, it, expect, vi } from 'vitest';
import { duracionMinutos, elegirMp4, urlDescarga, resolverVideoArchive } from '../src/archive.js';

describe('duracionMinutos', () => {
  it.each([
    ['421.5', 7],
    ['07:01', 7],
    ['1:02:03', 62],
    ['20', 1],
  ])('%s -> %i', (entrada, esperado) => {
    expect(duracionMinutos(entrada)).toBe(esperado);
  });

  it('devuelve null sin dato valido', () => {
    expect(duracionMinutos(undefined)).toBeNull();
    expect(duracionMinutos('abc')).toBeNull();
  });
});

describe('elegirMp4', () => {
  it('prefiere h.264 sobre MPEG4 y descarta no-mp4', () => {
    const meta = {
      files: [
        { name: 'corto.ogv', format: 'Ogg Video' },
        { name: 'corto_512kb.mp4', format: '512Kb MPEG4' },
        { name: 'corto.mp4', format: 'h.264' },
      ],
    };
    expect(elegirMp4(meta)?.name).toBe('corto.mp4');
  });

  it('devuelve null si no hay mp4', () => {
    expect(elegirMp4({ files: [{ name: 'a.avi' }] })).toBeNull();
    expect(elegirMp4({})).toBeNull();
  });
});

describe('urlDescarga', () => {
  it('codifica espacios y caracteres especiales', () => {
    expect(urlDescarga('popeye_x', 'Popeye - Bride & Gloom.mp4')).toBe(
      'https://archive.org/download/popeye_x/Popeye%20-%20Bride%20%26%20Gloom.mp4',
    );
  });
});

describe('resolverVideoArchive', () => {
  it('construye la URL https y la duracion', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ name: 'spree.mp4', format: 'h.264', length: '380.2' }] }),
    });
    const video = await resolverVideoArchive('spree_lunch', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith('https://archive.org/metadata/spree_lunch');
    expect(video).toEqual({ video_url: 'https://archive.org/download/spree_lunch/spree.mp4', duracion: 6 });
  });

  it('devuelve null si la API falla o no hay mp4', async () => {
    expect(await resolverVideoArchive('x', { fetchImpl: vi.fn().mockResolvedValue({ ok: false }) })).toBeNull();
    const sinMp4 = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ files: [] }) });
    expect(await resolverVideoArchive('x', { fetchImpl: sinMp4 })).toBeNull();
  });
});
