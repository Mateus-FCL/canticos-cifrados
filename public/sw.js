/**
 * Service worker do Cânticos: guarda as páginas abertas e os arquivos do app no aparelho,
 * para funcionar em modo avião. As regras ficam em sw-regras.js (testadas).
 * A versão vem de sw-versao.js, gerado a cada build: versão nova apaga o cache antigo.
 */
import {
  LIMITE_PAGINAS,
  cachesVelhos,
  chaveDaPagina,
  estrategia,
  excedentes,
  importsDoScript,
  nomesDosCaches,
} from './sw-regras.js';
import { VERSAO } from './sw-versao.js';

const sw = self;
const { paginas: CACHE_PAGINAS, arquivos: CACHE_ARQUIVOS } = nomesDosCaches(VERSAO);

/** Páginas guardadas já na instalação: a lista, as setlists e a tela Sem internet. */
const PAGINAS_INICIAIS = ['/', '/setlists/', '/setlists/ver/', '/sem-internet/'];
const SEM_INTERNET = '/sem-internet/';
/** Sem resposta da rede nesse tempo, usa a cópia guardada (internet fraca na igreja). */
const ESPERA_REDE_MS = 4000;

/** CSS e scripts que uma página usa, para ela abrir completa sem internet. */
function arquivosDaPagina(html) {
  return [...html.matchAll(/(?:href|src)="(\/_astro\/[^"]+)"/g)].map((m) => m[1]);
}

/** Guarda os arquivos e, nos scripts, também o que eles importam. */
async function guardarArquivos(cache, caminhos) {
  const pendentes = [...caminhos];
  const vistos = new Set();
  while (pendentes.length > 0) {
    const caminho = pendentes.shift();
    if (vistos.has(caminho)) continue;
    vistos.add(caminho);
    let resposta = await cache.match(caminho);
    if (!resposta) {
      resposta = await fetch(caminho);
      if (!resposta.ok) continue;
      await cache.put(caminho, resposta.clone());
    }
    if (caminho.endsWith('.js')) pendentes.push(...importsDoScript(await resposta.text(), caminho));
  }
}

async function guardarPagina(cache, url, resposta) {
  await cache.put(chaveDaPagina(url), resposta);
  const chaves = (await cache.keys()).map((r) => r.url);
  await Promise.all(excedentes(chaves, LIMITE_PAGINAS).map((chave) => cache.delete(chave)));
}

sw.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const paginas = await caches.open(CACHE_PAGINAS);
      const arquivos = await caches.open(CACHE_ARQUIVOS);
      for (const caminho of PAGINAS_INICIAIS) {
        const url = new URL(caminho, sw.location.origin);
        const resposta = await fetch(url, { cache: 'no-cache' });
        if (!resposta.ok) continue;
        const html = await resposta.clone().text();
        await paginas.put(chaveDaPagina(url), resposta);
        await guardarArquivos(arquivos, arquivosDaPagina(html));
      }
      await arquivos.addAll(['/manifest.webmanifest', '/favicon.svg', '/icones/icone-192.png']);
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      await Promise.all(cachesVelhos(await caches.keys(), VERSAO).map((nome) => caches.delete(nome)));
      await sw.clients.claim();
    })(),
  );
});

/** Rede primeiro; sem rede ou demorando, a cópia; sem cópia, a tela Sem internet. */
async function atenderPagina(pedido, url) {
  const cache = await caches.open(CACHE_PAGINAS);
  const daRede = fetch(pedido).then(async (resposta) => {
    if (resposta.ok) await guardarPagina(cache, url, resposta.clone());
    return resposta;
  });
  daRede.catch(() => undefined); // se a rede falhar depois, não vira erro solto
  const prazo = new Promise((resolver) => setTimeout(resolver, ESPERA_REDE_MS, undefined));
  try {
    const rapida = await Promise.race([daRede, prazo]);
    if (rapida) return rapida;
  } catch {
    // sem rede: segue para a cópia
  }
  const guardada = await cache.match(chaveDaPagina(url));
  if (guardada) return guardada;
  try {
    return await daRede; // a rede estava só lenta
  } catch {
    return (await cache.match(new URL(SEM_INTERNET, sw.location.origin).href)) ?? Response.error();
  }
}

async function atenderFixo(pedido) {
  const cache = await caches.open(CACHE_ARQUIVOS);
  const guardada = await cache.match(pedido);
  if (guardada) return guardada;
  const resposta = await fetch(pedido);
  if (resposta.ok) await cache.put(pedido, resposta.clone());
  return resposta;
}

async function atenderAtualizando(pedido, evento) {
  const cache = await caches.open(CACHE_ARQUIVOS);
  const guardada = await cache.match(pedido);
  const daRede = fetch(pedido).then(async (resposta) => {
    if (resposta.ok) await cache.put(pedido, resposta.clone());
    return resposta;
  });
  if (guardada) {
    evento.waitUntil(daRede.catch(() => undefined));
    return guardada;
  }
  return daRede;
}

sw.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  const url = new URL(pedido.url);
  const tipo = estrategia(url, pedido.mode === 'navigate', sw.location.origin);
  if (tipo === 'pagina') evento.respondWith(atenderPagina(pedido, url));
  else if (tipo === 'fixo') evento.respondWith(atenderFixo(pedido));
  else if (tipo === 'atualizar') evento.respondWith(atenderAtualizando(pedido, evento));
});

/** A setlist pede para guardar os cânticos dela, para o culto funcionar sem internet. */
sw.addEventListener('message', (evento) => {
  const dados = evento.data;
  if (!dados || dados.tipo !== 'guardar-paginas' || !Array.isArray(dados.caminhos)) return;
  evento.waitUntil(
    (async () => {
      const paginas = await caches.open(CACHE_PAGINAS);
      const arquivos = await caches.open(CACHE_ARQUIVOS);
      for (const caminho of dados.caminhos.slice(0, 100)) {
        if (typeof caminho !== 'string' || !caminho.startsWith('/canticos/')) continue;
        const url = new URL(caminho, sw.location.origin);
        if (await paginas.match(chaveDaPagina(url))) continue;
        try {
          const resposta = await fetch(url);
          if (!resposta.ok) continue;
          const html = await resposta.clone().text();
          await guardarPagina(paginas, url, resposta);
          await guardarArquivos(arquivos, arquivosDaPagina(html));
        } catch {
          return; // caiu a internet: tenta de novo na próxima vez que a setlist abrir
        }
      }
    })(),
  );
});
