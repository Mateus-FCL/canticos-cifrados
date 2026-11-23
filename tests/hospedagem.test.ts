import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const raiz = (caminho: string) => new URL(`../${caminho}`, import.meta.url);
const cabecalhos = readFileSync(raiz('public/_headers'), 'utf8');

/** Cabeçalhos de um bloco do _headers (a linha do caminho e as linhas recuadas abaixo dela). */
function bloco(caminho: string): string {
  const linhas = cabecalhos.split('\n');
  const inicio = linhas.findIndex((l) => l.trim() === caminho);
  expect(inicio, `bloco ${caminho} no _headers`).toBeGreaterThanOrEqual(0);
  const fim = linhas.findIndex((l, i) => i > inicio && l.trim() !== '' && !/^\s/.test(l));
  return linhas.slice(inicio + 1, fim < 0 ? undefined : fim).join('\n');
}

describe('regras da hospedagem (public/_headers)', () => {
  it('todas as páginas levam a política de segurança', () => {
    expect(bloco('/*')).toMatch(/Content-Security-Policy: default-src 'self'/);
  });

  it('CSS e scripts do build ficam guardados no navegador por um ano (o nome muda a cada versão)', () => {
    expect(bloco('/_astro/*')).toMatch(/Cache-Control: public, max-age=31536000, immutable/);
  });

  it('o service worker é sempre conferido, para a versão nova chegar', () => {
    for (const arquivo of ['/sw.js', '/sw-regras.js', '/sw-versao.js']) {
      expect(bloco(arquivo), arquivo).toMatch(/Cache-Control: no-cache/);
    }
  });
});

describe('página de endereço errado', () => {
  it('existe (sem ela, a hospedagem mostraria a lista para qualquer endereço)', () => {
    expect(existsSync(raiz('src/pages/404.astro'))).toBe(true);
  });
});

describe('verificação automática no GitHub', () => {
  const fluxo = existsSync(raiz('.github/workflows/verificar.yml'))
    ? readFileSync(raiz('.github/workflows/verificar.yml'), 'utf8')
    : '';

  it('roda os testes e o build em todo PR', () => {
    expect(fluxo).toMatch(/pull_request/);
    expect(fluxo).toMatch(/pnpm test/);
    expect(fluxo).toMatch(/pnpm build/);
  });

  it('usa a mesma versão do Node exigida pelo projeto', () => {
    const minimo = Number(
      JSON.parse(readFileSync(raiz('package.json'), 'utf8')).engines.node.match(/(\d+)/)?.[1],
    );
    const usada = Number(fluxo.match(/node-version:\s*(\d+)/)?.[1]);
    expect(usada).toBeGreaterThanOrEqual(minimo);
  });
});
