import { shouldBypassCache } from './sw-cache-policy';

describe('shouldBypassCache', () => {
  it('bypasses API requests', () => {
    expect(shouldBypassCache('/api/series')).toBe(true);
    expect(shouldBypassCache('https://retrotoons.app/api/login')).toBe(true);
  });

  it('bypasses video files by extension', () => {
    expect(shouldBypassCache('/media/ep1.mp4')).toBe(true);
    expect(shouldBypassCache('/media/ep1.webm')).toBe(true);
    expect(shouldBypassCache('/media/stream.m3u8')).toBe(true);
  });

  it('does not bypass the app shell or static assets', () => {
    expect(shouldBypassCache('/')).toBe(false);
    expect(shouldBypassCache('/index.html')).toBe(false);
    expect(shouldBypassCache('/main.js')).toBe(false);
    expect(shouldBypassCache('/fonts/inter/inter-variable.woff2')).toBe(false);
    expect(shouldBypassCache('/manifest.webmanifest')).toBe(false);
  });

  it('is case-insensitive on video extensions', () => {
    expect(shouldBypassCache('/media/EP1.MP4')).toBe(true);
  });
});
