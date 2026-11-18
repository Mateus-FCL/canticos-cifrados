/**
 * Leitura e escrita de acordes na cifra brasileira (ver docs/convencoes.md).
 * Lê a notação brasileira e a americana; escreve só a brasileira.
 * `B` é Si; a notação alemã (`H`) não é aceita.
 */

export interface Acorde {
  /** Nota fundamental com acidente: `C`, `F#`, `Bb`. */
  raiz: string;
  /** Tudo depois da raiz, já na forma brasileira: `m7`, `7M`, `m7(b5)`, `°`. */
  sufixo: string;
  /** Nota do baixo, em acorde invertido como `C/E`. */
  baixo?: string;
}

const RAIZ = /^([A-G][#b]?)(.*)$/;
const BAIXO = /^(.*)\/([A-G][#b]?)$/;

/** Peças que podem formar um sufixo. A barra só vale entre números, como em 6/9. */
const SUFIXO_VALIDO = /^(?:maj|Maj|M|m|dim|aug|aum|sus|add|º|°|ø|Δ|\+|-|\d+|\(|\)|b|#|,|\/(?=\d))*$/;

/** Da forma americana (ou variações) para a brasileira. A ordem importa. */
const PARA_BRASILEIRA: [RegExp, string][] = [
  [/^(?:ø7?|m7\(?b5\)?)/, 'm7(b5)'],
  [/^m(?:\(maj7\)|maj7|Maj7|M7|7M)/, 'm7M'],
  [/^(?:maj7|Maj7|M7|Δ7?)/, '7M'],
  [/^(?:aug|aum)/, '+'],
  [/^(?:dim|º)/, '°'],
];

function sufixoBrasileiro(sufixo: string): string {
  for (const [padrao, troca] of PARA_BRASILEIRA) {
    if (padrao.test(sufixo)) return sufixo.replace(padrao, troca);
  }
  return sufixo;
}

/** Lê um acorde. Devolve `null` se o texto não for acorde (ex.: `x2`, `Refrão`). */
export function lerAcorde(texto: string): Acorde | null {
  const partes = texto.trim().match(RAIZ);
  if (!partes) return null;
  const [, raiz = '', resto = ''] = partes;

  const comBaixo = resto.match(BAIXO);
  const sufixo = comBaixo ? (comBaixo[1] ?? '') : resto;
  if (!SUFIXO_VALIDO.test(sufixo)) return null;

  const acorde: Acorde = { raiz, sufixo: sufixoBrasileiro(sufixo) };
  if (comBaixo?.[2]) acorde.baixo = comBaixo[2];
  return acorde;
}

export function escreverAcorde({ raiz, sufixo, baixo }: Acorde): string {
  return `${raiz}${sufixo}${baixo ? `/${baixo}` : ''}`;
}

/** Reescreve um acorde na cifra brasileira. `null` se não for acorde. */
export function normalizarAcorde(texto: string): string | null {
  const acorde = lerAcorde(texto);
  return acorde ? escreverAcorde(acorde) : null;
}
