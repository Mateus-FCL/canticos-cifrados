# Sugestões de cânticos: configurar na Cloudflare

Qualquer pessoa sugere um cântico novo ou uma correção pela tela **/sugerir/**. A sugestão vai
para o servidor do app (`worker/index.ts`, endereço `/api/sugestoes`), que:

1. confere os campos (as mesmas regras da tela, em `src/lib/sugestao.ts`);
2. confere a caixa **"não sou robô"** (Cloudflare **Turnstile**);
3. aceita no máximo 10 sugestões por hora do mesmo lugar;
4. guarda como **pendente** no banco **D1**, para o admin aprovar depois.

Do endereço de quem enviou, o banco guarda só um **resumo** (não dá para descobrir o IP a partir
dele), usado apenas para o limite por hora.

São três coisas para fazer **uma vez** no painel da Cloudflare (<https://dash.cloudflare.com>).

## 1. Criar o banco D1

1. No menu da esquerda: **Storage & databases** → **D1 SQL database** → **Create database**.
2. Nome: `canticos-sugestoes`. Localização: deixe a automática. Clique em **Create**.
3. Na página do banco, copie o **Database ID** (um código como `3f2a1c9e-...`).
4. No arquivo `wrangler.jsonc`, troque `COLE-AQUI-O-ID-DO-BANCO` por esse código.

Não precisa criar tabela: o servidor cria sozinho na primeira sugestão.
Para ver as sugestões que chegaram: página do banco → **Console** →
`SELECT * FROM sugestoes ORDER BY criada_em DESC;`

## 2. Criar a verificação "não sou robô" (Turnstile)

1. No menu da esquerda: **Turnstile** → **Add widget**.
2. Nome: `Cânticos – sugestões`.
3. **Hostnames**: adicione `f4lcomate.workers.dev` (vale para o endereço oficial e para os
   endereços de teste das branches). Se um dia usar domínio próprio, adicione ele também.
4. Modo: **Managed** (a Cloudflare decide; quase sempre não pede nada à pessoa).
5. Clique em **Create**. Aparecem duas chaves:
   - **Site Key** (pública): vai para a tela;
   - **Secret Key** (secreta): vai só para o servidor. Nunca no código nem no GitHub.

## 3. Colocar as chaves no projeto

Em **Workers & Pages** → **canticos-cifrados** → **Settings**:

- **Build** → **Variables and secrets** (a do build, onde estão `NODE_VERSION` e `PNPM_VERSION`)
  → **Add** → nome `PUBLIC_TURNSTILE_SITE_KEY`, valor = a **Site Key**.
- O segredo `TURNSTILE_SECRET` (valor = a **Secret Key**) depende de onde o servidor está:
  - **Endereços de teste das branches (Previews)**: eles **não herdam** nada da produção.
    O segredo vai na área **Previews Base**:
    - pelo painel: em **Runtime variables and secrets**, troque o seletor do alto de
      **Production** para **Previews Base** e adicione o segredo (tipo **Secret**);
    - ou pelo terminal do VS Code (abre o navegador para entrar na conta uma vez):
      ```bash
      npx wrangler login
      npx wrangler preview base-config secret put TURNSTILE_SECRET
      ```
      Ele pede o valor: cole a **Secret Key** e aperte Enter.

    O segredo vale para os **Previews criados depois** dele: faça um commit novo (ou
    **Retry build**) para a branch ganhar um Preview novo.
  - **Endereço oficial (produção)**: só depois do merge na `main`. Antes disso, o painel mostra
    "Variables cannot be added to a Worker that only has static assets", porque a produção ainda
    não tem servidor. Depois do merge, adicione em **Runtime variables and secrets**
    (seletor em **Production**) → **Add** → tipo **Secret**, nome `TURNSTILE_SECRET`.

O banco D1 já está ligado nos dois (bloco `d1_databases` e `previews.d1_databases` no
`wrangler.jsonc`).

Enquanto a `PUBLIC_TURNSTILE_SITE_KEY` não existir, a tela usa a **chave de teste** da
Cloudflare: a caixa mostra "Somente para teste" e aprova qualquer um. Sem o
`TURNSTILE_SECRET`, o servidor **recusa** todas as sugestões (e avisa no log do Worker).

## Testar

No endereço de teste da branch (ver **Deployments**), abra **/sugerir/**, cole uma cifra e envie.
Deve aparecer **"Sugestão enviada!"**. No **Console** do D1, a consulta acima mostra a linha nova.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| A caixa "não sou robô" mostra erro de domínio | Adicione o endereço exato da página em **Hostnames** do Turnstile |
| "Não foi possível confirmar que você não é um robô" sempre | Confira o segredo `TURNSTILE_SECRET` (copiado inteiro, tipo Secret, na seção do servidor) |
| Build falha falando de `d1_databases` | O `database_id` no `wrangler.jsonc` ainda está como `COLE-AQUI-…` ou está errado |
| "Não foi possível enviar agora" | Veja os logs em **Workers & Pages** → **canticos-cifrados** → **Observability** |
