import { describe, it, expect, vi } from 'vitest';
import {
  normalizar,
  extraerSxE,
  emparejarVideos,
  resolverCanalOficial,
  listarVideosOficiales,
  runIngestaVideos,
} from '../src/ingesta-videos.js';

const ep = (id, temporada, numero, titulo) => ({ id, temporada, numero, titulo });

describe('normalizar', () => {
  it('quita acentos, signos y pasa a minusculas', () => {
    expect(normalizar('¡Día del Basurero! & Co.')).toBe('dia del basurero and co');
  });
});

describe('extraerSxE', () => {
  it.each([
    ['Mighty Morphin Power Rangers | S01 | E01 | Day of the Dumpster', { temporada: 1, numero: 1 }],
    ['Franklin S2E14 - Franklin Plays the Game', { temporada: 2, numero: 14 }],
    ['The Magic School Bus Season 3 Episode 7 Full Episode', { temporada: 3, numero: 7 }],
  ])('lee %s', (titulo, esperado) => {
    expect(extraerSxE(titulo)).toEqual(esperado);
  });

  it('devuelve null si no hay marcador', () => {
    expect(extraerSxE('Franklin Goes to School')).toBeNull();
  });
});

describe('emparejarVideos', () => {
  const episodios = [
    ep(1, 1, 1, 'Day of the Dumpster'),
    ep(2, 1, 2, 'High Five'),
    ep(3, 1, 3, 'Teamwork'),
    ep(4, 1, 4, 'A Bad Reflection on You'),
  ];

  it('prioriza el marcador SxxEyy', () => {
    const videos = [{ id: 'aaaaaaaaaaa', titulo: 'MMPR | S01 | E02 | Full Episode' }];
    expect(emparejarVideos(episodios, videos)).toEqual([{ temporada: 1, numero: 2, youtube_id: 'aaaaaaaaaaa' }]);
  });

  it('usa el titulo del episodio cuando no hay marcador', () => {
    const videos = [{ id: 'bbbbbbbbbbb', titulo: 'Day of the Dumpster | Power Rangers Full Episode' }];
    expect(emparejarVideos(episodios, videos)).toEqual([{ temporada: 1, numero: 1, youtube_id: 'bbbbbbbbbbb' }]);
  });

  it('descarta clips, trailers y recopilaciones', () => {
    const videos = [
      { id: 'ccccccccccc', titulo: 'Teamwork | Clip' },
      { id: 'ddddddddddd', titulo: 'Best fights compilation S01E04' },
    ];
    expect(emparejarVideos(episodios, videos)).toEqual([]);
  });

  it('no adivina si el titulo aparece en varios videos', () => {
    const videos = [
      { id: 'eeeeeeeeeee', titulo: 'Teamwork part 1' },
      { id: 'fffffffffff', titulo: 'Teamwork part 2' },
    ];
    expect(emparejarVideos(episodios, videos)).toEqual([]);
  });

  it('no asigna el mismo video a dos episodios', () => {
    const videos = [{ id: 'ggggggggggg', titulo: 'S01E01 Day of the Dumpster High Five' }];
    const pares = emparejarVideos(episodios, videos);
    expect(pares).toHaveLength(1);
    expect(pares[0].numero).toBe(1);
  });
});

function jsonRes(data) {
  return { ok: true, status: 200, json: async () => data };
}

describe('YouTube Data API', () => {
  it('resuelve el canal oficial por handle', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonRes({ items: [{ id: 'UC1', contentDetails: { relatedPlaylists: { uploads: 'UU1' } } }] }),
    );
    const canal = await resolverCanalOficial({ handle: '@X' }, { apiKey: 'k', fetchImpl });
    expect(canal).toEqual({ channelId: 'UC1', uploads: 'UU1' });
    expect(fetchImpl.mock.calls[0][0]).toContain('forHandle=%40X');
  });

  it('pagina las subidas y descarta videos de otros canales', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonRes({
          nextPageToken: 'p2',
          items: [
            { snippet: { title: 'Oficial 1', videoOwnerChannelId: 'UC1', resourceId: { videoId: 'aaaaaaaaaaa' } } },
            { snippet: { title: 'Resubida', videoOwnerChannelId: 'UC9', resourceId: { videoId: 'zzzzzzzzzzz' } } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
          items: [{ snippet: { title: 'Oficial 2', videoOwnerChannelId: 'UC1', resourceId: { videoId: 'bbbbbbbbbbb' } } }],
        }),
      );
    const videos = await listarVideosOficiales({ channelId: 'UC1', uploads: 'UU1' }, { apiKey: 'k', fetchImpl });
    expect(videos.map((v) => v.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(fetchImpl.mock.calls[1][0]).toContain('pageToken=p2');
  });

  it('exige YOUTUBE_API_KEY', async () => {
    await expect(runIngestaVideos({ series: [], apiKey: '' })).rejects.toThrow('YOUTUBE_API_KEY');
  });
});
