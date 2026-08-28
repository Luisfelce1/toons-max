import { z } from 'zod';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug invalido');
const numericId = z.string().regex(/^\d+$/, 'id invalido').transform(Number);
const intString = z.string().regex(/^\d+$/, 'debe ser numerico').transform(Number);

export const loginBodySchema = z.object({
  key: z.string().min(1, 'la clave es obligatoria'),
});

export const seriesQuerySchema = z.object({
  canal: slug.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: intString.pipe(z.number().int().min(1).max(200)).optional(),
  offset: intString.pipe(z.number().int().min(0)).optional(),
});

export const slugParamSchema = z.object({ slug });

export const idParamSchema = z.object({ id: numericId });

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues.map((i) => i.message).join(', ') });
    }
    req[`valid_${source}`] = result.data;
    return next();
  };
}
