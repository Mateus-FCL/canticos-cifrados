/**
 * Transforma a sugestão aprovada no arquivo do cântico (src/content/canticos/<id>.yaml).
 * Lógica pura: quem grava no GitHub é o servidor (worker/github.ts).
 */
import { parse, parseDocument, stringify } from 'yaml';
import { canticoSchema } from '../src/lib/cantico';
import { normalizar } from '../src/lib/lista';

export interface DadosAprovados {
  titulo: string;
  numero?: number;
  tom: string;
  compasso: string;
  bpm?: number;
  /** Já convertido para ChordPro. */
  chordpro: string;
}

/** Nome do arquivo a partir do título, sem repetir um que já existe. */
export function slugDoTitulo(titulo: string, existentes: readonly string[]): string {
  const base =
    normalizar(titulo)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cantico';
  let slug = base;
  for (let n = 2; existentes.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export function numeroLivre(numeros: readonly number[]): number {
  return numeros.length === 0 ? 1 : Math.max(...numeros) + 1;
}

export function montarYamlNovo(d: DadosAprovados): string {
  const versao = {
    tom: d.tom,
    compasso: d.compasso,
    ...(d.bpm === undefined ? {} : { bpm: d.bpm }),
    chordpro: d.chordpro,
  };
  const cantico = {
    ...(d.numero === undefined ? {} : { numero: d.numero }),
    titulo: d.titulo,
    versoes: [versao],
  };
  return `# Sugerido pelo app e aprovado pelo admin.\n${stringify(cantico)}`;
}

/** Correção: troca só os campos aprovados e mantém o resto do arquivo (comentários, tags, direitos…). */
export function atualizarYaml(textoAtual: string, d: DadosAprovados): string {
  const doc = parseDocument(textoAtual);
  doc.set('titulo', d.titulo);
  if (d.numero === undefined) doc.delete('numero');
  else doc.set('numero', d.numero);
  doc.setIn(['versoes', 0, 'tom'], d.tom);
  doc.setIn(['versoes', 0, 'compasso'], d.compasso);
  if (d.bpm === undefined) doc.deleteIn(['versoes', 0, 'bpm']);
  else doc.setIn(['versoes', 0, 'bpm'], d.bpm);
  doc.setIn(['versoes', 0, 'chordpro'], d.chordpro);
  return doc.toString();
}

/** Mensagem do primeiro problema, ou undefined se o app aceita o arquivo. */
export function validarYaml(texto: string): string | undefined {
  const resultado = canticoSchema.safeParse(parse(texto));
  if (resultado.success) return undefined;
  const [problema] = resultado.error.issues;
  return problema ? `${problema.path.join('.')}: ${problema.message}` : 'arquivo inválido';
}
