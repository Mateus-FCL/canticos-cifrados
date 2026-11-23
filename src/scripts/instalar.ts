/**
 * Convite "Instalar o app" na lista de cânticos. Só aparece quando o navegador
 * avisa que dá para instalar (Chrome, Edge, Samsung Internet no Android). No iPhone
 * não existe esse aviso: lá se instala pelo menu Compartilhar → "Adicionar à Tela de Início".
 */
import { deveOferecerInstalar } from '../lib/instalar';

const CHAVE = 'canticos:instalar-dispensado';

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function iniciarConviteInstalar() {
  const convite = document.querySelector<HTMLElement>('.instalar');
  const sim = convite?.querySelector<HTMLButtonElement>('.instalar-sim');
  const nao = convite?.querySelector<HTMLButtonElement>('.instalar-nao');
  if (!convite || !sim || !nao) return;

  let dispensado: string | null = null;
  try {
    dispensado = localStorage.getItem(CHAVE);
  } catch {}
  if (!deveOferecerInstalar(dispensado, Date.now())) return;

  let evento: EventoInstalar | undefined;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // o convite é nosso, no lugar da barrinha do navegador
    evento = e as EventoInstalar;
    convite.hidden = false;
  });

  sim.addEventListener('click', async () => {
    if (!evento) return;
    await evento.prompt();
    evento = undefined;
    convite.hidden = true;
  });

  nao.addEventListener('click', () => {
    convite.hidden = true;
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {}
  });

  window.addEventListener('appinstalled', () => {
    convite.hidden = true;
  });
}
