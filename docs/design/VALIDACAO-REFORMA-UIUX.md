# Validação do piloto de UI/UX

Unidade `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`, iniciada em 03/11/2026. [Contrato e limites](REFORMA-UIUX.md); SHA e CI no [checkpoint](../PROGRESSO.md) e na PR da unidade.

## Incremento de 03/11 — checkpoint parcial

Implementados: largura intrínseca das tabelas com limite de identificação de 360 px desktop/260 px mobile, números à direita; TeamFilter da r6 reutilizado no piloto com checkboxes, contador e Todas/Nenhuma; cabeçalho do jogo centralizado, contexto acima e nomes/placar proporcionais. Súmula completa e perfil V4 **pendentes**, não avaliados como concluídos.

`node docs/design/prototipos/reforma-uiux/build.cjs` e `node docs/design/prototipos/reforma-uiux/verify.cjs`: **PASS**, tipagem e 11 cenários, dez capturas, incluindo geometria em 1366/1920, filtros múltiplos/vazio/busca/mínimo/retorno e cabeçalho em 320/390/1366/1920. Demais cenários de teclado/reflow/axe continuaram verdes. Primeira execução revelou seletor de colunas fora da tela em 320 px após a mudança de filtro; corrigidos flex/min-width e ancoragem antes da prova final.

Inspeção visual do autor: [tabela desktop](prototipos/reforma-uiux/capturas/publico-desktop.png) e [jogo no celular](prototipos/reforma-uiux/capturas/jogo-cabecalho-390.png). HTML atual: 292785 bytes, SHA256 `08ecc6bf9ba960ff6b11666df06a29ff757d49ba62b42231b6a3e68eb433c142`.

Revisão `web-design-guidelines`, [diretrizes atualizadas](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultadas em 03/11. Arquivos revisados: app.tsx, pilot.css, theme.css e TeamFilter reutilizado. `pilot.css:14`/regras mobile: painel de seleção com alvos de 44 px e rolagem interna; `theme.css:289`: largura proporcional e números tabulares preservados; `app.tsx:591`: controle semântico r6 com Escape/retorno de foco; `app.tsx:1813`: título e contexto legíveis e centralizados. Sem novo bloqueio encontrado neste recorte. Não é parecer independente. Recomendações da ui-ux-pro-max de navegação por teclado e rolagem interna foram consultadas no planejamento e aplicadas.

**Gate consolidado não repetido neste incremento:** pausa ao atingir 15% restante na janela de 5h. A prova integral original abaixo vale para seu SHA antigo; CI nova deve ser consultada na retomada.

## Provas focais da primeira entrega

Windows, Node 24.18.0, dependências do lockfile (`npm ci --ignore-scripts`), Chromium headless/Playwright 1.64.1. Nenhum dado humano ou serviço remoto participa dos testes.

| Comando                                               | Resultado                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npx vitest run src/ui-system/controls.test.ts`       | 4 PASS: Unicode/acentos/caixa, ordenação completa antes do recorte, ausentes/desempate e precisão |
| `node docs/design/prototipos/reforma-uiux/build.cjs`  | HTML autocontido gerado, sem fontes ou serviços de rede                                           |
| `node docs/design/prototipos/reforma-uiux/verify.cjs` | Tipagem sem diagnósticos, 9 cenários PASS, 8 capturas, nenhum erro JavaScript                     |

O verificador percorre público/admin em 390×844, 1366×768 e 1920×1080; testa reflow em 320 CSS px e ampliação CSS de 200%. Axe sem violações selecionadas em oito telas por resolução, diálogo, seletor de colunas e autocomplete abertos. Exercitados cancelamento/foco, erro recuperável, respostas antigas, ordenação entre páginas, retorno com filtros, campos proporcionais, 12 atletas e distinção 0/00. O exemplo rejeita camisa duplicada. A geometria garante ao menos dez atletas completos no desktop e cinco no celular na primeira tela.

Gate local PASS: 689 unitários, transporte 7, banco isolado 13, Worker/HTTP 29 e PDF/workerd 1; formatação, lint, tipagem, builds, fronteira do cliente e scanner de segredos PASS. `npm run design:verify` completo PASS. O refinamento final de densidade mudou somente CSS e o limite de linhas visíveis no verificador; os nove cenários/tipagem do piloto foram reaplicados após a mudança, reutilizando a prova de backend e protótipos inalterados. CI **SUCCESS** no SHA `298e1917ba3347a67b8be8a2aa7c4a9aa9a5a732`, [run 41745327850](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41745327850): gate completo, design (incluindo o CSS final), **689 unitários**, **551 browsers PASS / 109 SKIP**. Conferência direta dos steps e do log do job `126296757627`. Checkpoint posterior apenas documental reutiliza essa prova; CI do HEAD vigente será conferida antes de integrar. A prova do piloto não substitui verificações das rotas reais.

## Inspeção visual

Capturas selecionadas da execução final:

- [Jogadores no celular](prototipos/reforma-uiux/capturas/publico-mobile.png): identificação/equipe, J/PTS/PPJ e seletor de colunas; busca global visível.
- [Autocomplete no celular](prototipos/reforma-uiux/capturas/busca-mobile.png): tipos, grupos e contexto, sem versões técnicas nas linhas.
- [Jogos no desktop](prototipos/reforma-uiux/capturas/jogos-desktop.png): seis cabeçalhos ordenáveis e ações próximas.
- [Informações no desktop](prototipos/reforma-uiux/capturas/informacoes-desktop.png): Categoria com 145 px em 1366, sem crescer para preencher a página.
- [Equipes/elenco no desktop](prototipos/reforma-uiux/capturas/elenco-desktop.png): lista ao lado de 12 atletas, sem sobreposição.

O HTML servido localmente respondeu HTTP 200 e conferiu byte a byte com o arquivo commitado (288397 bytes, SHA256 `b27dc4e89f51a937dd66ea34fe5736add6c5b10999d18d43c895b05c8fbe927e`).

Conjunto completo e JSON: `docs/design/.preview-artifacts/reforma-uiux/`.

## Skills e revisão do autor

`ui-ux-pro-max` versionada: consultas `data table compact dashboard --design-system --density 9`, `combobox keyboard focus --domain ux` e `derived state effects --stack react`. Aplicadas recomendações pertinentes de foco visível/não encoberto, listas derivadas sem efeitos e limpeza de inscrições/temporizadores. Identidade clara/azul prevaleceu sobre sugestões genéricas.

`web-design-guidelines` 1.0.0 lida da instalação pessoal existente, sem copiar para o Git. [Fonte atual](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultada em 03/11/2026. Revisão do autor nos componentes, app, fixtures, CSS e scripts; não é parecer independente. Achados tratados:

| Arquivo/linha ou função                                             | Correção                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `prototipos/reforma-uiux/app.tsx:47` (`PilotLink`)                  | Navegação com links reais, modificadores e destinos copiáveis; páginas usam links e perfis usam tablist.          |
| `prototipos/reforma-uiux/app.tsx:165` (`go`)                        | Guardas também no hash/histórico, retorno com filtros/ordem em memória e foco sem deslocar o cabeçalho.           |
| `prototipos/reforma-uiux/app.tsx:366` (`ColumnPicker`)              | Escape/clique externo, preferência na sessão e após redimensionar.                                                |
| `prototipos/reforma-uiux/app.tsx` (`GameEditor`, `Rosters`)         | Erros associados aos campos por ARIA, foco no campo a corrigir, rótulos, nomes de controles e contexto de edição. |
| `src/ui-system/components.tsx:214` (`Modal`)                        | Diálogo nativo/fundo inerte, cancelamento, retorno do foco, rolagem interna e ações visíveis.                     |
| `src/ui-system/global-search.tsx:29`                                | Combobox com foco no input, grupos, status acessível, erro recuperável e proteção contra resposta antiga.         |
| `src/ui-system/theme.css:374` e `prototipos/reforma-uiux/pilot.css` | Seleção/foco, números tabulares, alvos mobile, fontes legíveis, rolagem interna e campos proporcionais.           |

Decisões do responsável prevalecem: texto de 14 px nas tabelas, português natural e dispensa de virtualização em listas pequenas/paginadas.

## Limites

Fixtures locais: não comprova API, ordenação/busca no servidor, persistência, conflitos, importação, publicação ou deploy. Ampliação CSS não substitui zoom nativo em todos os navegadores. Axe e revisão do autor não comprovam WCAG integral nem aceite humano. O responsável escolheu avaliar o piloto antes da expansão; manter a mesma unidade/PR enquanto aguarda esse aceite.
