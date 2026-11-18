import { describe, expect, it } from 'vitest';
import { lerChordpro, type Linha } from '../src/lib/chordpro';
import { palavrasDaLinha, soAcordes } from '../src/lib/palavras';

const linha = (fonte: string): Linha => {
  const l = lerChordpro(fonte)[0]?.linhas[0];
  if (!l) throw new Error('linha vazia');
  return l;
};

describe('palavrasDaLinha', () => {
  it('cada palavra leva o acorde que começa nela', () => {
    expect(palavrasDaLinha(linha('[G]Cantamos [C]juntos'))).toEqual([
      [{ acorde: 'G', texto: 'Cantamos' }],
      [{ acorde: 'C', texto: 'juntos' }],
    ]);
  });

  it('acorde no meio da palavra não separa a palavra', () => {
    expect(palavrasDaLinha(linha('sempre lou[Em]varemos'))).toEqual([
      [{ texto: 'sempre' }],
      [{ texto: 'lou' }, { acorde: 'Em', texto: 'varemos' }],
    ]);
  });

  it('texto depois do acorde com várias palavras', () => {
    expect(palavrasDaLinha(linha('[Em]Com a voz e o [C]coração'))).toEqual([
      [{ acorde: 'Em', texto: 'Com' }],
      [{ texto: 'a' }],
      [{ texto: 'voz' }],
      [{ texto: 'e' }],
      [{ texto: 'o' }],
      [{ acorde: 'C', texto: 'coração' }],
    ]);
  });

  it('acorde solto antes de um espaço vira palavra só com acorde', () => {
    expect(palavrasDaLinha(linha('[G] Cantamos'))).toEqual([[{ acorde: 'G', texto: '' }], [{ texto: 'Cantamos' }]]);
  });

  it('linha só de acordes', () => {
    expect(palavrasDaLinha(linha('[G] [C]  [D]'))).toEqual([
      [{ acorde: 'G', texto: '' }],
      [{ acorde: 'C', texto: '' }],
      [{ acorde: 'D', texto: '' }],
    ]);
  });

  it('acorde no fim da linha', () => {
    expect(palavrasDaLinha(linha('Com alegria e [G]'))).toEqual([
      [{ texto: 'Com' }],
      [{ texto: 'alegria' }],
      [{ texto: 'e' }],
      [{ acorde: 'G', texto: '' }],
    ]);
  });

  it('mantém a marca de "não é acorde"', () => {
    expect(palavrasDaLinha(linha('[x2]Repete'))).toEqual([[{ acorde: 'x2', texto: 'Repete', naoAcorde: true }]]);
  });
});

describe('soAcordes', () => {
  it('reconhece linha sem letra', () => {
    expect(soAcordes(linha('[G] [C] [D]'))).toBe(true);
    expect(soAcordes(linha('[G]Cantamos'))).toBe(false);
  });
});
