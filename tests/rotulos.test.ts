import { describe, expect, it } from 'vitest';
import { rotuloTom } from '../src/lib/rotulos';

describe('rotuloTom', () => {
  it('escreve o tom como no protótipo', () => {
    expect(rotuloTom('G')).toBe('Tom G');
    expect(rotuloTom('F#m')).toBe('Tom F#m');
  });
});
