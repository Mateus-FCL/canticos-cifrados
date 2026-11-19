/**
 * Adaptador das setlists no navegador (a regra está em lib/setlists).
 * Ficam guardadas só neste aparelho; sem armazenamento, valem até fechar a página.
 */
import { escreverSetlists, lerSetlists, type Setlist } from '../lib/setlists';

export const CHAVE_SETLISTS = 'canticos:setlists';

export function carregarSetlists(): Setlist[] {
  try {
    return lerSetlists(localStorage.getItem(CHAVE_SETLISTS));
  } catch {
    return [];
  }
}

/** Devolve false quando o navegador não deixa guardar (ex.: modo anônimo, memória cheia). */
export function guardarSetlists(lista: Setlist[]): boolean {
  try {
    localStorage.setItem(CHAVE_SETLISTS, escreverSetlists(lista));
    return true;
  } catch {
    return false;
  }
}

export function novoId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // randomUUID só existe em https; no teste pela rede local ele falta.
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}
