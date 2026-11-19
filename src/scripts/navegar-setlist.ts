/**
 * Cântico aberto pela setlist (/canticos/x/?setlist=id): mostra "Anterior" e "Próximo",
 * e o "Voltar" do alto leva de volta à setlist em vez da lista de cânticos.
 */
import { linkNaSetlist, rotuloNavegacao, vizinhos } from '../lib/setlists';
import { carregarSetlists } from './setlists';

export function iniciarNavegacaoNaSetlist() {
  const cantico = document.querySelector<HTMLElement>('.cifra')?.dataset['id'];
  const idSetlist = new URLSearchParams(location.search).get('setlist');
  const nav = document.querySelector<HTMLElement>('.nav-setlist');
  if (!cantico || !idSetlist || !nav) return;

  const setlist = carregarSetlists().find((s) => s.id === idSetlist);
  const posicao = setlist && vizinhos(setlist, cantico);
  if (!setlist || !posicao) return; // setlist apagada, ou o cântico saiu dela: página normal

  const voltar = document.querySelector<HTMLAnchorElement>('.voltar');
  if (voltar) {
    voltar.href = `/setlists/ver/?id=${encodeURIComponent(idSetlist)}`;
    voltar.textContent = '← Voltar à setlist';
  }

  nav.querySelector('.nav-posicao')!.textContent = rotuloNavegacao(setlist.nome, posicao);

  const ligar = (seletor: string, destino: string | undefined) => {
    const link = nav.querySelector<HTMLAnchorElement>(seletor)!;
    if (destino) link.href = linkNaSetlist(destino, idSetlist);
    link.hidden = !destino;
  };
  ligar('.nav-anterior', posicao.anterior);
  ligar('.nav-proximo', posicao.proximo);
  // No último cântico, o lugar do "Próximo" vira o caminho de volta.
  nav.querySelector<HTMLAnchorElement>('.nav-fim')!.hidden = posicao.proximo !== undefined;
  nav.querySelector<HTMLAnchorElement>('.nav-fim')!.href = `/setlists/ver/?id=${encodeURIComponent(idSetlist)}`;

  nav.hidden = false;
}
