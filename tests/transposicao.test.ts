import { describe, expect, it } from 'vitest';
import { normalizarSemitons, transporAcorde, transporTom, usaBemol } from '../src/lib/transposicao';

describe('transporTom', () => {
  it('sobe e desce meio tom', () => {
    expect(transporTom('G', 1)).toBe('Ab');
    expect(transporTom('G', 2)).toBe('A');
    expect(transporTom('G', -1)).toBe('F#');
    expect(transporTom('C', -1)).toBe('B');
  });

  it('escolhe o nome usual do tom: Mi bemol, não Ré sustenido', () => {
    expect(transporTom('D', 1)).toBe('Eb');
    expect(transporTom('C', 1)).toBe('Db');
    expect(transporTom('A', 1)).toBe('Bb');
    expect(transporTom('E', 2)).toBe('F#');
  });

  it('tons menores', () => {
    expect(transporTom('Em', 2)).toBe('F#m');
    expect(transporTom('Am', 1)).toBe('Bbm');
    expect(transporTom('Em', 4)).toBe('G#m');
    expect(transporTom('Dm', 1)).toBe('Ebm');
  });

  it('12 meios tons voltam ao mesmo tom', () => {
    expect(transporTom('G', 12)).toBe('G');
    expect(transporTom('G', -12)).toBe('G');
    expect(transporTom('Bb', 0)).toBe('Bb');
  });

  it('entende tom escrito com sustenido ou bemol', () => {
    expect(transporTom('Db', 1)).toBe('D');
    expect(transporTom('C#', 1)).toBe('D');
    expect(transporTom('F#m', 0)).toBe('F#m');
  });
});

describe('usaBemol', () => {
  it.each(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])('%s usa bemol', (tom) => {
    expect(usaBemol(tom)).toBe(true);
  });

  it.each(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m'])('%s usa sustenido', (tom) => {
    expect(usaBemol(tom)).toBe(false);
  });
});

describe('transporAcorde', () => {
  it('de G para A, como na prévia do protótipo', () => {
    const paraA = (acorde: string) => transporAcorde(acorde, 2, 'A');
    expect(['G', 'C', 'D', 'Em'].map(paraA)).toEqual(['A', 'D', 'E', 'F#m']);
  });

  it('em tom de bemol escreve com bemol', () => {
    // De D para Eb: D G A Bm → Eb Ab Bb Cm
    const paraEb = (acorde: string) => transporAcorde(acorde, 1, 'Eb');
    expect(['D', 'G', 'A', 'Bm', 'F#m'].map(paraEb)).toEqual(['Eb', 'Ab', 'Bb', 'Cm', 'Gm']);
  });

  it('em tom de sustenido escreve com sustenido', () => {
    // De C para B: C F G Am → B E F# G#m
    const paraB = (acorde: string) => transporAcorde(acorde, -1, 'B');
    expect(['C', 'F', 'G', 'Am'].map(paraB)).toEqual(['B', 'E', 'F#', 'G#m']);
  });

  it('mantém o sufixo e as extensões', () => {
    expect(transporAcorde('C7M', 2, 'D')).toBe('D7M');
    expect(transporAcorde('Cm7M', 2, 'D')).toBe('Dm7M');
    expect(transporAcorde('C+', 2, 'D')).toBe('D+');
    expect(transporAcorde('C°', 2, 'D')).toBe('D°');
    expect(transporAcorde('Bbm7(b5)', 2, 'D')).toBe('Cm7(b5)');
    expect(transporAcorde('F#m7', 1, 'Bb')).toBe('Gm7');
    expect(transporAcorde('G7(9)', 2, 'A')).toBe('A7(9)');
  });

  it('transpõe também o baixo', () => {
    expect(transporAcorde('C/E', 2, 'D')).toBe('D/F#');
    expect(transporAcorde('G/B', 1, 'Ab')).toBe('Ab/C');
    expect(transporAcorde('D/F#', 1, 'Eb')).toBe('Eb/G');
  });

  it('zero meios tons devolve o acorde normalizado', () => {
    expect(transporAcorde('Cmaj7', 0, 'C')).toBe('C7M');
  });

  it('o que não é acorde fica como está', () => {
    expect(transporAcorde('x2', 3, 'A')).toBe('x2');
  });
});

describe('normalizarSemitons', () => {
  it('fica entre -5 e 6, pelo caminho mais curto', () => {
    expect(normalizarSemitons(0)).toBe(0);
    expect(normalizarSemitons(12)).toBe(0);
    expect(normalizarSemitons(-12)).toBe(0);
    expect(normalizarSemitons(13)).toBe(1);
    expect(normalizarSemitons(-13)).toBe(-1);
    expect(normalizarSemitons(7)).toBe(-5);
    expect(normalizarSemitons(-7)).toBe(5);
    expect(normalizarSemitons(6)).toBe(6);
  });
});
