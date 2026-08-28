const COMBINING_MARKS_RE = /[̀-ͯ]/g;

export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  mdash: '—',
  ndash: '–',
  nbsp: ' ',
};

export function stripHtml(html) {
  if (html === null || html === undefined) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|lt|gt|quot|apos|mdash|ndash|nbsp);/g, (_, name) => HTML_ENTITIES[name])
    .replace(/\s+/g, ' ')
    .replace(/ ([.,!?;:])/g, '$1')
    .trim();
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeId(id) {
  if (!id) return false;
  return YOUTUBE_ID_RE.test(id);
}

export function isValidVideoUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
