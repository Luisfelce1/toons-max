import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  mapTvMazeShow,
  mapTvMazeEpisodes,
  mapJikanAnime,
  mapJikanEpisodesPage,
  fetchJikanEpisodes,
  runIngesta,
  elegirShowPorAnio,
  slugSerie,
  SERIES,
} from '../src/ingesta.js';
import { applyTestDbEnv } from './helpers/testDb.js';

describe('mapTvMazeShow', () => {
  it('maps a TVMaze show to serie fields with stripped summary and never an external poster', () => {
    const show = {
      name: 'Courage the Cowardly Dog',
      premiered: '1999-11-12',
      image: { original: 'https://static.tvmaze.com/uploads/images/original_untouched/x/y.jpg' },
      summary: '<p>A dog <b>protects</b> his owners.</p>',
    };
    const serie = mapTvMazeShow(show);
    expect(serie).toMatchObject({
      titulo: 'Courage the Cowardly Dog',
      anio: 1999,
      sinopsis: 'A dog protects his owners.',
      poster: null,
      tipo: 'tv',
      fuente: 'tvmaze',
    });
  });

  it('handles a missing poster/summary/premiered gracefully', () => {
    const serie = mapTvMazeShow({ name: 'X', image: null, summary: null, premiered: null });
    expect(serie.poster).toBeNull();
    expect(serie.sinopsis).toBe('');
    expect(serie.anio).toBeNull();
  });
});

describe('mapTvMazeEpisodes', () => {
  it('maps embedded episodes with season/number/duration and stripped summary', () => {
    const show = {
      _embedded: {
        episodes: [
          { season: 1, number: 1, name: 'Ep 1', runtime: 30, summary: '<p>Uno</p>' },
          { season: 1, number: 2, name: 'Ep 2', runtime: 30, summary: '<p>Dos</p>' },
        ],
      },
    };
    const episodios = mapTvMazeEpisodes(show);
    expect(episodios).toEqual([
      { temporada: 1, numero: 1, titulo: 'Ep 1', duracion: 30, resumen: 'Uno' },
      { temporada: 1, numero: 2, titulo: 'Ep 2', duracion: 30, resumen: 'Dos' },
    ]);
  });

  it('filters by season and drops specials without number', () => {
    const show = {
      _embedded: {
        episodes: [
          { season: 1, number: 1, name: 'A', runtime: 22, summary: '' },
          { season: 1, number: null, name: 'Special', runtime: 22, summary: '' },
          { season: 4, number: 1, name: 'Zeo', runtime: 22, summary: '' },
        ],
      },
    };
    expect(mapTvMazeEpisodes(show, [1, 2, 3]).map((e) => e.titulo)).toEqual(['A']);
  });

  it('returns an empty array when there are no embedded episodes', () => {
    expect(mapTvMazeEpisodes({})).toEqual([]);
  });
});

describe('elegirShowPorAnio', () => {
  const resultados = [
    { show: { id: 1, name: 'Franklin', premiered: '2024-04-12' } },
    { show: { id: 2, name: 'Franklin', premiered: '1997-11-03' } },
  ];
  it('picks the show whose premiere year matches', () => {
    expect(elegirShowPorAnio(resultados, 1997)?.id).toBe(2);
  });
  it('returns null when no year matches', () => {
    expect(elegirShowPorAnio(resultados, 1980)).toBeNull();
  });
  it('falls back to the first result without a year', () => {
    expect(elegirShowPorAnio(resultados, undefined)?.id).toBe(1);
  });
});

describe('SERIES catalog', () => {
  it('has unique slugs and only official YouTube sources', () => {
    const slugs = SERIES.map(slugSerie);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of SERIES.filter((x) => x.oficial)) {
      expect(s.oficial.handle || s.oficial.username).toBeTruthy();
    }
  });
});

describe('mapJikanAnime', () => {
  it('maps a Jikan anime search result to serie fields', () => {
    const anime = {
      mal_id: 21,
      title: 'Dragon Ball',
      year: 1986,
      images: { jpg: { image_url: 'https://cdn.myanimelist.net/images/anime/x.jpg' } },
      synopsis: 'A boy searches for magic orbs.',
    };
    const serie = mapJikanAnime(anime);
    expect(serie).toMatchObject({
      titulo: 'Dragon Ball',
      anio: 1986,
      sinopsis: 'A boy searches for magic orbs.',
      poster: null,
      tipo: 'anime',
      fuente: 'jikan',
      fuente_id: 21,
    });
  });

  it('falls back to aired.prop.from.year when year is absent', () => {
    const serie = mapJikanAnime({ mal_id: 1, title: 'X', aired: { prop: { from: { year: 2001 } } } });
    expect(serie.anio).toBe(2001);
  });
});

describe('mapJikanEpisodesPage', () => {
  it('numbers episodes cumulatively across pages', () => {
    const page1 = mapJikanEpisodesPage({ data: [{ title: 'Ep 1' }, { title: 'Ep 2' }] }, 1, 2);
    const page2 = mapJikanEpisodesPage({ data: [{ title: 'Ep 3' }] }, 2, 2);
    expect(page1).toEqual([
      { temporada: 1, numero: 1, titulo: 'Ep 1', duracion: null, resumen: '' },
      { temporada: 1, numero: 2, titulo: 'Ep 2', duracion: null, resumen: '' },
    ]);
    expect(page2).toEqual([{ temporada: 1, numero: 3, titulo: 'Ep 3', duracion: null, resumen: '' }]);
  });
});

describe('fetchJikanEpisodes', () => {
  it('paginates until has_next_page is false and waits between pages', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: [{ title: 'Ep 1' }], pagination: { has_next_page: true } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: [{ title: 'Ep 2' }], pagination: { has_next_page: false } }),
      });
    const sleepImpl = vi.fn().mockResolvedValue(undefined);

    const episodios = await fetchJikanEpisodes(21, { fetchImpl, sleepImpl, pageSize: 1 });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(episodios).toEqual([
      { temporada: 1, numero: 1, titulo: 'Ep 1', duracion: null, resumen: '' },
      { temporada: 1, numero: 2, titulo: 'Ep 2', duracion: null, resumen: '' },
    ]);
  });

  it('does not sleep when there is only one page', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ data: [{ title: 'Ep 1' }], pagination: { has_next_page: false } }),
    });
    const sleepImpl = vi.fn().mockResolvedValue(undefined);

    await fetchJikanEpisodes(21, { fetchImpl, sleepImpl, pageSize: 100 });

    expect(sleepImpl).not.toHaveBeenCalled();
  });
});

describe('runIngesta (idempotent, integration)', () => {
  applyTestDbEnv();

  let migrate;
  let getPool;
  let closePool;
  let resetDb;
  let repo;

  beforeAll(async () => {
    ({ migrate } = await import('../src/migrate.js'));
    ({ getPool, closePool } = await import('../src/db.js'));
    ({ resetDb } = await import('./helpers/fixtures.js'));
    repo = await import('../src/repo.js');
    await migrate();
  });

  beforeEach(async () => {
    await resetDb(getPool());
    await repo.upsertCanal({ slug: 'cartoon-network', nombre: 'Cartoon Network' });
  });

  afterAll(async () => {
    await closePool();
  });

  const show = {
    id: 1,
    name: 'Courage the Cowardly Dog',
    premiered: '1999-11-12',
    image: { original: 'https://static.tvmaze.com/x.jpg' },
    summary: '<p>Resumen</p>',
    _embedded: { episodes: [{ season: 1, number: 1, name: 'Ep 1', runtime: 22, summary: '<p>Uno</p>' }] },
  };

  function buildFetchImpl() {
    return vi.fn().mockImplementation(async (url) => ({
      json: async () => (String(url).includes('/search/shows') ? [{ show }] : show),
    }));
  }

  const series = [{ nombre: 'Courage the Cowardly Dog', anio: 1999, canal: 'cartoon-network', fuente: 'tvmaze' }];

  it('does not duplicate series or episodes when run twice', async () => {
    const fetchImpl = buildFetchImpl();
    await runIngesta({ series, fetchImpl, sleepImpl: vi.fn().mockResolvedValue(undefined) });
    await runIngesta({ series, fetchImpl, sleepImpl: vi.fn().mockResolvedValue(undefined) });

    const { total, series: rows } = await repo.listSeries({});
    expect(total).toBe(1);
    const episodios = await repo.listEpisodiosBySerie(rows[0].id);
    expect(episodios).toHaveLength(1);
  });

  it('keeps a video filled by hand when ingesting again', async () => {
    const fetchImpl = buildFetchImpl();
    await runIngesta({ series, fetchImpl });
    const { series: rows } = await repo.listSeries({});
    await repo.setEpisodioVideo(rows[0].id, 1, 1, { youtube_id: 'aqz-KE-bpKQ' });

    await runIngesta({ series, fetchImpl });

    const [episodio] = await repo.listEpisodiosBySerie(rows[0].id);
    expect(episodio.youtube_id).toBe('aqz-KE-bpKQ');
    expect(rows[0].poster).toBeNull();
  });
});
