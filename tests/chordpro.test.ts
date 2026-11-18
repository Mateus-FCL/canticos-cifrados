import { describe, expect, it } from 'vitest';
import { letraDe, lerChordpro } from '../src/lib/chordpro';

describe('lerChordpro', () => {
  it('põe o acorde sobre a sílaba que vem depois dele', () => {
    const [secao] = lerChordpro('[G]Cantamos [C]juntos');
    expect(secao?.linhas).toEqual([
      {
        segmentos: [
          { acorde: 'G', texto: 'Cantamos ' },
          { acorde: 'C', texto: 'juntos' },
        ],
      },
    ]);
  });

  it('acorde no meio da palavra', () => {
    const [secao] = lerChordpro('Hoje e sempre lou[Em]varemos');
    expect(secao?.linhas[0]?.segmentos).toEqual([
      { texto: 'Hoje e sempre lou' },
      { acorde: 'Em', texto: 'varemos' },
    ]);
  });

  it('escreve os acordes na cifra brasileira', () => {
    const [secao] = lerChordpro('[Cmaj7]Paz [Bbm7b5]luz [Cdim/Eb]céu');
    expect(secao?.linhas[0]?.segmentos.map((s) => s.acorde)).toEqual(['C7M', 'Bbm7(b5)', 'C°/Eb']);
  });

  it('acorde no fim da linha, sem letra depois', () => {
    const [secao] = lerChordpro('Com alegria e [G]');
    expect(secao?.linhas[0]?.segmentos).toEqual([{ texto: 'Com alegria e ' }, { acorde: 'G', texto: '' }]);
  });

  it('linha só de acordes (introdução)', () => {
    const [secao] = lerChordpro('[G] [C] [D]');
    expect(secao?.linhas[0]?.segmentos.map((s) => s.acorde)).toEqual(['G', 'C', 'D']);
  });

  it('o que não é acorde entre colchetes fica como está', () => {
    const [secao] = lerChordpro('[x2]Repete');
    expect(secao?.linhas[0]?.segmentos).toEqual([{ acorde: 'x2', texto: 'Repete', naoAcorde: true }]);
  });

  it('{c: ...} dá título à seção e linha em branco separa seções', () => {
    const secoes = lerChordpro('{c: Estrofe 1}\n[G]Um\n\n{c: Estrofe 2}\n[C]Dois');
    expect(secoes.map((s) => s.titulo)).toEqual(['Estrofe 1', 'Estrofe 2']);
    expect(secoes.map((s) => s.linhas.length)).toEqual([1, 1]);
  });

  it('aceita {comment: ...} e diretivas sem espaço', () => {
    const secoes = lerChordpro('{comment:Refrão}\n[G]Um');
    expect(secoes[0]?.titulo).toBe('Refrão');
  });

  it('{soc}/{eoc} marcam o refrão', () => {
    const secoes = lerChordpro('[G]Um\n{soc}\n[C]Dois\n{eoc}\n[D]Três');
    expect(secoes.map((s) => [s.titulo, s.refrao])).toEqual([
      [undefined, false],
      ['Refrão', true],
      [undefined, false],
    ]);
  });

  it('{start_of_chorus: Coro} usa o nome dado', () => {
    const secoes = lerChordpro('{start_of_chorus: Coro}\n[C]Dois\n{end_of_chorus}');
    expect(secoes[0]).toMatchObject({ titulo: 'Coro', refrao: true });
  });

  it('ignora diretivas desconhecidas, como {title}', () => {
    const secoes = lerChordpro('{title: Nome}\n[G]Um');
    expect(secoes).toHaveLength(1);
    expect(secoes[0]?.linhas).toHaveLength(1);
  });

  it('aceita quebras de linha do Windows e várias linhas em branco', () => {
    const secoes = lerChordpro('[G]Um\r\n\r\n\r\n[C]Dois\r\n');
    expect(secoes).toHaveLength(2);
    expect(secoes[1]?.linhas[0]?.segmentos[0]?.texto).toBe('Dois');
  });

  it('colchete sem fechar fica como texto', () => {
    const [secao] = lerChordpro('Olá [G sem fim');
    expect(secao?.linhas[0]?.segmentos).toEqual([{ texto: 'Olá [G sem fim' }]);
  });
});

describe('letraDe', () => {
  it('tira os acordes e as diretivas, mantendo as seções', () => {
    const texto = '{c: Estrofe 1}\n[G]Cantamos [C]juntos\nlou[Em]varemos\n\n{c: Estrofe 2}\n[G] [C]\nFim';
    expect(letraDe(texto)).toBe('Cantamos juntos\nlouvaremos\n\nFim');
  });
});
