import { motivoPara } from './motivos';

describe('motivoPara', () => {
  it.each([
    ['Mighty Morphin Power Rangers', 'rayo'],
    ['Rocket Power', 'patineta'],
    ['The Magic School Bus', 'autobus'],
    ['Recess', 'columpio'],
    ["Bobby's World", 'nube'],
    ['Franklin', 'tortuga'],
    ['Bear in the Big Blue House', 'casa'],
    ['Pingu', 'iglu'],
    ['La Pantera Rosa', 'huellas'],
    ['La abeja Maya (clásica)', 'flor'],
    ['Érase una vez... la vida', 'reloj'],
    ['Popeye el marino (clásicos 1952-1957)', 'ancla'],
    ['Casper (clásicos)', 'fantasma'],
    ['Pocoyó', 'pelota'],
    ['Courage the Cowardly Dog', 'hueso'],
    ['Peppa Pig', 'charco'],
    ['Caillou (España)', 'cometa'],
    ['Tres espías sin límite (Latino)', 'lupa'],
    ['Código Lyoko', 'ordenador'],
    ['Oggy y las cucarachas', 'bicho'],
    ['Barbapapá', 'nube'],
    ['Pequeño Oso', 'oso'],
    ['Max y Ruby', 'conejo'],
    ['Babar', 'corona'],
    ['Franklin (Latino)', 'tortuga'],
    ['Power Rangers: Fuerza Mística', 'rayo'],
    ['El autobús mágico vuelve a despegar', 'autobus'],
  ])('%s -> %s', (titulo, esperado) => {
    expect(motivoPara(titulo)).toBe(esperado);
  });

  it('usa tambien el slug', () => {
    expect(motivoPara('Titulo raro', 'erase-una-vez-el-hombre')).toBe('reloj');
  });

  it('devuelve null si no hay motivo (portada con iniciales)', () => {
    expect(motivoPara('Saint Seiya')).toBeNull();
  });
});
