/**
 * Sugestões no banco D1. As tabelas são criadas sozinhas na primeira vez (não precisa
 * rodar nada no painel da Cloudflare além de criar o banco vazio).
 */
import type { BancoAdmin, ResumoSugestao, Status } from './admin';
import type { BancoDeSugestoes, SugestaoGuardada } from './sugestoes';
import type { D1 } from './tipos';

const CRIAR = [
  `CREATE TABLE IF NOT EXISTS sugestoes (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    cantico_id TEXT,
    dados TEXT NOT NULL,
    status TEXT NOT NULL,
    criada_em TEXT NOT NULL,
    resumo_ip TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS sugestoes_por_ip ON sugestoes (resumo_ip, criada_em)',
  'CREATE INDEX IF NOT EXISTS sugestoes_por_status ON sugestoes (status, criada_em)',
  // Erros de senha do painel, para o limite de tentativas.
  'CREATE TABLE IF NOT EXISTS tentativas (resumo_ip TEXT NOT NULL, criada_em TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS tentativas_por_ip ON tentativas (resumo_ip, criada_em)',
];

let pronto: Promise<void> | undefined;

/** Cria as tabelas uma vez por instância do servidor. */
function prepararTabelas(banco: D1): Promise<void> {
  pronto ??= (async () => {
    for (const sql of CRIAR) await banco.prepare(sql).run();
  })().catch((erro: unknown) => {
    pronto = undefined; // tenta de novo no próximo pedido
    throw erro;
  });
  return pronto;
}

interface LinhaSugestao {
  id: string;
  tipo: SugestaoGuardada['tipo'];
  cantico_id: string | null;
  dados: string;
  status: Status;
  criada_em: string;
  resumo_ip: string;
}

function daLinha(l: LinhaSugestao): SugestaoGuardada {
  return {
    id: l.id,
    tipo: l.tipo,
    ...(l.cantico_id ? { canticoId: l.cantico_id } : {}),
    dados: JSON.parse(l.dados) as SugestaoGuardada['dados'],
    status: l.status,
    criadaEm: l.criada_em,
    resumoIp: l.resumo_ip,
  };
}

export function bancoD1(banco: D1): BancoDeSugestoes & BancoAdmin {
  return {
    async contarRecentes(resumoIp, desde) {
      await prepararTabelas(banco);
      const linha = await banco
        .prepare('SELECT COUNT(*) AS total FROM sugestoes WHERE resumo_ip = ? AND criada_em >= ?')
        .bind(resumoIp, desde)
        .first<{ total: number }>();
      return linha?.total ?? 0;
    },

    async guardar(s: SugestaoGuardada) {
      await prepararTabelas(banco);
      await banco
        .prepare(
          'INSERT INTO sugestoes (id, tipo, cantico_id, dados, status, criada_em, resumo_ip) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(s.id, s.tipo, s.canticoId ?? null, JSON.stringify(s.dados), s.status, s.criadaEm, s.resumoIp)
        .run();
    },

    async listar(status): Promise<ResumoSugestao[]> {
      await prepararTabelas(banco);
      const { results } = await banco
        .prepare('SELECT * FROM sugestoes WHERE status = ? ORDER BY criada_em')
        .bind(status)
        .all<LinhaSugestao>();
      return results.map((l) => {
        const s = daLinha(l);
        return { id: s.id, tipo: s.tipo, titulo: s.dados.titulo, criadaEm: s.criadaEm };
      });
    },

    async obter(id) {
      await prepararTabelas(banco);
      const linha = await banco.prepare('SELECT * FROM sugestoes WHERE id = ?').bind(id).first<LinhaSugestao>();
      return linha ? daLinha(linha) : null;
    },

    async marcar(id, status) {
      await prepararTabelas(banco);
      await banco.prepare('UPDATE sugestoes SET status = ? WHERE id = ?').bind(status, id).run();
    },

    async contarErros(resumoIp, desde) {
      await prepararTabelas(banco);
      const linha = await banco
        .prepare('SELECT COUNT(*) AS total FROM tentativas WHERE resumo_ip = ? AND criada_em >= ?')
        .bind(resumoIp, desde)
        .first<{ total: number }>();
      return linha?.total ?? 0;
    },

    async registrarErro(resumoIp, quando) {
      await prepararTabelas(banco);
      await banco.prepare('INSERT INTO tentativas (resumo_ip, criada_em) VALUES (?, ?)').bind(resumoIp, quando).run();
    },
  };
}
