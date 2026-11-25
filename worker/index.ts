/**
 * Servidor do app na Cloudflare. O site continua sendo só arquivos (dist/): este código
 * só atende os endereços /api/ (ver "run_worker_first" no wrangler.jsonc).
 */
import { atenderAdmin, type DependenciasAdmin, type ItemIndice } from './admin';
import { bancoD1 } from './banco';
import { repositorioGitHub } from './github';
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

function dependenciasAdmin(env: Ambiente, origem: string): DependenciasAdmin {
  const repositorio =
    env.GITHUB_TOKEN && env.REPOSITORIO_GITHUB
      ? repositorioGitHub(env.GITHUB_TOKEN, env.REPOSITORIO_GITHUB, env.RAMO_CONTEUDO ?? 'main')
      : undefined;
  return {
    banco: bancoD1(env.BANCO),
    ...(repositorio ? { repositorio } : {}),
    ...(env.ADMIN_SENHA ? { senha: env.ADMIN_SENHA } : {}),
    indice: async () => {
      const resposta = await env.ASSETS.fetch(`${origem}/indice-canticos.json`);
      return resposta.ok ? ((await resposta.json()) as ItemIndice[]) : [];
    },
    agora: () => new Date(),
    resumoDoIp,
  };
}

const json = (corpo: unknown, status: number) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(pedido: Request, env: Ambiente): Promise<Response> {
    const url = new URL(pedido.url);
    try {
      if (url.pathname === '/api/sugestoes') return await receberSugestao(pedido, dependencias(env, url.origin));
      if (url.pathname.startsWith('/api/admin/')) return await atenderAdmin(pedido, dependenciasAdmin(env, url.origin));
      if (url.pathname.startsWith('/api/')) return json({ erro: 'Endereço não encontrado.' }, 404);
      return env.ASSETS.fetch(pedido);
    } catch (erro) {
      // O detalhe vai para o log da Cloudflare (Observability); a pessoa vê uma mensagem simples.
      console.error(erro);
      return json({ erro: 'Algo deu errado no servidor. Tente de novo daqui a pouco.' }, 500);
    }
  },
};
