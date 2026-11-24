/**
 * Desenha uma cifra (ChordPro) no navegador, com as mesmas peças da tela do cântico
 * (src/pages/canticos/[id].astro), para a prévia ficar igual. O estilo vem de
 * src/styles/cifra.css: o alvo precisa da classe "desenho-cifra".
 * Só cria texto (nunca innerHTML): o que a pessoa colou não vira código.
 */
import { lerChordpro } from '../lib/chordpro';
import { palavrasDaLinha, soAcordes } from '../lib/palavras';

function elemento<K extends keyof HTMLElementTagNameMap>(tag: K, classe: string, texto?: string) {
  const el = document.createElement(tag);
  el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

export function desenharCifra(alvo: HTMLElement, chordpro: string) {
  const secoes = lerChordpro(chordpro).map((secao) => {
    const el = elemento('section', secao.refrao ? 'secao refrao' : 'secao');
    if (secao.titulo) el.append(elemento('h2', 'titulo-secao', secao.titulo));
    for (const linha of secao.linhas) {
      const p = elemento('p', 'linha');
      if (soAcordes(linha)) p.dataset['soAcordes'] = '';
      for (const palavra of palavrasDaLinha(linha)) {
        const span = elemento('span', 'palavra');
        for (const peca of palavra) {
          const pecaEl = elemento('span', 'peca');
          pecaEl.append(
            elemento('span', peca.naoAcorde ? 'acorde nao-acorde' : 'acorde', peca.acorde ?? ''),
            elemento('span', 'texto', peca.texto),
          );
          span.append(pecaEl);
        }
        p.append(span, ' ');
      }
      el.append(p);
    }
    return el;
  });
  alvo.replaceChildren(...secoes);
}
