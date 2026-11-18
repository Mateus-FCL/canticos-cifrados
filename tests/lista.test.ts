import { describe, expect, it } from 'vitest';
import { corresponde, itensDaLista, normalizar, type ItemLista } from '../src/lib/lista';

const entrada = (id: string, titulo: string, numero?: number, tom = 'G') => ({
  id,
  data: { titulo, versoes: [{ tom }], ...(numero === undefined ? {} : { numero }) },
});

describe('normalizar', () => {
  it('tira acentos, maiúsculas e espaços das pontas', () => {
    expect(normalizar('  Canção da ESPERANÇA ')).toBe('cancao da esperanca');
  });

  it('junta espaços repetidos', () => {
    expect(normalizar('Paz   no  Caminho')).toBe('paz no caminho');
  });
});

describe('itensDaLista', () => {
  it('usa o tom da primeira versão', () => {
    const [item] = itensDaLista([
      { id: 'a', data: { titulo: 'A', numero: 1, versoes: [{ tom: 'D' }, { tom: 'E' }] } },
    ]);
    expect(item?.tom).toBe('D');
  });

  it('ordena por número e deixa os sem número no fim, por título', () => {
    const itens = itensDaLista([
      entrada('z', 'Zelo'),
      entrada('b', 'Bênção', 41),
      entrada('a', 'Água viva'),
      entrada('c', 'Canto', 12),
      entrada('e', 'Éden'),
    ]);
    expect(itens.map((i) => i.id)).toEqual(['c', 'b', 'a', 'e', 'z']);
  });
});

describe('corresponde', () => {
  const item: ItemLista = { id: 'x', numero: 127, titulo: 'Canção da Esperança', tom: 'E' };

  it('busca vazia mostra tudo', () => {
    expect(corresponde(item, '')).toBe(true);
    expect(corresponde(item, '   ')).toBe(true);
  });

  it('acha pelo começo do número', () => {
    expect(corresponde(item, '1')).toBe(true);
    expect(corresponde(item, '12')).toBe(true);
    expect(corresponde(item, '127')).toBe(true);
    expect(corresponde(item, '27')).toBe(false);
    expect(corresponde(item, '1271')).toBe(false);
  });

  it('acha por parte do título, sem ligar para acento ou maiúscula', () => {
    expect(corresponde(item, 'esperanca')).toBe(true);
    expect(corresponde(item, 'CANÇÃO')).toBe(true);
    expect(corresponde(item, 'da esp')).toBe(true);
    expect(corresponde(item, 'paz')).toBe(false);
  });

  it('acha cada palavra em qualquer ordem', () => {
    expect(corresponde(item, 'esperança canção')).toBe(true);
  });

  it('cântico sem número só aparece pela busca de título', () => {
    const semNumero: ItemLista = { id: 'y', titulo: 'Hino 3 da Ceia', tom: 'C' };
    expect(corresponde(semNumero, '3')).toBe(true);
    expect(corresponde(semNumero, '4')).toBe(false);
  });
});
