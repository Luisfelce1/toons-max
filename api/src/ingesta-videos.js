import 'dotenv/config';
import * as repo from './repo.js';
import { SERIES, slugSerie, sinopsisConIdioma } from './ingesta.js';

/*
 * Rellena `youtube_id` SOLO con videos subidos por el canal OFICIAL de cada serie
 * (campo `oficial` en SERIES). Nunca toma resubidas de terceros.
 *
 * Requiere YOUTUBE_API_KEY (YouTube Data API v3, gratuita con cuota diaria).
 * Es idempotente y no borra videos puestos a mano.
 */

const YT_API = 'https://www.googleapis.com/youtube/v3';
const MIN_TITULO = 4;

const COMBINING_MARKS_RE = /[̀-ͯ]/g;

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Extrae temporada/episodio de titulos tipo "S01 E05", "S1E5", "Season 1 Episode 5". */
export function extraerSxE(titulo) {
  const t = String(titulo ?? '');
  const m =
    t.match(/\bS(?:eason)?\s*0*(\d{1,2})\s*[|:x\-–]?\s*E(?:p(?:isode)?)?\s*0*(\d{1,3})\b/i) ??
    t.match(/\bseason\s*0*(\d{1,2})\D{1,12}episode\s*0*(\d{1,3})\b/i);
  return m ? { temporada: Number(m[1]), numero: Number(m[2]) } : null;
}

function esEpisodioCompleto(titulo) {
  const t = normalizar(titulo);
  if (/\b(clip|trailer|promo|shorts?|compilation|compilacion|song|cancion|sneak peek)\b/.test(t)) return false;
  return true;
}

/**
 * Empareja videos oficiales con episodios. Prioridad:
 * 1) marcador SxxEyy que exista en la serie, 2) titulo del episodio contenido en el del video.
 * Un video solo se asigna a un episodio y un episodio a un video.
 */
export function emparejarVideos(episodios, videos) {
  const porClave = new Map(episodios.map((e) => [`${e.temporada}x${e.numero}`, e]));
  const asignados = new Map();
  const usados = new Set();

  const candidatos = videos.filter((v) => esEpisodioCompleto(v.titulo));

  for (const v of candidatos) {
    const sxe = extraerSxE(v.titulo);
    const ep = sxe ? porClave.get(`${sxe.temporada}x${sxe.numero}`) : null;
    if (ep && !asignados.has(ep.id) && !usados.has(v.id)) {
      asignados.set(ep.id, v.id);
      usados.add(v.id);
    }
  }

  for (const ep of episodios) {
    if (asignados.has(ep.id)) continue;
    const tituloEp = normalizar(ep.titulo);
    if (tituloEp.length < MIN_TITULO) continue;
    const re = new RegExp(`(^| )${tituloEp.replace(/ /g, ' ')}( |$)`);
    const coincidencias = candidatos.filter((v) => !usados.has(v.id) && re.test(normalizar(v.titulo)));
    // Si el titulo es ambiguo (varios videos distintos), no adivinamos.
    if (coincidencias.length === 1) {
      asignados.set(ep.id, coincidencias[0].id);
      usados.add(coincidencias[0].id);
    }
  }

  return episodios
    .filter((e) => asignados.has(e.id))
    .map((e) => ({ temporada: e.temporada, numero: e.numero, youtube_id: asignados.get(e.id) }));
}

async function getJson(fetchImpl, url) {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`YouTube API ${res.status} en ${url.replace(/key=[^&]+/, 'key=***')}`);
  return res.json();
}

/** Devuelve { channelId, uploads } del canal oficial indicado por handle o username. */
export async function resolverCanalOficial(oficial, { apiKey, fetchImpl }) {
  const param = oficial.channelId
    ? `id=${encodeURIComponent(oficial.channelId)}`
    : oficial.handle
      ? `forHandle=${encodeURIComponent(oficial.handle)}`
      : `forUsername=${encodeURIComponent(oficial.username)}`;
  const json = await getJson(fetchImpl, `${YT_API}/channels?part=contentDetails&${param}&key=${apiKey}`);
  const canal = json.items?.[0];
  if (!canal) return null;
  return { channelId: canal.id, uploads: canal.contentDetails.relatedPlaylists.uploads };
}

/** Lista todos los videos subidos por el canal, verificando que el propietario sea ese canal. */
export async function listarVideosOficiales({ channelId, uploads }, { apiKey, fetchImpl }) {
  const videos = [];
  let pageToken = '';
  do {
    const json = await getJson(
      fetchImpl,
      `${YT_API}/playlistItems?part=snippet&maxResults=50&playlistId=${uploads}${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`,
    );
    for (const item of json.items ?? []) {
      const sn = item.snippet ?? {};
      const owner = sn.videoOwnerChannelId ?? sn.channelId;
      if (owner === channelId && sn.resourceId?.videoId) {
        videos.push({ id: sn.resourceId.videoId, titulo: sn.title, publicado: sn.publishedAt ?? '' });
      }
    }
    pageToken = json.nextPageToken ?? '';
  } while (pageToken);
  return videos;
}

/** "PT1H2M3S" -> 3723 segundos. */
export function duracionISO(iso) {
  const m = String(iso ?? '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, d, h, min, seg] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + seg;
}

/** Añade la duracion (segundos) a cada video, en lotes de 50 (limite de la API). */
export async function añadirDuraciones(videos, { apiKey, fetchImpl }) {
  const duraciones = new Map();
  for (let i = 0; i < videos.length; i += 50) {
    const ids = videos.slice(i, i + 50).map((v) => v.id).join(',');
    const json = await getJson(fetchImpl, `${YT_API}/videos?part=contentDetails&id=${ids}&key=${apiKey}`);
    for (const item of json.items ?? []) {
      duraciones.set(item.id, duracionISO(item.contentDetails?.duration));
    }
  }
  return videos.map((v) => ({ ...v, segundos: duraciones.get(v.id) ?? 0 }));
}

/**
 * Serie que sale entera de un canal oficial: se queda con los episodios completos
 * (duracion entre minSeg y maxSeg, sin recopilaciones ni clips), opcionalmente filtrados
 * por `filtro` en el titulo, y los numera por orden de publicacion.
 */
export function seleccionarEpisodiosCanal(videos, { filtro, minSeg = 240, maxSeg = 1800 } = {}) {
  const reFiltro = filtro ? new RegExp(filtro.split('|').map(normalizar).join('|')) : null;
  return videos
    .filter((v) => esEpisodioCompleto(v.titulo) && !/\b(recopilacion|mix|minutos|horas|hours|marathon|maraton|directo|live|en vivo)\b/.test(normalizar(v.titulo)))
    .filter((v) => v.segundos >= minSeg && v.segundos <= maxSeg)
    .filter((v) => !reFiltro || reFiltro.test(normalizar(v.titulo)))
    .sort((a, b) => String(a.publicado).localeCompare(String(b.publicado)))
    .map((v, i) => ({
      temporada: 1,
      numero: i + 1,
      titulo: v.titulo,
      duracion: Math.max(1, Math.round(v.segundos / 60)),
      youtube_id: v.id,
    }));
}

async function ingestaSerieYoutube(item, canal, { apiKey, fetchImpl }) {
  const canalApp = await repo.getCanalBySlug(item.canal);
  if (!canalApp) {
    console.warn(`Canal de la app "${item.canal}" no existe; ejecuta antes npm run ingesta.`);
    return null;
  }
  const videos = await añadirDuraciones(await listarVideosOficiales(canal, { apiKey, fetchImpl }), { apiKey, fetchImpl });
  const episodios = seleccionarEpisodiosCanal(videos, item);
  const serieId = await repo.upsertSerie({
    slug: slugSerie(item),
    titulo: item.titulo ?? item.nombre,
    anio: item.anio ?? null,
    sinopsis: sinopsisConIdioma(item, 'Episodios completos del canal oficial en YouTube.'),
    poster: null,
    tipo: 'tv',
    fuente: 'youtube',
    canal_id: canalApp.id,
  });
  for (const ep of episodios) {
    await repo.upsertEpisodio({ ...ep, resumen: null, serie_id: serieId });
  }
  return { serie: item.nombre, episodios: episodios.length, conVideo: episodios.length };
}

export async function runIngestaVideos({ series = SERIES, apiKey = process.env.YOUTUBE_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) {
    throw new Error('Falta YOUTUBE_API_KEY (YouTube Data API v3) en api/.env');
  }
  const resumen = [];
  for (const item of series.filter((s) => s.oficial)) {
    const canal = await resolverCanalOficial(item.oficial, { apiKey, fetchImpl });
    if (!canal) {
      console.warn(`Canal oficial no encontrado para "${item.nombre}", se omite.`);
      continue;
    }
    if (item.fuente === 'youtube') {
      const fila = await ingestaSerieYoutube(item, canal, { apiKey, fetchImpl });
      if (fila) resumen.push(fila);
      continue;
    }
    const serie = await repo.getSerieBySlug(slugSerie(item));
    if (!serie) {
      console.warn(`"${item.nombre}" no esta en la base; ejecuta antes npm run ingesta.`);
      continue;
    }
    const episodios = await repo.listEpisodiosBySerie(serie.id);
    const videos = await listarVideosOficiales(canal, { apiKey, fetchImpl });
    const pares = emparejarVideos(episodios, videos);
    for (const par of pares) {
      await repo.setEpisodioVideo(serie.id, par.temporada, par.numero, { youtube_id: par.youtube_id });
    }
    resumen.push({ serie: item.nombre, episodios: episodios.length, conVideo: pares.length });
  }
  return resumen;
}

const isMain = process.argv[1] && process.argv[1].endsWith('ingesta-videos.js');
if (isMain) {
  runIngestaVideos()
    .then((resumen) => {
      console.table(resumen);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error durante la ingesta de videos:', error.message);
      process.exit(1);
    });
}
