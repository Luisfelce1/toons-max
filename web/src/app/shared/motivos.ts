/**
 * Motivo "de referencia" de cada serie para su portada: un objeto o escena GENERICA que
 * evoca la serie (el autobus escolar, un ancla, una patineta...) dibujado desde cero.
 * Nunca personajes, logos, tipografias ni diseños de la obra original.
 */
export type Motivo =
  | 'rayo'
  | 'patineta'
  | 'autobus'
  | 'columpio'
  | 'nube'
  | 'tortuga'
  | 'casa'
  | 'iglu'
  | 'huellas'
  | 'flor'
  | 'reloj'
  | 'ancla'
  | 'fantasma'
  | 'pelota'
  | 'hueso'
  | 'corazones'
  | 'ciudad'
  | 'monedas'
  | 'telarana'
  | 'matraz'
  | 'gafas'
  | 'biberon'
  | 'libreta'
  | 'claqueta'
  | 'planeta'
  | 'libro'
  | 'palmera'
  | 'charco'
  | 'cometa'
  | 'lupa'
  | 'ordenador'
  | 'bicho'
  | 'oso'
  | 'conejo'
  | 'corona';

/** Palabras clave (sin acentos, minusculas) -> motivo. La primera que coincide gana. */
const REGLAS: ReadonlyArray<readonly [string, Motivo]> = [
  ['pequeno oso', 'oso'],
  ['little bear', 'oso'],
  ['corduroy', 'oso'],
  ['max y ruby', 'conejo'],
  ['babar', 'corona'],
  ['senorita arana', 'telarana'],
  ['miss spider', 'telarana'],
  ['power rangers', 'rayo'],
  ['rocket power', 'patineta'],
  ['magic school bus', 'autobus'],
  ['autobus magico', 'autobus'],
  ['recess', 'columpio'],
  ['recreo', 'columpio'],
  ['bobby', 'nube'],
  ['franklin', 'tortuga'],
  ['big blue house', 'casa'],
  ['casa azul', 'casa'],
  ['pingu', 'iglu'],
  ['pantera rosa', 'huellas'],
  ['pink panther', 'huellas'],
  ['abeja', 'flor'],
  ['erase una vez', 'reloj'],
  ['popeye', 'ancla'],
  ['casper', 'fantasma'],
  ['pocoyo', 'pelota'],
  ['courage', 'hueso'],
  ['coraje', 'hueso'],
  ['catdog', 'hueso'],
  ['powerpuff', 'corazones'],
  ['superpoderosas', 'corazones'],
  ['arnold', 'ciudad'],
  ['ducktales', 'monedas'],
  ['spider', 'telarana'],
  ['dexter', 'matraz'],
  ['johnny bravo', 'gafas'],
  ['rugrats', 'biberon'],
  ['doug', 'libreta'],
  ['animaniacs', 'claqueta'],
  ['tiny toon', 'claqueta'],
  ['captain planet', 'planeta'],
  ['arthur', 'libro'],
  ['thornberry', 'palmera'],
  ['timon', 'palmera'],
  ['peppa', 'charco'],
  ['caillou', 'cometa'],
  ['totally spies', 'lupa'],
  ['espias', 'lupa'],
  ['lyoko', 'ordenador'],
  ['oggy', 'bicho'],
  ['barbapapa', 'nube'],
];

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Motivo para una serie, o null si no hay uno (la portada muestra entonces las iniciales). */
export function motivoPara(titulo: string, slug = ''): Motivo | null {
  const texto = ` ${normalizar(titulo)} ${normalizar(slug)} `;
  for (const [clave, motivo] of REGLAS) {
    if (texto.includes(clave)) return motivo;
  }
  return null;
}
