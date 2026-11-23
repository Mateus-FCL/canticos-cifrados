import { describe, expect, it } from 'vitest';
// O service worker é JavaScript puro em public/ (o navegador carrega direto, sem build).
import {
  LIMITE_PAGINAS,
  cachesVelhos,
  chaveDaPagina,
  estrategia,
  excedentes,
  importsDoScript,
  nomesDosCaches,
} from '../public/sw-regras.js';

const ORIGEM = 'https://canticos.exemplo';
const url = (caminho: string) => new URL(caminho, ORIGEM);

describe('como cada pedido é atendido', () => {
  it('páginas: tenta a rede e, sem ela, usa a cópia guardada', () => {
    expect(estrategia(url('/canticos/paz-no-caminho/'), true, ORIGEM)).toBe('pagina');
    expect(estrategia(url('/setlists/ver/?id=a'), true, ORIGEM)).toBe('pagina');
  });

  it('CSS e scripts do build: nome muda a cada versão, então a cópia guardada vale para sempre', () => {
    expect(estrategia(url('/_astro/index.BbX1.css'), false, ORIGEM)).toBe('fixo');
  });

  it('índice da busca, ícones e manifesto: entrega a cópia e atualiza por trás', () => {
    for (const caminho of ['/pagefind/pagefind.js', '/icones/icone-192.png', '/favicon.svg', '/manifest.webmanifest']) {
      expect(estrategia(url(caminho), false, ORIGEM), caminho).toBe('atualizar');
    }
  });

  it('o próprio service worker e outros sites nunca passam pelo cache', () => {
    expect(estrategia(url('/sw.js'), false, ORIGEM)).toBe('rede');
    expect(estrategia(url('/sw-versao.js'), false, ORIGEM)).toBe('rede');
    expect(estrategia(new URL('https://outro.site/x.js'), false, ORIGEM)).toBe('rede');
    expect(estrategia(new URL('https://outro.site/'), true, ORIGEM)).toBe('rede');
  });
});

describe('chave da página guardada', () => {
  it('ignora o ?setlist= e o #: o cântico é o mesmo', () => {
    expect(chaveDaPagina(url('/canticos/paz/?setlist=a#x'))).toBe(`${ORIGEM}/canticos/paz/`);
  });

  it('mantém o ?id= do detalhe da setlist sem diferença: a página é uma só para todas', () => {
    expect(chaveDaPagina(url('/setlists/ver/?id=a'))).toBe(`${ORIGEM}/setlists/ver/`);
  });
});

describe('arquivos que um script chama', () => {
  it('acha os imports do build, para guardar tudo que a página precisa', () => {
    const js = 'import{r as e}from"./busca.BReiFlea.js";import"./base.X1.js";const m=import("./tarde.Y2.js");';
    expect(importsDoScript(js, '/_astro/pagina.js')).toEqual([
      '/_astro/busca.BReiFlea.js',
      '/_astro/base.X1.js',
      '/_astro/tarde.Y2.js',
    ]);
  });

  it('ignora o que não é arquivo do build', () => {
    expect(importsDoScript('const a = "from"; fetch("./x.json")', '/_astro/p.js')).toEqual([]);
  });
});

describe('o cache não cresce sem limite', () => {
  it('apaga as páginas mais antigas além do limite', () => {
    const chaves = Array.from({ length: LIMITE_PAGINAS + 3 }, (_, i) => `p${i}`);
    expect(excedentes(chaves, LIMITE_PAGINAS)).toEqual(['p0', 'p1', 'p2']);
    expect(excedentes(['a', 'b'], LIMITE_PAGINAS)).toEqual([]);
  });
});

describe('versão nova substitui o cache antigo', () => {
  it('os nomes levam a versão', () => {
    expect(nomesDosCaches('42')).toEqual({ paginas: 'canticos-paginas-42', arquivos: 'canticos-arquivos-42' });
  });

  it('apaga os caches do app de outras versões e não mexe nos de outros', () => {
    const nomes = ['canticos-paginas-41', 'canticos-arquivos-41', 'canticos-paginas-42', 'outra-coisa'];
    expect(cachesVelhos(nomes, '42')).toEqual(['canticos-paginas-41', 'canticos-arquivos-41']);
  });
});
