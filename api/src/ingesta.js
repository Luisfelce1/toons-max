import 'dotenv/config';
import { stripHtml, slugify } from './utils.js';
import * as repo from './repo.js';

const TVMAZE_URL = 'https://api.tvmaze.com/singlesearch/shows';
const JIKAN_SEARCH_URL = 'https://api.jikan.moe/v4/anime';
const JIKAN_EPISODES_PAGE_SIZE = 100;
const JIKAN_WAIT_MS = 1000;

export const SERIES = [
  { nombre: 'Courage the Cowardly Dog', canal: 'cartoon-network', fuente: 'tvmaze' },
  { nombre: 'The Powerpuff Girls', canal: 'cartoon-network', fuente: 'tvmaze' },
  { nombre: 'Hey Arnold!', canal: 'nickelodeon', fuente: 'tvmaze' },
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
    poster: show.image?.original ?? null,
    tipo: 'tv',
    fuente: 'tvmaze',
  };
}

export function mapTvMazeEpisodes(show) {
  const episodes = show._embedded?.episodes ?? [];
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
    poster: anime.images?.jpg?.image_url ?? null,
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

async function ingestTvMaze(item, canalId, { fetchImpl }) {
  const res = await fetchImpl(`${TVMAZE_URL}?q=${encodeURIComponent(item.nombre)}&embed=episodes`);
  const show = await res.json();
  const serieId = await repo.upsertSerie({ ...mapTvMazeShow(show), slug: slugify(show.name), canal_id: canalId });
  for (const episodio of mapTvMazeEpisodes(show)) {
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
