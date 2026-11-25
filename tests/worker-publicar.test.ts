import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { atualizarYaml, montarYamlNovo, numeroLivre, slugDoTitulo, validarYaml } from '../worker/publicar';

const dados = {
  titulo: 'Rio de Paz',
  numero: 91,
  tom: 'D',
  compasso: '4/4',
  bpm: 72,
  chordpro: '{c: Estrofe 1}\n[D]Como um rio de [G]paz',
};

describe('nome do arquivo do cântico novo', () => {
  it('vem do título, sem acento e com traços', () => {
    expect(slugDoTitulo('Canção da Esperança!', [])).toBe('cancao-da-esperanca');
  });

  it('não repete um nome que já existe', () => {
    expect(slugDoTitulo('Paz no Caminho', ['paz-no-caminho'])).toBe('paz-no-caminho-2');
    expect(slugDoTitulo('Paz no Caminho', ['paz-no-caminho', 'paz-no-caminho-2'])).toBe('paz-no-caminho-3');
  });

  it('título só com símbolos ainda gera um nome', () => {
    expect(slugDoTitulo('!!!', [])).toBe('cantico');
  });
});

describe('número sugerido para o cântico novo', () => {
  it('é o próximo depois do maior', () => {
    expect(numeroLivre([12, 90, 35])).toBe(91);
    expect(numeroLivre([])).toBe(1);
  });
});

describe('arquivo do cântico novo', () => {
  it('tem os campos no formato do app e passa na conferência', () => {
    const texto = montarYamlNovo(dados);
    expect(parse(texto)).toEqual({
      numero: 91,
      titulo: 'Rio de Paz',
      versoes: [{ tom: 'D', compasso: '4/4', bpm: 72, chordpro: dados.chordpro }],
    });
    expect(validarYaml(texto)).toBeUndefined();
  });

  it('sem número e sem BPM, os campos ficam de fora', () => {
    const { numero: _n, bpm: _b, ...semOpcionais } = dados;
    const lido = parse(montarYamlNovo(semOpcionais));
    expect(lido).not.toHaveProperty('numero');
    expect(lido.versoes[0]).not.toHaveProperty('bpm');
  });
});

describe('correção de um cântico que já existe', () => {
  const atual = [
    '# Comentário que precisa ficar.',
    'numero: 35',
    'titulo: Paz no Caminho',
    'tags: [louvor]',
    'versoes:',
    '  - tom: C',
    '    compasso: 3/4',
    '    bpm: 66',
    '    chordpro: |',
    '      [C]Pelo caminho [F]vou',
    '    direitos:',
    '      origemCifra: própria',
    '',
  ].join('\n');

  it('troca só o que o admin aprovou e guarda o resto (comentários, tags, direitos)', () => {
    const texto = atualizarYaml(atual, { ...dados, titulo: 'Paz no Caminho', numero: 35, bpm: 70 });
    expect(texto).toContain('# Comentário que precisa ficar.');
    const lido = parse(texto);
    expect(lido.tags).toEqual(['louvor']);
    expect(lido.versoes[0]).toMatchObject({ tom: 'D', compasso: '4/4', bpm: 70, chordpro: dados.chordpro });
    expect(lido.versoes[0].direitos).toEqual({ origemCifra: 'própria' });
  });

  it('BPM ou número apagados saem do arquivo', () => {
    const { numero: _n, bpm: _b, ...semOpcionais } = dados;
    const lido = parse(atualizarYaml(atual, semOpcionais));
    expect(lido).not.toHaveProperty('numero');
    expect(lido.versoes[0]).not.toHaveProperty('bpm');
  });
});

describe('conferência antes de publicar', () => {
  it('explica o problema quando o arquivo não seria aceito pelo app', () => {
    expect(validarYaml(montarYamlNovo({ ...dados, tom: 'H' }))).toMatch(/tom/);
  });
});
