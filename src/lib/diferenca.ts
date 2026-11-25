/**
 * Diferença linha a linha entre duas versões de uma cifra (a atual e a sugerida), para o admin
 * ver o que mudou numa correção. Lógica pura, sem DOM.
 */

export interface LinhaDiferente {
  tipo: 'igual' | 'saiu' | 'entrou';
  texto: string;
}

/** Usa a maior sequência comum: o que não está nela saiu (da atual) ou entrou (na sugerida). */
export function diferencaDeLinhas(antes: readonly string[], depois: readonly string[]): LinhaDiferente[] {
  const a = antes.map((l) => l.trimEnd());
  const b = depois.map((l) => l.trimEnd());
  // comum[i][j] = tamanho da maior sequência comum entre a[i..] e b[j..]
  const comum = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      comum[i]![j] = a[i] === b[j] ? comum[i + 1]![j + 1]! + 1 : Math.max(comum[i + 1]![j]!, comum[i]![j + 1]!);
    }
  }

  const resultado: LinhaDiferente[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      resultado.push({ tipo: 'igual', texto: a[i]! });
      i++;
      j++;
    } else if (comum[i + 1]![j]! >= comum[i]![j + 1]!) {
      resultado.push({ tipo: 'saiu', texto: a[i]! });
      i++;
    } else {
      resultado.push({ tipo: 'entrou', texto: b[j]! });
      j++;
    }
  }
  for (; i < a.length; i++) resultado.push({ tipo: 'saiu', texto: a[i]! });
  for (; j < b.length; j++) resultado.push({ tipo: 'entrou', texto: b[j]! });
  return resultado;
}

export function houveMudanca(diferenca: readonly LinhaDiferente[]): boolean {
  return diferenca.some((l) => l.tipo !== 'igual');
}
