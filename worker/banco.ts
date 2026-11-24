/**
 * Sugestões no banco D1. A tabela é criada sozinha na primeira vez (não precisa
 * rodar nada no painel da Cloudflare além de criar o banco vazio).
 */
import type { BancoDeSugestoes, SugestaoGuardada } from './sugestoes';
import type { D1 } from './tipos';

const CRIAR_TABELA = `CREATE TABLE IF NOT EXISTS sugestoes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  cantico_id TEXT,
  dados TEXT NOT NULL,
  status TEXT NOT NULL,
  criada_em TEXT NOT NULL,
  resumo_ip TEXT NOT NULL
)`;
const CRIAR_INDICE = 'CREATE INDEX IF NOT EXISTS sugestoes_por_ip ON sugestoes (resumo_ip, criada_em)';

let pronto: Promise<void> | undefined;

/** Cria a tabela uma vez por instância do servidor. */
function prepararTabela(banco: D1): Promise<void> {
  pronto ??= (async () => {
    await banco.prepare(CRIAR_TABELA).run();
    await banco.prepare(CRIAR_INDICE).run();
  })().catch((erro: unknown) => {
    pronto = undefined; // tenta de novo no próximo pedido
    throw erro;
  });
  return pronto;
}

export function bancoD1(banco: D1): BancoDeSugestoes {
  return {
    async contarRecentes(resumoIp, desde) {
      await prepararTabela(banco);
      const linha = await banco
        .prepare('SELECT COUNT(*) AS total FROM sugestoes WHERE resumo_ip = ? AND criada_em >= ?')
        .bind(resumoIp, desde)
        .first<{ total: number }>();
      return linha?.total ?? 0;
    },

    async guardar(s: SugestaoGuardada) {
      await prepararTabela(banco);
      await banco
        .prepare(
          'INSERT INTO sugestoes (id, tipo, cantico_id, dados, status, criada_em, resumo_ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(s.id, s.tipo, s.canticoId ?? null, JSON.stringify(s.dados), s.status, s.criadaEm, s.resumoIp)
        .run();
    },
  };
}
