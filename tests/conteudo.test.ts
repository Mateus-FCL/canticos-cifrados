import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { canticoSchema } from '../src/lib/cantico';
import { lerChordpro } from '../src/lib/chordpro';

const pasta = new URL('../src/content/canticos/', import.meta.url);
const arquivos = readdirSync(pasta).filter((nome) => nome.endsWith('.yaml'));
const canticos = arquivos.map((nome) => ({
  nome,
  dados: canticoSchema.parse(parse(readFileSync(new URL(nome, pasta), 'utf8'))),
}));

describe('conteúdo em src/content/canticos', () => {
  it('tem pelo menos um cântico', () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  it('não repete número de cântico', () => {
    const numeros = canticos.map((c) => c.dados.numero).filter((n) => n !== undefined);
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it('todo acorde entre colchetes é um acorde reconhecido', () => {
    for (const { nome, dados } of canticos) {
      for (const versao of dados.versoes) {
        const estranhos = lerChordpro(versao.chordpro)
          .flatMap((s) => s.linhas)
          .flatMap((l) => l.segmentos)
          .filter((s) => s.naoAcorde)
          .map((s) => s.acorde);
        expect(estranhos, `${nome}: acordes não reconhecidos`).toEqual([]);
      }
    }
  });

  it('nome do arquivo em minúsculas, sem acento e com hífen', () => {
    for (const { nome } of canticos) {
      expect(nome).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.yaml$/);
    }
  });
});
