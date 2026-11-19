import { describe, expect, it } from 'vitest';
import { avisoDaBusca, deveBuscarNaLetra, idDaUrl, partesDoTrecho } from '../src/lib/busca';

describe('quando buscar no texto da letra', () => {
  it('só com 3 letras ou mais', () => {
    expect(deveBuscarNaLetra('pa')).toBe(false);
    expect(deveBuscarNaLetra(' paz ')).toBe(true);
  });

  it('número sozinho fica só na busca por número', () => {
    expect(deveBuscarNaLetra('123')).toBe(false);
    expect(deveBuscarNaLetra(' 12 35 ')).toBe(false);
    expect(deveBuscarNaLetra('salmo 23')).toBe(true);
  });
});

describe('trecho da letra com a palavra destacada', () => {
  it('separa o que é destaque do resto', () => {
    expect(partesDoTrecho('Pelo <mark>caminho</mark> vou')).toEqual([
      { texto: 'Pelo ', destaque: false },
      { texto: 'caminho', destaque: true },
      { texto: ' vou', destaque: false },
    ]);
  });

  it('desfaz os códigos de caracteres especiais', () => {
    expect(partesDoTrecho('Tu &amp; eu &lt;sempre&gt; &quot;juntos&quot; d&#39;água')).toEqual([
      { texto: 'Tu & eu <sempre> "juntos" d\'água', destaque: false },
    ]);
  });

  it('nunca devolve HTML: qualquer outra marcação vira texto', () => {
    expect(partesDoTrecho('<mark><b>paz</b></mark>')).toEqual([{ texto: '<b>paz</b>', destaque: true }]);
  });

  it('ignora pedaços vazios', () => {
    expect(partesDoTrecho('<mark>paz</mark>')).toEqual([{ texto: 'paz', destaque: true }]);
    expect(partesDoTrecho('')).toEqual([]);
  });
});

describe('id do cântico a partir do endereço do resultado', () => {
  it('lê o nome da página', () => {
    expect(idDaUrl('/canticos/paz-no-caminho/')).toBe('paz-no-caminho');
    expect(idDaUrl('/canticos/paz-no-caminho/index.html')).toBe('paz-no-caminho');
  });

  it('não confunde com outras páginas', () => {
    expect(idDaUrl('/setlists/')).toBeUndefined();
  });
});

describe('aviso com o total encontrado', () => {
  it('conta título e letra', () => {
    expect(avisoDaBusca(0, 0)).toBe('Nenhum cântico encontrado.');
    expect(avisoDaBusca(1, 0)).toBe('1 cântico encontrado.');
    expect(avisoDaBusca(3, 0)).toBe('3 cânticos encontrados.');
    expect(avisoDaBusca(0, 1)).toBe('1 cântico encontrado na letra.');
    expect(avisoDaBusca(0, 2)).toBe('2 cânticos encontrados na letra.');
    expect(avisoDaBusca(1, 2)).toBe('1 cântico encontrado e mais 2 na letra.');
  });
});
