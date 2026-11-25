import { describe, expect, it } from 'vitest';
import { LIMITE_POR_HORA, TAMANHO_MAX, receberSugestao, type Dependencias, type SugestaoGuardada } from '../worker/sugestoes';

const valida = {
  tipo: 'novo',
  titulo: 'Grande é o Senhor',
  cifra: 'G        D\nGrande é o Senhor',
  tom: 'G',
  compasso: '4/4',
};

/** Banco e verificações de mentira: guardam o que receberam para o teste conferir. */
function preparar(opcoes: { recentes?: number; canticoExiste?: boolean } = {}) {
  const guardadas: SugestaoGuardada[] = [];
  const deps: Dependencias = {
    canticoExiste: async () => opcoes.canticoExiste ?? true,
    banco: {
      contarRecentes: async () => opcoes.recentes ?? 0,
      guardar: async (s) => {
        guardadas.push(s);
      },
    },
    agora: () => new Date('2026-11-24T12:00:00Z'),
    novoId: () => 'id-1',
    resumoDoIp: async (ip) => `resumo-${ip}`,
  };
  return { deps, guardadas };
}

const pedido = (corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  new Request('https://app.exemplo/api/sugestoes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', ...cabecalhos },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });

describe('receber uma sugestão', () => {
  it('sugestão certa fica guardada como pendente', async () => {
    const { deps, guardadas } = preparar();
    const resposta = await receberSugestao(pedido(valida), deps);
    expect(resposta.status).toBe(201);
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({
      id: 'id-1',
      tipo: 'novo',
      status: 'pendente',
      criadaEm: '2026-11-24T12:00:00.000Z',
      resumoIp: 'resumo-1.2.3.4',
    });
    expect(guardadas[0]?.dados.titulo).toBe('Grande é o Senhor');
  });

  it('não guarda o campo-armadilha junto com a sugestão', async () => {
    const { deps, guardadas } = preparar();
    await receberSugestao(pedido({ ...valida, site: '' }), deps);
    expect(guardadas[0]?.dados).not.toHaveProperty('site');
  });

  it('robô que preenche o campo-armadilha recebe "enviada", mas nada é guardado', async () => {
    const { deps, guardadas } = preparar();
    const resposta = await receberSugestao(pedido({ ...valida, site: 'https://spam.exemplo' }), deps);
    expect(resposta.status).toBe(201);
    expect(guardadas).toHaveLength(0);
  });

  it('só aceita envios vindos do próprio app', async () => {
    const { deps, guardadas } = preparar();
    const resposta = await receberSugestao(pedido(valida, { origin: 'https://outro-site.exemplo' }), deps);
    expect(resposta.status).toBe(403);
    expect(guardadas).toHaveLength(0);
    expect((await receberSugestao(pedido(valida, { origin: 'https://app.exemplo' }), deps)).status).toBe(201);
  });

  it('só aceita POST', async () => {
    const { deps } = preparar();
    const resposta = await receberSugestao(new Request('https://app.exemplo/api/sugestoes'), deps);
    expect(resposta.status).toBe(405);
  });

  it('recusa texto grande demais', async () => {
    const { deps, guardadas } = preparar();
    const resposta = await receberSugestao(pedido({ ...valida, cifra: 'a'.repeat(TAMANHO_MAX) }), deps);
    expect(resposta.status).toBe(413);
    expect(guardadas).toHaveLength(0);
  });

  it('recusa o que não é JSON', async () => {
    const { deps } = preparar();
    expect((await receberSugestao(pedido('isto não é json'), deps)).status).toBe(400);
  });

  it('devolve as mensagens de cada campo com problema', async () => {
    const { deps, guardadas } = preparar();
    const resposta = await receberSugestao(pedido({ ...valida, titulo: '' }), deps);
    expect(resposta.status).toBe(422);
    expect(await resposta.json()).toMatchObject({ erros: { titulo: 'Escreva o nome da música.' } });
    expect(guardadas).toHaveLength(0);
  });

  it('campos com tipo errado contam como em branco', async () => {
    const { deps } = preparar();
    const resposta = await receberSugestao(pedido({ ...valida, titulo: 123, bpm: 'rápido' }), deps);
    expect(resposta.status).toBe(422);
    expect(await resposta.json()).toMatchObject({ erros: { titulo: expect.any(String), bpm: expect.any(String) } });
  });

  it('BPM em branco é aceito', async () => {
    const { deps, guardadas } = preparar();
    const resposta = await receberSugestao(pedido({ ...valida, bpm: null }), deps);
    expect(resposta.status).toBe(201);
    expect(guardadas[0]?.dados).not.toHaveProperty('bpm');
  });

  it('muitas sugestões do mesmo lugar em pouco tempo: pede para esperar', async () => {
    const { deps, guardadas } = preparar({ recentes: LIMITE_POR_HORA });
    const resposta = await receberSugestao(pedido(valida), deps);
    expect(resposta.status).toBe(429);
    expect(guardadas).toHaveLength(0);
  });

  it('correção de um cântico que não existe é recusada', async () => {
    const { deps } = preparar({ canticoExiste: false });
    const resposta = await receberSugestao(pedido({ ...valida, tipo: 'correcao', canticoId: 'nao-existe' }), deps);
    expect(resposta.status).toBe(422);
  });

  it('correção guarda qual cântico está sendo corrigido', async () => {
    const { deps, guardadas } = preparar();
    await receberSugestao(pedido({ ...valida, tipo: 'correcao', canticoId: 'paz-no-caminho' }), deps);
    expect(guardadas[0]).toMatchObject({ tipo: 'correcao', canticoId: 'paz-no-caminho' });
  });
});
