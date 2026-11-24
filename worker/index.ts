/**
 * Servidor do app na Cloudflare. O site continua sendo só arquivos (dist/): este código
 * só atende os endereços /api/ (ver "run_worker_first" no wrangler.jsonc).
 */
import { bancoD1 } from './banco';
import { receberSugestao, type Dependencias } from './sugestoes';
import type { Ambiente } from './tipos';

const VERIFICAR_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

async function confirmarHumano(segredo: string | undefined, token: string, ip: string): Promise<boolean> {
  if (!segredo) {
    console.error('Falta o segredo TURNSTILE_SECRET no painel da Cloudflare.');
    return false;
  }
  if (!token) return false;
  const resposta = await fetch(VERIFICAR_TURNSTILE, {
    method: 'POST',
    body: new URLSearchParams({ secret: segredo, response: token, remoteip: ip }),
  });
  const resultado: { success?: boolean } = await resposta.json();
  return resultado.success === true;
}

/** Resumo (SHA-256) do IP: dá para contar envios sem guardar o endereço da pessoa. */
async function resumoDoIp(ip: string, sal: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}:${ip}`));
  return [...new Uint8Array(bytes)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function dependencias(env: Ambiente, origem: string): Dependencias {
  return {
    banco: bancoD1(env.BANCO),
    confirmarHumano: (token, ip) => confirmarHumano(env.TURNSTILE_SECRET, token, ip),
    canticoExiste: async (id) => (await env.ASSETS.fetch(`${origem}/canticos/${encodeURIComponent(id)}.json`)).ok,
    resumoDoIp: (ip) => resumoDoIp(ip, env.TURNSTILE_SECRET ?? ''),
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
