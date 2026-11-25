/**
 * Lê e grava os arquivos dos cânticos no GitHub (API de conteúdos), no ramo RAMO_CONTEUDO.
 * Cada aprovação (ou exclusão) vira um commit; a Cloudflare refaz o site sozinha depois do commit.
 * O token (GITHUB_TOKEN) só precisa de acesso de escrita a "Contents" deste repositório.
 */
import type { Repositorio } from './admin';

function paraBase64(texto: string): string {
  let binario = '';
  for (const b of new TextEncoder().encode(texto)) binario += String.fromCharCode(b);
  return btoa(binario);
}

function deBase64(base64: string): string {
  const binario = atob(base64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
}

export function repositorioGitHub(token: string, repositorio: string, ramo: string): Repositorio {
  const cabecalhos = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'canticos-cifrados',
  };
  const endereco = (caminho: string) =>
    `https://api.github.com/repos/${repositorio}/contents/${caminho.split('/').map(encodeURIComponent).join('/')}`;

  return {
    async ler(caminho) {
      const resposta = await fetch(`${endereco(caminho)}?ref=${encodeURIComponent(ramo)}`, { headers: cabecalhos });
      if (resposta.status === 404) return null;
      if (!resposta.ok) throw new Error(`GitHub respondeu ${resposta.status} ao ler ${caminho}`);
      const dados: { content: string; sha: string } = await resposta.json();
      return { texto: deBase64(dados.content), sha: dados.sha };
    },

    async gravar(caminho, texto, mensagem, sha) {
      const resposta = await fetch(endereco(caminho), {
        method: 'PUT',
        headers: { ...cabecalhos, 'content-type': 'application/json' },
        body: JSON.stringify({ message: mensagem, content: paraBase64(texto), branch: ramo, ...(sha ? { sha } : {}) }),
      });
      // 409: mudou desde a versão "sha"; 422: o arquivo já existe e faltou o "sha".
      if (resposta.status === 409 || resposta.status === 422) return { conflito: true };
      if (!resposta.ok) throw new Error(`GitHub respondeu ${resposta.status} ao gravar ${caminho}`);
      const dados: { commit?: { html_url?: string } } = await resposta.json();
      return dados.commit?.html_url ? { url: dados.commit.html_url } : {};
    },

    async apagar(caminho, mensagem, sha) {
      const resposta = await fetch(endereco(caminho), {
        method: 'DELETE',
        headers: { ...cabecalhos, 'content-type': 'application/json' },
        body: JSON.stringify({ message: mensagem, sha, branch: ramo }),
      });
      // 409: mudou desde a versão "sha"; 422: "sha" não confere; 404: já não existe.
      if (resposta.status === 409 || resposta.status === 422 || resposta.status === 404) return { conflito: true };
      if (!resposta.ok) throw new Error(`GitHub respondeu ${resposta.status} ao apagar ${caminho}`);
      const dados: { commit?: { html_url?: string } } = await resposta.json();
      return dados.commit?.html_url ? { url: dados.commit.html_url } : {};
    },
  };
}
