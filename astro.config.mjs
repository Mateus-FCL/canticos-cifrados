// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  build: {
    // CSS sempre em arquivo, para a CSP em public/_headers não precisar de 'unsafe-inline'.
    inlineStylesheets: 'never',
  },
});
