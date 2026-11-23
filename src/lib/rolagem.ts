/**
 * Autorolagem guiada pelo BPM. Lógica pura, sem DOM.
 *
 * O ChordPro não diz quanto tempo cada linha dura, então o app estima:
 * cada acorde vale um compasso (o costume nas cifras), e uma linha sem acorde
 * continua o anterior por dois compassos. O "mapa de batidas" sai disso no build,
 * e a pessoa ajusta a velocidade quando a estimativa não bate com a música.
 */
import type { Linha } from './chordpro';

export const VELOCIDADE_MIN = 0.5;
export const VELOCIDADE_MAX = 1.5;
const COMPASSOS_SEM_ACORDE = 2;

/** Batidas (as do BPM) em cada compasso. Em 6/8, 9/8 e 12/8 o BPM conta a semínima pontuada. */
export function temposPorCompasso(compasso: string): number {
  const partes = /^(\d+)\/(\d+)$/.exec(compasso);
  if (!partes) return 4;
  const cima = Number(partes[1]);
  const baixo = Number(partes[2]);
  return baixo === 8 && cima > 3 && cima % 3 === 0 ? cima / 3 : cima;
}

export function batidasDaLinha(linha: Linha, tempos: number): number {
  const acordes = linha.segmentos.filter((s) => s.acorde !== undefined && !s.naoAcorde).length;
  return (acordes || COMPASSOS_SEM_ACORDE) * tempos;
}

/** Batida em que cada linha começa. */
export function inicios(batidas: readonly number[]): number[] {
  let soma = 0;
  return batidas.map((b) => {
    const inicio = soma;
    soma += b;
    return inicio;
  });
}

const total = (batidas: readonly number[]) => batidas.reduce((a, b) => a + b, 0);

/**
 * Onde a tela deve estar (em px, no ponto de leitura) numa batida.
 * `topos`: topo de cada linha na página; `fim`: onde a última termina.
 * `porLinha`: pula de linha em linha, sem deslizar (para quem pede menos movimento).
 */
export function posicaoNaBatida(
  topos: readonly number[],
  batidas: readonly number[],
  fim: number,
  batida: number,
  porLinha = false,
): number {
  if (topos.length === 0) return fim;
  if (batida <= 0) return topos[0]!;
  const comeco = inicios(batidas);
  for (let i = 0; i < topos.length; i++) {
    const dura = batidas[i] ?? 0;
    if (dura <= 0 || batida >= comeco[i]! + dura) continue;
    const topo = topos[i]!;
    if (porLinha) return topo;
    const proximo = topos[i + 1] ?? fim;
    return topo + ((batida - comeco[i]!) / dura) * (proximo - topo);
  }
  return fim;
}

/** O caminho de volta: em que batida está quem lê na posição `y`. */
export function batidaNaPosicao(
  topos: readonly number[],
  batidas: readonly number[],
  fim: number,
  y: number,
): number {
  if (topos.length === 0 || y <= topos[0]!) return 0;
  const comeco = inicios(batidas);
  for (let i = 0; i < topos.length; i++) {
    const topo = topos[i]!;
    const proximo = topos[i + 1] ?? fim;
    if (proximo <= topo || y >= proximo) continue;
    return comeco[i]! + (batidas[i] ?? 0) * ((y - topo) / (proximo - topo));
  }
  return total(batidas);
}

/** Batida depois de `ms` milissegundos. */
export function avancar(batida: number, ms: number, bpm: number, velocidade: number): number {
  return batida + (ms / 1000) * (bpm / 60) * velocidade;
}

/** Mais devagar (-1) ou mais rápido (+1), de 10 em 10%. */
export function mudarVelocidade(velocidade: number, direcao: 1 | -1): number {
  const nova = Math.round((velocidade + direcao * 0.1) * 10) / 10;
  return Math.min(VELOCIDADE_MAX, Math.max(VELOCIDADE_MIN, nova));
}

export function rotuloVelocidade(velocidade: number): string {
  return `Velocidade ${Math.round(velocidade * 100)}%`;
}

export function rotuloAndamento(compasso: string, bpm: number): string {
  return `${compasso} · ${bpm} BPM`;
}
