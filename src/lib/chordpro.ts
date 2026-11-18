/**
 * Leitura do formato ChordPro: `[G]Cantamos [C]juntos`.
 * O acorde entre colchetes fica sobre o texto que vem logo depois dele.
 * Lógica pura, sem DOM: a tela só desenha o que sai daqui.
 */
import { normalizarAcorde } from './acorde';

export interface Segmento {
  /** Acorde na cifra brasileira, ou o texto original se não for acorde (`naoAcorde`). */
  acorde?: string;
  /** Texto que fica sob o acorde. Pode ser vazio (acorde no fim da linha). */
  texto: string;
  /** Havia algo entre colchetes que não é acorde, como `[x2]`. */
  naoAcorde?: true;
}

export interface Linha {
  segmentos: Segmento[];
}

export interface Secao {
  /** Ex.: "Estrofe 1", "Refrão". */
  titulo?: string;
  refrao: boolean;
  linhas: Linha[];
}

const DIRETIVA = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i;
const COLCHETES = /\[([^[\]]*)\]/g;

const TITULO = new Set(['c', 'comment', 'ci', 'comment_italic', 'cb', 'comment_box']);
const INICIO_REFRAO = new Set(['soc', 'start_of_chorus']);
const FIM_REFRAO = new Set(['eoc', 'end_of_chorus']);
const INICIO_ESTROFE = new Set(['sov', 'start_of_verse', 'sob', 'start_of_bridge']);
const FIM_ESTROFE = new Set(['eov', 'end_of_verse', 'eob', 'end_of_bridge']);

function lerLinha(linha: string): Linha {
  const segmentos: Segmento[] = [];
  const marcas = [...linha.matchAll(COLCHETES)];

  const antes = linha.slice(0, marcas[0]?.index ?? linha.length);
  if (antes) segmentos.push({ texto: antes });

  marcas.forEach((marca, i) => {
    const inicio = (marca.index ?? 0) + marca[0].length;
    const fim = marcas[i + 1]?.index ?? linha.length;
    const texto = linha.slice(inicio, fim);
    const bruto = marca[1] ?? '';
    const acorde = normalizarAcorde(bruto);
    segmentos.push(acorde ? { acorde, texto } : { acorde: bruto.trim(), texto, naoAcorde: true });
  });

  return { segmentos };
}

/** Lê o texto ChordPro e devolve as seções (estrofes, refrões) com as linhas. */
export function lerChordpro(fonte: string): Secao[] {
  const secoes: Secao[] = [];
  let atual: Secao | null = null;
  let dentroDoRefrao = false;

  const fechar = () => {
    if (atual && (atual.linhas.length > 0 || atual.titulo)) secoes.push(atual);
    atual = null;
  };
  const abrir = (titulo?: string, refrao = dentroDoRefrao) => {
    fechar();
    atual = { refrao, linhas: [] };
    if (titulo) atual.titulo = titulo;
  };

  for (const crua of fonte.split(/\r?\n/)) {
    const linha = crua.trimEnd();
    const diretiva = linha.trim().match(DIRETIVA);

    if (diretiva) {
      const nome = (diretiva[1] ?? '').toLowerCase();
      const valor = diretiva[2]?.trim() || undefined;
      if (TITULO.has(nome)) abrir(valor);
      else if (INICIO_REFRAO.has(nome)) {
        dentroDoRefrao = true;
        abrir(valor ?? 'Refrão', true);
      } else if (FIM_REFRAO.has(nome)) {
        dentroDoRefrao = false;
        fechar();
      } else if (INICIO_ESTROFE.has(nome)) abrir(valor);
      else if (FIM_ESTROFE.has(nome)) fechar();
      // Outras diretivas ({title}, {key}...) vêm do YAML do cântico e são ignoradas aqui.
      continue;
    }

    if (linha.trim() === '') {
      fechar();
      continue;
    }

    if (!atual) abrir();
    (atual as Secao | null)?.linhas.push(lerLinha(linha));
  }

  fechar();
  return secoes;
}

/** Só a letra, sem acordes nem diretivas. Seções separadas por linha em branco. */
export function letraDe(fonte: string): string {
  return lerChordpro(fonte)
    .map((secao) =>
      secao.linhas
        .map((linha) => linha.segmentos.map((s) => s.texto).join('').trim())
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n');
}
