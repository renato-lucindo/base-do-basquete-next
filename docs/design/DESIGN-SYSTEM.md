# Design system da Base do Basquete

A base visual do MVP reúne superfícies claras, azul para ações e seleção, tipografia de leitura rápida e tabelas compactas. A consulta pública prioriza o celular. A operação administrativa prioriza o desktop, com reflow para telas menores. Os [padrões comuns](PADROES.md), [públicos](PUBLICO.md) e [administrativos](PADROES-ADMIN.md) definem o comportamento dos fluxos.

## Uso pelos agentes

Use este guia antes de propor ou editar UI. Comece pela tela atual e pela decisão vigente da área. Localize o consumidor real do token ou componente para conferir se ele cobre o caso solicitado. Ao revisar a entrega, compare a tela renderizada com essa referência e aplique a [conferência de textos e tabelas](README.md#conferência-obrigatória-de-textos-e-tabelas) quando pertinente. Registre a escolha e o resultado observado na seção de verificação da PR.

Por exemplo, ao ajustar uma tabela de estatísticas, confira no [catálogo de métricas](../../src/statistics/metrics.ts) que `J` aparece como **Jogos** no tooltip, no seletor e na legenda. Abra a aba afetada e confirme que a legenda aparece uma vez, depois da paginação, quando houver, e antes do rodapé. Para um diálogo, confira foco inicial, Escape e retorno ao acionador no percurso alterado.

## Catálogo interativo

Com as dependências do projeto instaladas, gere o HTML com `node docs/design/catalogo/build.cjs` e abra `docs/design/.preview-artifacts/catalogo/index.html` no navegador. O catálogo funciona offline. Os exemplos usam dados fictícios e podem ser reiniciados ao recarregar a página.

- **Fundamentos.** Paleta lida do CSS, amostras tipográficas e superfícies.
- **Interface pública.** Abas, busca, ordenação, paginação e tabela vazia.
- **Administração.** Status textual, botão primário, formulário em diálogo, erro junto ao campo e confirmação local.

## Fundamentos em código

| Fundamento          | Fonte e aplicação                                                                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cor                 | [`tokens.css`](../../src/ui-system/tokens.css) contém as cores semânticas. `--bb-blue` é a cor de ação e foco, `--bb-blue-hover` reforça a interação e `--bb-blue-soft` marca seleção.                                                                                                  |
| Superfícies         | Use `--bb-surface` para conteúdo, `--bb-background` para o plano de fundo e `--bb-line` para divisores decorativos. Campos usam `--bb-control-line` para um contorno com contraste próprio.                                                                                             |
| Texto e estado      | `--bb-text` e `--bb-muted` distinguem conteúdo principal e secundário. `--bb-success` e `--bb-danger` acompanham mensagens que identificam o estado em palavras.                                                                                                                        |
| Tipografia          | [`theme.css`](../../src/ui-system/theme.css) aplica os tokens `--bb-font-*` com Inter e fallback de sistema. Na composição `.bb-ui`, corpo de 0,875 rem, seção de 1,0625 rem e título de 1,3125 rem, com título de 1,25 rem até 639 px. Use números tabulares nas métricas comparáveis. |
| Escala e reflow     | [`readability.css`](../../src/ui-system/readability.css) aplica 100% até 639 CSS px e 150% a partir de 640 CSS px. Use rem para dimensões ligadas ao texto, permita quebra em nomes longos e reserve rolagem horizontal para regiões que precisem dela.                                 |
| Densidade e forma   | A composição `.bb-ui` usa cantos de 0,3125 rem nos controles básicos, intervalo de 0,5 rem entre ações e 0,75 rem entre grupos de conteúdo. Controles principais no celular têm referência de 2,75 rem com fonte padrão.                                                                |
| Administração atual | [`styles.css`](../../src/styles.css) consome o mesmo azul e tom neutro de fundo pelos aliases `--blue` e `--surface`. Os componentes administrativos carregam os estilos de suas áreas.                                                                                                 |

## Componentes

| Para                                    | Reutilize                                                                                                                                                                             | Confira                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exibir uma coleção compacta             | [`DataTable` e `Pager`](../../src/ui-system/components.tsx), ou o componente especializado da tela                                                                                    | Identificação prioritária, cabeçalho semântico, números alinhados, ordenação antes do corte e vazio junto aos dados.                                                                              |
| Alternar conteúdo local                 | [`SectionTabs` e `TabPanel`](../../src/ui-system/components.tsx)                                                                                                                      | Cada aba aponta para seu painel. Setas, Home e End movem a seleção. Entre páginas, use links com `aria-current="page"`.                                                                           |
| Buscar e filtrar                        | [`GlobalSearch`](../../src/ui-system/global-search.tsx) no cabeçalho público e [`TeamFilter`](../../src/statistics/reference/team-filter.tsx) para seleção de equipes em estatísticas | Busca local junto aos resultados. Reutilize [`normalizeSearch`](../../src/ui-system/controls.ts) para fixtures e filtros locais. Em consultas paginadas, aplique filtros e ordenação no servidor. |
| Informar métricas abreviadas            | [`StatisticsLegend`](../../src/statistics/reference/scoresheet-statistics-table.tsx) e o catálogo curto consumido por ele                                                             | Uma legenda ao final do conteúdo ativo. Para `J`, use `Jogos` em cabeçalho/tooltip, seletor e legenda, conforme os [padrões de texto](PADROES.md#textos-de-apresentação).                         |
| Executar ação ou identificar estado     | `.bb-button.bb-primary` no tema público, `.primary` na base administrativa e [`Icon`](../../src/ui-system/components.tsx) e [`Badge`](../../src/ui.tsx) nas respectivas bases         | Use `button` para ações e link para navegar. Identifique ações só com ícone por nome acessível. Um status precisa de texto além da cor.                                                           |
| Editar, validar e confirmar             | [`AdminDialog`](../../src/competition/admin-dialog.tsx), [`Field`](../../src/ui.tsx) e [`AdminToast`](../../src/competition/admin-toast.tsx)                                          | Rótulo persistente, erro associado ao campo, foco inicial e retorno ao acionador. Feedback transitório complementa erros e estados persistentes.                                                  |
| Selecionar em catálogos administrativos | [Padrão de combobox](PADROES-ADMIN.md#4-combobox-e-seleção-pesquisável) e o seletor existente do domínio, como [`VenuePicker`](../../src/games/venue-picker.tsx)                      | Pesquisa, estado sem resultados, seleção e limpeza explícitas, navegação por teclado.                                                                                                             |

Ao alterar um token ou componente compartilhado, confira os consumidores afetados e o exemplo equivalente no catálogo. Para mudanças de comportamento, siga o [fluxo de revisão](README.md#fluxo-de-trabalho-dos-agentes), incluindo foco, teclado, zoom, estados vazios e erros.

## Verificação

`npm run design:verify` inclui o catálogo. O verificador confere interação, contraste automatizado com axe, ausência de transbordamento da página e escala nas larguras de 320, 390, 639, 640, 1366 e 1920 CSS px. O verificador também simula ampliação de 200% por CSS. A execução grava capturas desktop e mobile junto do HTML. As provas do catálogo cobrem suas amostras e fixtures. Com WebKit do Playwright instalado, rode `node docs/design/catalogo/verify.cjs --webkit` para repetir a verificação no segundo motor.
