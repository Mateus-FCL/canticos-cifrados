import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NIVEL_PADRAO, TOTAL_NIVEIS, aumentar, descreverNivel, diminuir, escalaDoNivel, lerNivel } from '../src/lib/tamanho';

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const rem = (nome: string) => Number(tokens.match(new RegExp(`--${nome}\\s*:\\s*([\\d.]+)rem`))?.[1]);

describe('níveis de tamanho da letra', () => {
  it('são 5, começando no 2 (tamanho normal)', () => {
    expect(TOTAL_NIVEIS).toBe(5);
    expect(NIVEL_PADRAO).toBe(2);
    expect(escalaDoNivel(NIVEL_PADRAO)).toBe(1);
  });

  it('cada nível é maior que o anterior', () => {
    for (let n = 2; n <= TOTAL_NIVEIS; n++) {
      expect(escalaDoNivel(n)).toBeGreaterThan(escalaDoNivel(n - 1));
    }
  });

  it('nem o menor nível deixa a letra abaixo de 19 px', () => {
    expect(rem('texto-corpo') * escalaDoNivel(1)).toBeGreaterThanOrEqual(rem('texto-min'));
  });

  it('A+ e A− param nos limites', () => {
    expect(aumentar(2)).toBe(3);
    expect(aumentar(5)).toBe(5);
    expect(diminuir(2)).toBe(1);
    expect(diminuir(1)).toBe(1);
  });

  it('descreve como no protótipo', () => {
    expect(descreverNivel(4)).toBe('Tamanho 4 de 5');
  });
});

describe('lerNivel (valor guardado no aparelho)', () => {
  it('aceita um nível válido', () => {
    expect(lerNivel('4')).toBe(4);
  });

  it('volta ao padrão se não houver valor ou se ele for inválido', () => {
    for (const valor of [null, '', 'grande', '0', '6', '2.5', '-1']) {
      expect(lerNivel(valor), String(valor)).toBe(NIVEL_PADRAO);
    }
  });
});
