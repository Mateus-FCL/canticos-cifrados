/**
 * Tamanho da letra do cântico em 5 níveis. Lógica pura, sem DOM.
 * A escala multiplica o tamanho que já vem do sistema: quem aumentou a letra
 * no celular continua com ela aumentada, e o nível soma por cima.
 */

/** Multiplicador de cada nível (posição 0 = nível 1). O nível 1 dá 19 px com a fonte padrão. */
const ESCALAS = [0.95, 1, 1.2, 1.45, 1.75] as const;

export const TOTAL_NIVEIS = ESCALAS.length;
export const NIVEL_PADRAO = 2;

export function escalaDoNivel(nivel: number): number {
  return ESCALAS[nivel - 1] ?? 1;
}

export function aumentar(nivel: number): number {
  return Math.min(nivel + 1, TOTAL_NIVEIS);
}

export function diminuir(nivel: number): number {
  return Math.max(nivel - 1, 1);
}

export function descreverNivel(nivel: number): string {
  return `Tamanho ${nivel} de ${TOTAL_NIVEIS}`;
}

/** Lê o nível guardado; qualquer coisa estranha volta ao padrão. */
export function lerNivel(valor: string | null): number {
  if (valor === null || !/^\d+$/.test(valor)) return NIVEL_PADRAO;
  const nivel = Number(valor);
  return nivel >= 1 && nivel <= TOTAL_NIVEIS ? nivel : NIVEL_PADRAO;
}
