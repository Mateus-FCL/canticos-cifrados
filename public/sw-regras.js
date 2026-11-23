// @ts-check
/**
 * Regras do cache do app (usadas pelo sw.js). JavaScript puro porque o navegador
 * carrega o service worker direto desta pasta, sem passar pelo build. Testadas em tests/sw-regras.test.ts.
 */

/** Quantas páginas guardar no aparelho. Passou disso, as mais antigas saem. */
export const LIMITE_PAGINAS = 400;

/**
 * Como atender cada pedido:
 * - "pagina": tenta a rede; sem ela (ou se demorar), usa a cópia guardada; sem cópia, a tela Sem internet.
 * - "fixo": usa a cópia guardada; só busca na rede se não tiver (arquivos do build, com nome que muda a cada versão).
 * - "atualizar": entrega a cópia guardada na hora e busca a nova por trás.
 * - "rede": não passa pelo cache.
 * @param {URL} url
 * @param {boolean} ehPagina pedido de navegação (abrir uma página)
 * @param {string} origem
 * @returns {'pagina' | 'fixo' | 'atualizar' | 'rede'}
 */
export function estrategia(url, ehPagina, origem) {
  if (url.origin !== origem) return 'rede';
  if (ehPagina) return 'pagina';
  const caminho = url.pathname;
  if (caminho === '/sw.js' || caminho === '/sw-versao.js' || caminho === '/sw-regras.js') return 'rede';
  if (caminho.startsWith('/_astro/')) return 'fixo';
  if (
    caminho.startsWith('/pagefind/') ||
    caminho.startsWith('/icones/') ||
    caminho === '/favicon.svg' ||
    caminho === '/manifest.webmanifest'
  ) {
    return 'atualizar';
  }
  return 'rede';
}

/**
 * A página guardada não depende de ?setlist=, ?id= nem #: o HTML é o mesmo.
 * @param {URL} url
 */
export function chaveDaPagina(url) {
  return url.origin + url.pathname;
}

/**
 * Chaves a apagar para ficar dentro do limite (as primeiras são as mais antigas).
 * @param {readonly string[]} chaves
 * @param {number} limite
 */
export function excedentes(chaves, limite) {
  return chaves.slice(0, Math.max(0, chaves.length - limite));
}

/**
 * Arquivos .js que um script do build importa ("./busca.x.js"), com o caminho completo.
 * Sem eles, uma página guardada abriria sem internet mas o script dela falharia.
 * @param {string} codigo
 * @param {string} caminhoDoScript
 */
export function importsDoScript(codigo, caminhoDoScript) {
  const pasta = caminhoDoScript.slice(0, caminhoDoScript.lastIndexOf('/') + 1);
  const achados = [...codigo.matchAll(/\b(?:from|import)\s*\(?\s*["']\.\/([^"']+\.js)["']/g)];
  return [...new Set(achados.map((m) => pasta + m[1]))];
}

/** @param {string} versao */
export function nomesDosCaches(versao) {
  return { paginas: `canticos-paginas-${versao}`, arquivos: `canticos-arquivos-${versao}` };
}

/**
 * Caches do app de outras versões (os de outros sites ou bibliotecas ficam).
 * @param {readonly string[]} nomes
 * @param {string} versao
 */
export function cachesVelhos(nomes, versao) {
  const atuais = Object.values(nomesDosCaches(versao));
  return nomes.filter((nome) => nome.startsWith('canticos-') && !atuais.includes(nome));
}
