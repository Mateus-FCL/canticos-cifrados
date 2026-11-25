import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { LIMITE_ERROS_SENHA, atenderAdmin, type DependenciasAdmin } from '../worker/admin';
import { criarSessao } from '../worker/sessao';
import type { SugestaoGuardada } from '../worker/sugestoes';

const SENHA = 'louvor-2026';
const AGORA = new Date('2026-11-25T12:00:00Z');
const ORIGEM = 'https://app.exemplo';

const novo: SugestaoGuardada = {
  id: 's1',
  tipo: 'novo',
  dados: { tipo: 'novo', titulo: 'Rio de Paz', cifra: 'D\nComo um rio', tom: 'D', compasso: '4/4', nome: 'Ana' },
  status: 'pendente',
  criadaEm: '2026-11-24T10:00:00.000Z',
  resumoIp: 'x',
};
const correcao: SugestaoGuardada = {
  id: 's2',
  tipo: 'correcao',
  canticoId: 'paz-no-caminho',
  dados: {
    tipo: 'correcao',
    canticoId: 'paz-no-caminho',
    titulo: 'Paz no Caminho',
    cifra: 'C           F\nPelo caminho sigo',
    tom: 'C',
    compasso: '3/4',
    bpm: 66,
  },
  status: 'pendente',
  criadaEm: '2026-11-24T11:00:00.000Z',
  resumoIp: 'y',
};
const ARQUIVO_ATUAL = 'numero: 35\ntitulo: Paz no Caminho\nversoes:\n  - tom: C\n    compasso: 3/4\n    bpm: 66\n    chordpro: "[C]Pelo caminho [F]vou"\n';

function preparar(opcoes: { senha?: string | undefined; erros?: number; semGithub?: boolean; shaAtual?: string } = {}) {
  const sugestoes = new Map([novo, correcao].map((s) => [s.id, { ...s }]));
  const gravados: { caminho: string; texto: string; mensagem: string; sha?: string }[] = [];
  const errosRegistrados: string[] = [];
  const deps: DependenciasAdmin = {
    ...('senha' in opcoes ? (opcoes.senha === undefined ? {} : { senha: opcoes.senha }) : { senha: SENHA }),
    agora: () => AGORA,
    resumoDoIp: async (ip) => `r-${ip}`,
    indice: async () => [
      { id: 'cantico-de-exemplo', numero: 12, titulo: 'Cântico de Exemplo' },
      { id: 'paz-no-caminho', numero: 35, titulo: 'Paz no Caminho' },
    ],
    banco: {
      listar: async (status) =>
        [...sugestoes.values()]
          .filter((s) => s.status === status)
          .map((s) => ({ id: s.id, tipo: s.tipo, titulo: s.dados.titulo, criadaEm: s.criadaEm })),
      obter: async (id) => sugestoes.get(id) ?? null,
      marcar: async (id, status) => {
        const s = sugestoes.get(id);
        if (s) s.status = status;
      },
      contarErros: async () => opcoes.erros ?? 0,
      registrarErro: async (resumoIp) => {
        errosRegistrados.push(resumoIp);
      },
    },
    ...(opcoes.semGithub
      ? {}
      : {
          repositorio: {
            ler: async (caminho) =>
              caminho.endsWith('paz-no-caminho.yaml') ? { texto: ARQUIVO_ATUAL, sha: opcoes.shaAtual ?? 'sha-1' } : null,
            gravar: async (caminho, texto, mensagem, sha) => {
              gravados.push({ caminho, texto, mensagem, ...(sha ? { sha } : {}) });
              return { url: 'https://github.com/commit/1' };
            },
          },
        }),
  };
  return { deps, sugestoes, gravados, errosRegistrados };
}

async function cookie(senha = SENHA) {
  return `canticos_admin=${await criarSessao(senha, AGORA.getTime())}`;
}

function pedido(caminho: string, opcoes: { metodo?: string; corpo?: unknown; cookie?: string; origem?: string } = {}) {
  const cabecalhos: Record<string, string> = { 'cf-connecting-ip': '1.2.3.4', 'content-type': 'application/json' };
  if (opcoes.cookie) cabecalhos['cookie'] = opcoes.cookie;
  cabecalhos['origin'] = opcoes.origem ?? ORIGEM;
  return new Request(`${ORIGEM}/api/admin${caminho}`, {
    method: opcoes.metodo ?? 'GET',
    headers: cabecalhos,
    ...(opcoes.corpo === undefined ? {} : { body: JSON.stringify(opcoes.corpo) }),
  });
}

describe('entrar no painel', () => {
  it('senha certa: entra e recebe o cookie da sessão (protegido)', async () => {
    const { deps } = preparar();
    const resposta = await atenderAdmin(pedido('/entrar', { metodo: 'POST', corpo: { senha: SENHA } }), deps);
    expect(resposta.status).toBe(200);
    const definido = resposta.headers.get('set-cookie') ?? '';
    expect(definido).toMatch(/^canticos_admin=v1\./);
    for (const parte of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/admin']) expect(definido).toContain(parte);
  });

  it('senha errada: recusa e conta a tentativa', async () => {
    const { deps, errosRegistrados } = preparar();
    const resposta = await atenderAdmin(pedido('/entrar', { metodo: 'POST', corpo: { senha: 'errada' } }), deps);
    expect(resposta.status).toBe(401);
    expect(errosRegistrados).toEqual(['r-1.2.3.4']);
  });

  it(`depois de ${LIMITE_ERROS_SENHA} erros em 15 minutos, pede para esperar (nem a senha certa entra)`, async () => {
    const { deps } = preparar({ erros: LIMITE_ERROS_SENHA });
    const resposta = await atenderAdmin(pedido('/entrar', { metodo: 'POST', corpo: { senha: SENHA } }), deps);
    expect(resposta.status).toBe(429);
    expect(await resposta.json()).toMatchObject({ erro: expect.stringMatching(/15 minutos/) });
  });

  it('sem senha configurada na Cloudflare, o painel fica fechado', async () => {
    const { deps } = preparar({ senha: undefined });
    const resposta = await atenderAdmin(pedido('/entrar', { metodo: 'POST', corpo: { senha: '' } }), deps);
    expect(resposta.status).toBe(503);
  });

  it('pedido vindo de outro site é recusado', async () => {
    const { deps } = preparar();
    const resposta = await atenderAdmin(
      pedido('/entrar', { metodo: 'POST', corpo: { senha: SENHA }, origem: 'https://outro.exemplo' }),
      deps,
    );
    expect(resposta.status).toBe(403);
  });

  it('sair apaga o cookie', async () => {
    const { deps } = preparar();
    const resposta = await atenderAdmin(pedido('/sair', { metodo: 'POST', cookie: await cookie() }), deps);
    expect(resposta.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
});

describe('o resto do painel exige estar logado', () => {
  it('sem cookie, ou com cookie de senha antiga, não entra', async () => {
    const { deps } = preparar();
    expect((await atenderAdmin(pedido('/sugestoes'), deps)).status).toBe(401);
    expect((await atenderAdmin(pedido('/sugestoes', { cookie: await cookie('senha-antiga') }), deps)).status).toBe(401);
  });

  it('logado, confirma a sessão', async () => {
    const { deps } = preparar();
    expect((await atenderAdmin(pedido('/sessao', { cookie: await cookie() }), deps)).status).toBe(200);
  });
});

describe('lista e detalhe das sugestões', () => {
  it('lista as pendentes', async () => {
    const { deps } = preparar();
    const resposta = await atenderAdmin(pedido('/sugestoes', { cookie: await cookie() }), deps);
    const corpo = (await resposta.json()) as { sugestoes: { id: string }[] };
    expect(corpo.sugestoes.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('cântico novo: sugere o próximo número livre', async () => {
    const { deps } = preparar();
    const resposta = await atenderAdmin(pedido('/sugestoes/s1', { cookie: await cookie() }), deps);
    expect(await resposta.json()).toMatchObject({ sugestao: { id: 's1' }, numeroSugerido: 36 });
  });

  it('correção: traz o cântico atual (para comparar) e a versão do arquivo', async () => {
    const { deps } = preparar();
    const resposta = await atenderAdmin(pedido('/sugestoes/s2', { cookie: await cookie() }), deps);
    expect(await resposta.json()).toMatchObject({
      atual: { sha: 'sha-1', numero: 35, tom: 'C', texto: 'C            F\nPelo caminho vou' },
    });
  });

  it('sugestão que não existe: "não encontrada"', async () => {
    const { deps } = preparar();
    expect((await atenderAdmin(pedido('/sugestoes/nada', { cookie: await cookie() }), deps)).status).toBe(404);
  });
});

describe('aprovar e recusar', () => {
  const aprovarNovo = { titulo: 'Rio de Paz', numero: 36, tom: 'D', compasso: '4/4', bpm: null, cifra: 'D\nComo um rio' };

  it('aprovar cântico novo: grava o arquivo no GitHub e marca como aprovada', async () => {
    const { deps, gravados, sugestoes } = preparar();
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s1/aprovar', { metodo: 'POST', corpo: aprovarNovo, cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(200);
    expect(gravados[0]?.caminho).toBe('src/content/canticos/rio-de-paz.yaml');
    expect(parse(gravados[0]?.texto ?? '')).toMatchObject({
      numero: 36,
      titulo: 'Rio de Paz',
      versoes: [{ tom: 'D', compasso: '4/4', chordpro: '[D]Como um rio' }],
    });
    expect(gravados[0]?.mensagem).toMatch(/Rio de Paz/);
    expect(sugestoes.get('s1')?.status).toBe('aprovada');
  });

  it('número já usado por outro cântico: explica e não grava', async () => {
    const { deps, gravados } = preparar();
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s1/aprovar', { metodo: 'POST', corpo: { ...aprovarNovo, numero: 12 }, cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(422);
    expect(await resposta.json()).toMatchObject({ erros: { numero: expect.stringMatching(/Cântico de Exemplo/) } });
    expect(gravados).toHaveLength(0);
  });

  it('aprovar correção: grava por cima do arquivo, usando a versão que o admin viu', async () => {
    const { deps, gravados } = preparar();
    const corpo = { titulo: 'Paz no Caminho', numero: 35, tom: 'C', compasso: '3/4', bpm: 66, cifra: 'C\nPelo caminho sigo', sha: 'sha-1' };
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s2/aprovar', { metodo: 'POST', corpo, cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(200);
    expect(gravados[0]).toMatchObject({ caminho: 'src/content/canticos/paz-no-caminho.yaml', sha: 'sha-1' });
    expect(parse(gravados[0]?.texto ?? '').versoes[0].chordpro).toBe('[C]Pelo caminho sigo');
  });

  it('o cântico mudou depois que o admin abriu a sugestão: avisa e não grava', async () => {
    const { deps, gravados } = preparar({ shaAtual: 'sha-novo' });
    const corpo = { titulo: 'Paz no Caminho', numero: 35, tom: 'C', compasso: '3/4', bpm: 66, cifra: 'C\nLuz', sha: 'sha-1' };
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s2/aprovar', { metodo: 'POST', corpo, cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(409);
    expect(gravados).toHaveLength(0);
  });

  it('sem o token do GitHub configurado, avisa que não dá para aprovar', async () => {
    const { deps } = preparar({ semGithub: true });
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s1/aprovar', { metodo: 'POST', corpo: aprovarNovo, cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(503);
  });

  it('recusar marca como recusada', async () => {
    const { deps, sugestoes } = preparar();
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s1/recusar', { metodo: 'POST', cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(200);
    expect(sugestoes.get('s1')?.status).toBe('recusada');
  });

  it('sugestão já decidida não pode ser aprovada de novo', async () => {
    const { deps, sugestoes } = preparar();
    sugestoes.get('s1')!.status = 'recusada';
    const resposta = await atenderAdmin(
      pedido('/sugestoes/s1/aprovar', { metodo: 'POST', corpo: aprovarNovo, cookie: await cookie() }),
      deps,
    );
    expect(resposta.status).toBe(409);
  });
});
