import { describe, expect, it } from 'vitest';
import { DURACAO_SESSAO_MS, criarSessao, sessaoValida, senhaConfere } from '../worker/sessao';

const agora = Date.UTC(2026, 10, 25, 12);

describe('senha do admin', () => {
  it('confere a senha certa e recusa a errada', async () => {
    expect(await senhaConfere('louvor 2026', 'louvor 2026')).toBe(true);
    expect(await senhaConfere('louvor', 'louvor 2026')).toBe(false);
    expect(await senhaConfere('', 'louvor 2026')).toBe(false);
  });

  it('sem senha configurada, ninguém entra (nem com senha vazia)', async () => {
    expect(await senhaConfere('', '')).toBe(false);
    expect(await senhaConfere('qualquer', undefined)).toBe(false);
  });
});

describe('sessão do admin (cookie assinado)', () => {
  it('a sessão criada vale até expirar (30 dias)', async () => {
    const valor = await criarSessao('senha-certa', agora);
    expect(await sessaoValida(valor, 'senha-certa', agora)).toBe(true);
    expect(await sessaoValida(valor, 'senha-certa', agora + DURACAO_SESSAO_MS - 1000)).toBe(true);
    expect(await sessaoValida(valor, 'senha-certa', agora + DURACAO_SESSAO_MS + 1000)).toBe(false);
    expect(DURACAO_SESSAO_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('trocar a senha desloga todo mundo', async () => {
    const valor = await criarSessao('senha-antiga', agora);
    expect(await sessaoValida(valor, 'senha-nova', agora)).toBe(false);
  });

  it('cookie alterado ou inventado não vale', async () => {
    const valor = await criarSessao('senha-certa', agora);
    const [versao, , assinatura] = valor.split('.');
    const maisTempo = `${versao}.${agora + 10 * DURACAO_SESSAO_MS}.${assinatura}`;
    expect(await sessaoValida(maisTempo, 'senha-certa', agora)).toBe(false);
    expect(await sessaoValida('qualquer-coisa', 'senha-certa', agora)).toBe(false);
    expect(await sessaoValida(undefined, 'senha-certa', agora)).toBe(false);
  });

  it('sem senha configurada, nenhuma sessão vale', async () => {
    const valor = await criarSessao('x', agora);
    expect(await sessaoValida(valor, undefined, agora)).toBe(false);
  });
});
