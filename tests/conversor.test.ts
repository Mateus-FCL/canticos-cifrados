import { describe, expect, it } from 'vitest';
import { lerChordpro } from '../src/lib/chordpro';
import { bpmDosToques, cifraParaTexto, converterCifra, ehLinhaDeAcordes, linkDeBusca } from '../src/lib/conversor';

/** Junta linhas, para escrever as cifras de exemplo sem se perder nos espaços. */
const texto = (...linhas: string[]) => linhas.join('\n');

describe('linha só de acordes', () => {
  it('reconhece acordes separados por espaços', () => {
    expect(ehLinhaDeAcordes('G              D')).toBe(true);
    expect(ehLinhaDeAcordes('  Am7   D/F#  C7M  Bm7(b5)')).toBe(true);
  });

  it('aceita marcas de repetição e barras de compasso', () => {
    expect(ehLinhaDeAcordes('G  D  Em  C  (2x)')).toBe(true);
    expect(ehLinhaDeAcordes('| G  | D  |')).toBe(true);
  });

  it('frases com palavras que parecem acordes ("Em", "E", "A") continuam sendo letra', () => {
    expect(ehLinhaDeAcordes('Em teus braços')).toBe(false);
    expect(ehLinhaDeAcordes('E a tua graça')).toBe(false);
  });

  it('linha vazia ou só marcas não é linha de acordes', () => {
    expect(ehLinhaDeAcordes('')).toBe(false);
    expect(ehLinhaDeAcordes('(2x)')).toBe(false);
  });
});

describe('converter a cifra copiada de um site (acordes em cima da letra)', () => {
  it('põe cada acorde no ponto da letra onde ele estava', () => {
    const { chordpro } = converterCifra(texto('G              D', 'Cantamos juntos canção'));
    expect(chordpro).toBe('[G]Cantamos juntos [D]canção');
  });

  it('acorde no meio da palavra fica no meio da palavra', () => {
    expect(converterCifra(texto('      D', 'Cantamos')).chordpro).toBe('Cantam[D]os');
  });

  it('acorde depois do fim da letra fica no fim', () => {
    expect(converterCifra(texto('G           C', 'Pelo')).chordpro).toBe('[G]Pelo        [C]');
  });

  it('escreve os acordes na cifra brasileira', () => {
    expect(converterCifra(texto('Cmaj7 Bø', 'Santo santo')).chordpro).toBe('[C7M]Santo [Bm7(b5)]santo');
  });

  it('acorde que caiu no espaço entre palavras vai para o começo da palavra seguinte', () => {
    expect(converterCifra(texto('G              D', 'Cantamos juntos  canção')).chordpro).toBe(
      '[G]Cantamos juntos  [D]canção',
    );
  });

  it('linha de acordes sem letra embaixo (introdução, solo) fica só com os acordes', () => {
    const { chordpro } = converterCifra(texto('G  D  Em  C', '', 'Letra'));
    expect(chordpro).toBe(texto('[G] [D] [Em] [C]', '', 'Letra'));
  });

  it('marcadores de parte viram título de seção', () => {
    const { chordpro } = converterCifra(texto('[Refrão]', 'G', 'Aleluia', '', 'Parte 2:', 'Amém'));
    expect(chordpro).toBe(texto('{c: Refrão}', '[G]Aleluia', '', '{c: Parte 2}', 'Amém'));
  });

  it('"[Intro] G D" vira título e linha de acordes', () => {
    expect(converterCifra('[Intro] G  D  Em').chordpro).toBe(texto('{c: Intro}', '[G] [D] [Em]'));
  });

  it('lê o tom da linha "Tom:" e tira a linha da cifra', () => {
    const resultado = converterCifra(texto('Tom: Em', '', 'Em', 'Senhor'));
    expect(resultado.tom).toBe('Em');
    expect(resultado.chordpro).toBe('[Em]Senhor');
  });

  it('sem "Tom:", sugere o tom pelo primeiro acorde', () => {
    expect(converterCifra(texto('Am7   D', 'Glória')).tom).toBe('Am');
    expect(converterCifra(texto('F#7M', 'Paz')).tom).toBe('F#');
  });

  it('descarta tablatura e linha de capotraste', () => {
    const { chordpro } = converterCifra(
      texto('Capotraste na 2ª casa', 'E|-----3---|', 'B|---1-----|', 'G', 'Luz'),
    );
    expect(chordpro).toBe('[G]Luz');
  });

  it('junta várias linhas em branco numa só e tira as das pontas', () => {
    expect(converterCifra(texto('', '', 'Um', '', '', '', 'Dois', '')).chordpro).toBe(texto('Um', '', 'Dois'));
  });

  it('colchetes e chaves na letra não confundem o formato', () => {
    expect(converterCifra('Santo {santo} [santo]').chordpro).toBe('Santo (santo) (santo)');
  });

  it('o resultado é lido pela tela do cântico', () => {
    const { chordpro } = converterCifra(texto('[Refrão]', 'G       D', 'Aleluia amém'));
    const [secao] = lerChordpro(chordpro);
    expect(secao?.titulo).toBe('Refrão');
    expect(secao?.linhas[0]?.segmentos.map((s) => s.acorde)).toEqual(['G', 'D']);
  });
});

describe('o caminho de volta (para corrigir um cântico que já está no app)', () => {
  it('escreve os acordes em cima da letra', () => {
    expect(cifraParaTexto('[G]Cantamos juntos [D]canção')).toBe(
      texto('G               D', 'Cantamos juntos canção'),
    );
  });

  it('título de seção vira [Título], e refrão sem título vira [Refrão]', () => {
    expect(cifraParaTexto(texto('{c: Estrofe 1}', 'Luz'))).toBe(texto('[Estrofe 1]', 'Luz'));
    expect(cifraParaTexto(texto('{soc}', 'Glória', '{eoc}'))).toBe(texto('[Refrão]', 'Glória'));
  });

  it('linha só de acordes fica só com os acordes', () => {
    expect(cifraParaTexto('[G] [D] [Em]')).toBe('G  D  Em');
  });

  it('ida e volta devolve a mesma cifra', () => {
    // Linha só de acordes logo antes de uma letra é ambígua nesse formato (os acordes
    // seriam lidos como sendo daquela letra); por isso, aqui ela vem no fim da seção.
    const original = texto(
      '{c: Estrofe 1}',
      '[G]Cantamos juntos [C]can[D]ção',
      '[Em]Com a voz e o [C]coração',
      '',
      '{c: Refrão}',
      'Aleluia',
      '[G] [D] [Em] [C]',
    );
    expect(converterCifra(cifraParaTexto(original)).chordpro).toBe(original);
  });
});

describe('"Toque no ritmo" (BPM pelos toques)', () => {
  it('calcula pelo intervalo entre os toques', () => {
    expect(bpmDosToques([0, 1000, 2000, 3000])).toBe(60);
    expect(bpmDosToques([0, 500, 1000, 1500, 2000])).toBe(120);
  });

  it('um toque fora do ritmo não estraga a conta', () => {
    expect(bpmDosToques([0, 500, 1000, 1700, 2200, 2700])).toBe(120);
  });

  it('precisa de pelo menos 3 toques', () => {
    expect(bpmDosToques([0, 500])).toBeUndefined();
  });

  it('uma pausa longa recomeça a contagem', () => {
    expect(bpmDosToques([0, 500, 1000, 9000, 10000, 11000, 12000])).toBe(60);
  });

  it('fica entre 30 e 300 BPM', () => {
    expect(bpmDosToques([0, 100, 200, 300])).toBe(300);
  });
});

describe('link para procurar a cifra', () => {
  it('procura o nome da música no Cifra Club', () => {
    const url = new URL(linkDeBusca('Grande é o Senhor'));
    expect(url.protocol).toBe('https:');
    expect(url.searchParams.get('q')).toBe('Grande é o Senhor cifra site:cifraclub.com.br');
  });
});
