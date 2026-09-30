import { hashSlug, iniciales } from './portada';

describe('portada', () => {
  it('iniciales ignora articulos y toma dos palabras', () => {
    expect(iniciales('The Magic School Bus')).toBe('MS');
    expect(iniciales('Franklin')).toBe('F');
    expect(iniciales("Bobby's World")).toBe('BW');
    expect(iniciales('El Mundo de Bobby')).toBe('MB');
    expect(iniciales('¡!')).toBe('?');
  });

  it('hashSlug es estable y distingue series', () => {
    expect(hashSlug('rocket-power')).toBe(hashSlug('rocket-power'));
    expect(hashSlug('rocket-power')).not.toBe(hashSlug('recess'));
  });
});
