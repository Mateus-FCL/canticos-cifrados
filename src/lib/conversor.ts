/**
 * Conversão entre a cifra copiada de sites (acordes numa linha, letra embaixo) e o ChordPro
 * que o app guarda. Lógica pura, sem DOM. Usada na tela "Sugerir cântico".
 *
 * Limite conhecido: uma linha só de acordes (introdução, solo) logo antes de uma linha de
 * letra é lida como os acordes daquela letra, porque o formato não diferencia os dois casos.
 * A prévia mostra o resultado, e o admin pode ajustar antes de aprovar.
 */
import { lerAcorde, normalizarAcorde } from './acorde';
import { lerChordpro } from './chordpro';

/** Marcas que podem aparecer numa linha de acordes sem serem acordes: | / - (2x) x2. */
const MARCA = /^(?:\||\/|-+|\(?\d+x\)?|\(?x\d+\)?)$/i;
const REPETICAO = /^\(?\d+x\)?$|^\(?x\d+\)?$/i;
/** Linha de tablatura: "E|---3---|". */
const TABLATURA = /^\s*[A-Ga-g][#b]?\s*\|/;
const CAPOTRASTE = /^\s*capo/i;
const LINHA_TOM = /^\s*tom\s*:\s*(\S+)/i;
/** "[Refrão]", "[Intro] G D", com o resto da linha (pode ser vazio). */
const MARCADOR_COLCHETES = /^\s*\[([^\]]+)\]\s*(.*)$/;
/** "Refrão", "Parte 2:", "Intro: G D". */
const MARCADOR_PALAVRA =
  /^\s*((?:intro(?:dução)?|refr[ãa]o|coro|estrofe|verso|ponte|pr[ée]-refr[ãa]o|final|solo|interl[úu]dio|parte)(?:\s*\d+)?)\s*:?\s*(.*)$/i;

function palavras(linha: string): string[] {
  return linha.trim().split(/\s+/).filter(Boolean);
}

export function ehLinhaDeAcordes(linha: string): boolean {
  const acordes = palavras(linha).filter((p) => !MARCA.test(p));
  return acordes.length > 0 && acordes.every((p) => lerAcorde(p) !== null);
}

/** Acordes da linha com a coluna onde cada um começa. Marcas de repetição viram texto. */
function acordesComColuna(linha: string): { coluna: number; acorde: string }[] {
  return [...linha.matchAll(/\S+/g)].flatMap((m) => {
    const palavra = m[0];
    if (MARCA.test(palavra)) return [];
    return [{ coluna: m.index, acorde: normalizarAcorde(palavra) ?? palavra }];
  });
}

/** "[G] [D] [Em]" (mais a marca de repetição, se houver, como texto). */
function linhaSoDeAcordes(linha: string): string {
  const repeticao = palavras(linha).filter((p) => REPETICAO.test(p));
  const acordes = acordesComColuna(linha).map((a) => `[${a.acorde}]`);
  return [...acordes, ...repeticao].join(' ');
}

/** Colchetes e chaves na letra confundiriam o ChordPro: viram parênteses. */
function letraSegura(letra: string): string {
  return letra.replace(/[[{]/g, '(').replace(/[\]}]/g, ')');
}

/** Encaixa os acordes na letra, na coluna em que estavam. */
function juntar(linhaDeAcordes: string, letra: string): string {
  let resultado = letraSegura(letra.trimEnd());
  const acordes = acordesComColuna(linhaDeAcordes)
    .map(({ coluna, acorde }) => {
      // Caiu num espaço: vai para o começo da palavra seguinte.
      let onde = coluna;
      while (onde < resultado.length && resultado[onde] === ' ') onde++;
      return { onde: onde >= resultado.length ? Math.max(coluna, resultado.length) : onde, acorde };
    })
    .sort((a, b) => b.onde - a.onde);
  for (const { onde, acorde } of acordes) {
    resultado = resultado.padEnd(onde, ' ');
    resultado = `${resultado.slice(0, onde)}[${acorde}]${resultado.slice(onde)}`;
  }
  return resultado.trimStart();
}

/** Tom no formato do app ("G", "F#", "Em") a partir de um acorde. */
function tomDoAcorde(texto: string): string | undefined {
  const acorde = lerAcorde(texto);
  if (!acorde) return undefined;
  const menor = acorde.sufixo.startsWith('m') && !acorde.sufixo.startsWith('maj');
  return acorde.raiz + (menor ? 'm' : '');
}

export interface Conversao {
  chordpro: string;
  /** Da linha "Tom:" ou, sem ela, do primeiro acorde. */
  tom?: string;
}

export function converterCifra(texto: string): Conversao {
  const linhas = texto.replace(/\r\n?/g, '\n').replace(/ /g, ' ').replace(/\t/g, '    ').split('\n');
  const saida: string[] = [];
  let tom: string | undefined;
  let primeiroAcorde: string | undefined;

  const marcador = (titulo: string, resto: string) => {
    saida.push(`{c: ${titulo.trim()}}`);
    if (ehLinhaDeAcordes(resto)) saida.push(linhaSoDeAcordes(resto));
  };

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] ?? '';
    if (TABLATURA.test(linha) || CAPOTRASTE.test(linha)) continue;

    const linhaTom = LINHA_TOM.exec(linha);
    if (linhaTom) {
      tom ??= tomDoAcorde(linhaTom[1] ?? '');
      continue;
    }

    if (linha.trim() === '') {
      saida.push('');
      continue;
    }

    const colchetes = MARCADOR_COLCHETES.exec(linha);
    if (colchetes && lerAcorde(colchetes[1] ?? '') === null && (colchetes[2] === '' || ehLinhaDeAcordes(colchetes[2] ?? ''))) {
      marcador(colchetes[1] ?? '', colchetes[2] ?? '');
      continue;
    }
    const palavra = MARCADOR_PALAVRA.exec(linha);
    if (palavra && (palavra[2] === '' || ehLinhaDeAcordes(palavra[2] ?? ''))) {
      marcador(palavra[1] ?? '', palavra[2] ?? '');
      continue;
    }

    if (ehLinhaDeAcordes(linha)) {
      primeiroAcorde ??= acordesComColuna(linha)[0]?.acorde;
      const seguinte = linhas[i + 1];
      const temLetraEmbaixo =
        seguinte !== undefined &&
        seguinte.trim() !== '' &&
        !ehLinhaDeAcordes(seguinte) &&
        !TABLATURA.test(seguinte) &&
        !MARCADOR_COLCHETES.test(seguinte) &&
        !(MARCADOR_PALAVRA.exec(seguinte)?.[2] === '');
      if (temLetraEmbaixo) {
        saida.push(juntar(linha, seguinte));
        i++;
      } else {
        saida.push(linhaSoDeAcordes(linha));
      }
      continue;
    }

    saida.push(letraSegura(linha.trim()));
  }

  // Várias linhas em branco viram uma; as das pontas saem.
  const chordpro = saida
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  tom ??= primeiroAcorde ? tomDoAcorde(primeiroAcorde) : undefined;
  return tom ? { chordpro, tom } : { chordpro };
}

/** O caminho de volta: ChordPro → acordes em cima da letra (para corrigir um cântico). */
export function cifraParaTexto(chordpro: string): string {
  const blocos = lerChordpro(chordpro).map((secao) => {
    const linhas: string[] = [];
    const titulo = secao.titulo ?? (secao.refrao ? 'Refrão' : undefined);
    if (titulo) linhas.push(`[${titulo}]`);
    for (const { segmentos } of secao.linhas) {
      const soAcordes = segmentos.every((s) => s.texto.trim() === '' && s.acorde !== undefined && !s.naoAcorde);
      if (soAcordes) {
        linhas.push(segmentos.map((s) => s.acorde).join('  '));
        continue;
      }
      let acordes = '';
      let letra = '';
      for (const s of segmentos) {
        if (s.acorde !== undefined && s.naoAcorde) {
          letra += `(${s.acorde})`;
        } else if (s.acorde !== undefined) {
          acordes = acordes.length > letra.length ? `${acordes} ` : acordes.padEnd(letra.length, ' ');
          acordes += s.acorde;
        }
        letra += s.texto;
      }
      if (acordes.trim()) linhas.push(acordes.trimEnd());
      linhas.push(letra.trimEnd());
    }
    return linhas.join('\n');
  });
  return blocos.join('\n\n');
}

/** Busca da música no Cifra Club (pela busca do Google, que sempre funciona). */
export function linkDeBusca(nome: string): string {
  const q = `${nome.trim()} cifra site:cifraclub.com.br`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
