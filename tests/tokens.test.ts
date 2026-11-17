import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function valor(nome: string): string {
  const achado = css.match(new RegExp(`--${nome}\\s*:\\s*([^;]+);`));
  if (!achado?.[1]) throw new Error(`variável --${nome} não definida`);
  return achado[1].trim();
}

function rem(nome: string): number {
  const v = valor(nome);
  const achado = v.match(/^([\d.]+)rem$/);
  if (!achado?.[1]) throw new Error(`--${nome} deve estar em rem, veio "${v}"`);
  return Number(achado[1]);
}

describe('tokens.css', () => {
  it('traz as cores do protótipo', () => {
    expect(valor('cor-fundo')).toBe('#ffffff');
    expect(valor('cor-superficie')).toBe('#f1f3f6');
    expect(valor('cor-primaria')).toBe('#1b3a5c');
    expect(valor('cor-texto')).toBe('#121217');
    expect(valor('cor-borda')).toBe('#6b788c');
    expect(valor('cor-acorde')).toBe('#b3261f');
    expect(valor('cor-aviso')).toBe('#fff3c4');
  });

  it('não fixa o tamanho da fonte da raiz em px (obedece à fonte do sistema)', () => {
    expect(css).not.toMatch(/(html|:root)\s*\{[^}]*font-size\s*:\s*[\d.]+px/);
  });

  it('não usa px em tamanho de texto', () => {
    expect(css).not.toMatch(/--texto-[\w-]+\s*:\s*[\d.]+px/);
  });

  it('texto mínimo de 19 px com a fonte padrão de 16 px', () => {
    expect(rem('texto-min') * 16).toBeGreaterThanOrEqual(19);
    for (const nome of ['texto-corpo', 'texto-titulo', 'texto-titulo-grande']) {
      expect(rem(nome)).toBeGreaterThanOrEqual(rem('texto-min'));
    }
  });

  it('alvo de toque de 60 px', () => {
    expect(rem('alvo-toque') * 16).toBeGreaterThanOrEqual(60);
  });

  it('entrelinha 1,5', () => {
    expect(Number(valor('entrelinha'))).toBeGreaterThanOrEqual(1.5);
  });
});
