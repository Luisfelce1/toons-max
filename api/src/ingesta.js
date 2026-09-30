import 'dotenv/config';
import { stripHtml, slugify } from './utils.js';
import * as repo from './repo.js';

const TVMAZE_API = 'https://api.tvmaze.com';
const JIKAN_SEARCH_URL = 'https://api.jikan.moe/v4/anime';
const JIKAN_EPISODES_PAGE_SIZE = 100;
const JIKAN_WAIT_MS = 1000;

/**
 * Catalogo a ingerir. Solo metadata (titulos, temporadas, episodios); nunca pósters
 * externos: las portadas se generan en el frontend (ver web/src/app/shared/portada.ts).
 *
 * - `tvmazeId`: id exacto en TVMaze (evita que la busqueda por nombre elija otra serie).
 * - `anio`: si no hay id, se busca por nombre y se exige que el estreno coincida con este año.
 * - `temporadas`: limita las temporadas a ingerir (p. ej. solo Mighty Morphin de Power Rangers).
 * - `oficial`: canal OFICIAL de YouTube del que `ingesta-videos` puede tomar episodios completos.
 */
export const SERIES = [
  // Cartoon Network
  { nombre: 'Courage the Cowardly Dog', anio: 1999, canal: 'cartoon-network', fuente: 'tvmaze' },
  { nombre: 'The Powerpuff Girls', anio: 1998, canal: 'cartoon-network', fuente: 'tvmaze' },
  { nombre: "Dexter's Laboratory", anio: 1996, canal: 'cartoon-network', fuente: 'tvmaze' },
  { nombre: 'Johnny Bravo', anio: 1997, canal: 'cartoon-network', fuente: 'tvmaze' },
  { nombre: 'Ed, Edd n Eddy', anio: 1999, canal: 'cartoon-network', fuente: 'tvmaze' },
  // Nickelodeon
  { nombre: 'Hey Arnold!', anio: 1996, canal: 'nickelodeon', fuente: 'tvmaze' },
  { nombre: 'Rocket Power', tvmazeId: 6323, canal: 'nickelodeon', fuente: 'tvmaze' },
  { nombre: 'Rugrats', anio: 1991, canal: 'nickelodeon', fuente: 'tvmaze' },
  { nombre: 'Doug', anio: 1991, canal: 'nickelodeon', fuente: 'tvmaze' },
  { nombre: 'CatDog', anio: 1998, canal: 'nickelodeon', fuente: 'tvmaze' },
  { nombre: 'The Wild Thornberrys', anio: 1998, canal: 'nickelodeon', fuente: 'tvmaze' },
  // Fox Kids
  {
    nombre: 'Mighty Morphin Power Rangers', tvmazeId: 794, temporadas: [1, 2, 3],
    titulo: 'Mighty Morphin Power Rangers',
    canal: 'fox-kids', fuente: 'tvmaze', oficial: { handle: '@PowerRangersOfficial' },
  },
  { nombre: "Bobby's World", tvmazeId: 16657, canal: 'fox-kids', fuente: 'tvmaze' },
  // Disney
  { nombre: 'Recess', tvmazeId: 5935, canal: 'disney', fuente: 'tvmaze' },
  { nombre: 'Bear in the Big Blue House', tvmazeId: 8913, canal: 'disney', fuente: 'tvmaze' },
  { nombre: 'Timon & Pumbaa', anio: 1995, canal: 'disney', fuente: 'tvmaze' },
  { nombre: 'Gargoyles', anio: 1994, canal: 'disney', fuente: 'tvmaze' },
  { nombre: 'DuckTales', anio: 1987, canal: 'disney', fuente: 'tvmaze' },
  // Warner
  { nombre: 'Animaniacs', anio: 1993, canal: 'warner-channel', fuente: 'tvmaze' },
  { nombre: 'Pinky and the Brain', anio: 1995, canal: 'warner-channel', fuente: 'tvmaze' },
  { nombre: 'Tiny Toon Adventures', anio: 1990, canal: 'warner-channel', fuente: 'tvmaze' },
  // Marvel
  { nombre: 'X-Men', anio: 1992, canal: 'marvel', fuente: 'tvmaze' },
  { nombre: 'Spider-Man', anio: 1994, canal: 'marvel', fuente: 'tvmaze' },
  // Otros
  {
    nombre: 'Franklin', tvmazeId: 17755, canal: 'otros', fuente: 'tvmaze',
    oficial: { username: 'officialfranklin' },
  },
  {
    nombre: 'The Magic School Bus', tvmazeId: 18504, canal: 'otros', fuente: 'tvmaze',
    oficial: { handle: '@TheMagicSchoolBusOfficial' },
  },
  { nombre: 'Arthur', anio: 1996, canal: 'otros', fuente: 'tvmaze' },
  { nombre: 'Garfield and Friends', anio: 1988, canal: 'otros', fuente: 'tvmaze' },
  { nombre: 'Captain Planet and the Planeteers', anio: 1990, canal: 'otros', fuente: 'tvmaze' },
  { nombre: 'Saint Seiya', canal: 'otros', fuente: 'jikan' },
  { nombre: 'Dragon Ball', canal: 'otros', fuente: 'jikan' },
];

function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function mapTvMazeShow(show) {
  const year = show.premiered ? Number(String(show.premiered).slice(0, 4)) : null;
  return {
    titulo: show.name,
    anio: Number.isNaN(year) ? null : year,
    sinopsis: stripHtml(show.summary),
    // Sin pósters externos (copyright): el frontend genera una portada original.
    poster: null,
    tipo: 'tv',
    fuente: 'tvmaze',
  };
}

export function mapTvMazeEpisodes(show, temporadas = null) {
  const episodes = (show._embedded?.episodes ?? []).filter(
    (ep) => ep.number != null && (!temporadas || temporadas.includes(ep.season)),
  );
  return episodes.map((ep) => ({
    temporada: ep.season,
    numero: ep.number,
    titulo: ep.name,
    duracion: ep.runtime ?? null,
    resumen: stripHtml(ep.summary),
  }));
}

export function mapJikanAnime(anime) {
  const anio = anime.year ?? anime.aired?.prop?.from?.year ?? null;
  return {
    titulo: anime.title,
    anio,
    sinopsis: stripHtml(anime.synopsis),
    poster: null,
    tipo: 'anime',
    fuente: 'jikan',
    fuente_id: anime.mal_id,
  };
}

export function mapJikanEpisodesPage(page, pageNumber, pageSize = JIKAN_EPISODES_PAGE_SIZE) {
  const data = page.data ?? [];
  const startIndex = (pageNumber - 1) * pageSize;
  return data.map((ep, i) => ({
    temporada: 1,
    numero: startIndex + i + 1,
    titulo: ep.title,
    duracion: null,
    resumen: '',
  }));
}

export async function fetchJikanEpisodes(malId, { fetchImpl = fetch, sleepImpl = defaultSleep, pageSize = JIKAN_EPISODES_PAGE_SIZE } = {}) {
  const episodios = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await fetchImpl(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`);
    const json = await res.json();
    episodios.push(...mapJikanEpisodesPage(json, page, pageSize));
    hasNextPage = Boolean(json.pagination?.has_next_page);
    if (hasNextPage) {
      await sleepImpl(JIKAN_WAIT_MS);
      page += 1;
    }
  }

  return episodios;
}

/** Slug estable de una serie del catalogo. */
export function slugSerie(item) {
  return slugify(item.nombre);
}

/** Elige, entre los resultados de /search/shows, la serie cuyo estreno coincide con `anio`. */
export function elegirShowPorAnio(resultados, anio) {
  const shows = (resultados ?? []).map((r) => r.show).filter(Boolean);
  if (!anio) return shows[0] ?? null;
  return shows.find((show) => Number(String(show.premiered ?? '').slice(0, 4)) === anio) ?? null;
}

export async function resolverTvMazeId(item, { fetchImpl }) {
  if (item.tvmazeId) return item.tvmazeId;
  const res = await fetchImpl(`${TVMAZE_API}/search/shows?q=${encodeURIComponent(item.nombre)}`);
  const show = elegirShowPorAnio(await res.json(), item.anio);
  return show?.id ?? null;
}

async function ingestTvMaze(item, canalId, { fetchImpl }) {
  const id = await resolverTvMazeId(item, { fetchImpl });
  if (!id) {
    console.warn(`TVMaze: no encontre "${item.nombre}" (${item.anio ?? 'sin año'}), se omite.`);
    return null;
  }
  const res = await fetchImpl(`${TVMAZE_API}/shows/${id}?embed=episodes`);
  const show = await res.json();
  const mapped = mapTvMazeShow(show);
  const serieId = await repo.upsertSerie({
    ...mapped,
    titulo: item.titulo ?? mapped.titulo,
    fuente_id: show.id ?? id,
    // El slug sale de nuestro catalogo (no de TVMaze) para que ingesta-videos lo encuentre.
    slug: slugSerie(item),
    canal_id: canalId,
  });
  for (const episodio of mapTvMazeEpisodes(show, item.temporadas ?? null)) {
    await repo.upsertEpisodio({ ...episodio, serie_id: serieId });
  }
  return serieId;
}

async function ingestJikan(item, canalId, { fetchImpl, sleepImpl }) {
  const res = await fetchImpl(`${JIKAN_SEARCH_URL}?q=${encodeURIComponent(item.nombre)}&limit=1&order_by=members&sort=desc`);
  const json = await res.json();
  const anime = json.data?.[0];
  if (!anime) return null;

  const serieId = await repo.upsertSerie({ ...mapJikanAnime(anime), slug: slugify(anime.title), canal_id: canalId });
  const episodios = await fetchJikanEpisodes(anime.mal_id, { fetchImpl, sleepImpl });
  for (const episodio of episodios) {
    await repo.upsertEpisodio({ ...episodio, serie_id: serieId });
  }
  return serieId;
}

export async function runIngesta({ series = SERIES, fetchImpl = fetch, sleepImpl = defaultSleep } = {}) {
  for (const item of series) {
    const canal = await repo.getCanalBySlug(item.canal);
    if (!canal) {
      console.warn(`Canal desconocido "${item.canal}" para "${item.nombre}", se omite.`);
      continue;
    }

    if (item.fuente === 'tvmaze') {
      await ingestTvMaze(item, canal.id, { fetchImpl });
    } else if (item.fuente === 'jikan') {
      await ingestJikan(item, canal.id, { fetchImpl, sleepImpl });
    }
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('ingesta.js');
if (isMain) {
  runIngesta()
    .then(() => {
      console.log('Ingesta completada.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error durante la ingesta:', error);
      process.exit(1);
    });
}
