export interface Canal {
  id: number;
  slug: string;
  nombre: string;
}

export interface SerieResumen {
  id: number;
  slug: string;
  titulo: string;
  anio: number | null;
  poster: string | null;
  tipo: string;
  canal_slug: string;
  canal_nombre: string;
}

export interface SerieDetalle {
  id: number;
  slug: string;
  titulo: string;
  anio: number | null;
  sinopsis: string | null;
  poster: string | null;
  tipo: string;
  canal_slug: string;
  canal_nombre: string;
  total_episodios: number;
}

export interface Episodio {
  id: number;
  serie_id: number;
  temporada: number;
  numero: number;
  titulo: string | null;
  duracion: number | null;
  resumen: string | null;
  video_url: string | null;
  youtube_id: string | null;
}

export interface SeriesResponse {
  total: number;
  limit: number;
  offset: number;
  series: SerieResumen[];
}
