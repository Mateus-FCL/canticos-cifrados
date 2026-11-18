/**
 * Troca de tom. Lógica pura, sem DOM.
 * Sustenido ou bemol é escolhido pelo tom de destino (Mi bemol, não Ré sustenido),
 * e o baixo do acorde (C/E) muda junto. O sufixo (7M, m7(b5)...) não muda.
 */
import { escreverAcorde, lerAcorde } from './acorde';

const POSICAO: Record<string, number> = {
  C: 0, 'B#': 0,
  'C#': 1, Db: 1,
  D: 2,
  'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, 'E#': 5,
  'F#': 6, Gb: 6,
  G: 7,
  'G#': 8, Ab: 8,
  A: 9,
  'A#': 10, Bb: 10,
  B: 11, Cb: 11,
};

const SUSTENIDOS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BEMOIS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Nome usual de cada tom, como os músicos escrevem. */
const TONS_MAIORES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TONS_MENORES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

const TOM = /^([A-G][#b]?)(m?)$/;

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function posicao(nota: string): number {
  const p = POSICAO[nota];
  if (p === undefined) throw new Error(`nota desconhecida: ${nota}`);
  return p;
}

/** Deixa a troca entre -5 e +6 meios tons: o mesmo tom pelo caminho mais curto. */
export function normalizarSemitons(semitons: number): number {
  const r = mod12(semitons);
  return r > 6 ? r - 12 : r;
}

/** Tom com bemol na armadura: F, Bb, Eb, Ab, Db, Gb e os menores Dm, Gm, Cm, Fm, Bbm, Ebm. */
export function usaBemol(tom: string): boolean {
  const [, raiz = '', menor = ''] = tom.match(TOM) ?? [];
  if (raiz.endsWith('b')) return true;
  return menor ? ['D', 'G', 'C', 'F'].includes(raiz) : raiz === 'F';
}

/** Tom depois de subir (positivo) ou descer (negativo) meios tons. */
export function transporTom(tom: string, semitons: number): string {
  const partes = tom.match(TOM);
  if (!partes) return tom;
  const [, raiz = '', menor = ''] = partes;
  const destino = mod12(posicao(raiz) + semitons);
  return (menor ? TONS_MENORES : TONS_MAIORES)[destino] + menor;
}

/** Acorde transposto, escrito com sustenido ou bemol conforme o tom de destino. */
export function transporAcorde(texto: string, semitons: number, tomDestino: string): string {
  const acorde = lerAcorde(texto);
  if (!acorde) return texto;

  const nomes = usaBemol(tomDestino) ? BEMOIS : SUSTENIDOS;
  const mover = (nota: string) => nomes[mod12(posicao(nota) + semitons)] ?? nota;

  const novo = { ...acorde, raiz: mover(acorde.raiz) };
  if (acorde.baixo) novo.baixo = mover(acorde.baixo);
  return escreverAcorde(novo);
}
