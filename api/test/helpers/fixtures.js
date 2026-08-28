export async function resetDb(pool) {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query('TRUNCATE TABLE episodio');
  await pool.query('TRUNCATE TABLE serie');
  await pool.query('TRUNCATE TABLE canal');
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

export async function seedFixtures(pool) {
  await pool.query(
    'INSERT INTO canal (slug, nombre) VALUES (?, ?), (?, ?)',
    ['cartoon-network', 'Cartoon Network', 'nickelodeon', 'Nickelodeon']
  );

  const [[{ id: cnId }]] = await pool.query('SELECT id FROM canal WHERE slug = ?', ['cartoon-network']);
  const [[{ id: nickId }]] = await pool.query('SELECT id FROM canal WHERE slug = ?', ['nickelodeon']);

  await pool.query(
    `INSERT INTO serie (slug, titulo, anio, sinopsis, poster, tipo, canal_id)
     VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
    [
      'coraje-el-perro-cobarde', 'Coraje el perro cobarde', 1999, 'Un perro protege a sus dueños.', 'https://example.org/coraje.jpg', 'tv', cnId,
      'hey-arnold', 'Hey Arnold!', 1996, 'Un chico con cabeza de balon en la ciudad.', 'https://example.org/arnold.jpg', 'tv', nickId,
    ]
  );

  const [[{ id: corajeId }]] = await pool.query('SELECT id FROM serie WHERE slug = ?', ['coraje-el-perro-cobarde']);

  await pool.query(
    `INSERT INTO episodio (serie_id, temporada, numero, titulo, duracion, resumen, video_url, youtube_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      corajeId, 1, 2, 'Segundo episodio', 22, 'Resumen 2', null, null,
      corajeId, 1, 1, 'Primer episodio', 22, 'Resumen 1', null, 'dQw4w9WgXcQ',
    ]
  );

  return { cnId, nickId, corajeId };
}
