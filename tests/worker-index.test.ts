import { describe, expect, it } from 'vitest';
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
    ...extra,
  };
}

const sugestao = {
  tipo: 'novo',
  titulo: 'Rio de Paz',
  cifra: 'D\nComo um rio',
  tom: 'D',
  compasso: '4/4',
};

const enviar = (corpo: unknown) =>
  new Request('https://app.exemplo/api/sugestoes', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://app.exemplo', 'cf-connecting-ip': '9.9.9.9' },
    body: JSON.stringify(corpo),
  });

describe('servidor (worker/index.ts)', () => {
  it('grava a sugestão no banco', async () => {
    const { banco, consultas } = bancoDeMentira();

    const resposta = await servidor.fetch(enviar(sugestao), ambiente(banco));

    expect(resposta.status).toBe(201);
    const insercao = consultas.find((c) => c.sql.startsWith('INSERT INTO sugestoes'));
    expect(insercao?.valores[1]).toBe('novo');
    expect(JSON.parse(String(insercao?.valores[3]))).toMatchObject({ titulo: 'Rio de Paz' });
    // Guarda um resumo do IP, nunca o IP.
    expect(insercao?.valores).not.toContain('9.9.9.9');
  });

  it('outros endereços /api/ respondem "não encontrado"', async () => {
    const { banco } = bancoDeMentira();
    const resposta = await servidor.fetch(new Request('https://app.exemplo/api/outra-coisa'), ambiente(banco));
    expect(resposta.status).toBe(404);
  });
});
