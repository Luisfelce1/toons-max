import { channelSlug } from './channel-slug';

describe('channelSlug', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(channelSlug('Cartoon Network')).toBe('cartoon-network');
  });

  it('normalizes accents', () => {
    expect(channelSlug('Canción Épica')).toBe('cancion-epica');
  });

  it('strips punctuation and collapses repeated dashes', () => {
    expect(channelSlug('Fox Kids!!  --')).toBe('fox-kids');
  });

  it('trims leading/trailing dashes', () => {
    expect(channelSlug('  --Warner Channel--  ')).toBe('warner-channel');
  });

  it('returns an empty string for empty input', () => {
    expect(channelSlug('')).toBe('');
  });
});
