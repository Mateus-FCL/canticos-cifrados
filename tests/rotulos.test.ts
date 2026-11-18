import { describe, expect, it } from 'vitest';
import { rotuloBotaoTom, rotuloTom } from '../src/lib/rotulos';

describe('rotuloBotaoTom', () => {
  it('escreve como no botão do protótipo', () => {
    expect(rotuloBotaoTom('G')).toBe('Tom: G');
  });
});

describe('rotuloTom', () => {
  it('escreve o tom como no protótipo', () => {
    expect(rotuloTom('G')).toBe('Tom G');
    expect(rotuloTom('F#m')).toBe('Tom F#m');
  });
});
