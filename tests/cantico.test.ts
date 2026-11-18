import { describe, expect, it } from 'vitest';
import { canticoSchema } from '../src/lib/cantico';

const versao = {
  tom: 'G',
  compasso: '4/4',
  bpm: 72,
  chordpro: '{c: Estrofe 1}\n[G]Cantamos [C]juntos',
};

const cantico = {
  numero: 12,
  titulo: 'Cântico de Exemplo',
  versoes: [versao],
};

describe('canticoSchema', () => {
  it('aceita um cântico mínimo e preenche os padrões', () => {
    const r = canticoSchema.parse(cantico);
    expect(r.pessoas).toEqual([]);
    expect(r.versoes[0]?.direitos).toBeUndefined();
  });

  it('número é opcional', () => {
    const { numero: _, ...semNumero } = cantico;
    expect(canticoSchema.safeParse(semNumero).success).toBe(true);
  });

  it('número precisa ser inteiro positivo', () => {
    for (const numero of [0, -3, 1.5]) {
      expect(canticoSchema.safeParse({ ...cantico, numero }).success).toBe(false);
    }
  });

  it('título não pode ser vazio', () => {
    expect(canticoSchema.safeParse({ ...cantico, titulo: '  ' }).success).toBe(false);
  });

  it('precisa de pelo menos uma versão', () => {
    expect(canticoSchema.safeParse({ ...cantico, versoes: [] }).success).toBe(false);
  });

  it.each(['C', 'G', 'Em', 'F#', 'F#m', 'Bb', 'Ebm'])('aceita o tom %s', (tom) => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, tom }] });
    expect(r.success).toBe(true);
  });

  it.each(['H', 'g', 'Sol', 'G7', 'C#b', ''])('recusa o tom "%s"', (tom) => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, tom }] });
    expect(r.success).toBe(false);
  });

  it.each(['4/4', '3/4', '6/8', '2/2'])('aceita o compasso %s', (compasso) => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, compasso }] });
    expect(r.success).toBe(true);
  });

  it.each(['4', 'quatro', '4/0', '0/4'])('recusa o compasso "%s"', (compasso) => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, compasso }] });
    expect(r.success).toBe(false);
  });

  it('bpm precisa ser inteiro entre 30 e 300', () => {
    for (const bpm of [29, 301, 72.5]) {
      const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, bpm }] });
      expect(r.success).toBe(false);
    }
  });

  it('chordpro não pode ser vazio', () => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, chordpro: '\n ' }] });
    expect(r.success).toBe(false);
  });

  it('tags são opcionais e começam vazias', () => {
    expect(canticoSchema.parse(cantico).tags).toEqual([]);
  });

  it('aceita tags e tira espaços das pontas', () => {
    const r = canticoSchema.parse({ ...cantico, tags: [' louvor ', 'ceia'] });
    expect(r.tags).toEqual(['louvor', 'ceia']);
  });

  it('recusa tag vazia ou repetida', () => {
    expect(canticoSchema.safeParse({ ...cantico, tags: [''] }).success).toBe(false);
    expect(canticoSchema.safeParse({ ...cantico, tags: ['ceia', 'ceia'] }).success).toBe(false);
  });

  it('áudio e PDF são opcionais na versão', () => {
    const r = canticoSchema.parse(cantico);
    expect(r.versoes[0]?.audio).toBeUndefined();
    expect(r.versoes[0]?.pdf).toBeUndefined();
  });

  it.each([
    'https://midia.exemplo.org/012-cantico-de-exemplo.mp3',
    'https://midia.exemplo.org/012.m4a',
    'https://midia.exemplo.org/012.ogg',
    'https://midia.exemplo.org/012.opus',
  ])('aceita o áudio %s', (audio) => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, audio }] });
    expect(r.success).toBe(true);
  });

  it.each([
    'http://midia.exemplo.org/012.mp3',
    'https://midia.exemplo.org/012.pdf',
    '012.mp3',
    '',
  ])('recusa o áudio "%s"', (audio) => {
    const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, audio }] });
    expect(r.success).toBe(false);
  });

  it('aceita PDF com https e extensão .pdf', () => {
    const pdf = 'https://midia.exemplo.org/012-cantico-de-exemplo.pdf';
    const r = canticoSchema.parse({ ...cantico, versoes: [{ ...versao, pdf }] });
    expect(r.versoes[0]?.pdf).toBe(pdf);
  });

  it.each(['http://midia.exemplo.org/012.pdf', 'https://midia.exemplo.org/012.mp3', '012.pdf'])(
    'recusa o PDF "%s"',
    (pdf) => {
      const r = canticoSchema.safeParse({ ...cantico, versoes: [{ ...versao, pdf }] });
      expect(r.success).toBe(false);
    },
  );

  it('direitos são informativos e opcionais', () => {
    const direitos = { origemLetra: 'Autoria própria', origemCifra: 'Autoria própria' };
    const r = canticoSchema.parse({ ...cantico, versoes: [{ ...versao, direitos }] });
    expect(r.versoes[0]?.direitos).toEqual(direitos);
  });
});
