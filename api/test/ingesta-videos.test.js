import { describe, it, expect, vi } from 'vitest';
import {
  normalizar,
  extraerSxE,
  emparejarVideos,
  resolverCanalOficial,
  listarVideosOficiales,
  runIngestaVideos,
  duracionISO,
  seleccionarEpisodiosCanal,
  repartirPorSerie,
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

describe('duracionISO', () => {
  it.each([
    ['PT7M', 420],
    ['PT1H2M3S', 3723],
    ['PT45S', 45],
    ['P0D', 0],
    ['basura', 0],
  ])('%s -> %i', (iso, seg) => {
    expect(duracionISO(iso)).toBe(seg);
  });
});

describe('seleccionarEpisodiosCanal', () => {
  const v = (id, titulo, segundos, publicado) => ({ id, titulo, segundos, publicado });
  const videos = [
    v('bbbbbbbbbbb', 'Érase una vez... el hombre - Capítulo 2', 1500, '2019-02-01'),
    v('aaaaaaaaaaa', 'Érase una vez... el hombre - Capítulo 1', 1500, '2019-01-01'),
    v('ccccccccccc', 'Érase una vez... la vida - Capítulo 1', 1500, '2019-01-05'),
    v('ddddddddddd', 'Érase una vez... el hombre | Recopilación 2 horas', 7200, '2019-03-01'),
    v('eeeeeeeeeee', 'Érase una vez... el hombre (trailer)', 60, '2019-03-02'),
  ];

  it('filtra por titulo, duracion y recopilaciones, y numera por fecha', () => {
    const eps = seleccionarEpisodiosCanal(videos, { filtro: 'el hombre', minSeg: 900, maxSeg: 2400 });
    expect(eps.map((e) => [e.numero, e.youtube_id])).toEqual([
      [1, 'aaaaaaaaaaa'],
      [2, 'bbbbbbbbbbb'],
    ]);
    expect(eps[0]).toMatchObject({ temporada: 1, duracion: 25 });
  });

  it('acepta varios terminos en el filtro', () => {
    const eps = seleccionarEpisodiosCanal(videos, { filtro: 'la vida|cuerpo humano', minSeg: 900, maxSeg: 2400 });
    expect(eps.map((e) => e.youtube_id)).toEqual(['ccccccccccc']);
  });
});

describe('resolverCanalOficial por channelId', () => {
  it('usa el parametro id=', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonRes({ items: [{ id: 'UCX', contentDetails: { relatedPlaylists: { uploads: 'UUX' } } }] }),
    );
    await resolverCanalOficial({ channelId: 'UCX' }, { apiKey: 'k', fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toContain('id=UCX');
  });
});

describe('repartirPorSerie', () => {
  const v = (id, titulo) => ({ id, titulo, segundos: 600, publicado: id });
  const subseries = [
    { nombre: 'Franklin', patron: 'franklin' },
    { nombre: 'Pequeno Oso', patron: 'pequeno oso|little bear' },
    { nombre: 'Max y Ruby', patron: 'max y ruby' },
  ];

  it('agrupa los videos de un canal mixto en su serie', () => {
    const videos = [
      v('a', 'Franklin y el día de campo | Episodio completo'),
      v('b', 'Pequeño Oso - La luna | Treehouse'),
      v('c', 'FRANKLIN: Franklin va a la escuela'),
      v('d', 'Max y Ruby: El pastel'),
      v('e', 'Little Bear - Full Episode'),
      v('f', 'Compilación de canciones'),
    ];
    const { porSerie, sinClasificar } = repartirPorSerie(videos, subseries);
    expect(porSerie.get('Franklin').map((x) => x.id)).toEqual(['a', 'c']);
    expect(porSerie.get('Pequeno Oso').map((x) => x.id)).toEqual(['b', 'e']);
    expect(porSerie.get('Max y Ruby').map((x) => x.id)).toEqual(['d']);
    expect(sinClasificar.map((x) => x.id)).toEqual(['f']);
  });

  it('no confunde palabras parciales', () => {
    const { porSerie } = repartirPorSerie([v('a', 'Frankliniano especial')], subseries);
    expect(porSerie.get('Franklin')).toEqual([]);
  });

  it('la primera regla gana y * recoge el resto', () => {
    const subs = [
      { nombre: 'Despegar', patron: 'vuelve a despegar' },
      { nombre: 'Clasico', patron: '*' },
    ];
    const { porSerie, sinClasificar } = repartirPorSerie(
      [v('a', 'El autobús mágico vuelve a despegar: Capítulo 1'), v('b', 'El autobús mágico: Sistema solar')],
      subs,
    );
    expect(porSerie.get('Despegar').map((x) => x.id)).toEqual(['a']);
    expect(porSerie.get('Clasico').map((x) => x.id)).toEqual(['b']);
    expect(sinClasificar).toEqual([]);
  });
});

describe('canal multiserie de punta a punta (API simulada)', () => {
  it('solo reparte videos subidos por el propio canal oficial', async () => {
    const respuestas = {
      channels: { items: [{ id: 'UCT', contentDetails: { relatedPlaylists: { uploads: 'UUT' } } }] },
      playlistItems: {
        items: [
          { snippet: { title: 'Franklin y el día de campo', videoOwnerChannelId: 'UCT', resourceId: { videoId: 'aaaaaaaaaaa' }, publishedAt: '2020-01-01' } },
          { snippet: { title: 'Pequeño Oso - La luna', videoOwnerChannelId: 'UCT', resourceId: { videoId: 'bbbbbbbbbbb' }, publishedAt: '2020-01-02' } },
          { snippet: { title: 'Franklin: resubido', videoOwnerChannelId: 'UCOTRO', resourceId: { videoId: 'ccccccccccc' }, publishedAt: '2020-01-03' } },
        ],
      },
      videos: {
        items: [
          { id: 'aaaaaaaaaaa', contentDetails: { duration: 'PT11M' } },
          { id: 'bbbbbbbbbbb', contentDetails: { duration: 'PT12M' } },
        ],
      },
    };
    const fetchImpl = vi.fn().mockImplementation(async (url) => {
      const clave = Object.keys(respuestas).find((k) => String(url).includes(`/${k}?`));
      return jsonRes(respuestas[clave]);
    });
    const canal = await resolverCanalOficial({ handle: '@x' }, { apiKey: 'k', fetchImpl });
    const videos = await listarVideosOficiales(canal, { apiKey: 'k', fetchImpl });
    const { porSerie } = repartirPorSerie(videos, [
      { nombre: 'Franklin', patron: 'franklin' },
      { nombre: 'Oso', patron: 'pequeno oso' },
    ]);
    // El video resubido por otro canal no entra.
    expect(porSerie.get('Franklin').map((x) => x.id)).toEqual(['aaaaaaaaaaa']);
    expect(porSerie.get('Oso').map((x) => x.id)).toEqual(['bbbbbbbbbbb']);
  });
});
