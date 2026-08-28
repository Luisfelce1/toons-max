import { createHash, timingSafeEqual } from 'node:crypto';

export function keyMatches(recibida, esperada) {
  const a = createHash('sha256').update(String(recibida ?? '')).digest();
  const b = createHash('sha256').update(String(esperada ?? '')).digest();
  return timingSafeEqual(a, b);
}

export function familyKeyMiddleware(env = process.env) {
  const familyKey = env.FAMILY_KEY;

  return (req, res, next) => {
    if (!familyKey) {
      return next();
    }

    const provided = req.get('x-family-key');
    if (!provided || !keyMatches(provided, familyKey)) {
      return res.status(401).json({ error: 'Clave familiar invalida o ausente.' });
    }

    return next();
  };
}
