import { describe, expect, it } from 'vitest';
import { escreverAcorde, lerAcorde, normalizarAcorde } from '../src/lib/acorde';

describe('lerAcorde', () => {
  it('separa raiz, sufixo e baixo', () => {
    expect(lerAcorde('F#m7')).toEqual({ raiz: 'F#', sufixo: 'm7' });
    expect(lerAcorde('C/E')).toEqual({ raiz: 'C', sufixo: '', baixo: 'E' });
    expect(lerAcorde('Bbm7(b5)')).toEqual({ raiz: 'Bb', sufixo: 'm7(b5)' });
  });

  it('B é Si, nunca Si bemol; H não é acorde', () => {
    expect(lerAcorde('B')).toEqual({ raiz: 'B', sufixo: '' });
    expect(lerAcorde('H')).toBeNull();
    expect(lerAcorde('H7')).toBeNull();
  });

  it('6/9 é extensão, não baixo', () => {
    expect(lerAcorde('C6/9')).toEqual({ raiz: 'C', sufixo: '6/9' });
  });

  it('recusa o que não é acorde', () => {
    for (const texto of ['', 'x2', 'Refrão', 'c', 'N.C.', 'Cxyz', 'C/', 'C/H']) {
      expect(lerAcorde(texto), texto).toBeNull();
    }
  });
});

describe('normalizarAcorde: escreve sempre na cifra brasileira', () => {
  it.each([
    // Casos obrigatórios da convenção
    ['C7M', 'C7M'],
    ['Cm7M', 'Cm7M'],
    ['C+', 'C+'],
    ['C°', 'C°'],
    ['Bbm7(b5)', 'Bbm7(b5)'],
    ['C/E', 'C/E'],
    ['F#m7', 'F#m7'],
    // Iguais nas duas notações
    ['Cm', 'Cm'],
    ['C7', 'C7'],
    ['Csus4', 'Csus4'],
    ['C9', 'C9'],
    ['C#', 'C#'],
    ['Cb', 'Cb'],
    ['C7(9)', 'C7(9)'],
    ['Dadd9', 'Dadd9'],
    // Notação americana vira brasileira
    ['Cmaj7', 'C7M'],
    ['CMaj7', 'C7M'],
    ['CM7', 'C7M'],
    ['CΔ', 'C7M'],
    ['Cm(maj7)', 'Cm7M'],
    ['CmMaj7', 'Cm7M'],
    ['Caug', 'C+'],
    ['Caum', 'C+'],
    ['Cdim', 'C°'],
    ['Cº', 'C°'],
    ['Cdim7', 'C°7'],
    ['Cø', 'Cm7(b5)'],
    ['Cø7', 'Cm7(b5)'],
    ['Cm7b5', 'Cm7(b5)'],
    ['Bbmaj7/D', 'Bb7M/D'],
  ])('%s → %s', (entrada, saida) => {
    expect(normalizarAcorde(entrada)).toBe(saida);
  });

  it('devolve null para o que não é acorde', () => {
    expect(normalizarAcorde('x2')).toBeNull();
  });
});

describe('escreverAcorde', () => {
  it('monta o texto com baixo', () => {
    expect(escreverAcorde({ raiz: 'G', sufixo: '7M', baixo: 'B' })).toBe('G7M/B');
    expect(escreverAcorde({ raiz: 'Eb', sufixo: 'm' })).toBe('Ebm');
  });
});
