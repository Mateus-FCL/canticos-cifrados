/**
 * Autorolagem na tela do cântico (as contas estão em lib/rolagem, testadas).
 * - A linha que está sendo cantada fica a 30% do alto da tela.
 * - Tocar numa linha faz a rolagem seguir dali (ressincronizar).
 * - Rolar a tela com o dedo, a roda do mouse ou o teclado pausa: o app não briga com a pessoa.
 * - Com "reduzir movimento" ligado no sistema, a tela pula de linha em linha em vez de deslizar.
 */
import {
  avancar,
  batidaNaPosicao,
  inicios,
  mudarVelocidade,
  posicaoNaBatida,
  rotuloVelocidade,
} from '../lib/rolagem';

const PONTO_DE_LEITURA = 0.3;
const TECLAS_DE_ROLAR = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export function iniciarRolagem() {
  const cifra = document.querySelector<HTMLElement>('.cifra');
  const abrir = document.querySelector<HTMLButtonElement>('.abrir-rolagem');
  const barra = document.querySelector<HTMLElement>('.barra-rolagem');
  const bpm = Number(cifra?.dataset['bpm']);
  if (!cifra || !abrir || !barra || !bpm) return;

  const q = <T extends Element>(seletor: string) => barra.querySelector<T>(seletor)!;
  const estado = q<HTMLElement>('.estado-rolagem');
  const detalhe = q<HTMLElement>('.detalhe-rolagem');
  const pausar = q<HTMLButtonElement>('.pausar-rolagem');
  const devagar = q<HTMLButtonElement>('.mais-devagar');
  const rapido = q<HTMLButtonElement>('.mais-rapido');

  const linhas = [...cifra.querySelectorAll<HTMLElement>('.linha')];
  const batidas = linhas.map((l) => Number(l.dataset['batidas']) || 0);
  const comeco = inicios(batidas);
  const totalBatidas = batidas.reduce((a, b) => a + b, 0);
  const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)');

  const CHAVE = `canticos:velocidade:${cifra.dataset['id'] ?? ''}`;
  let velocidade = 1;
  try {
    const salva = Number(localStorage.getItem(CHAVE));
    if (salva >= 0.5 && salva <= 1.5) velocidade = salva;
  } catch {}

  let ativa = false; // a barra está aberta
  let rodando = false;
  let batida = 0;
  let escolhida = false; // a pessoa tocou numa linha enquanto estava pausado
  let ultimo = 0;
  let quadro = 0;

  /** Topos medidos a cada quadro: tamanho da letra, modo e tela girada mudam o desenho. */
  const medir = () => {
    const topos = linhas.map((l) => l.getBoundingClientRect().top + scrollY);
    const ultima = linhas[linhas.length - 1];
    const fim = ultima ? ultima.getBoundingClientRect().bottom + scrollY : 0;
    return { topos, fim };
  };
  const pontoDeLeitura = () => innerHeight * PONTO_DE_LEITURA;

  const mostrar = (texto: string) => {
    estado.textContent = texto;
  };
  const atualizarBotoes = () => {
    barra.toggleAttribute('data-pausado', !rodando);
    pausar.querySelector('.icone-rolagem')!.textContent = rodando ? '⏸' : '▶';
    pausar.querySelector('.palavra-rolagem')!.textContent = rodando ? ' Pausar' : ' Continuar';
    detalhe.textContent = `${bpm} BPM · ${rotuloVelocidade(velocidade)}`;
    devagar.disabled = velocidade <= 0.5;
    rapido.disabled = velocidade >= 1.5;
  };

  const posicionar = () => {
    const { topos, fim } = medir();
    const y = posicaoNaBatida(topos, batidas, fim, batida, menosMovimento.matches);
    scrollTo({ top: Math.max(0, y - pontoDeLeitura()), behavior: 'instant' });
  };

  const passo = (agora: number) => {
    if (!rodando) return;
    batida = avancar(batida, Math.min(agora - ultimo, 250), bpm, velocidade);
    ultimo = agora;
    if (batida >= totalBatidas) {
      batida = totalBatidas;
      posicionar();
      parar('Fim do cântico.');
      return;
    }
    posicionar();
    quadro = requestAnimationFrame(passo);
  };

  const comecar = () => {
    if (!escolhida) {
      const { topos, fim } = medir();
      batida = batidaNaPosicao(topos, batidas, fim, scrollY + pontoDeLeitura());
      if (batida >= totalBatidas) batida = 0; // estava no fim: recomeça
    }
    escolhida = false;
    rodando = true;
    ultimo = performance.now();
    mostrar('Rolando a letra.');
    atualizarBotoes();
    quadro = requestAnimationFrame(passo);
  };

  function parar(texto: string) {
    rodando = false;
    cancelAnimationFrame(quadro);
    mostrar(texto);
    atualizarBotoes();
  }

  const abrirBarra = () => {
    ativa = true;
    barra.hidden = false;
    abrir.hidden = true;
    comecar();
  };

  const fecharBarra = () => {
    parar('');
    ativa = false;
    barra.hidden = true;
    abrir.hidden = false;
    abrir.focus();
  };

  abrir.hidden = false;
  abrir.addEventListener('click', abrirBarra);
  q('.fechar-rolagem').addEventListener('click', fecharBarra);
  pausar.addEventListener('click', () => (rodando ? parar('Pausado.') : comecar()));

  const ajustar = (direcao: 1 | -1) => {
    velocidade = mudarVelocidade(velocidade, direcao);
    try {
      if (velocidade === 1) localStorage.removeItem(CHAVE);
      else localStorage.setItem(CHAVE, String(velocidade));
    } catch {}
    atualizarBotoes();
  };
  devagar.addEventListener('click', () => ajustar(-1));
  rapido.addEventListener('click', () => ajustar(1));

  // Tocar numa linha: a rolagem segue dali.
  cifra.addEventListener('click', (evento) => {
    if (!ativa) return;
    const linha = (evento.target as Element).closest<HTMLElement>('.linha');
    const i = linha ? linhas.indexOf(linha) : -1;
    if (i < 0) return;
    batida = comeco[i] ?? 0;
    posicionar();
    if (rodando) mostrar('Seguindo da linha tocada.');
    else {
      escolhida = true;
      mostrar('Pausado. Continuar segue desta linha.');
    }
  });

  // A pessoa rolou a tela: pausa, para não brigar com ela.
  const pausarPelaPessoa = () => {
    if (rodando) parar('Pausado: você rolou a tela.');
  };
  addEventListener('wheel', pausarPelaPessoa, { passive: true });
  addEventListener('touchmove', pausarPelaPessoa, { passive: true });
  addEventListener('keydown', (evento) => {
    if (TECLAS_DE_ROLAR.has(evento.key) && !(evento.target instanceof HTMLButtonElement)) pausarPelaPessoa();
  });

  // Uma tela por cima (Tom, Tamanho, Setlist) ou o app em segundo plano: pausa.
  for (const tela of document.querySelectorAll('dialog')) {
    new MutationObserver(() => {
      if (tela.open && rodando) parar('Pausado.');
    }).observe(tela, { attributes: true, attributeFilter: ['open'] });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rodando) parar('Pausado.');
  });

  atualizarBotoes();
}
