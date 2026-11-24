/**
 * POST /api/sugestoes: recebe a sugestão (novo cântico ou correção) e guarda como pendente,
 * para o admin aprovar. Tudo que fala com o mundo de fora (banco, verificação de robô,
 * arquivos do site) chega por `Dependencias`, para os testes trocarem por versões de mentira.
 */
import { errosDaSugestao, type Sugestao } from '../src/lib/sugestao';

/** Tamanho máximo do pedido inteiro (a cifra sozinha já tem limite menor). */
export const TAMANHO_MAX = 64 * 1024;
/** Sugestões aceitas do mesmo endereço por hora. */
export const LIMITE_POR_HORA = 10;

export interface SugestaoGuardada {
  id: string;
  tipo: Sugestao['tipo'];
  canticoId?: string;
  dados: Sugestao;
  status: 'pendente' | 'aprovada' | 'recusada';
  criadaEm: string;
  /** Resumo do endereço IP (não o IP em si), só para o limite por hora. */
  resumoIp: string;
}

export interface BancoDeSugestoes {
  contarRecentes(resumoIp: string, desde: string): Promise<number>;
  guardar(sugestao: SugestaoGuardada): Promise<void>;
}

export interface Dependencias {
  banco: BancoDeSugestoes;
  /** Turnstile: confirma que quem enviou é uma pessoa. */
  confirmarHumano(token: string, ip: string): Promise<boolean>;
  canticoExiste(id: string): Promise<boolean>;
  resumoDoIp(ip: string): Promise<string>;
  agora(): Date;
  novoId(): string;
}

const json = (corpo: unknown, status: number) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '');
const opcional = (valor: unknown) => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined);

/** Monta a sugestão só com os campos conhecidos; tipo errado conta como em branco. */
function lerSugestao(corpo: Record<string, unknown>): Sugestao {
  const bpm = corpo['bpm'];
  const extras = {
    canticoId: opcional(corpo['canticoId']),
    nome: opcional(corpo['nome']),
    contato: opcional(corpo['contato']),
    observacao: opcional(corpo['observacao']),
  };
  return {
    tipo: corpo['tipo'] === 'correcao' ? 'correcao' : 'novo',
    titulo: texto(corpo['titulo']).trim(),
    cifra: texto(corpo['cifra']),
    tom: texto(corpo['tom']),
    compasso: texto(corpo['compasso']),
    // Em branco (null, vazio) fica sem BPM; qualquer outra coisa vai para a conferência.
    ...(bpm === null || bpm === undefined || bpm === '' ? {} : { bpm: typeof bpm === 'number' ? bpm : NaN }),
    ...Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== undefined)),
  };
}

export async function receberSugestao(pedido: Request, deps: Dependencias): Promise<Response> {
  if (pedido.method !== 'POST') return json({ erro: 'Use POST.' }, 405);
  const origem = pedido.headers.get('origin');
  if (origem && origem !== new URL(pedido.url).origin) return json({ erro: 'Envio não permitido.' }, 403);

  const bruto = await pedido.text();
  if (bruto.length > TAMANHO_MAX) {
    return json({ erro: 'A sugestão ficou muito grande. Mande uma música por vez.' }, 413);
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400);
  }
  if (typeof corpo !== 'object' || corpo === null) return json({ erro: 'Pedido inválido.' }, 400);
  const campos = corpo as Record<string, unknown>;

  const sugestao = lerSugestao(campos);
  const erros = errosDaSugestao(sugestao);
  if (Object.keys(erros).length > 0) return json({ erros }, 422);

  const ip = pedido.headers.get('cf-connecting-ip') ?? '';
  if (!(await deps.confirmarHumano(texto(campos['token']), ip))) {
    return json({ erro: 'Não foi possível confirmar que você não é um robô. Tente de novo.' }, 400);
  }

  const resumoIp = await deps.resumoDoIp(ip);
  const agora = deps.agora();
  const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000).toISOString();
  if ((await deps.banco.contarRecentes(resumoIp, umaHoraAtras)) >= LIMITE_POR_HORA) {
    return json({ erro: 'Muitas sugestões em pouco tempo. Tente de novo daqui a uma hora.' }, 429);
  }

  if (sugestao.tipo === 'correcao' && !(await deps.canticoExiste(sugestao.canticoId ?? ''))) {
    return json({ erros: { canticoId: 'Este cântico não existe mais no app.' } }, 422);
  }

  await deps.banco.guardar({
    id: deps.novoId(),
    tipo: sugestao.tipo,
    ...(sugestao.canticoId ? { canticoId: sugestao.canticoId } : {}),
    dados: sugestao,
    status: 'pendente',
    criadaEm: agora.toISOString(),
    resumoIp,
  });
  return json({ ok: true }, 201);
}
