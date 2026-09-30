import { getPool } from './db.js';
import { isValidVideoUrl, isValidYoutubeId } from './utils.js';

const MAX_LIMIT = 200;

/** Un episodio se puede ver si tiene video de YouTube oficial o un MP4 (dominio publico). */
const EPISODIO_CON_VIDEO = '(e.youtube_id IS NOT NULL OR e.video_url IS NOT NULL)';
const SERIE_CON_VIDEO = `EXISTS (SELECT 1 FROM episodio e WHERE e.serie_id = s.id AND ${EPISODIO_CON_VIDEO})`;
const DEFAULT_LIMIT = 50;

export async function upsertCanal({ slug, nombre }) {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO canal (slug, nombre) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
    [slug, nombre]
  );
  const [[row]] = await pool.execute('SELECT id FROM canal WHERE slug = ?', [slug]);
  return row.id;
}

/** `soloConVideo`: solo canales con alguna serie que se pueda ver (lo que usa la app). */
export async function listCanales({ soloConVideo = false } = {}) {
  const pool = getPool();
  const where = soloConVideo
    ? `WHERE EXISTS (SELECT 1 FROM serie s WHERE s.canal_id = c.id AND ${SERIE_CON_VIDEO})`
    : '';
  const [rows] = await pool.execute(`SELECT c.id, c.slug, c.nombre FROM canal c ${where} ORDER BY c.nombre ASC`);
  return rows;
}

export async function getCanalBySlug(slug) {
  const pool = getPool();
  const [[row]] = await pool.execute('SELECT id, slug, nombre FROM canal WHERE slug = ?', [slug]);
  return row ?? null;
}

export async function upsertSerie({ slug, titulo, anio, sinopsis, poster, tipo, fuente, fuente_id: fuenteId, canal_id: canalId }) {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO serie (slug, titulo, anio, sinopsis, poster, tipo, fuente, fuente_id, canal_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       titulo = VALUES(titulo), anio = VALUES(anio), sinopsis = VALUES(sinopsis),
       poster = VALUES(poster), tipo = VALUES(tipo), fuente = VALUES(fuente),
       fuente_id = VALUES(fuente_id), canal_id = VALUES(canal_id)`,
    [slug, titulo, anio ?? null, sinopsis ?? null, poster ?? null, tipo ?? 'tv', fuente ?? null, fuenteId ?? null, canalId]
  );
  const [[row]] = await pool.execute('SELECT id FROM serie WHERE slug = ?', [slug]);
  return row.id;
}

export async function listSeries({ canal, q, limit = DEFAULT_LIMIT, offset = 0, soloConVideo = false } = {}) {
  const pool = getPool();
  const clauses = soloConVideo ? [SERIE_CON_VIDEO] : [];
  const params = [];

  if (canal) {
    clauses.push('c.slug = ?');
    params.push(canal);
  }
  if (q) {
    if (q.length >= 4) {
      clauses.push('MATCH(s.titulo) AGAINST (? IN NATURAL LANGUAGE MODE)');
      params.push(q);
    } else {
      clauses.push('s.titulo LIKE ?');
      params.push(`${q}%`);
    }
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM serie s JOIN canal c ON c.id = s.canal_id ${where}`,
    params
  );
  const total = countRows[0].total;

  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const [rows] = await pool.execute(
    `SELECT s.id, s.slug, s.titulo, s.anio, s.poster, s.tipo, c.slug AS canal_slug, c.nombre AS canal_nombre
     FROM serie s JOIN canal c ON c.id = s.canal_id
     ${where}
     ORDER BY s.titulo ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );

  return { total, limit: safeLimit, offset: safeOffset, series: rows };
}

export async function getSerieBySlug(slug, { soloConVideo = false } = {}) {
  const pool = getPool();
  const filtroEpisodios = soloConVideo ? ` AND ${EPISODIO_CON_VIDEO}` : '';
  const filtroSerie = soloConVideo ? ` AND ${SERIE_CON_VIDEO}` : '';
  const [[serie]] = await pool.execute(
    `SELECT s.id, s.slug, s.titulo, s.anio, s.sinopsis, s.poster, s.tipo,
            c.slug AS canal_slug, c.nombre AS canal_nombre,
            (SELECT COUNT(*) FROM episodio e WHERE e.serie_id = s.id${filtroEpisodios}) AS total_episodios
     FROM serie s JOIN canal c ON c.id = s.canal_id
     WHERE s.slug = ?${filtroSerie}`,
    [slug]
  );
  return serie ?? null;
}

function assertValidVideoFields({ video_url: videoUrl, youtube_id: youtubeId }) {
  if (videoUrl && !isValidVideoUrl(videoUrl)) {
    throw new Error('video_url invalido: debe ser una URL https://');
  }
  if (youtubeId && !isValidYoutubeId(youtubeId)) {
    throw new Error('youtube_id invalido: debe tener 11 caracteres alfanumericos');
  }
}

export async function upsertEpisodio(episodio) {
  assertValidVideoFields(episodio);
  const {
    serie_id: serieId, temporada, numero, titulo, duracion, resumen, video_url: videoUrl, youtube_id: youtubeId,
  } = episodio;

  const pool = getPool();
  await pool.execute(
    `INSERT INTO episodio (serie_id, temporada, numero, titulo, duracion, resumen, video_url, youtube_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       titulo = VALUES(titulo), duracion = VALUES(duracion), resumen = VALUES(resumen),
       video_url = COALESCE(VALUES(video_url), video_url),
       youtube_id = COALESCE(VALUES(youtube_id), youtube_id)`,
    [serieId, temporada, numero, titulo ?? null, duracion ?? null, resumen ?? null, videoUrl ?? null, youtubeId ?? null]
  );
  const [[row]] = await pool.execute(
    'SELECT id FROM episodio WHERE serie_id = ? AND temporada = ? AND numero = ?',
    [serieId, temporada, numero]
  );
  return row.id;
}

/** Asigna un video a un episodio existente (usado por ingesta-videos). */
export async function setEpisodioVideo(serieId, temporada, numero, { youtube_id: youtubeId }) {
  assertValidVideoFields({ youtube_id: youtubeId });
  const pool = getPool();
  const [result] = await pool.execute(
    'UPDATE episodio SET youtube_id = ? WHERE serie_id = ? AND temporada = ? AND numero = ?',
    [youtubeId, serieId, temporada, numero]
  );
  return result.affectedRows > 0;
}

export async function listEpisodiosBySerie(serieId, { soloConVideo = false } = {}) {
  const pool = getPool();
  const filtro = soloConVideo ? ` AND ${EPISODIO_CON_VIDEO}` : '';
  const [rows] = await pool.execute(
    `SELECT e.id, e.serie_id, e.temporada, e.numero, e.titulo, e.duracion, e.resumen, e.video_url, e.youtube_id
     FROM episodio e WHERE e.serie_id = ?${filtro} ORDER BY e.temporada ASC, e.numero ASC`,
    [serieId]
  );
  return rows;
}

export async function getEpisodioById(id, { soloConVideo = false } = {}) {
  const pool = getPool();
  const filtro = soloConVideo ? ` AND ${EPISODIO_CON_VIDEO}` : '';
  const [[row]] = await pool.execute(
    `SELECT e.id, e.serie_id, e.temporada, e.numero, e.titulo, e.duracion, e.resumen, e.video_url, e.youtube_id
     FROM episodio e WHERE e.id = ?${filtro}`,
    [id]
  );
  return row ?? null;
}
