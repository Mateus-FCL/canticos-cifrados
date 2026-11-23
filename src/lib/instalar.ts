/** Quando mostrar o convite "Instalar o app". Lógica pura, sem DOM. */

export const DIAS_ATE_OFERECER_DE_NOVO = 30;
const DIA = 24 * 60 * 60 * 1000;

/** `dispensadoEm`: quando a pessoa tocou em "Agora não" (milissegundos, como texto), ou null. */
export function deveOferecerInstalar(dispensadoEm: string | null, agora: number): boolean {
  const quando = Number(dispensadoEm);
  if (dispensadoEm === null || !Number.isFinite(quando) || dispensadoEm.trim() === '') return true;
  return agora - quando >= DIAS_ATE_OFERECER_DE_NOVO * DIA;
}
