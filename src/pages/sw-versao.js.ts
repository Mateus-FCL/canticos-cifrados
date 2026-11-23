/**
 * Versão do cache do app, gerada a cada build (vira /sw-versao.js).
 * O navegador compara este arquivo: mudou, o service worker novo assume e apaga o cache antigo.
 */
import type { APIRoute } from 'astro';

const VERSAO = Date.now().toString(36);

export const GET: APIRoute = () =>
  new Response(`export const VERSAO = '${VERSAO}';\n`, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
