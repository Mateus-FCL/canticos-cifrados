/**
 * Adaptador da troca de tom na tela do cântico (o cálculo está em lib/transposicao).
 * O tom escolhido fica guardado neste aparelho, um por cântico.
 */
import { rotuloBotaoTom } from '../lib/rotulos';
import { normalizarSemitons, transporAcorde, transporTom } from '../lib/transposicao';

const chave = (id: string) => `canticos:tom:${id}`;

function lerSalvo(id: string): number {
  try {
    const valor = Number.parseInt(localStorage.getItem(chave(id)) ?? '', 10);
    return Number.isFinite(valor) ? normalizarSemitons(valor) : 0;
  } catch {
    return 0;
  }
}

function salvar(id: string, semitons: number) {
  try {
    if (semitons === 0) localStorage.removeItem(chave(id));
    else localStorage.setItem(chave(id), String(semitons));
  } catch {
    // Sem armazenamento (aba privada etc.): vale só até fechar a página.
  }
}

/** Reescreve os acordes de um trecho da página no tom pedido. */
function transporTrecho(trecho: ParentNode, semitons: number, tomOriginal: string) {
  const destino = transporTom(tomOriginal, semitons);
  for (const el of trecho.querySelectorAll<HTMLElement>('[data-acorde]')) {
    el.textContent = transporAcorde(el.dataset['acorde'] ?? '', semitons, destino);
  }
}

export function iniciarTrocaDeTom() {
  const cifra = document.querySelector<HTMLElement>('.cifra');
  const botao = document.querySelector<HTMLButtonElement>('.abrir-tom');
  const tela = document.querySelector<HTMLDialogElement>('.tela-tom');
  if (!cifra || !botao || !tela) return;

  const id = cifra.dataset['id'] ?? '';
  const original = cifra.dataset['tom'] ?? '';
  const q = <T extends Element>(seletor: string) => tela.querySelector<T>(seletor);
  const tomAtual = q<HTMLElement>('.tom-atual');
  const tituloPrevia = q<HTMLElement>('.titulo-previa');
  const previa = q<HTMLElement>('.previa-linhas');

  let aplicado = lerSalvo(id);
  let pendente = aplicado;

  const mostrarNaPagina = () => {
    transporTrecho(cifra, aplicado, original);
    botao.textContent = rotuloBotaoTom(transporTom(original, aplicado));
  };

  const mostrarNaTela = () => {
    const tom = transporTom(original, pendente);
    if (tomAtual) tomAtual.textContent = tom;
    if (tituloPrevia) tituloPrevia.textContent = `Prévia no tom ${tom}`;
    if (previa) transporTrecho(previa, pendente, original);
  };

  // Prévia: as duas primeiras linhas que têm letra.
  if (previa) {
    const linhas = [...cifra.querySelectorAll('.linha:not([data-so-acordes])')].slice(0, 2);
    previa.replaceChildren(...linhas.map((l) => l.cloneNode(true)));
  }

  botao.hidden = false;
  mostrarNaPagina();

  botao.addEventListener('click', () => {
    pendente = aplicado;
    mostrarNaTela();
    tela.showModal();
  });

  const mudar = (semitons: number) => {
    pendente = normalizarSemitons(semitons);
    mostrarNaTela();
  };
  q('.descer')?.addEventListener('click', () => mudar(pendente - 1));
  q('.subir')?.addEventListener('click', () => mudar(pendente + 1));
  q('.original')?.addEventListener('click', () => mudar(0));

  // "Voltar" (ou Esc) fecha sem mudar nada; "Concluído" aplica e guarda.
  q('.voltar-tom')?.addEventListener('click', () => tela.close());
  q('.concluir-tom')?.addEventListener('click', () => {
    aplicado = pendente;
    salvar(id, aplicado);
    mostrarNaPagina();
    tela.close();
  });
}
