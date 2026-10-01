import 'dotenv/config';
import { stripHtml, slugify } from './utils.js';
import * as repo from './repo.js';
import { CANALES } from './canales.js';
import { resolverVideoArchive } from './archive.js';

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
 *
 * Fuentes:
 * - `tvmaze` / `jikan`: metadata; el video llega despues con `ingesta:videos`.
 * - `youtube`: la serie entera sale de un canal OFICIAL en español (la gestiona `ingesta:videos`).
 * - `youtube-multi`: canal OFICIAL con varias series; `series[].patron` reparte los videos
 *   por titulo (palabras separadas por |, '*' = el resto del canal).
 * - `archive`: cortos en DOMINIO PUBLICO en EE. UU. (Internet Archive), version original.
 *   Solo titulos que Wikipedia marca como dominio publico; nunca doblajes (tienen sus propios derechos).
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
  // En español: series completas desde canales OFICIALES gratuitos (npm run ingesta:videos)
  {
    nombre: 'Pocoyo', titulo: 'Pocoyó', anio: 2005, canal: 'en-espanol', fuente: 'youtube', idioma: 'Español (España)',
    oficial: { handle: '@pocoyocapitulosenespanol' }, minSeg: 240, maxSeg: 1800,
  },
  {
    nombre: 'La abeja Maya', titulo: 'La abeja Maya (clásica)', anio: 1975, canal: 'en-espanol', fuente: 'youtube',
    idioma: 'Español', oficial: { username: 'AbejaMayaOficial' }, minSeg: 600, maxSeg: 1800,
  },
  {
    nombre: 'Erase una vez el hombre', titulo: 'Érase una vez... el hombre', anio: 1978, canal: 'en-espanol',
    fuente: 'youtube', idioma: 'Español', oficial: { handle: '@eraseunavezchannel' }, filtro: 'el hombre',
    minSeg: 900, maxSeg: 2400,
  },
  {
    nombre: 'Erase una vez la vida', titulo: 'Érase una vez... la vida', anio: 1987, canal: 'en-espanol',
    fuente: 'youtube', idioma: 'Español', oficial: { handle: '@eraseunavezchannel' }, filtro: 'la vida|cuerpo humano',
    minSeg: 900, maxSeg: 2400,
  },
  {
    nombre: 'Pingu', titulo: 'Pingu', anio: 1990, canal: 'en-espanol', fuente: 'youtube', idioma: 'Sin diálogos',
    oficial: { handle: '@Pingu' }, minSeg: 240, maxSeg: 900,
  },
  {
    nombre: 'La Pantera Rosa', titulo: 'La Pantera Rosa', anio: 1969, canal: 'en-espanol', fuente: 'youtube',
    idioma: 'Español latino / sin diálogos', oficial: { channelId: 'UCM99Js1M2trMUwllNf7Ep7A' }, minSeg: 300, maxSeg: 1500,
  },
  // En español, de los 90 a 2007: canales OFICIALES de sus productoras (nombre del canal
  // "Canal Oficial", "OFICIAL" o de la productora: WildBrain, Xilam...).
  {
    nombre: 'Peppa Pig', anio: 2004, canal: 'en-espanol', fuente: 'youtube', idioma: 'Español',
    oficial: { channelId: 'UCBErs5AlvBpzKfVRNj9ogAQ' }, minSeg: 240, maxSeg: 900,
  },
  {
    nombre: 'Caillou Espana', titulo: 'Caillou (España)', anio: 1997, canal: 'en-espanol', fuente: 'youtube',
    idioma: 'Español (España)', oficial: { handle: '@CaillouEspanolCastellano' }, minSeg: 240, maxSeg: 1800,
  },
  {
    nombre: 'Caillou Latino', titulo: 'Caillou (Latino)', anio: 1997, canal: 'en-espanol', fuente: 'youtube',
    idioma: 'Español latino', oficial: { channelId: 'UCCzR0RTeFKJr-kcwADUlSnw' }, minSeg: 240, maxSeg: 1800,
  },
  {
    nombre: 'Totally Spies Espana', titulo: 'Totally Spies! (España)', anio: 2001, canal: 'en-espanol',
    fuente: 'youtube', idioma: 'Español (España)', oficial: { channelId: 'UCCvPFhfn1abfSFCl-WjgaBQ' },
    minSeg: 900, maxSeg: 1800,
  },
  {
    nombre: 'Totally Spies Latino', titulo: 'Tres espías sin límite (Latino)', anio: 2001, canal: 'en-espanol',
    fuente: 'youtube', idioma: 'Español latino', oficial: { channelId: 'UCPKJ7VUetpOmRVT7J6Cx87Q' },
    minSeg: 900, maxSeg: 1800,
  },
  {
    nombre: 'Codigo Lyoko', titulo: 'Código Lyoko', anio: 2003, canal: 'en-espanol', fuente: 'youtube',
    idioma: 'Español (España)', oficial: { handle: '@CodeLyokoESP' }, minSeg: 900, maxSeg: 1800,
  },
  {
    nombre: 'Oggy y las cucarachas', anio: 1998, canal: 'en-espanol', fuente: 'youtube', idioma: 'Sin diálogos',
    oficial: { channelId: 'UCcK5THtxSZXBYxahuzRnX_w' }, minSeg: 300, maxSeg: 1500,
  },
  {
    nombre: 'Barbapapa', titulo: 'Barbapapá', anio: 1974, canal: 'en-espanol', fuente: 'youtube', idioma: 'Español',
    oficial: { handle: '@Barbapapa-CanalOficial' }, minSeg: 240, maxSeg: 900,
  },
  // Canales oficiales con VARIAS series (fuente 'youtube-multi'): cada video se asigna a la
  // serie cuyo `patron` (palabras separadas por |) aparece en su titulo.
  {
    nombre: 'Treehouse Direct Latam', canal: 'en-espanol', fuente: 'youtube-multi', idioma: 'Español latino',
    oficial: { handle: '@treehousedirectlatam' }, minSeg: 240, maxSeg: 1800,
    series: [
      { nombre: 'Franklin Latino', titulo: 'Franklin (Latino)', anio: 1997, patron: 'franklin' },
      { nombre: 'Pequeno Oso', titulo: 'Pequeño Oso', anio: 1995, patron: 'pequeno oso|osito|little bear' },
      { nombre: 'Max y Ruby', titulo: 'Max y Ruby', anio: 2002, patron: 'max y ruby|max and ruby|max ruby' },
      { nombre: 'Babar', titulo: 'Babar', anio: 1989, patron: 'babar' },
      { nombre: 'Caillou Treehouse', titulo: 'Caillou (Treehouse)', anio: 1997, patron: 'caillou' },
      { nombre: 'Rolie Polie Olie', titulo: 'Rolie Polie Olie', anio: 1998, patron: 'rolie polie|olie' },
      { nombre: 'Miss Spider', titulo: 'La señorita Araña', anio: 2004, patron: 'miss spider|senorita arana|arana' },
      { nombre: 'Corduroy', titulo: 'Corduroy', anio: 2000, patron: 'corduroy|pana' },
    ],
  },
  {
    nombre: 'Power Rangers Ninos', canal: 'en-espanol', fuente: 'youtube-multi', idioma: 'Español',
    oficial: { handle: '@powerrangersninosoficial' }, minSeg: 900, maxSeg: 1800,
    series: [
      { nombre: 'Power Rangers Mighty Morphin ES', titulo: 'Power Rangers: Mighty Morphin', anio: 1993, patron: 'mighty morphin|mmpr' },
      { nombre: 'Power Rangers Zeo ES', titulo: 'Power Rangers Zeo', anio: 1996, patron: 'zeo' },
      { nombre: 'Power Rangers Turbo ES', titulo: 'Power Rangers Turbo', anio: 1997, patron: 'turbo' },
      { nombre: 'Power Rangers en el Espacio', titulo: 'Power Rangers en el Espacio', anio: 1998, patron: 'en el espacio|in space' },
      { nombre: 'Power Rangers Galaxia Perdida', titulo: 'Power Rangers: Galaxia Perdida', anio: 1999, patron: 'galaxia perdida|lost galaxy' },
      { nombre: 'Power Rangers Lightspeed Rescue', titulo: 'Power Rangers: Lightspeed Rescue', anio: 2000, patron: 'lightspeed|rescate' },
      { nombre: 'Power Rangers Fuerza del Tiempo', titulo: 'Power Rangers: Fuerza del Tiempo', anio: 2001, patron: 'fuerza del tiempo|time force' },
      { nombre: 'Power Rangers Fuerza Salvaje', titulo: 'Power Rangers: Fuerza Salvaje', anio: 2002, patron: 'fuerza salvaje|wild force' },
      { nombre: 'Power Rangers Tormenta Ninja', titulo: 'Power Rangers: Tormenta Ninja', anio: 2003, patron: 'tormenta ninja|ninja storm' },
      { nombre: 'Power Rangers Dino Trueno', titulo: 'Power Rangers: Dino Trueno', anio: 2004, patron: 'dino trueno|dino thunder' },
      { nombre: 'Power Rangers SPD', titulo: 'Power Rangers: S.P.D.', anio: 2005, patron: 'spd|s p d' },
      { nombre: 'Power Rangers Fuerza Mistica', titulo: 'Power Rangers: Fuerza Mística', anio: 2006, patron: 'fuerza mistica|mystic force' },
      { nombre: 'Power Rangers Operacion Sobrecarga', titulo: 'Power Rangers: Operación Sobrecarga', anio: 2007, patron: 'operacion sobrecarga|operation overdrive' },
      { nombre: 'Power Rangers Dino Charge', titulo: 'Power Rangers: Dino Charge', anio: 2015, patron: 'dino charge|dino super charge' },
      { nombre: 'Power Rangers Otras', titulo: 'Power Rangers (otras temporadas)', anio: null, patron: 'power rangers' },
    ],
  },
  {
    nombre: 'El Autobus Magico ES', canal: 'en-espanol', fuente: 'youtube-multi', idioma: 'Español latino',
    oficial: { handle: '@elautobusmagicoenespanol' }, minSeg: 600, maxSeg: 1800,
    series: [
      {
        nombre: 'El Autobus Magico Vuelve a Despegar', titulo: 'El autobús mágico vuelve a despegar', anio: 2017,
        patron: 'vuelve a despegar|rides again',
      },
      // Sin patron especifico: todo lo demas del canal es la serie clasica.
      { nombre: 'El Autobus Magico Clasico', titulo: 'El autobús mágico', anio: 1994, patron: '*' },
    ],
  },
  // Clasicos: cortos en dominio publico en EE. UU. (1950+), version original, Internet Archive
  {
    nombre: 'Popeye clasicos', titulo: 'Popeye el marino (clásicos 1952-1957)', anio: 1952, canal: 'clasicos',
    fuente: 'archive', idioma: 'Inglés (original)',
    sinopsis: 'Cortos de Famous Studios en dominio publico en EE. UU. (copyright no renovado).',
    episodios: [
      ['Shuteye Popeye', 1952, 'popeye_shuteye_popeye'],
      ['Big Bad Sindbad', 1952, 'popeye_big_bad_sinbad'],
      ['Ancient Fistory', 1953, 'popeye_the_sailor_ancient_fantasy'],
      ['Floor Flusher', 1954, 'Popeye_Floor_Flusher_1954'],
      ['Taxi-Turvy', 1954, 'popeye_taxi-turvey'],
      ['Bride and Gloom', 1954, 'Popeye_BrideandGloom'],
      ['Greek Mirthology', 1954, 'Popeye_Greek_Mirthology_1954'],
      ['Fright to the Finish', 1954, 'popeye_fright_to_the_finish'],
      ['Private Eye Popeye', 1954, 'popeye_private_eye_popeye'],
      ['Gopher Spinach', 1954, 'Popeye_Gopher_Spinach_1954'],
      ["Cookin' with Gags", 1955, 'Popeye_Cooking_With_Gags_1954'],
      ['Insect to Injury', 1956, 'insect_to_injury'],
      ['Spree Lunch', 1957, 'spree_lunch'],
    ],
  },
  {
    nombre: 'Casper clasicos', titulo: 'Casper (clásicos)', anio: 1954, canal: 'clasicos', fuente: 'archive',
    idioma: 'Inglés (original)',
    sinopsis: 'Cortos de Famous Studios en dominio publico en EE. UU. (copyright no renovado).',
    episodios: [
      ['Boo Moon', 1954, 'casper-the-friendly-ghost-boo-moon-1953'],
      ['Spooking About Africa', 1957, 'spooking-about-africa-1957'],
    ],
  },
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

/** Texto de sinopsis con el idioma, que la app muestra en la ficha de la serie. */
export function sinopsisConIdioma(item, sinopsis = item.sinopsis ?? '') {
  return item.idioma ? `${sinopsis}${sinopsis ? ' ' : ''}Idioma: ${item.idioma}.`.trim() : sinopsis;
}

export async function ingestArchive(item, canalId, { fetchImpl }) {
  const serieId = await repo.upsertSerie({
    slug: slugSerie(item),
    titulo: item.titulo ?? item.nombre,
    anio: item.anio ?? null,
    sinopsis: sinopsisConIdioma(item),
    poster: null,
    tipo: 'corto',
    fuente: 'archive',
    canal_id: canalId,
  });
  let numero = 0;
  for (const [titulo, anio, identifier] of item.episodios) {
    numero += 1;
    const video = await resolverVideoArchive(identifier, { fetchImpl });
    if (!video) console.warn(`Archive: "${identifier}" sin MP4, queda sin video.`);
    await repo.upsertEpisodio({
      serie_id: serieId,
      temporada: 1,
      numero,
      titulo: `${titulo} (${anio})`,
      duracion: video?.duracion ?? null,
      resumen: `Corto original de ${anio} en dominio publico. Fuente: archive.org/details/${identifier}`,
      video_url: video?.video_url ?? null,
    });
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
  for (const canal of CANALES) {
    await repo.upsertCanal(canal);
  }
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
    } else if (item.fuente === 'archive') {
      await ingestArchive(item, canal.id, { fetchImpl });
    }
    // `youtube`: lo gestiona ingesta-videos.js (necesita YOUTUBE_API_KEY).
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
