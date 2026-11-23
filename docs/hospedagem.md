# Hospedagem

O app é um site estático (só arquivos, sem servidor): o `pnpm build` gera tudo em `dist/`.
Ele fica hospedado na **Cloudflare Pages**, de graça, com `https` (obrigatório para instalar
na tela inicial e para funcionar sem internet).

## Como funciona depois de configurado

- **Merge na `main`** → a Cloudflare roda o build e publica no endereço oficial
  (`https://<nome-do-projeto>.pages.dev`) em poucos minutos.
- **Envio de qualquer outra branch** → a Cloudflare publica um **endereço de teste** só daquela
  branch (ex.: `https://funcao-sem-internet.<nome-do-projeto>.pages.dev`). Dá para testar no
  celular antes do merge.
- **Todo PR** → o GitHub Actions (`.github/workflows/verificar.yml`) roda os testes e o build.
  Se algo quebrar (inclusive um cântico com erro no YAML), o PR mostra um ✗ vermelho.

## Configurar pela primeira vez (uma vez só)

1. Crie uma conta grátis em <https://dash.cloudflare.com/sign-up>.
2. No painel, abra **Workers e Pages** → **Criar** → aba **Pages** → **Conectar ao Git**.
3. Autorize a Cloudflare no GitHub e escolha o repositório **canticos-cifrados**.
4. Preencha:

   | Campo | Valor |
   |---|---|
   | Nome do projeto | `canticos-cifrados` (vira o endereço `canticos-cifrados.pages.dev`) |
   | Branch de produção | `main` |
   | Framework | Astro (ou "Nenhum") |
   | Comando de build | `pnpm build` |
   | Pasta de saída | `dist` |

5. Em **Variáveis de ambiente** (do build), adicione:

   | Nome | Valor |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `PNPM_VERSION` | `10.34.9` |

6. Clique em **Salvar e implantar**. O primeiro build leva uns 2 minutos.
7. Abra o endereço `https://….pages.dev` no celular. No Android, deve aparecer
   **"Usar como app"**; no iPhone, use **Compartilhar → Adicionar à Tela de Início**.

## O que já está pronto no código

- `public/_headers`: política de segurança (CSP) em todas as páginas; CSS e scripts do build
  guardados por um ano no navegador (o nome deles muda a cada versão); o service worker
  sempre conferido, para a versão nova chegar.
- `src/pages/404.astro`: página de endereço errado. Sem ela, a Cloudflare mostraria a lista
  de cânticos para qualquer endereço.

## Domínio próprio (opcional, depois)

Em **Pages → canticos-cifrados → Domínios personalizados** dá para usar um endereço como
`canticos.suaigreja.com.br`. O `https` continua automático.
