import { describe, expect, it } from 'vitest';
import { diferencaDeLinhas, houveMudanca } from '../src/lib/diferenca';

describe('o que mudou entre a cifra atual e a sugerida', () => {
  it('marca a linha trocada como "saiu" e "entrou", e o resto como igual', () => {
    expect(diferencaDeLinhas(['G', 'Luz do mundo', 'Amém'], ['G', 'Luz do céu', 'Amém'])).toEqual([
      { tipo: 'igual', texto: 'G' },
      { tipo: 'saiu', texto: 'Luz do mundo' },
      { tipo: 'entrou', texto: 'Luz do céu' },
      { tipo: 'igual', texto: 'Amém' },
    ]);
  });

  it('linha nova no meio aparece só como "entrou"', () => {
    expect(diferencaDeLinhas(['A', 'C'], ['A', 'B', 'C'])).toEqual([
      { tipo: 'igual', texto: 'A' },
      { tipo: 'entrou', texto: 'B' },
      { tipo: 'igual', texto: 'C' },
    ]);
  });

  it('linha apagada aparece só como "saiu"', () => {
    expect(diferencaDeLinhas(['A', 'B', 'C'], ['A', 'C'])).toEqual([
      { tipo: 'igual', texto: 'A' },
      { tipo: 'saiu', texto: 'B' },
      { tipo: 'igual', texto: 'C' },
    ]);
  });

  it('diz se houve alguma mudança', () => {
    expect(houveMudanca(diferencaDeLinhas(['A'], ['A']))).toBe(false);
    expect(houveMudanca(diferencaDeLinhas(['A'], ['B']))).toBe(true);
  });

  it('espaços sobrando no fim da linha não contam como mudança', () => {
    expect(houveMudanca(diferencaDeLinhas(['G   D  '], ['G   D']))).toBe(false);
  });
});
