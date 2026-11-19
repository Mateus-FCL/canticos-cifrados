/**
 * Adaptador do tamanho da letra na tela do cântico (a regra está em lib/tamanho).
 * Vale para todos os cânticos e fica guardado neste aparelho.
 */
import { NIVEL_PADRAO, TOTAL_NIVEIS, aumentar, descreverNivel, diminuir, escalaDoNivel, lerNivel } from '../lib/tamanho';

const CHAVE = 'canticos:tamanho';

function lerSalvo(): number {
  try {
    return lerNivel(localStorage.getItem(CHAVE));
  } catch {
    return NIVEL_PADRAO;
  }
}

function salvar(nivel: number) {
  try {
    if (nivel === NIVEL_PADRAO) localStorage.removeItem(CHAVE);
    else localStorage.setItem(CHAVE, String(nivel));
  } catch {
    // Sem armazenamento: vale só até fechar a página.
  }
}

function aplicarNaPagina(nivel: number) {
  document.documentElement.style.setProperty('--escala-letra', String(escalaDoNivel(nivel)));
}

export function iniciarTamanho() {
  let aplicado = lerSalvo();
  aplicarNaPagina(aplicado);

  const cifra = document.querySelector<HTMLElement>('.cifra');
  const botao = document.querySelector<HTMLButtonElement>('.abrir-tamanho');
  const tela = document.querySelector<HTMLDialogElement>('.tela-tamanho');
  if (!cifra || !botao || !tela) return;

  const q = <T extends Element>(seletor: string) => tela.querySelector<T>(seletor);
  const previa = q<HTMLElement>('.previa-tamanho');
  const nivelTexto = q<HTMLElement>('.nivel');
  const barra = q<HTMLElement>('.barra');
  const menor = q<HTMLButtonElement>('.menor');
  const maior = q<HTMLButtonElement>('.maior');

  const marcas = Array.from({ length: TOTAL_NIVEIS }, () => document.createElement('span'));
  barra?.replaceChildren(...marcas);

  let pendente = aplicado;

  const mostrarNaTela = () => {
    previa?.style.setProperty('--escala-previa', String(escalaDoNivel(pendente)));
    if (nivelTexto) nivelTexto.textContent = descreverNivel(pendente);
    marcas.forEach((marca, i) => marca.toggleAttribute('data-cheio', i < pendente));
    if (menor) menor.disabled = pendente <= 1;
    if (maior) maior.disabled = pendente >= TOTAL_NIVEIS;
  };

  botao.hidden = false;

  botao.addEventListener('click', () => {
    pendente = aplicado;
    // Prévia com as três primeiras linhas com letra, já no tom em uso.
    const linhas = [...cifra.querySelectorAll('.linha:not([data-so-acordes])')].slice(0, 3);
    previa?.replaceChildren(...linhas.map((l) => l.cloneNode(true)));
    mostrarNaTela();
    tela.showModal();
  });

  menor?.addEventListener('click', () => {
    pendente = diminuir(pendente);
    mostrarNaTela();
  });
  maior?.addEventListener('click', () => {
    pendente = aumentar(pendente);
    mostrarNaTela();
  });

  // "Voltar" (ou Esc) fecha sem mudar nada; "Concluído" aplica e guarda.
  q('.voltar-tamanho')?.addEventListener('click', () => tela.close());
  q('.concluir-tamanho')?.addEventListener('click', () => {
    aplicado = pendente;
    salvar(aplicado);
    aplicarNaPagina(aplicado);
    tela.close();
  });
}
