const VIDEO_EXTENSIONS = /\.(mp4|webm|m3u8)(\?.*)?$/i;

export function shouldBypassCache(url: string): boolean {
  const path = url.startsWith('http') ? new URL(url).pathname : url;
  if (path.startsWith('/api/')) return true;
  if (VIDEO_EXTENSIONS.test(path)) return true;
  return false;
}
