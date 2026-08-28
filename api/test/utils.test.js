import { describe, it, expect } from 'vitest';
import { slugify, stripHtml, isValidYoutubeId, isValidVideoUrl } from '../src/utils.js';

describe('slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Cartoon Network')).toBe('cartoon-network');
  });

  it('normalizes accents', () => {
    expect(slugify('Canción Épica')).toBe('cancion-epica');
  });

  it('strips punctuation and collapses repeated dashes', () => {
    expect(slugify('Hey Arnold!!  -- The Movie')).toBe('hey-arnold-the-movie');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  --Fox Kids--  ')).toBe('fox-kids');
  });
});

describe('stripHtml', () => {
  it('removes tags but keeps text content', () => {
    expect(stripHtml('<p>Un show de <b>caricaturas</b>.</p>')).toBe('Un show de caricaturas.');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('Tom &amp; Jerry &mdash; &quot;classic&quot;')).toBe('Tom & Jerry — "classic"');
  });

  it('handles null/undefined gracefully', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
  });

  it('collapses excess whitespace left by stripped tags', () => {
    expect(stripHtml('<p>Uno</p>\n<p>Dos</p>')).toBe('Uno Dos');
  });
});

describe('isValidYoutubeId', () => {
  it('accepts exactly 11 url-safe characters', () => {
    expect(isValidYoutubeId('dQw4w9WgXcQ')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidYoutubeId('short')).toBe(false);
    expect(isValidYoutubeId('waytoolongtobeavalidid')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(isValidYoutubeId('dQw4w9Wg X!')).toBe(false);
  });

  it('rejects empty/null', () => {
    expect(isValidYoutubeId('')).toBe(false);
    expect(isValidYoutubeId(null)).toBe(false);
  });
});

describe('isValidVideoUrl', () => {
  it('accepts https URLs', () => {
    expect(isValidVideoUrl('https://example.org/video.mp4')).toBe(true);
  });

  it('rejects http (non-https) URLs', () => {
    expect(isValidVideoUrl('http://example.org/video.mp4')).toBe(false);
  });

  it('rejects non-URL strings', () => {
    expect(isValidVideoUrl('javascript:alert(1)')).toBe(false);
    expect(isValidVideoUrl('not a url')).toBe(false);
  });

  it('rejects empty/null', () => {
    expect(isValidVideoUrl('')).toBe(false);
    expect(isValidVideoUrl(null)).toBe(false);
  });
});
