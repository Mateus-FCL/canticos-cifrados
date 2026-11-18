import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { canticoSchema } from './lib/cantico';

const canticos = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/canticos' }),
  schema: canticoSchema,
});

export const collections = { canticos };
