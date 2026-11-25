/**
 * Login do admin com senha única (segredo ADMIN_SENHA na Cloudflare).
 * A sessão é um cookie assinado com uma chave que sai da própria senha: trocar a senha
 * invalida todas as sessões, sem precisar guardar lista de sessões em lugar nenhum.
 */

export const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;
const VERSAO = 'v1';
const codificar = new TextEncoder();

async function resumo(texto: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', codificar.encode(texto)));
}

/** Compara sem "vazar" pelo tempo quantos caracteres batem. */
function iguais(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diferenca === 0;
}

export async function senhaConfere(digitada: string, certa: string | undefined): Promise<boolean> {
  if (!certa) return false; // sem senha configurada, o painel fica fechado
  return iguais(await resumo(digitada), await resumo(certa));
}

function paraBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function assinar(mensagem: string, senha: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    'raw',
    await resumo(`canticos-admin:${senha}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return paraBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', chave, codificar.encode(mensagem))));
}

/** Valor do cookie: "v1.<expira em ms>.<assinatura>". */
export async function criarSessao(senha: string, agora: number): Promise<string> {
  const expira = agora + DURACAO_SESSAO_MS;
  return `${VERSAO}.${expira}.${await assinar(`${VERSAO}.${expira}`, senha)}`;
}

export async function sessaoValida(valor: string | undefined, senha: string | undefined, agora: number): Promise<boolean> {
  if (!valor || !senha) return false;
  const [versao, expira, assinatura] = valor.split('.');
  if (versao !== VERSAO || !expira || !assinatura || !/^\d+$/.test(expira)) return false;
  if (Number(expira) <= agora) return false;
  const esperada = await assinar(`${versao}.${expira}`, senha);
  return iguais(codificar.encode(assinatura), codificar.encode(esperada));
}
