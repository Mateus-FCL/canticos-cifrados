import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publico = (caminho: string) => new URL(`../public${caminho}`, import.meta.url);
const manifesto = JSON.parse(readFileSync(publico('/manifest.webmanifest'), 'utf8')) as {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
};
const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');

/** Largura e altura gravadas no cabeçalho do PNG. */
function tamanhoDoPng(caminho: string): string {
  const dados = readFileSync(publico(caminho));
  expect(dados.subarray(1, 4).toString('latin1'), `${caminho} não é PNG`).toBe('PNG');
  return `${dados.readUInt32BE(16)}x${dados.readUInt32BE(20)}`;
}

describe('manifesto do app (instalar na tela inicial)', () => {
  it('tem nome, nome curto e idioma', () => {
    expect(manifesto.name).toBe('Cânticos Cifrados');
    // Embaixo do ícone cabem uns 12 caracteres.
    expect(manifesto.short_name.length).toBeLessThanOrEqual(12);
    expect(manifesto.lang).toBe('pt-BR');
  });

  it('abre na lista de cânticos, em tela cheia como app', () => {
    expect(manifesto.start_url).toBe('/');
    expect(manifesto.scope).toBe('/');
    expect(manifesto.display).toBe('standalone');
  });

  it('usa as cores do protótipo', () => {
    const primaria = tokens.match(/--cor-primaria:\s*(#[\da-f]{6})/i)?.[1];
    const fundo = tokens.match(/--cor-fundo:\s*(#[\da-f]{6})/i)?.[1];
    expect(manifesto.theme_color.toLowerCase()).toBe(primaria?.toLowerCase());
    expect(manifesto.background_color.toLowerCase()).toBe(fundo?.toLowerCase());
    expect(layout).toContain(`name="theme-color" content="${primaria?.toLowerCase()}"`);
  });

  it('tem ícones de 192 e 512 e um que pode ser recortado (maskable)', () => {
    const tamanhos = manifesto.icons.filter((i) => i.purpose !== 'maskable').map((i) => i.sizes);
    expect(tamanhos).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifesto.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('cada ícone existe e tem o tamanho que declara', () => {
    for (const icone of manifesto.icons) {
      expect(icone.type).toBe('image/png');
      expect(existsSync(publico(icone.src)), icone.src).toBe(true);
      expect(tamanhoDoPng(icone.src), icone.src).toBe(icone.sizes);
    }
  });

  it('as páginas apontam para o manifesto e para os ícones do iPhone e da aba', () => {
    expect(layout).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(layout).toContain('rel="apple-touch-icon" href="/icones/apple-touch-icon.png"');
    expect(layout).toContain('rel="icon" href="/favicon.svg"');
    expect(tamanhoDoPng('/icones/apple-touch-icon.png')).toBe('180x180');
    expect(existsSync(publico('/favicon.svg'))).toBe(true);
  });
});
