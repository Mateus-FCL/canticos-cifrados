/**
 * Busca no texto da letra (o índice é gerado pelo Pagefind no build). Lógica pura, sem DOM.
 */

/** Número sozinho já é resolvido pela busca da lista; letra só a partir de 3 caracteres. */
export function deveBuscarNaLetra(busca: string): boolean {
  const texto = busca.trim();
  return texto.length >= 3 && !/^[\d\s]+$/.test(texto);
}

export interface Parte {
  texto: string;
  destaque: boolean;
}

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodificar(texto: string): string {
  return texto.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (inteira, codigo: string) => {
    if (codigo.startsWith('#x') || codigo.startsWith('#X')) return String.fromCodePoint(parseInt(codigo.slice(2), 16));
    if (codigo.startsWith('#')) return String.fromCodePoint(Number(codigo.slice(1)));
    return ENTIDADES[codigo.toLowerCase()] ?? inteira;
  });
}

/**
 * O trecho do Pagefind vem como HTML com <mark> na palavra encontrada.
 * Aqui ele vira pedaços de texto puro, para a tela montar sem usar innerHTML.
 */
export function partesDoTrecho(trecho: string): Parte[] {
  const partes: Parte[] = [];
  let destaque = false;
  for (const pedaco of trecho.split(/(<\/?mark>)/i)) {
    if (/^<mark>$/i.test(pedaco)) destaque = true;
    else if (/^<\/mark>$/i.test(pedaco)) destaque = false;
    else if (pedaco) partes.push({ texto: decodificar(pedaco), destaque });
  }
  return partes;
}

/** "/canticos/paz-no-caminho/" → "paz-no-caminho". */
export function idDaUrl(url: string): string | undefined {
  return /^\/canticos\/([^/]+)\//.exec(url)?.[1];
}

const encontrados = (n: number) => (n === 1 ? '1 cântico encontrado' : `${n} cânticos encontrados`);

/** Aviso lido pelo leitor de tela: quantos pelo número ou título e quantos a mais pela letra. */
export function avisoDaBusca(pelosTitulos: number, naLetra: number): string {
  if (pelosTitulos === 0 && naLetra === 0) return 'Nenhum cântico encontrado.';
  if (naLetra === 0) return `${encontrados(pelosTitulos)}.`;
  if (pelosTitulos === 0) return `${encontrados(naLetra)} na letra.`;
  return `${encontrados(pelosTitulos)} e mais ${naLetra} na letra.`;
}
