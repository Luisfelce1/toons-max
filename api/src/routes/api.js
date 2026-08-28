import { Router } from 'express';
import * as repo from '../repo.js';
import { keyMatches } from '../auth.js';
import { loginBodySchema, seriesQuerySchema, slugParamSchema, idParamSchema, validate } from '../validation.js';

export function createApiRouter(env = process.env) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  router.post('/login', validate(loginBodySchema, 'body'), (req, res) => {
    const { key } = req.valid_body;
    const familyKey = env.FAMILY_KEY;

    if (!familyKey || keyMatches(key, familyKey)) {
      return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false });
  });

  router.get('/canales', async (req, res, next) => {
    try {
      res.json(await repo.listCanales());
    } catch (error) {
      next(error);
    }
  });

  router.get('/series', validate(seriesQuerySchema, 'query'), async (req, res, next) => {
    try {
      res.json(await repo.listSeries(req.valid_query));
    } catch (error) {
      next(error);
    }
  });

  router.get('/series/:slug', validate(slugParamSchema, 'params'), async (req, res, next) => {
    try {
      const serie = await repo.getSerieBySlug(req.valid_params.slug);
      if (!serie) return res.status(404).json({ error: 'Serie no encontrada' });
      return res.json(serie);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/series/:slug/episodios', validate(slugParamSchema, 'params'), async (req, res, next) => {
    try {
      const serie = await repo.getSerieBySlug(req.valid_params.slug);
      if (!serie) return res.status(404).json({ error: 'Serie no encontrada' });
      return res.json(await repo.listEpisodiosBySerie(serie.id));
    } catch (error) {
      return next(error);
    }
  });

  router.get('/episodios/:id', validate(idParamSchema, 'params'), async (req, res, next) => {
    try {
      const episodio = await repo.getEpisodioById(req.valid_params.id);
      if (!episodio) return res.status(404).json({ error: 'Episodio no encontrado' });
      return res.json(episodio);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
