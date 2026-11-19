/**
 * Setlists: listas de cânticos que a pessoa monta para um culto ou ensaio.
 * Lógica pura, sem DOM. Cada função devolve uma lista nova (nunca altera a recebida);
 * quando não há o que mudar, devolve a mesma lista, para a tela saber que nada aconteceu.
 * Ficam guardadas só neste aparelho (localStorage), no formato de escreverSetlists.
 */

export interface Setlist {
  id: string;
  nome: string;
  /** Ids dos cânticos (nome do arquivo YAML), na ordem de apresentação. */
  canticos: string[];
}

export const NOME_MAX = 60;
const VERSAO = 1;

export function limparNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ').slice(0, NOME_MAX).trim();
}

export function erroDoNome(nome: string): string | undefined {
  return limparNome(nome) === '' ? 'Escreva um nome para a setlist.' : undefined;
}

export function rotuloQuantidade(total: number): string {
  if (total === 0) return 'Nenhum cântico';
  return total === 1 ? '1 cântico' : `${total} cânticos`;
}

/** Anunciado depois de subir ou descer, para quem não vê a lista se mexer. */
export function avisoPosicao(titulo: string, posicao: number, total: number): string {
  return `“${titulo}” agora é o ${posicao}º de ${total}.`;
}

/** Troca uma setlist por outra; se a função não mudar nada, devolve a lista como estava. */
function alterar(lista: Setlist[], id: string, mudar: (s: Setlist) => Setlist): Setlist[] {
  const i = lista.findIndex((s) => s.id === id);
  const atual = lista[i];
  if (!atual) return lista;
  const nova = mudar(atual);
  return nova === atual ? lista : lista.map((s, j) => (j === i ? nova : s));
}

export function criarSetlist(lista: Setlist[], nome: string, id: string): Setlist[] {
  if (erroDoNome(nome) || lista.some((s) => s.id === id)) return lista;
  return [...lista, { id, nome: limparNome(nome), canticos: [] }];
}

export function renomearSetlist(lista: Setlist[], id: string, nome: string): Setlist[] {
  if (erroDoNome(nome)) return lista;
  return alterar(lista, id, (s) => ({ ...s, nome: limparNome(nome) }));
}

export function excluirSetlist(lista: Setlist[], id: string): Setlist[] {
  return lista.filter((s) => s.id !== id);
}

export function adicionarCantico(lista: Setlist[], id: string, cantico: string): Setlist[] {
  return alterar(lista, id, (s) => (s.canticos.includes(cantico) ? s : { ...s, canticos: [...s.canticos, cantico] }));
}

export function removerCantico(lista: Setlist[], id: string, cantico: string): Setlist[] {
  return alterar(lista, id, (s) =>
    s.canticos.includes(cantico) ? { ...s, canticos: s.canticos.filter((c) => c !== cantico) } : s,
  );
}

function mover(lista: Setlist[], id: string, cantico: string, passo: -1 | 1): Setlist[] {
  return alterar(lista, id, (s) => {
    const de = s.canticos.indexOf(cantico);
    const para = de + passo;
    if (de < 0 || para < 0 || para >= s.canticos.length) return s;
    const canticos = [...s.canticos];
    [canticos[de], canticos[para]] = [canticos[para]!, cantico];
    return { ...s, canticos };
  });
}

/** Sobe uma posição (toca antes). */
export function subir(lista: Setlist[], id: string, cantico: string): Setlist[] {
  return mover(lista, id, cantico, -1);
}

/** Desce uma posição (toca depois). */
export function descer(lista: Setlist[], id: string, cantico: string): Setlist[] {
  return mover(lista, id, cantico, 1);
}

export interface Vizinhos {
  anterior?: string;
  proximo?: string;
  /** Começa em 1, como a pessoa conta. */
  posicao: number;
  total: number;
}

/** Para os botões "anterior" e "próximo" quando o cântico é aberto pela setlist. */
export function vizinhos(setlist: Setlist, cantico: string): Vizinhos | undefined {
  const i = setlist.canticos.indexOf(cantico);
  if (i < 0) return undefined;
  const anterior = setlist.canticos[i - 1];
  const proximo = setlist.canticos[i + 1];
  return {
    ...(anterior !== undefined && { anterior }),
    ...(proximo !== undefined && { proximo }),
    posicao: i + 1,
    total: setlist.canticos.length,
  };
}

/** Tira os cânticos que não existem mais no app (ex.: arquivo removido). */
export function semAusentes(setlist: Setlist, existentes: ReadonlySet<string>): Setlist {
  return { ...setlist, canticos: setlist.canticos.filter((c) => existentes.has(c)) };
}

export function escreverSetlists(lista: Setlist[]): string {
  return JSON.stringify({ versao: VERSAO, setlists: lista });
}

/** Lê o que está guardado. Nada guardado ou dado estragado vira lista vazia, nunca erro. */
export function lerSetlists(texto: string | null): Setlist[] {
  let dados: unknown;
  try {
    dados = JSON.parse(texto ?? '');
  } catch {
    return [];
  }
  if (typeof dados !== 'object' || dados === null || !('versao' in dados) || !('setlists' in dados)) return [];
  if (dados.versao !== VERSAO || !Array.isArray(dados.setlists)) return [];

  const lista: Setlist[] = [];
  for (const item of dados.setlists as unknown[]) {
    const setlist = lerUma(item);
    if (setlist && !lista.some((s) => s.id === setlist.id)) lista.push(setlist);
  }
  return lista;
}

function lerUma(item: unknown): Setlist | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  const { id, nome, canticos } = item as Record<string, unknown>;
  if (typeof id !== 'string' || id === '' || typeof nome !== 'string' || erroDoNome(nome)) return undefined;
  const ids = Array.isArray(canticos) ? canticos.filter((c): c is string => typeof c === 'string' && c !== '') : [];
  return { id, nome: limparNome(nome), canticos: [...new Set(ids)] };
}
