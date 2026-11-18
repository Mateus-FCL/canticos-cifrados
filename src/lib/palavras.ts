/**
 * Agrupa os segmentos de uma linha em palavras inteiras, para a tela só
 * quebrar a linha nos espaços (nunca em "lou|varemos" quando há acorde no meio).
 */
import type { Linha, Segmento } from './chordpro';

/** Pedaço de uma palavra: o acorde (se houver) fica sobre o texto. */
export type Peca = Segmento;
export type Palavra = Peca[];

export function palavrasDaLinha(linha: Linha): Palavra[] {
  const palavras: Palavra[] = [];
  let atual: Palavra = [];

  const fechar = () => {
    if (atual.length > 0) palavras.push(atual);
    atual = [];
  };

  for (const { acorde, texto, naoAcorde } of linha.segmentos) {
    const [primeiro = '', ...resto] = texto.split(/(\s+)/);

    // O primeiro trecho (até o primeiro espaço) fica sob o acorde.
    if (acorde !== undefined) {
      const peca: Peca = { acorde, texto: primeiro };
      if (naoAcorde) peca.naoAcorde = true;
      atual.push(peca);
    } else if (primeiro) {
      atual.push({ texto: primeiro });
    }

    // Cada espaço fecha a palavra; o que vem depois começa outra, sem acorde.
    for (const trecho of resto) {
      if (/^\s+$/.test(trecho)) fechar();
      else if (trecho) atual.push({ texto: trecho });
    }
  }

  fechar();
  return palavras;
}

/** Linha sem letra, só com acordes (ex.: introdução). Some no modo "Só letra". */
export function soAcordes(linha: Linha): boolean {
  return linha.segmentos.every((s) => s.texto.trim() === '');
}
