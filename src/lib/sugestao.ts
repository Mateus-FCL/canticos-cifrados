/**
 * Sugestão de cântico (novo ou correção) enviada por qualquer pessoa, sem login.
 * Lógica pura, sem DOM: a mesma conferência roda na tela e, depois, no servidor.
 */

export const TONS = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
] as const;

export const COMPASSOS = ['4/4', '3/4', '6/8', '2/4', '12/8'] as const;

export const LIMITES = { titulo: 120, cifra: 30_000, nome: 80, contato: 120, observacao: 500 } as const;

export interface Sugestao {
  tipo: 'novo' | 'correcao';
  /** Na correção: o cântico que está sendo corrigido. */
  canticoId?: string;
  titulo: string;
  /** Como a pessoa colou: acordes em cima da letra (o conversor transforma em ChordPro). */
  cifra: string;
  tom: string;
  compasso: string;
  /** Em branco quando a pessoa não sabe. */
  bpm?: number;
  nome?: string;
  contato?: string;
  /** Na correção: o que a pessoa mudou. */
  observacao?: string;
}

export type Erros = Partial<Record<keyof Sugestao, string>>;

const grande = 'Ficou muito grande.';

/** Mensagens por campo; objeto vazio quando está tudo certo. */
export function errosDaSugestao(s: Sugestao): Erros {
  const erros: Erros = {};
  if (s.titulo.trim() === '') erros.titulo = 'Escreva o nome da música.';
  else if (s.titulo.length > LIMITES.titulo) erros.titulo = grande;

  if (s.cifra.trim() === '') erros.cifra = 'Cole a cifra (letra com os acordes).';
  else if (s.cifra.length > LIMITES.cifra) erros.cifra = `${grande} Mande uma música por vez.`;

  if (!(TONS as readonly string[]).includes(s.tom)) erros.tom = 'Escolha o tom.';
  if (!(COMPASSOS as readonly string[]).includes(s.compasso)) erros.compasso = 'Escolha o compasso.';
  if (s.bpm !== undefined && (!Number.isInteger(s.bpm) || s.bpm < 30 || s.bpm > 300)) {
    erros.bpm = 'O BPM fica entre 30 e 300.';
  }

  if ((s.nome?.length ?? 0) > LIMITES.nome) erros.nome = grande;
  if ((s.contato?.length ?? 0) > LIMITES.contato) erros.contato = grande;
  if ((s.observacao?.length ?? 0) > LIMITES.observacao) erros.observacao = grande;

  if (s.tipo === 'correcao' && !s.canticoId) erros.canticoId = 'Falta dizer qual cântico está sendo corrigido.';
  return erros;
}
