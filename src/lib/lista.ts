/** Lógica pura da lista de cânticos: ordem e busca. Sem DOM. */

export interface ItemLista {
  id: string;
  numero?: number;
  titulo: string;
  tom: string;
}

/** O mínimo de uma entrada da coleção que a lista precisa. */
interface EntradaCantico {
  id: string;
  data: { numero?: number | undefined; titulo: string; versoes: { tom: string }[] };
}

const colacao = new Intl.Collator('pt-BR', { sensitivity: 'base' });

/** Minúsculas, sem acento e sem espaços sobrando, para comparar textos. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** Itens da lista: primeiro os numerados, em ordem; depois os sem número, por título. */
export function itensDaLista(entradas: EntradaCantico[]): ItemLista[] {
  return entradas
    .map(({ id, data }) => ({
      id,
      titulo: data.titulo,
      tom: data.versoes[0]?.tom ?? '',
      ...(data.numero === undefined ? {} : { numero: data.numero }),
    }))
    .sort((a, b) => {
      if (a.numero !== undefined && b.numero !== undefined) return a.numero - b.numero;
      if (a.numero !== undefined) return -1;
      if (b.numero !== undefined) return 1;
      return colacao.compare(a.titulo, b.titulo);
    });
}

/**
 * O item aparece se cada palavra da busca estiver no título,
 * ou, se a palavra for só algarismos, se o número do cântico começar com ela.
 */
export function corresponde(item: ItemLista, busca: string): boolean {
  const palavras = normalizar(busca).split(' ').filter(Boolean);
  const titulo = normalizar(item.titulo);
  const numero = item.numero === undefined ? '' : String(item.numero);

  return palavras.every(
    (palavra) => titulo.includes(palavra) || (/^\d+$/.test(palavra) && numero.startsWith(palavra)),
  );
}
