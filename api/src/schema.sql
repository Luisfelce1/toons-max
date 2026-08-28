CREATE TABLE IF NOT EXISTS canal (
  id     INT PRIMARY KEY AUTO_INCREMENT,
  slug   VARCHAR(64)  NOT NULL UNIQUE,
  nombre VARCHAR(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS serie (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  slug       VARCHAR(160) NOT NULL UNIQUE,
  titulo     VARCHAR(255) NOT NULL,
  anio       INT,
  sinopsis   TEXT,
  poster     VARCHAR(512),
  tipo       VARCHAR(16)  NOT NULL DEFAULT 'tv',
  fuente     VARCHAR(32),
  fuente_id  INT,
  canal_id   INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_serie_canal FOREIGN KEY (canal_id) REFERENCES canal(id),
  FULLTEXT KEY ft_serie_titulo (titulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS episodio (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  serie_id   INT NOT NULL,
  temporada  INT NOT NULL,
  numero     INT NOT NULL,
  titulo     VARCHAR(255),
  duracion   INT,
  resumen    TEXT,
  video_url  VARCHAR(512),
  youtube_id VARCHAR(16),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_epi (serie_id, temporada, numero),
  CONSTRAINT fk_epi_serie FOREIGN KEY (serie_id) REFERENCES serie(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
