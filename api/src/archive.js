/*
 * Internet Archive: resuelve el MP4 reproducible de un item de dominio publico.
 * Solo se usa con identificadores verificados en el catalogo (ver SERIES en ingesta.js).
 */

const ARCHIVE = 'https://archive.org';

// Preferencia de formato: H.264 (compatible con Safari/Tizen) antes que MPEG4 antiguos.
const PREFERENCIA = ['h.264', 'h.264 ia', 'mpeg4', '512kb mpeg4'];

/** Convierte "421.5" o "07:01" o "1:02:03" a minutos (redondeado, minimo 1). */
export function duracionMinutos(length) {
  if (length == null || length === '') return null;
  const partes = String(length).split(':').map(Number);
  if (partes.some(Number.isNaN)) return null;
  const segundos = partes.reduce((acc, n) => acc * 60 + n, 0);
  return Math.max(1, Math.round(segundos / 60));
}

/** Elige el archivo MP4 preferido de la respuesta de /metadata/{id}. */
export function elegirMp4(metadata) {
  const mp4s = (metadata?.files ?? []).filter((f) => /\.mp4$/i.test(f.name ?? ''));
  if (mp4s.length === 0) return null;
  const rango = (f) => {
    const i = PREFERENCIA.indexOf(String(f.format ?? '').toLowerCase());
    return i === -1 ? PREFERENCIA.length : i;
  };
  return [...mp4s].sort((a, b) => rango(a) - rango(b))[0];
}

export function urlDescarga(identifier, nombreArchivo) {
  const ruta = nombreArchivo.split('/').map(encodeURIComponent).join('/');
  return `${ARCHIVE}/download/${encodeURIComponent(identifier)}/${ruta}`;
}

/** Devuelve { video_url, duracion } del item, o null si no tiene MP4. */
export async function resolverVideoArchive(identifier, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${ARCHIVE}/metadata/${encodeURIComponent(identifier)}`);
  if (!res.ok) return null;
  const metadata = await res.json();
  const archivo = elegirMp4(metadata);
  if (!archivo) return null;
  return {
    video_url: urlDescarga(identifier, archivo.name),
    duracion: duracionMinutos(archivo.length),
  };
}
