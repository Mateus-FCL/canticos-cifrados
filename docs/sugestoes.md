# Sugestões de cânticos: configurar na Cloudflare

Qualquer pessoa sugere um cântico novo ou uma correção pela tela **/sugerir/**. A sugestão vai
para o servidor do app (`worker/index.ts`, endereço `/api/sugestoes`), que:

1. só aceita envios vindos do próprio app, com limite de tamanho;
2. confere os campos (as mesmas regras da tela, em `src/lib/sugestao.ts`);
3. descarta envios de robôs que caem na **armadilha** (um campo escondido que pessoas não veem);
4. aceita no máximo 10 sugestões por hora do mesmo lugar;
5. guarda como **pendente** no banco **D1**, para o admin aprovar depois.

Nada aparece no app sem a aprovação do admin: no pior caso, um robô enche a lista de pendentes,
mas não publica nada. Do endereço de quem enviou, o banco guarda só um **resumo**, usado apenas
para o limite por hora.

## Configurar (uma vez, no painel da Cloudflare)

Só é preciso o banco D1 (já feito: `canticos-sugestoes`).

1. No menu da esquerda: **Storage & databases** → **D1 SQL database** → **Create database**.
2. Nome: `canticos-sugestoes`. Copie o **Database ID** e coloque no `wrangler.jsonc`, nos dois
   lugares: `d1_databases` (produção) e `previews.d1_databases` (endereços de teste das branches,
   que não herdam nada da produção).

Não precisa criar tabela: o servidor cria sozinho na primeira sugestão.

## Ver as sugestões que chegaram

Página do banco → **Console**:

```sql
SELECT * FROM sugestoes ORDER BY criada_em DESC;
```

## Testar

No endereço de teste da branch, abra **/sugerir/**, cole uma cifra e envie. Deve aparecer
**"Sugestão enviada!"**, e a consulta acima mostra a linha nova com `status` = `pendente`.

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Build falha falando de `d1_databases` | Confira o `database_id` no `wrangler.jsonc` |
| "Não foi possível enviar agora" | Veja os logs em **Workers & Pages** → **canticos-cifrados** → **Observability** |
| Muitas sugestões de lixo | Dá para voltar a ter a verificação "não sou robô" (Cloudflare Turnstile) |
