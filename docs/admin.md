# Painel do admin

Endereço: **/admin/** (não aparece em menus nem em buscadores; guarde o link).

Lá o admin:

- entra com a **senha do painel** (a sessão dura 30 dias neste aparelho);
- vê as sugestões **pendentes**, separadas em *Cânticos novos* e *Correções*;
- abre uma sugestão: na correção, vê **o que mudou** (linhas com − saem, com + entram);
- confere e arruma título, número, tom, compasso, BPM e cifra, com a prévia ao vivo;
- toca em **Aprovar e publicar**: o servidor grava o cântico no GitHub (um commit) e a
  Cloudflare refaz o site; em uns **2 minutos** ele aparece no app;
- ou toca em **Recusar**: a sugestão sai da lista.

Proteções: senha conferida no servidor; **5 erros de senha em 15 minutos** bloqueiam
temporariamente; **trocar a senha desloga todo mundo**; o app confere o cântico com as mesmas
regras do build antes de gravar; correção feita em cima de uma versão antiga é recusada
("este cântico mudou desde que você abriu").

## Configurar (uma vez)

O painel precisa de dois **segredos** (nunca vão para o código nem para o GitHub):

| Segredo | O que é |
|---|---|
| `ADMIN_SENHA` | A senha do painel. Sem ela, o painel fica fechado. |
| `GITHUB_TOKEN` | Permite ao servidor gravar os cânticos aprovados no repositório. |

### 1. Criar o token do GitHub

1. GitHub → foto do perfil → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Nome: `canticos-cifrados-admin`. Validade: a maior que preferir (anote para renovar).
3. **Repository access**: *Only select repositories* → `Mateus-FCL/canticos-cifrados`.
4. **Permissions** → **Repository permissions** → **Contents**: *Read and write*. Nada mais.
5. **Generate token** e copie (começa com `github_pat_`). Ele só aparece uma vez.

### 2. Colocar os segredos na Cloudflare

**Endereços de teste (Previews), antes do merge** — pelo terminal do VS Code, na pasta do
projeto e na branch de teste (o painel da Cloudflare não deixa enquanto a produção não tem
servidor):

```bash
npx wrangler login
npx wrangler preview base-config secret put ADMIN_SENHA
npx wrangler preview base-config secret put GITHUB_TOKEN
npx wrangler preview secret put ADMIN_SENHA
npx wrangler preview secret put GITHUB_TOKEN
```

Cada comando pede o valor: digite a senha escolhida ou cole o token e aperte Enter.
Os de `base-config` valem para as Previews futuras; os outros, para a Preview atual.

**Endereço oficial, depois do merge** — painel da Cloudflare → **Workers & Pages** →
**canticos-cifrados** → **Settings** → **Runtime variables and secrets** (seletor em
*Production*) → **Add** → tipo **Secret** → `ADMIN_SENHA` e depois `GITHUB_TOKEN`.

## Onde as aprovações são gravadas

No `wrangler.jsonc`, a variável `RAMO_CONTEUDO`:

- **produção**: `main` (o cântico aprovado aparece no endereço oficial);
- **Previews**: a branch de teste (`funcao/sugestoes`), para os testes **nunca** mexerem na main.

## Trocar a senha

Repita o passo 2 só para `ADMIN_SENHA` com a senha nova (produção: no painel; Previews: no
terminal). Todo mundo que estava logado sai e precisa da senha nova.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "O painel ainda não tem senha configurada" | Falta o segredo `ADMIN_SENHA` (passo 2) |
| "Falta o GITHUB_TOKEN" ao aprovar | Falta o segredo `GITHUB_TOKEN` (passos 1 e 2) |
| "Muitas tentativas erradas" | Espere 15 minutos |
| "Algo deu errado no servidor" ao aprovar | Token vencido ou sem permissão de *Contents*; veja os logs em **Observability** |
| Aprovou, mas o cântico não apareceu | Veja se o build da Cloudflare depois do commit ficou verde |
