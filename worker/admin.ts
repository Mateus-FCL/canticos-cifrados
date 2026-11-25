/**
 * Painel do admin (/api/admin/*): entrar com a senha, ver as sugestões pendentes,
 * aprovar (grava o cântico no GitHub) ou recusar. Tudo de fora chega por `DependenciasAdmin`.
 */
import { parse } from 'yaml';
import { cifraParaTexto, converterCifra } from '../src/lib/conversor';
import { errosDaSugestao } from '../src/lib/sugestao';
import { atualizarYaml, montarYamlNovo, numeroLivre, slugDoTitulo, validarYaml, type DadosAprovados } from './publicar';
import { criarSessao, DURACAO_SESSAO_MS, senhaConfere, sessaoValida } from './sessao';
import type { SugestaoGuardada } from './sugestoes';

export const LIMITE_ERROS_SENHA = 5;
const JANELA_ERROS_MS = 15 * 60 * 1000;
const COOKIE = 'canticos_admin';
const PASTA = 'src/content/canticos';

export type Status = SugestaoGuardada['status'];

export interface ResumoSugestao {
  id: string;
  tipo: SugestaoGuardada['tipo'];
  titulo: string;
  criadaEm: string;
}

export interface BancoAdmin {
  listar(status: Status): Promise<ResumoSugestao[]>;
  obter(id: string): Promise<SugestaoGuardada | null>;
  marcar(id: string, status: Status): Promise<void>;
  contarErros(resumoIp: string, desde: string): Promise<number>;
  registrarErro(resumoIp: string, quando: string): Promise<void>;
}

/** Arquivos do repositório no GitHub (no ramo de conteúdo). */
export interface Repositorio {
  ler(caminho: string): Promise<{ texto: string; sha: string } | null>;
  /** `conflito`: o arquivo mudou (ou já existe) desde a versão `sha` informada. */
  gravar(caminho: string, texto: string, mensagem: string, sha?: string): Promise<{ url?: string; conflito?: true }>;
}

export interface ItemIndice {
  id: string;
  numero?: number;
  titulo: string;
}

export interface DependenciasAdmin {
  banco: BancoAdmin;
  /** Ausente quando falta o GITHUB_TOKEN: dá para ver, mas não para aprovar. */
  repositorio?: Repositorio;
  indice(): Promise<ItemIndice[]>;
  /** ADMIN_SENHA. Ausente: o painel fica fechado. */
  senha?: string;
  agora(): Date;
  resumoDoIp(ip: string): Promise<string>;
}

const json = (corpo: unknown, status = 200, cabecalhos: Record<string, string> = {}) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cabecalhos },
  });

function lerCookie(pedido: Request): string | undefined {
  for (const parte of (pedido.headers.get('cookie') ?? '').split(';')) {
    const [nome, ...valor] = parte.trim().split('=');
    if (nome === COOKIE) return valor.join('=');
  }
  return undefined;
}

const cookieDaSessao = (valor: string, maxAge: number) =>
  `${COOKIE}=${valor}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

async function corpoJson(pedido: Request): Promise<Record<string, unknown>> {
  try {
    const corpo: unknown = await pedido.json();
    return typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const texto = (v: unknown) => (typeof v === 'string' ? v : '');
const numeroOuNada = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

async function entrar(pedido: Request, deps: DependenciasAdmin): Promise<Response> {
  if (!deps.senha) return json({ erro: 'O painel ainda não tem senha configurada (veja docs/admin.md).' }, 503);
  const agora = deps.agora().getTime();
  const resumoIp = await deps.resumoDoIp(pedido.headers.get('cf-connecting-ip') ?? '');
  const desde = new Date(agora - JANELA_ERROS_MS).toISOString();
  if ((await deps.banco.contarErros(resumoIp, desde)) >= LIMITE_ERROS_SENHA) {
    return json({ erro: 'Muitas tentativas erradas. Tente de novo em 15 minutos.' }, 429);
  }
  const { senha } = await corpoJson(pedido);
  if (!(await senhaConfere(texto(senha), deps.senha))) {
    await deps.banco.registrarErro(resumoIp, new Date(agora).toISOString());
    return json({ erro: 'Senha errada.' }, 401);
  }
  const valor = await criarSessao(deps.senha, agora);
  return json({ ok: true }, 200, { 'set-cookie': cookieDaSessao(valor, DURACAO_SESSAO_MS / 1000) });
}

async function detalhe(sugestao: SugestaoGuardada, deps: DependenciasAdmin): Promise<Response> {
  const indice = await deps.indice();
  const numeroSugerido = numeroLivre(indice.flatMap((c) => (c.numero === undefined ? [] : [c.numero])));
  if (sugestao.tipo !== 'correcao' || !sugestao.canticoId) return json({ sugestao, numeroSugerido });
  if (!deps.repositorio) return json({ erro: 'Falta o GITHUB_TOKEN (veja docs/admin.md).' }, 503);

  const arquivo = await deps.repositorio.ler(`${PASTA}/${sugestao.canticoId}.yaml`);
  if (!arquivo) return json({ sugestao, numeroSugerido, erro: 'O cântico desta correção não existe mais.' });
  const cantico = parse(arquivo.texto) as {
    numero?: number;
    titulo: string;
    versoes: { tom: string; compasso: string; bpm?: number; chordpro: string }[];
  };
  const versao = cantico.versoes[0];
  return json({
    sugestao,
    numeroSugerido,
    atual: {
      sha: arquivo.sha,
      numero: cantico.numero,
      titulo: cantico.titulo,
      tom: versao?.tom,
      compasso: versao?.compasso,
      bpm: versao?.bpm,
      texto: cifraParaTexto(versao?.chordpro ?? ''),
    },
  });
}

async function aprovar(pedido: Request, sugestao: SugestaoGuardada, deps: DependenciasAdmin): Promise<Response> {
  if (!deps.repositorio) return json({ erro: 'Falta o GITHUB_TOKEN para gravar o cântico (veja docs/admin.md).' }, 503);
  const corpo = await corpoJson(pedido);
  const numero = numeroOuNada(corpo['numero']);
  const bpm = numeroOuNada(corpo['bpm']);
  const base = {
    tipo: sugestao.tipo,
    ...(sugestao.canticoId ? { canticoId: sugestao.canticoId } : {}),
    titulo: texto(corpo['titulo']).trim(),
    cifra: texto(corpo['cifra']),
    tom: texto(corpo['tom']),
    compasso: texto(corpo['compasso']),
    ...(bpm === undefined ? {} : { bpm }),
  };
  const erros: Record<string, string> = { ...errosDaSugestao(base) };
  if (numero !== undefined && (!Number.isInteger(numero) || numero < 1)) erros['numero'] = 'Use um número inteiro maior que zero.';

  const indice = await deps.indice();
  const dono = numero === undefined ? undefined : indice.find((c) => c.numero === numero && c.id !== sugestao.canticoId);
  if (dono) erros['numero'] = `O número ${numero} já é do cântico “${dono.titulo}”.`;

  const { chordpro } = converterCifra(base.cifra);
  if (!erros['cifra'] && chordpro === '') erros['cifra'] = 'A cifra ficou vazia depois de converter.';
  if (Object.keys(erros).length > 0) return json({ erros }, 422);

  const dados: DadosAprovados = {
    titulo: base.titulo,
    tom: base.tom,
    compasso: base.compasso,
    chordpro,
    ...(numero === undefined ? {} : { numero }),
    ...(bpm === undefined ? {} : { bpm }),
  };

  const mudou = 'Este cântico mudou desde que você abriu a sugestão. Abra de novo para ver a versão atual.';
  let caminho: string;
  let conteudo: string;
  let sha: string | undefined;
  let mensagem: string;
  if (sugestao.tipo === 'correcao' && sugestao.canticoId) {
    caminho = `${PASTA}/${sugestao.canticoId}.yaml`;
    const atual = await deps.repositorio.ler(caminho);
    if (!atual) return json({ erro: 'O cântico desta correção não existe mais.' }, 404);
    if (texto(corpo['sha']) !== atual.sha) return json({ erro: mudou }, 409);
    conteudo = atualizarYaml(atual.texto, dados);
    sha = atual.sha;
    mensagem = `Corrige o cântico "${dados.titulo}" (sugestão aprovada)`;
  } else {
    caminho = `${PASTA}/${slugDoTitulo(dados.titulo, indice.map((c) => c.id))}.yaml`;
    conteudo = montarYamlNovo(dados);
    mensagem = `Adiciona o cântico "${dados.titulo}" (sugestão aprovada)`;
  }

  const problema = validarYaml(conteudo);
  if (problema) return json({ erro: `O app não aceitaria este cântico: ${problema}` }, 422);

  const gravado = await deps.repositorio.gravar(caminho, conteudo, mensagem, sha);
  if (gravado.conflito) return json({ erro: mudou }, 409);
  await deps.banco.marcar(sugestao.id, 'aprovada');
  return json({ ok: true, arquivo: caminho, ...(gravado.url ? { url: gravado.url } : {}) });
}

export async function atenderAdmin(pedido: Request, deps: DependenciasAdmin): Promise<Response> {
  const url = new URL(pedido.url);
  const caminho = url.pathname.replace(/^\/api\/admin/, '') || '/';
  const ehPost = pedido.method === 'POST';

  // Ações que mudam algo só valem vindas do próprio app (proteção contra outros sites).
  const origem = pedido.headers.get('origin');
  if (ehPost && origem !== url.origin) return json({ erro: 'Pedido não permitido.' }, 403);

  if (caminho === '/entrar' && ehPost) return entrar(pedido, deps);
  if (caminho === '/sair' && ehPost) return json({ ok: true }, 200, { 'set-cookie': cookieDaSessao('', 0) });

  if (!(await sessaoValida(lerCookie(pedido), deps.senha, deps.agora().getTime()))) {
    return json({ erro: 'Entre com a senha do painel.' }, 401);
  }

  if (caminho === '/sessao') return json({ ok: true });
  if (caminho === '/sugestoes' && !ehPost) return json({ sugestoes: await deps.banco.listar('pendente') });

  const rota = /^\/sugestoes\/([^/]+)(?:\/(aprovar|recusar))?$/.exec(caminho);
  if (rota) {
    const sugestao = await deps.banco.obter(decodeURIComponent(rota[1] ?? ''));
    if (!sugestao) return json({ erro: 'Sugestão não encontrada.' }, 404);
    const acao = rota[2];
    if (!acao && !ehPost) return detalhe(sugestao, deps);
    if (acao && ehPost) {
      if (sugestao.status !== 'pendente') return json({ erro: 'Esta sugestão já foi decidida.' }, 409);
      if (acao === 'recusar') {
        await deps.banco.marcar(sugestao.id, 'recusada');
        return json({ ok: true });
      }
      return aprovar(pedido, sugestao, deps);
    }
  }
  return json({ erro: 'Endereço não encontrado.' }, 404);
}
