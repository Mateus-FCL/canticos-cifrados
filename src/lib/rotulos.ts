/**
 * Textos que ainda podem mudar com o cliente ficam aqui, num ponto só.
 * Ex.: se o rótulo do tom virar "Tom Sol", só esta função muda.
 */
export function rotuloTom(tom: string): string {
  return `Tom ${tom}`;
}

/** Texto do botão que abre a troca de tom, como no protótipo: "Tom: G". */
export function rotuloBotaoTom(tom: string): string {
  return `Tom: ${tom}`;
}
