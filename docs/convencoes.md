# Convenções do projeto

Cânticos Cifrados: app para consultar letra e cifra dos cânticos do culto.
Lido no celular, em pé, durante o culto, por pessoas de idade avançada.

Decisões em `docs/adr/`. Regras de acessibilidade em `docs/acessibilidade.md`.
Escopo em `docs/spec.md`.

## Stack
- **Astro** com coleções de conteúdo validadas por Zod.
- **TypeScript estrito, sem `any`.**
- **Vitest**, com teste antes do código no parser, na transposição e na rolagem.
- **CSS próprio** com variáveis. Sem framework de CSS.
- **Pagefind** para busca, índice gerado no build.
- **PWA** com @vite-pwa/astro.
- Hospedagem a definir no ADR-0002. Até lá, nada de servidor.

## Regras que não mudam

1. **Obedecer ao tamanho de fonte do sistema.** Se a pessoa já aumentou a letra
   no celular, o app começa grande. O layout não quebra com a fonte em 200%.
   É a regra que mais importa; as outras servem a ela.
2. **Acessibilidade é requisito, não melhoria.** Vale `docs/acessibilidade.md`
   em toda tela: alvo de toque de 60 px, texto mínimo de 19 px, entrelinha 1,5,
   palavra no lugar de símbolo, nada só em gesto.
3. **Nenhuma dependência GPL ou AGPL** no código que vai para o navegador.
   Conferir com `pnpm licenses list` antes de adicionar pacote.
4. **Lógica pura separada do DOM.** O parser, a transposição e a conversão
   entre batida e posição são testáveis sem navegador. Rolagem e medição
   entram como adaptadores.
5. **A cifra segue a convenção brasileira.** Ver abaixo.
6. **Nenhuma conta de usuário.** Guardar que alguém frequenta uma igreja é
   dado pessoal sensível pela LGPD (art. 5º, II).
7. **Direitos são só informativos.** A origem da letra e da cifra pode ser
   anotada no cântico, mas a falta dela não bloqueia o build.
8. Nada de `innerHTML` com conteúdo externo sem sanitizar. CSP em
   `public/_headers`. Nenhum segredo com prefixo `PUBLIC_`.
9. Decisão de arquitetura abre ADR. Um passo pequeno por vez, com teste antes
   da interface. Parar ao fim de cada passo e mostrar o resultado.

## Git

- Mensagem de commit no imperativo, em português, dizendo o que mudou e por quê.
- Um commit por fatia de funcionalidade. Commit que mistura duas não entra.
- Sem rodapé, linha de assinatura ou coautoria na mensagem. O commit é de quem
  desenvolveu.
- Cada fatia numa branch com pull request. O outro revisa antes do merge.

## Cifra brasileira

Letras iguais à notação americana: A, B, C, D, E, F, G, com `m` minúsculo para
menor. `B` é Si, nunca Si bemol. Biblioteca que usar a convenção alemã
(`B` = Si bemol, `H` = Si) está errada para este projeto.

| Acorde | Brasil | Inglês |
|---|---|---|
| Sétima maior | `C7M` | `Cmaj7` |
| Menor com sétima maior | `Cm7M` | `Cm(maj7)` |
| Aumentado | `C+`, `Caum` | `Caug` |
| Diminuto | `C°` | `Cdim` |
| Meio diminuto | `Cm7(b5)` | `Cø` |

Iguais: `Cm`, `C7`, `Csus4`, `C9`, `C/E`, `C#`, `Cb`.

O parser lê as duas formas, porque material da internet vem misturado, e
escreve só na brasileira. Casos obrigatórios de teste: `C7M`, `Cm7M`, `C+`,
`C°`, `Bbm7(b5)`, `C/E`, `F#m7`, e acorde no meio da palavra.

## Modelo de conteúdo

Um arquivo YAML por cântico em `src/content/canticos/`. O formato está em
`src/lib/cantico.ts`.

- **Cântico**: `numero?`, `titulo`, `historia?`, `pessoas`, `tags`, `versoes`
- **Versão**: `tom`, `compasso`, `bpm`, `chordpro`, `audio?`, `pdf?`, `direitos?`
- **Direitos** (informativo): `origemLetra?`, `origemCifra?`

`tags` serve para filtrar a lista e não pode repetir. `audio` (áudio de
referência para a rolagem, nunca tocado para o usuário) e `pdf` ficam na
versão, porque mudam com o arranjo, e são endereços `https` (por exemplo, no R2).
O padrão de nomes dos arquivos no R2 ainda vai ser definido (issue #3).

Formato escolhido no lugar de `cantico.md` + `cifra.cho` com ChordSheetJS
(issue #8): o ChordSheetJS é GPL-2.0 (regra 3) e usa a notação americana, e o
painel de cadastro (Sveltia CMS) trabalha melhor com um arquivo por cântico.

A letra não é um campo à parte: ela sai do `chordpro`, tirando os acordes.
Assim letra e cifra nunca ficam diferentes.

`numero` é opcional até o ADR-0004, mas não pode se repetir.

## Rolagem (ADR-0007)

A leitura rola no andamento do cântico, não a velocidade fixa. Cada versão
guarda `bpm`. O mapa de batidas por linha é gerado no build a partir do
próprio ChordPro: acorde cai em tempo forte, então a posição dos acordes já
diz quantas batidas tem cada linha.

Um toque ressincroniza a posição. Depois de cada ressincronização, comparar
as batidas decorridas com as esperadas e ajustar também a taxa, não só a
posição.

Precisa de pausa: o pastor fala entre as estrofes.

Mudar o tamanho da letra muda a altura total do texto, então o mapa de
batidas para pixels é recalculado ao mudar o tamanho, ao girar o aparelho e
ao mudar a fonte do sistema.

## Armadilhas conhecidas

- A transposição escolhe sustenido ou bemol pelo tom de destino (Mi bemol, não
  Ré sustenido) e trata acorde com baixo e extensões.
- O brasileiro escreve o acorde em letra e fala a nota em dó-ré-mi. Confirmar
  com o cliente se o rótulo é "Tom G" ou "Tom Sol".
- A tela não apaga enquanto um cântico está aberto. Não é opção de usuário.
- Rolagem contínua é mais difícil de acompanhar com visão reduzida. Testar
  contra salto de linha em linha e respeitar `prefers-reduced-motion`.

## Comandos

- `pnpm install --frozen-lockfile`
- `pnpm dev`, `pnpm test`, `pnpm build`
- `pnpm licenses list`
