# Validação da reforma de UI/UX

Unidade `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`, iniciada em 03/11/2026. [Contrato e limites](REFORMA-UIUX.md); SHA e CI no [checkpoint](../PROGRESSO.md) e na PR da unidade.

## Integração nas rotas reais — autorização de04/11

O responsável autorizou implementar o último plano na mesma PR #51. `/atleta.html` agora apresenta a página contínua usando apenas respostas públicas validadas: identificação/dados disponíveis, conquistas laterais/abaixo, resumo temporada/carreira, até3 atuações recentes e estatísticas por inscrição. Jogos completos/Histórico/Evolução recolhidos. Sem foto/idade/data completa inventadas. Honrarias sem equipe disponível não recebem associação inferida; colocações coletivas não atribuem premiação individual.

A súmula real mantém `PublicGameView` e sua folha de estilos. O ajuste de navegação permite retornar de qualquer disputa ao perfil público identificado com filtros, colunas, painéis e posição preservados; não amplia o conjunto de destinos externos aceitos. API, Worker, banco, migrations e regras de publicação permanecem sem alterações.

### Provas locais

- `npm run gate`: **PASS**,693 unitários/142 arquivos, transporte7, banco isolado13, Worker/HTTP29, PDF/workerd1, tipos/builds/formato/lint/fronteira/segredos. Posteriormente, atributos de formulário, contenção de rolagem dos menus e fixtures/cache do preview receberam TypeScript/lint/formato focais; os cálculos, contratos e Worker permaneceram iguais. Sem banco real ou deploy.
- `npx playwright test tests/player-public.spec.ts tests/public-accessibility.spec.ts --workers=4`: **42 PASS**, desktop/mobile. Cobre ordem dos blocos, carreira independente da origem, resumo/recentes invariantes, checkbox Nenhuma/vazio e persistência, ordenação/colunas,25 registros distribuídos em páginas, cobertura/ausência/zero, erros/retry/contaminação, alteração entre páginas, datas e atuação explícita, retorno de outra disputa/rolagem,320/390/1366/1920, nomes longos e texto200%. Axe nos blocos, painéis e opções. Polimento posterior: **6 PASS** de geometria320/390 e axe/checkboxes nos dois projetos.
- `npx playwright test tests/public-navigation.spec.ts tests/public-result.spec.ts tests/public-prototype-fidelity.spec.ts tests/public-implementation-visual.spec.ts --workers=4`: **38 PASS**, incluindo fidelidade da súmula vigente, fontes sem parciais, faltas, navegação sem sessão, recortes, controles e seleção. Total:80 verificações de interface nesta etapa, mais6 reaplicadas após o polimento.
- Preview das rotas reais em5177 com fixtures declaradas: HTTP200,3 atuações/3 inscrições do atleta de exemplo e sem erro JavaScript; inspecionado em1366/390. Cache próprio do Vite evita interferir nos testes de5174. IDs de inscrição distintos por disputa fictícia; fonte e contratos validados, sem acesso ao banco.
- Inspeção visual do autor: conquistas ao lado no desktop/abaixo no celular; tabela à esquerda com números à direita. A primeira inspeção mobile cortava os pontos recentes: data agrupada junto ao confronto, preservando placar/PTS na área visível. HTML offline do piloto inalterado,364501 bytes/SHA256 `782a247dbba5c27c2d6827325a7e4b7f7679698df836c979be5bd762bd7c49ee`; continua referência fictícia, não uma cópia offline do produto.

Capturas da aplicação com fixtures de teste: [1366](evidencias/perfil-real/perfil-1366.png), [1920](evidencias/perfil-real/perfil-1920.png), [390](evidencias/perfil-real/perfil-390.png), [320](evidencias/perfil-real/perfil-320.png), [texto200%](evidencias/perfil-real/perfil-320-text200.png), [sem metadados opcionais/conquistas](evidencias/perfil-real/perfil-sem-metadados-390.png). As provas anteriores do piloto continuam abaixo, com limites próprios; não equivalem às rotas reais.

Logs em `.preview-artifacts/`: `player-integration-gate.log` SHA256 `2e6f9e6fc58e9dafbcae1644247525c14131089ab0f709db14c8684efdf16b9a`; `player-integration-verified.log` SHA256 `ec9bf60c8645cfa5a057af6dff1d1d564ede38cc011d99ba9e797a7a6380b3d2`; `player-integration-regression.log` SHA256 `83a2fa1ffa2ccee9860e770d015f0d21b449ca5d96fb012dc3cb47b0aef56f2b`. SHA material/CI no checkpoint e descrição da PR, sem extrapolar os resultados de outro commit.

### Revisão de UI/UX do autor

`ui-ux-pro-max`: consulta `progressive disclosure data tables --domain ux`, resultado Table Handling/Responsive aplicado à rolagem interna, mantendo regras do projeto acima das recomendações genéricas. `web-design-guidelines`: [diretrizes atuais](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultadas nesta execução. Achados tratados:

- `src/player-profile/public-page.tsx:330` / `public.css:403`: data dos recentes agrupada no celular, sem esconder PTS/placar; nomes longos com quebra.
- `src/player-profile/public-page.tsx:988`: glossário acessível por teclado/toque para siglas e cobertura; campos nativos rotulados/com nome, estados vazios e aviso de erro com foco.
- `src/player-profile/public.css:1`: tipografia emrem para acompanhar ampliação de texto; reflow interno, sem transbordamento da página. Menus com Escape/retorno do foco e rolagem contida.
- `src/public-ui/navigation.ts:29`: retorno do perfil de carreira entre disputas, preservando validação de destino local.

Falhas intermediárias registradas: fixture de teste comparava `Number(null)` ao gatilho0, simulando falha em toda primeira página; corrigido para página1. Dois seletores de teste confundiam label exato com o nome acessível do combobox e região com tabela; corrigidos sem ampliar timeout. Uma comparação usava innerText como expectativa de textContent; padronizada. Um teste de estatísticas recebeu otimização de dependências obsoleta ao iniciar preview com cache compartilhado; separado o cache, e a suíte correspondente passou novamente. Não são evidências de regressão resolvidas por ignorar testes.

Limites: revisão do autor, sem parecer independente, teste assistivo humano ou certificação WCAG integral. Os80 casos usam fixtures/transportes locais, não cobertura de dados humanos publicados. A API exige paginação de20; históricos extensos precisam de muitas consultas (até500 no limite de10000 registros), concorrência3. Falhas e inconsistências detectáveis impedem agregação parcial; não há token transacional de carreira no contrato nem benchmark no limite. Demais telas/novo autocomplete global/admin permanecem no piloto, fora deste recorte. PR Draft, sem merge/deploy/publicação.

## Piloto anterior — perfil contínuo e composição atual da súmula (04/11)

Plano explicitamente aprovado nesta conversa: recuperar o jogo atual, usar o print do Basketball Reference para organização de nome/dados pessoais e apresentar perfil contínuo com conquistas laterais desktop/abaixo no celular, resumo de temporada/carreira, três últimos jogos e estatísticas por campeonato. Jogos completos/Histórico/Evolução ficam recolhidos depois desses blocos. A proposta de jogo de72aba24 foi reprovada; a implementação atual aguarda avaliação visual.

- **Jogo:** reutiliza diretamente `src/publication/public-view.css`, sem modificar a aplicação. Contexto compacto e tabela de parciais/total, sem placar separado nem painéis novos; elencos, comissão, titulares/capitão/0/00, LL%, recortes sincronizados e faltas explícitas preservados. A prova renderiza também o `PublicGameView` atual com `confirmedManualFixture`, sem API/dado humano, e compara altura, fonte, borda e fundo das células em390/1366. Não é comparação com banco/serviço publicado.
- **Perfil:** sem tablist; nome28/24, campos públicos rotulados e omissão de ausentes, conquistas separadas por tipo, resumo em duas linhas com J e médias elegíveis. Cobertura parcial não entra como zero. Três jogos derivados de atuações explícitas; filtros da tabela não alteram resumo, conquistas ou recentes. Painéis/recortes/rolagem sobrevivem ao retorno e recarga; links antigos de seção continuam funcionando.
- **Verificação final:** `npm run design:verify` PASS, referências originais/tipagem e **17 cenários/20 capturas** do piloto. Axe sem violações selecionadas em telas/painéis/menus/diálogos; teclado/foco,320/390/1366/1920 e zoomCSS200. Teste adicional de teclado no navegador: Space abre e Enter fecha o painel; link antigo de conquistas leva ao título correto. Inspeção visual do autor no desktop/mobile e navegador da conversa. Não é parecer independente, WCAG integral ou aceite humano.
- **Gate consolidado:** `npm run gate` PASS — 689 unitários/141 arquivos, transporte7, banco isolado13, Worker/HTTP29, PDF/workerd1; formato/lint/tipos/builds/fronteira/segredos. Apenas documentação e cópias de capturas atualizadas depois dessa execução; formato focal reaplicado antes do commit. CI nova no checkpoint/PR; nenhuma integração Git/deploy executada.

Falhas focais tratadas: fechamento do painel nativo podia chegar à URL depois da recarga, corrigido com atualização controlada no acionamento do summary; o teste de retorno passou a medir rolagem após colocar o link de saída na tela, evitando confundir a rolagem automática do Playwright com a posição de saída. Não ampliados timeouts ou removidas provas de retorno. A primeira inspeção também detectou colisão com classes do perfil de equipe; as classes de identidade/resumo do jogador foram isoladas. Foco da célula F passou a ter seletor com especificidade suficiente contra a folha da súmula.

Revisão do autor com `ui-ux-pro-max` (busca `heading hierarchy --domain ux`, hierarquia sequencial/tipografia) e `web-design-guidelines` ([fonte atual](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultada nesta execução). Achados tratados por local:

- `public-details.tsx:590` e `pilot-navigation.tsx:71`: abertura dos painéis na URL, links reais de seção e limpeza de parâmetros em entrada nova; retorno conserva contexto.
- `public-details.tsx:728` e `public-details.css:174`: ordem DOM identificação/conquistas/resumo, lateral apenas no desktop, nomes longos e campos ausentes sem espaço artificial.
- `public-details.tsx:790` e `fixtures.ts:367`: resumo separado dos filtros; médias e cobertura conferidas, ano de nascimento sem inferir idade/data completa.
- `public-details.tsx:1009` e `public-details.css:91`: painel nativo acessível por teclado, controle de persistência e foco do total de faltas dentro da célula.

HTML autocontido: 364501 bytes, SHA256 `782a247dbba5c27c2d6827325a7e4b7f7679698df836c979be5bd762bd7c49ee`. HTTP local200, conteúdo idêntico ao arquivo. Logs locais: `design-perfil-continuo.log` e `gate-perfil-continuo.log` em `docs/design/.preview-artifacts/reforma-uiux/`; hashes/SHA no checkpoint.

Capturas vigentes: [perfil desktop](prototipos/reforma-uiux/capturas/perfil-resumo-desktop.png), [perfil celular](prototipos/reforma-uiux/capturas/perfil-resumo-mobile.png), [súmula desktop](prototipos/reforma-uiux/capturas/sumula-desktop.png), [súmula celular](prototipos/reforma-uiux/capturas/sumula-mobile.png), [componente atual com fixture desktop](prototipos/reforma-uiux/capturas/jogo-atual-referencia-1366.png), [componente atual com fixture celular](prototipos/reforma-uiux/capturas/jogo-atual-referencia-390.png). As capturas históricas nos mesmos caminhos foram substituídas; usar o SHA da seção antiga para reproduzi-las.

Fixtures apenas: nenhuma API, rota real, banco, publicação, deploy, boxscore, comparação ou recordes novos. As tabelas do catálogo ainda reutilizam cenários fictícios e não comprovam cobertura de todos os recortes. PR #51 permanece Draft.

## Revisão de 72aba24 — histórico, jogo reprovado (04/11)

As **duas páginas anteriores foram reprovadas pelo responsável**, apesar de seus testes funcionais verdes. A nova revisão usa a liberdade de composição reiterada nesta conversa, priorizando o jogo. O resultado e as parciais agora formam um bloco central; os elencos ficam próximos em 900 px, sem o card externo da página nem abas repetidas no detalhe. O perfil ocupa 1000 px, reúne identificação/biografia e números de carreira, e apresenta jogos recentes antes das participações. Tema claro/azul e contratos funcionais preservados.

Inspeção do autor em 320/390/1366/1920 px e no navegador aberto pelo responsável. Foram comparadas a referência original de súmula, a versão reprovada e a nova composição. Na revisão mobile, a tabela recente do perfil cortava PTS: corrigidos largura do confronto e data em duas linhas. Na captura de estresse, nomes longos não colidiam, mas formavam colunas estreitas: o jogo mobile passou a usar uma linha por equipe/placar, preservando o confronto horizontal no desktop. O verificador ganhou uma prova específica para nomes longos sem colisão e pontos recentes visíveis em 320/390; preservado o mínimo anterior de seis atletas completos por equipe na primeira tela desktop. As capturas de nomes longos alteram apenas o texto no DOM para estresse visual, sem representar identidades novas nas fixtures.

HTML autocontido: **339743 bytes**, SHA256 `6ee69d129ab6e6df86ad6235577b0550645f24e82e45708a55bcb3f1818525c1`. Build/tipagem e verificações focais verdes durante a implementação; prova consolidada desta revisão registrada no checkpoint após a execução. Log local: `docs/design/.preview-artifacts/reforma-uiux/design-final-revisao.log`. As capturas selecionadas abaixo são substituídas pelas da execução vigente; versões anteriores podem ser recuperadas no SHA indicado em cada seção histórica.

Prova final: `npm run design:verify` **PASS**, tipagem, referências originais e **17 cenários/18 capturas** do piloto, sem erros JavaScript ou violações axe selecionadas. Reflow320/zoomCSS200, períodos/faltas/ausência, filtros/retorno e cinco abas preservados. `npm run gate` **PASS**, 689 unitários/141 arquivos, transporte7, banco isolado13, Worker/HTTP29, PDF/workerd1, builds/tipos/lint/fronteira/segredos. Após a composição final mobile, reaplicado o conjunto completo de design; os artefatos de aplicação/banco/Worker permaneceram inalterados. CI do SHA publicado fica no checkpoint/PR, sem extrapolar a prova da versão anterior.

Uma execução focal intermediária falhou no autocomplete depois de navegar: o teste preencheu a busca antes de o foco de navegação chegar ao conteúdo e o painel foi fechado pela mudança de foco. Corrigida a sincronização do teste, aguardando o foco esperado em `main` antes de digitar, sem ampliar timeout nem alterar o componente de busca. A execução final reaplica o percurso.

Revisão do autor pelas skills: `ui-ux-pro-max`, consulta pertinente `data dense hierarchy --domain style`, aplicada à hierarquia/densidade sem importar navegação de dashboard; `web-design-guidelines`, [fonte atual](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultada nesta execução. Achados tratados:

- `public-details.tsx:112` / `public-details.css`: nomes e placar em áreas independentes; confronto central no desktop, linhas por equipe no celular, sem colisão e com metadados acima.
- `public-details.css` (`.bb-foul-trigger:focus-visible`): contorno para dentro da célula evita corte pelo painel; alvo completo, teclado/Escape/retorno preservados.
- `public-details.tsx:961` / `public-details.css`: datas sem ano na mesma linha e largura controlada do confronto preservam PTS no celular; a data completa permanece no elemento `time`.
- `app.tsx:258` / `public-details.tsx:668`: retorno/contexto permanecem acessíveis; menos repetição no jogo, cabeçalho e abas próximos no perfil. Filtros, alternativas do gráfico e estados vazios preservados.

Capturas para avaliar: [jogo desktop](prototipos/reforma-uiux/capturas/sumula-desktop.png), [jogo mobile](prototipos/reforma-uiux/capturas/sumula-mobile.png), [perfil desktop](prototipos/reforma-uiux/capturas/perfil-resumo-desktop.png), [perfil mobile](prototipos/reforma-uiux/capturas/perfil-resumo-mobile.png), [jogo com nomes longos em 320 px](prototipos/reforma-uiux/capturas/sumula-nomes-longos-320.png), [perfil com nome longo em 320 px](prototipos/reforma-uiux/capturas/perfil-nome-longo-320.png).

Não é revisão independente, aceite humano ou comprovação de WCAG integral. Piloto/fixtures apenas; sem integração às rotas reais, banco, API, deploy ou dados humanos. PR permanece Draft aguardando nova avaliação.

## Entrega anterior de 04/11 — histórico, reprovada visualmente

O restante desta seção registra `c0f2f0c`/`3fbcefa`, não a revisão atual. As imagens nos mesmos caminhos foram substituídas; para reproduzir as anteriores, usar a árvore de `3fbcefaa2184410097bfd201a1f1ba40986eeb66`. A CI [41769727652](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41769727652) terminou SUCCESS, conferida na retomada; isso não altera a reprovação visual.

A composição intermediária rejeitada foi refeita. A súmula tem confronto compacto, metadados acima e parciais ao lado no desktop/abaixo no celular; duas tabelas com 12 atletas, titulares/capitão/0/00, totais/LL%, comissão, recortes sincronizados e detalhes de faltas. O perfil começa pela carreira completa, com cinco abas, filtros/aba/modo compartilháveis, jogos vinculados à participação, conquistas/histórico, evolução e valores acessíveis. Essenciais e seletor de colunas persistente no celular.

`npm run design:verify` **PASS**, incluindo tipagem e **16 cenários/16 capturas** do piloto, referências originais e seus verificadores. Conferidos identidade e camisas únicas, somas por partida/período, ausência versus zero, registros sem scout, mínimos/checkboxes/ranking sem incluir ausentes, retorno/filtros/rolagem, teclado do gráfico e seletor após redimensionamento/recarga. Axe em nove telas, cinco abas do perfil, equipes/colunas/autocomplete e diálogos, em 390×844/1366×768/1920×1080; reflow320 e zoom CSS200 também nos novos detalhes. Sem violações selecionadas ou erros JavaScript. Não é prova de WCAG integral ou aceite humano.

Capturas atuais: [súmula desktop completa](prototipos/reforma-uiux/capturas/sumula-desktop.png), [súmula mobile completa](prototipos/reforma-uiux/capturas/sumula-mobile.png), [resumo desktop](prototipos/reforma-uiux/capturas/perfil-resumo-desktop.png), [resumo mobile](prototipos/reforma-uiux/capturas/perfil-resumo-mobile.png), [estatísticas desktop](prototipos/reforma-uiux/capturas/perfil-estatisticas-desktop.png), [estatísticas mobile](prototipos/reforma-uiux/capturas/perfil-estatisticas-mobile.png). Inspeção visual do autor nas duas áreas; pelo menos seis atletas completos por equipe na primeira tela da súmula desktop, sem encolher a fonte para passar a medição.

HTML autocontido: **334084 bytes**, SHA256 `d27c3a2c50fbbad372e007213d03c41da16b7f1b49f87fedfbac06102e34d67a`. Node24.18.0; Wrangler4.152.0 existente usado somente pelos comandos locais do gate. Logs/JSON em `docs/design/.preview-artifacts/reforma-uiux/`.

Revisão do autor conforme `ui-ux-pro-max` e `web-design-guidelines` ([diretrizes atuais](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas em04/11). Busca agregada de sistema descartada quanto a navegação comercial/paleta; buscas específicas `data dense dashboard --domain style`, `keyboard navigation focus --domain ux` e `time series trend --domain chart` forneceram recomendações pertinentes de densidade, foco e gráfico com tabela equivalente, preservando as decisões do projeto.

| Local revisado                                    | Achado e tratamento                                                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public-details.tsx:69` e `public-details.css`    | Cabeçalho refeito e medido; equipes/placares simétricos, metadados menores, parciais e elencos próximos.                                                             |
| `public-details.tsx:297` e regras `.bb-foul-cell` | Alvo cobre a célula inteira; diálogo nativo retorna foco, faltas explícitas mantêm período e penalidade textual.                                                     |
| `public-details.tsx:464` / `table-controls.tsx:4` | Estado compartilhável, rótulos persistentes, checkbox com alvo associado e seletor reutilizado; colunas manuais sobrevivem ao resize/recarga.                        |
| `public-details.tsx:1009` / `public-details.css`  | Axe detectou gráfico rolável sem foco; corrigido com figura nomeada/focável, rolagem por teclado e tabela de valores.                                                |
| `pilot-navigation.tsx:65` / `app.tsx`             | Links reais preservam contexto em nova aba; visitas preservam destino de retorno sem poluir filtros, com rolagem restaurada.                                         |
| `fixtures.ts` / `match-model.ts`                  | Fixtures da referência de súmula adaptadas por IDs, sem inferir participação pela equipe; desconhecido permanece ausente. Editor distingue nomes iguais pela camisa. |

Gate consolidado desta entrega **PASS**: 689 unitários/141 arquivos, transporte7, banco isolado13, Worker/HTTP29 e PDF/workerd1; lint/formato/tipos/builds/fronteira/segredos PASS. Ajuste final da ajuda de siglas somente no piloto foi coberto pela nova execução completa de design; artefatos da aplicação/banco/Worker permaneceram idênticos aos do gate. SHA e CI ficam no checkpoint e na PR. Sem API/rotas reais, migration, deploy ou dados humanos alterados. Recortes gerais do catálogo ainda reutilizam cenários fictícios; a seleção de um campeonato não comprova cobertura real. Classificação conserva a ordem fictícia publicada do piloto, sem implementar critérios novos de desempate. Perfil/súmula são demonstração navegável; aceite visual permanece pendente.

## Checkpoint intermediário de 03/11 — histórico

As capturas nos caminhos locais foram substituídas pela revisão vigente. Para reproduzir a evidência antiga, consulte a árvore do commit `42dcfe35f9db87ee37de28b0a7d8642f5b13944a`; os números abaixo descrevem aquele instante, não o HTML atual.

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
