# Hospedagem

O app é um site estático (só arquivos, sem servidor): o `pnpm build` gera tudo em `dist/`.
Ele fica hospedado na **Cloudflare Workers** (com arquivos estáticos), de graça, com `https`
(obrigatório para instalar na tela inicial e para funcionar sem internet).
A configuração está em `wrangler.jsonc`.

## Como funciona depois de configurado

- **Merge na `main`** → a Cloudflare roda o build e publica no endereço oficial
  (`https://canticos-cifrados.<sua-conta>.workers.dev`) em poucos minutos.
- **Envio de qualquer outra branch** → a Cloudflare publica um **endereço de teste** só daquela
  branch (ex.: `https://funcao-sem-internet-canticos-cifrados.<sua-conta>.workers.dev`). Dá para
  testar no celular antes do merge.
- **Todo PR** → o GitHub Actions (`.github/workflows/verificar.yml`) roda os testes e o build.
  Se algo quebrar (inclusive um cântico com erro no YAML), o PR mostra um ✗ vermelho.

## Configurar pela primeira vez (uma vez só)

1. Crie uma conta grátis em <https://dash.cloudflare.com/sign-up>.
2. No painel, abra **Workers & Pages** → **Create application** → **Import a repository**,
   autorize a Cloudflare no GitHub e escolha **Mateus-FCL/canticos-cifrados**.
3. Na tela **Set up your application**, preencha:

   | Campo | Valor |
   |---|---|
   | Project name | `canticos-cifrados` (**só o nome**: letras minúsculas, números e traços) |
   | Build command | `pnpm build` |
   | Deploy command | `npx wrangler deploy` (já vem preenchido) |
   | Preview command | `npx wrangler versions upload` (ou o que vier preenchido) |

4. Clique em **Deploy**.
5. Abra o projeto → **Settings** → **Build**:
   - **Branch control**: produção na `main` e **builds para as outras branches ligados**
     (é isso que cria o endereço de teste de cada branch).
   - **Variables and secrets** (do build) → adicione:

     | Nome | Valor |
     |---|---|
     | `NODE_VERSION` | `24` |
     | `PNPM_VERSION` | `10.34.9` |

6. Abra a aba **Domains** e **ligue as duas chavinhas** de "Worker URL":
   **Production** (endereço oficial) e **Preview** (endereços de teste das branches).
   Desligadas, os endereços `workers.dev` não abrem.
7. Em **Deployments**, clique no build mais recente para ver o registro (log). Se tiver
   falhado antes de existir o `wrangler.jsonc`, basta enviar um commit novo (ou **Retry build**).
8. Abra o endereço no celular. No Android, deve aparecer **"Usar como app"**; no iPhone,
   use **Compartilhar → Adicionar à Tela de Início**.

## O que já está pronto no código

- `wrangler.jsonc`: diz à Cloudflare para servir a pasta `dist/` e mostrar a página 404
  quando o endereço não existe.
- `public/_headers`: política de segurança (CSP) em todas as páginas; CSS e scripts do build
  guardados por um ano no navegador (o nome deles muda a cada versão); o service worker
  sempre conferido, para a versão nova chegar.
- `src/pages/404.astro`: página de endereço errado.

## Domínio próprio (opcional, depois)

Na aba **Domains** do projeto, **+ Add Domain** permite usar um endereço como
`canticos.suaigreja.com.br`. É preciso já ter o domínio; o `https` continua automático.
