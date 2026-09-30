import 'dotenv/config';
import { slugify } from './utils.js';
import * as repo from './repo.js';

export const CANALES = [
  { slug: 'cartoon-network', nombre: 'Cartoon Network' },
  { slug: 'nickelodeon', nombre: 'Nickelodeon' },
  { slug: 'fox-kids', nombre: 'Fox Kids' },
  { slug: 'hanna-barbera', nombre: 'Hanna Barbera' },
  { slug: 'disney', nombre: 'Disney' },
  { slug: 'warner-channel', nombre: 'Warner Channel' },
  { slug: 'marvel', nombre: 'Marvel' },
  { slug: 'otros', nombre: 'Otros' },
];

export const SERIES_DEMO = [
  {
    titulo: 'Coraje el Perro Cobarde', anio: 1999, canal: 'cartoon-network', tipo: 'tv',
    sinopsis: 'Un perro rosado protege a sus dueños de fuerzas sobrenaturales en el rancho Nada Mas.',
    episodios: [
      { temporada: 1, numero: 1, titulo: 'El pantano de los espíritus', duracion: 22, resumen: 'Coraje se enfrenta a un espiritu del pantano.', youtube_id: 'aqz-KE-bpKQ' },
      { temporada: 1, numero: 2, titulo: 'El regreso del perro fantasma', duracion: 22, resumen: 'Un antiguo perro maldito regresa al rancho.' },
    ],
  },
  {
    titulo: 'Las Chicas Superpoderosas', anio: 1998, canal: 'cartoon-network', tipo: 'tv',
    sinopsis: 'Tres niñas con superpoderes protegen la ciudad de Saltadilla.',
    episodios: [
      { temporada: 1, numero: 1, titulo: 'El nacimiento de las chicas', duracion: 22, resumen: 'El profesor Utonium crea a las chicas.' },
      { temporada: 1, numero: 2, titulo: 'Mojo se enfada', duracion: 22, resumen: 'Mojo Jojo intenta un nuevo plan maligno.' },
      { temporada: 1, numero: 3, titulo: 'El ataque de los monstruos', duracion: 22, resumen: 'Un monstruo gigante amenaza la ciudad.' },
    ],
  },
  {
    titulo: 'Hey Arnold!', anio: 1996, canal: 'nickelodeon', tipo: 'tv',
    sinopsis: 'Un chico con cabeza de balon crece en una gran ciudad junto a su abuelo.',
    episodios: [
      { temporada: 1, numero: 1, titulo: 'Arnold vuela una cometa', duracion: 22, resumen: 'Arnold intenta ganar el concurso de cometas.', youtube_id: 'aqz-KE-bpKQ' },
      { temporada: 1, numero: 2, titulo: 'El secreto de Helga', duracion: 22, resumen: 'Helga esconde su verdadero sentir.' },
    ],
  },
  {
    titulo: 'DuckTales', anio: 1987, canal: 'disney', tipo: 'tv',
    sinopsis: 'El Tio Rico McPato y sus tres sobrinos viven aventuras por el mundo.',
    episodios: [
      { temporada: 1, numero: 1, titulo: 'Buscadores de tesoros perdidos', duracion: 22, resumen: 'La familia busca un tesoro antiguo.' },
      { temporada: 1, numero: 2, titulo: 'El regreso de la momia', duracion: 22, resumen: 'Una maldicion egipcia amenaza al grupo.' },
    ],
  },
  {
    titulo: 'Los Jóvenes Titanes', anio: 2003, canal: 'warner-channel', tipo: 'tv',
    sinopsis: 'Cinco jovenes heroes protegen la ciudad mientras conviven como amigos.',
    episodios: [
      { temporada: 1, numero: 1, titulo: 'Nace un equipo', duracion: 22, resumen: 'Los titanes se conocen por primera vez.', youtube_id: 'aqz-KE-bpKQ' },
      { temporada: 1, numero: 2, titulo: 'El plan de Slade', duracion: 22, resumen: 'Un enemigo misterioso observa al equipo.' },
    ],
  },
  {
    titulo: 'Spider-Man: La Serie Animada', anio: 1994, canal: 'marvel', tipo: 'tv',
    sinopsis: 'Peter Parker equilibra su vida como estudiante y como el hombre araña.',
    episodios: [
      { temporada: 1, numero: 1, titulo: 'La noche de la mordida', duracion: 22, resumen: 'Peter obtiene sus poderes.' },
      { temporada: 1, numero: 2, titulo: 'El Duende Verde ataca', duracion: 22, resumen: 'Un nuevo villano aparece en la ciudad.' },
    ],
  },
];

export async function seed() {
  for (const canal of CANALES) {
    await repo.upsertCanal(canal);
  }

  for (const item of SERIES_DEMO) {
    const canal = await repo.getCanalBySlug(item.canal);
    const serieId = await repo.upsertSerie({
      slug: slugify(item.titulo),
      titulo: item.titulo,
      anio: item.anio,
      sinopsis: item.sinopsis,
      // Portada generada en el frontend: sin imagenes externas ni con copyright.
      poster: null,
      tipo: item.tipo,
      fuente: 'demo',
      canal_id: canal.id,
    });

    for (const episodio of item.episodios) {
      await repo.upsertEpisodio({ ...episodio, serie_id: serieId });
    }
  }
}

const isMain = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isMain) {
  seed()
    .then(() => {
      console.log('Datos de demo sembrados correctamente.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error sembrando datos de demo:', error);
      process.exit(1);
    });
}
