import { describe, expect, it } from 'vitest';
import { COMPASSOS, TONS, errosDaSugestao, type Sugestao } from '../src/lib/sugestao';

const valida: Sugestao = {
  tipo: 'novo',
  titulo: 'Grande é o Senhor',
  cifra: 'G        D\nGrande é o Senhor',
  tom: 'G',
  compasso: '4/4',
  bpm: 72,
};

describe('listas do formulário', () => {
  it('tem os 12 tons maiores e os 12 menores, no formato do app', () => {
    expect(TONS).toHaveLength(24);
    expect(TONS).toContain('F#');
    expect(TONS).toContain('Bbm');
    for (const tom of TONS) expect(tom).toMatch(/^[A-G](#|b)?m?$/);
  });

  it('tem os compassos mais comuns', () => {
    expect(COMPASSOS).toEqual(expect.arrayContaining(['4/4', '3/4', '6/8']));
  });
});

describe('o que falta preencher na sugestão', () => {
  it('sugestão completa não tem erro', () => {
    expect(errosDaSugestao(valida)).toEqual({});
  });

  it('pede título e cifra, em palavras simples', () => {
    const erros = errosDaSugestao({ ...valida, titulo: '  ', cifra: '' });
    expect(erros.titulo).toBe('Escreva o nome da música.');
    expect(erros.cifra).toBe('Cole a cifra (letra com os acordes).');
  });

  it('confere o tom, o compasso e o BPM', () => {
    const erros = errosDaSugestao({ ...valida, tom: 'H', compasso: '5/9', bpm: 12 });
    expect(Object.keys(erros).sort()).toEqual(['bpm', 'compasso', 'tom']);
    expect(erros.bpm).toBe('O BPM fica entre 30 e 300.');
  });

  it('BPM em branco é aceito (a pessoa pode não saber)', () => {
    const { bpm: _semBpm, ...semBpm } = valida;
    expect(errosDaSugestao(semBpm)).toEqual({});
  });

  it('limita o tamanho dos textos', () => {
    expect(errosDaSugestao({ ...valida, cifra: 'a'.repeat(30_001) }).cifra).toMatch(/muito grande/);
    expect(errosDaSugestao({ ...valida, titulo: 'a'.repeat(121) }).titulo).toMatch(/muito grande/);
  });

  it('correção precisa dizer qual cântico', () => {
    expect(errosDaSugestao({ ...valida, tipo: 'correcao' }).canticoId).toBeDefined();
    expect(errosDaSugestao({ ...valida, tipo: 'correcao', canticoId: 'paz-no-caminho' })).toEqual({});
  });
});
