import { afterEach, describe, expect, it, vi } from 'vitest';
import servidor from '../worker/index';
import type { Ambiente, D1, D1Declaracao } from '../worker/tipos';

/** Banco D1 de mentira: guarda as consultas e responde o mínimo que o servidor usa. */
function bancoDeMentira() {
  const consultas: { sql: string; valores: unknown[] }[] = [];
  const banco: D1 = {
    prepare(sql) {
      let valores: unknown[] = [];
      const declaracao: D1Declaracao = {
        bind: (...v) => {
          valores = v;
          return declaracao;
        },
        run: async () => {
          consultas.push({ sql, valores });
          return {};
        },
        first: async <T,>() => {
          consultas.push({ sql, valores });
          return { total: 0 } as T;
        },
        all: async <T,>() => ({ results: [] as T[] }),
      };
      return declaracao;
    },
  };
  return { banco, consultas };
}

function ambiente(banco: D1, extra: Partial<Ambiente> = {}): Ambiente {
  return {
    BANCO: banco,
    ASSETS: { fetch: async () => new Response('{}', { status: 200 }) },
    TURNSTILE_SECRET: 'segredo-de-teste',
    ...extra,
  };
}

const sugestao = {
  tipo: 'novo',
  titulo: 'Rio de Paz',
  cifra: 'D\nComo um rio',
  tom: 'D',
  compasso: '4/4',
  token: 'ok',
};

const enviar = (corpo: unknown) =>
  new Request('https://app.exemplo/api/sugestoes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://app.exemplo', 'cf-connecting-ip': '9.9.9.9' },
    body: JSON.stringify(corpo),
  });

afterEach(() => vi.unstubAllGlobals());

describe('servidor (worker/index.ts)', () => {
  it('confere o robô na Cloudflare e grava a sugestão no banco', async () => {
    const verificar = vi.fn(async () => Response.json({ success: true }));
    vi.stubGlobal('fetch', verificar);
    const { banco, consultas } = bancoDeMentira();

    const resposta = await servidor.fetch(enviar(sugestao), ambiente(banco));

    expect(resposta.status).toBe(201);
    expect(verificar).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    );
    const insercao = consultas.find((c) => c.sql.startsWith('INSERT INTO sugestoes'));
    expect(insercao?.valores[1]).toBe('novo');
    expect(JSON.parse(String(insercao?.valores[3]))).toMatchObject({ titulo: 'Rio de Paz' });
    // Guarda um resumo do IP, nunca o IP.
    expect(insercao?.valores).not.toContain('9.9.9.9');
  });

  it('sem o segredo do Turnstile configurado, não aceita (e não grava)', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { banco, consultas } = bancoDeMentira();
    const { TURNSTILE_SECRET: _semSegredo, ...semSegredo } = ambiente(banco);
    const resposta = await servidor.fetch(enviar(sugestao), semSegredo);
    expect(resposta.status).toBe(400);
    expect(consultas.some((c) => c.sql.startsWith('INSERT'))).toBe(false);
  });

  it('outros endereços /api/ respondem "não encontrado"', async () => {
    const { banco } = bancoDeMentira();
    const resposta = await servidor.fetch(new Request('https://app.exemplo/api/outra-coisa'), ambiente(banco));
    expect(resposta.status).toBe(404);
  });
});
