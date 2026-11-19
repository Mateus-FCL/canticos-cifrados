/**
 * "Adicionar à setlist" na tela do cântico: marca em quais setlists ele fica.
 * Nada é guardado até "Concluído"; "Voltar" (ou Esc) desfaz tudo, até a setlist criada ali.
 */
import {
  adicionarCantico,
  criarSetlist,
  erroDoNome,
  removerCantico,
  resumoDoCantico,
  rotuloQuantidade,
  type Setlist,
} from '../lib/setlists';
import { carregarSetlists, guardarSetlists, novoId } from './setlists';

export function iniciarAdicionarASetlist() {
  const cifra = document.querySelector<HTMLElement>('.cifra');
  const botao = document.querySelector<HTMLButtonElement>('.abrir-setlists');
  const aviso = document.querySelector<HTMLElement>('.aviso-setlist');
  const tela = document.querySelector<HTMLDialogElement>('.tela-setlists');
  const modelo = document.querySelector<HTMLTemplateElement>('.modelo-opcao-setlist');
  const cantico = cifra?.dataset['id'];
  if (!botao || !aviso || !tela || !modelo || !cantico) return;

  const q = <T extends Element>(seletor: string) => tela.querySelector<T>(seletor)!;
  const ul = q<HTMLUListElement>('.opcoes-marcar');
  const semSetlists = q<HTMLElement>('.sem-setlists');
  const form = q<HTMLFormElement>('.nova-aqui');
  const campo = q<HTMLInputElement>('.campo-texto');
  const erro = q<HTMLElement>('.mensagem-erro');

  let antes: Setlist[] = [];
  let pendente: Setlist[] = [];

  const quantidadeDe = (id: string) => rotuloQuantidade(pendente.find((s) => s.id === id)?.canticos.length ?? 0);

  // A opção vem de um <template> da página, então recebe o CSS dela.
  const desenhar = () => {
    semSetlists.hidden = pendente.length > 0;
    ul.hidden = pendente.length === 0;
    ul.replaceChildren(
      ...pendente.map((setlist) => {
        const li = modelo.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
        const caixa = li.querySelector('input')!;
        caixa.value = setlist.id;
        caixa.checked = setlist.canticos.includes(cantico);
        li.querySelector('.opcao-nome')!.textContent = setlist.nome;
        li.querySelector('.opcao-detalhe')!.textContent = quantidadeDe(setlist.id);
        return li;
      }),
    );
  };

  const mostrarErro = (mensagem: string) => {
    erro.textContent = mensagem;
    campo.setAttribute('aria-invalid', String(mensagem !== ''));
  };

  botao.hidden = false;

  botao.addEventListener('click', () => {
    antes = carregarSetlists();
    pendente = antes;
    form.reset();
    mostrarErro('');
    desenhar();
    tela.showModal();
  });

  ul.addEventListener('change', (evento) => {
    const caixa = evento.target as HTMLInputElement;
    const id = caixa.value;
    pendente = (caixa.checked ? adicionarCantico : removerCantico)(pendente, id, cantico);
    caixa.closest('li')!.querySelector('.opcao-detalhe')!.textContent = quantidadeDe(id);
  });

  campo.addEventListener('input', () => {
    if (erro.textContent) mostrarErro('');
  });

  // Criar ali mesmo já deixa a setlist nova marcada.
  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const problema = erroDoNome(campo.value);
    if (problema) {
      mostrarErro(problema);
      campo.focus();
      return;
    }
    const id = novoId();
    pendente = adicionarCantico(criarSetlist(pendente, campo.value, id), id, cantico);
    form.reset();
    desenhar();
    ul.querySelector<HTMLInputElement>(`input[value="${CSS.escape(id)}"]`)?.focus();
  });

  q('.voltar-setlists').addEventListener('click', () => tela.close());

  q('.concluir-setlists').addEventListener('click', () => {
    const resumo = resumoDoCantico(antes, pendente, cantico);
    if (resumo) {
      const guardou = guardarSetlists(pendente);
      aviso.textContent = guardou
        ? resumo
        : `${resumo} Este navegador não deixou guardar: a mudança some ao fechar a página.`;
    }
    tela.close();
  });
}
