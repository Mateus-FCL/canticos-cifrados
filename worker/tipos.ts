/**
 * O mínimo dos tipos da Cloudflare que o servidor usa (banco D1 e arquivos do site),
 * escrito aqui para não depender de um pacote só por causa disso.
 */

export interface D1Declaracao {
  bind(...valores: unknown[]): D1Declaracao;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface D1 {
  prepare(sql: string): D1Declaracao;
}

export interface Ambiente {
  /** Banco D1 das sugestões (binding no wrangler.jsonc). */
  BANCO: D1;
  /** Os arquivos do site (dist/), para conferir se um cântico existe. */
  ASSETS: { fetch(pedido: Request | string): Promise<Response> };
  /** Senha do painel do admin (segredo na Cloudflare). Sem ela, o painel fica fechado. */
  ADMIN_SENHA?: string;
  /** Token do GitHub com escrita em "Contents" deste repositório (segredo). Sem ele, não dá para aprovar. */
  GITHUB_TOKEN?: string;
  /** "dono/repositório" no GitHub (variável no wrangler.jsonc). */
  REPOSITORIO_GITHUB?: string;
  /** Ramo onde as aprovações são gravadas: "main" na produção, a branch de teste nas Previews. */
  RAMO_CONTEUDO?: string;
}
