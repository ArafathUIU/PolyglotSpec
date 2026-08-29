import { z } from 'zod';

export const PostSchema = z.object({
  title: z.string().min(3).max(100),
  body: z.string(),
  views: z.number().int().min(0).optional(),
  is_published: z.boolean().default(true)
});
