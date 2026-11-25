/**
 * Servidor do app na Cloudflare. O site continua sendo só arquivos (dist/): este código
 * só atende os endereços /api/ (ver "run_worker_first" no wrangler.jsonc).
 */
import { bancoD1 } from './banco';
import { receberSugestao, type Dependencias } from './sugestoes';
import type { Ambiente } from './tipos';

/** Resumo (SHA-256) do IP: dá para contar envios sem guardar o endereço da pessoa. */
async function resumoDoIp(ip: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`canticos-cifrados:${ip}`));
  return [...new Uint8Array(bytes)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function dependencias(env: Ambiente, origem: string): Dependencias {
  return {
    banco: bancoD1(env.BANCO),
    canticoExiste: async (id) => (await env.ASSETS.fetch(`${origem}/canticos/${encodeURIComponent(id)}.json`)).ok,
    resumoDoIp,
    agora: () => new Date(),
    novoId: () => crypto.randomUUID(),
  };
}

export default {
  async fetch(pedido: Request, env: Ambiente): Promise<Response> {
    const url = new URL(pedido.url);
    if (url.pathname === '/api/sugestoes') return receberSugestao(pedido, dependencias(env, url.origin));
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ erro: 'Endereço não encontrado.' }), {
        status: 404,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    return env.ASSETS.fetch(pedido);
  },
};
