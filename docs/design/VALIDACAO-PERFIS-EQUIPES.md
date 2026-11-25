# Validação dos perfis de equipes

Unidade `codex/perfis-equipes`, iniciada em `824a3d59da5323202d869a4d93a1038bcd377044`. Requisitos e HTML aceitos em [PERFIS-EQUIPES.md](PERFIS-EQUIPES.md). Evidência de 22/11/2026. Código executável `cfee448fdd36cd288dd4a7861c643abb6a07d442`; atualização posterior somente documental, sem invalidar os artefatos verificados.

## Resultado implementado

- Perfil geral com cinco abas e perfil da inscrição com três. Busca leva ao geral; inscrições mantêm disputa e inscrição. URL conserva aba, ano, filtros, ordenação, fase/grupo e retorno.
- Campanhas, sequência de cinco resultados por inscrição e recentes do ano escolhido, reunindo categorias por data. Situação usa o estado oficial. Resultados publicados preenchem jogos, campanha e sequência mesmo antes da organização da classificação. Um estado explícito da projeção prevalece para o mesmo jogo (inclusive exclusão/pendência); agenda não conta como resultado.
- Visão da disputa reutiliza classificação e estatísticas coletivas completas, destacando a inscrição. Jogadores reutiliza tabela completa, colunas, fases, totais/médias, paginação de 30 e camisas 0/00/DNP. Filtro de inscrição é aplicado antes da agregação.
- Conquistas históricas confirmadas à direita no desktop e após o conteúdo no celular. Jogos sem coluna Resultado. Legenda expandida, única e após o conteúdo da aba.
- Somente APIs públicas existentes; prévia e site de disputa única não ampliam escopo. Sem migration, DDL, publicação de dados ou deploy.

## Verificações locais

- `npm run gate`: PASS. 179 arquivos / 848 testes Vitest; 11 testes de plano de CI; 19 de transportes; 16 de banco local. Também lint, formato, tipos, builds público/admin/Worker, rotas em workerd, PDF real, fronteira cliente e segredos aprovados.
- Browsers finais do perfil: 10 PASS, incluindo retorno com foco no elenco mobile e larguras 1366/1920 px. Regressões focais anteriores: equipes 14 PASS e busca/navegação 30 PASS.
- Revisão das suítes antigas: 72 casos passaram, dois falharam por seletor antigo/área de toque e foram corrigidos. Reexecução focal desses dois casos: 4 PASS (desktop/mobile). Fixtures corrigidas para respeitar a disputa, paginação de 100 jogos e consultas de outras páginas; regressões correspondentes: 7 PASS / 1 skip preexistente na matriz explícita de tipografia. Não foram desativados testes nem ampliados timeouts.
- `design:build` e `design:verify`: PASS; referências geradas não integram o diff final.
- Primeiro ensaio geral interrompido por `ENOSPC` durante banco local simultâneo com browsers; espaço liberado ao terminar o banco. Execução geral local seguinte interrompida após encontrar falhas da navegação antiga e problemas das fixtures. Não declarar esses ensaios como regressão completa aprovada.
- CI inicial [45050998992](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45050998992), código `bf214f0`: checks e design passaram; Chromium/WebKit detectaram seletores antigos, alvos pequenos e fixtures incompatíveis. Correções comprovadas focalmente acima. A revisão foi aprovada na CI completa abaixo.

- CI final do código [45052047536](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45052047536), `cfee448`: **sete checks PASS**, incluindo validate. Chromium desktop 502 PASS; mobile 377 PASS e 125 skips já previstos pela matriz; WebKit 44 PASS. Gate completo com 848 unitários/179 arquivos e design PASS. Fontes executáveis inalteradas após essa prova; resultado do HEAD documental é conferido na PR #89.

## Revisão da interface

Guia aplicado: [cores e situação](catalogo/guia-completo-autonomo.html#cores), [tipografia](catalogo/guia-completo-autonomo.html#tipografia), [campos](catalogo/guia-completo-autonomo.html#formularios), [navegação](catalogo/guia-completo-autonomo.html#navegacao), [dados](catalogo/guia-completo-autonomo.html#dados), [estados](catalogo/guia-completo-autonomo.html#estados) e [acessibilidade](catalogo/guia-completo-autonomo.html#acessibilidade). Aplicadas também as regras de PADROES/PUBLICO e a escala vigente de +2 px.

Reaproveitados PublicHeader/Footer, SectionTabs/TabPanel, ScrollableTable, classificação, RecentResultsCell, tabelas de jogadores/equipes, ColumnPicker, tooltips e catálogo de métricas. Variação necessária: composição geral/contextual e painel lateral de conquistas do HTML aceito. A coluna de camisa é optativa no componente compartilhado, preservando os outros consumidores.

Inspeção das capturas reais em 1440 px e 390 px: conquistas à direita/abaixo; classificação com três equipes, coletivos com todas as inscrições, inscrição destacada, jogos em duas colunas, jogadores completos com rolagem interna. Tabelas seguem largura pelo conteúdo, alinhadas aos blocos, sem forçar colunas vazias. Corrigidos controle Fase estreito no celular, reflow do título em 320 px com texto a 200% e área de toque dos links de escolha da inscrição (mínimo de 44 px).

Axe com WCAG 2/2.1/2.2 A/AA: zero violações nas abas Visão geral e Jogadores e na escolha de inscrição, desktop/celular. Teclado entre abas, foco visível, skip link, paginação, recarga e preservação do grupo conferidos nos testes. Erro de outra inscrição não exibe tabela; nova tentativa recupera. Catálogo contaminado e publicação recolhida são recusados.

Textos conferidos nas legendas e cabeçalhos: `J` = **Jogos**, `PP%` = **Participação nos Pontos**, `5F` = **Exclusões por cinco faltas**. A legenda reúne apenas colunas presentes, fica expandida depois de tabelas/recentes/paginação e antes do rodapé; não se repete na classificação/coletivos embutidos. Cabeçalhos completos não receberam ajuda adicional. Ausências conservam —, sem zero presumido. Situação tem texto além do acento de cor.

Revisão de UI pelo próprio agente com as [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas em 22/11/2026. Achados corrigidos: nome acessível da medalha (`public-page.tsx`, role de imagem), perda de parâmetros de retorno (URLs locais) e largura do título/controle Fase (`screen.css`). Sem parecer independente: não havia ferramenta de subagente nesta sessão.

## Limites de entrega

Fixtures sintéticas somente em testes e protótipo. Elencos mostra participantes publicados de resultados; elenco oficial completo continua fora do escopo. Composição do histórico faz várias requisições, com concorrência e capacidade limitadas; falha de fonte não vira zero. Não foi aferido desempenho com histórico de mil inscrições.

Não houve avaliação desta implementação em Worker remoto. CONTRIBUTING exige publicar no Worker autorizado e obter novo aceite visual antes de integrar. A autorização de implementação do HTML não substitui esse aceite nem define um alvo de deploy.

## Correção da Copa ES Sub-15

A avaliação do preview revelou classificação publicada vazia (zero jogos/fases), apesar de26 resultados públicos. O perfil tomava essa projeção vazia como fonte exclusiva e ocultava o catálogo. Corrigida a composição em `team-profile/model.ts`: preserva resultados publicados ausentes da projeção, respeita estados oficiais para IDs presentes, mantém uma inscrição por campanha e não presume colocação/fase. Sequência usa os mesmos resultados e nomes públicos. O componente de sequência compartilhado recebe somente os campos que renderiza, sem fabricar versão ou metadados esportivos.

Reprodução com fixture sintética da classificação vazia; testes de jogos/campanha/posição e de exclusão/pendência. Caso de browser verifica geral/contextual, sequência e aba Jogos. Conferência de leitura dos dados públicos reais: LUSB9jogos,6vitórias,3derrotas,575pontos a favor e439contra. Sem alteração de dados, definição de fases, premiações ou publicação esportiva. Resultados finais de validação e versão do preview ficam na PR.

## Revisão de consistência —24/11/2026

Plano aceito em docs/PLAN-CONSISTENCIA-PUBLICA.md. Guia Navegação/localização, Estados, Tipografia, Dados e acessibilidade aplicado aos componentes reais. PADROES/PUBLICO/README/DESIGN-SYSTEM/PERFIS-EQUIPES atualizados; regra de títulos redundantes tem exemplos explícitos e testes do consumidor.

- Retenção da tabela limitada à mesma disputa/inscrição, com aria-busy/status sem desmontar; teste mantém requisição pendente e verifica tabela e altura da página. Ordem de súmula compartilhada por export de query-contract e usada nas duas telas.
- Contornos limitados à tabela, rolagem interna preservada; classificação/jogadores centralizados quando couberem e coletivos à esquerda. Seleção compartilhada com peso700 e fundo238/245/255; links sem aparência permanente de hyperlink e com foco/interação preservados. Testes verificam geometria, estilos e semântica, não somente classes.
- Breadcrumb hierárquico com seleção contextual pública; status abaixo. Rodapé único com marca e texto solicitado. Fontes públicas ajustadas nas fontes CSS, sem zoom global ou alteração administrativa. Capturas locais .preview-artifacts/consistency-players-1440.png, consistency-columns-390.png e consistency-games-390.png conferidas. Tabela/filtros16/14px; sem transbordamento da página em1440/390. Reflow320px/texto200% e axe incluídos nos testes.
- Eliminatórias sem jogos usam mensagem concreta; confrontos previamente definidos permanecem. Jogos têm centro do placar independente dos nomes. Títulos que repetem abas só semânticos, com sr-only; retorno/foco continuam na aba.
- gate:ui PASS e36unitários PASS. Rodada ampliada118browsers:114PASS/4falhas de expectativa antiga de título visível; rechecagem42PASS após exigir título semântico, mais6PASS do layout final. Nenhum novo skip ou timeout maior. Fontes inalteradas reutilizam provas; CI/publicação do SHA final devem ser registradas na PR/checkpoint, sem atribuir PASS antigo ao novo código.

Revisão do próprio agente, sem parecer independente declarado. Nenhum teste escreveu dados humanos; todas as APIs de testes usaram fixtures. Sem migrations/DDL/DML/Access nesta revisão.

CI macOS/WebKit do db4123e identificou alinhamento fase/modo da lista de equipes em390px: duas falhas,42PASS. Reproduzido também em Chromium; controles maiores ultrapassavam a largura disponível por aproximadamente4px. Corrigido espaçamento mobile (padding0,4→0,35rem), sem reduzir fonte ou alvo44px; focais finais2Chromium e2WebKit PASS. Build repetido. Rodada completa WebKit Windows não foi PASS (cinco falhas de overscroll não suportado, além dos dois alinhamentos posteriormente corrigidos); CI macOS do SHA final permanece necessária. Conector Cloudflare reconectado pelo responsável após fallback inicial Wrangler.

CI45438050865/2ee3ed8: scope/WebKit/design/checks aprovados; shard mobile encontrou2falhas de transbordamento do perfil de jogador em320px (379PASS/125dispensas preexistentes). Reproduzido localmente: a aba Ver jogos ultrapassava o viewport em cerca de1px com as fontes maiores. Antecipada a apresentação com rolagem interna das abas de17rem para19rem de largura do contêiner, preservando texto, fonte, alvos e asserções. Casos de320px:4PASS desktop/mobile, formatação e build PASS. CI nova precisa validar a composição; nenhuma redução de fonte, ocultação global do overflow ou enfraquecimento de teste.

O job desktop da mesma CI concluiu com499PASS/7falhas; somado ao mobile são878PASS/9falhas e125dispensas existentes. Além do overflow320px, identificadas reserva de altura inicial e posição de atletas na primeira tela. Mantidas as asserções: reserva dimensionada a três linhas, adoção do corpo16px no perfil, e compactação somente dos intervalos desktop da súmula. Medições após correção: viewport320px sem overflow nas quatro abas, painel456,875px estável nas quatro abas desktop e primeiro atleta y394 (<400). Rodada ampliada e gate novos registrados no checkpoint/PR ao concluir.

Rechecagem final:112browsers PASS/8dispensas preexistentes nas seis suítes dos perfis e consumidores públicos, cobrindo todos os nove casos da CI anterior; asserções/timeouts preservados. Tipagem, formato e lint focal PASS. Build e gate consolidado registrados no checkpoint; nova CI deve confirmar o SHA final antes de integração.

## Conformidade de design — 24/11/2026

Plano consolidado explicitamente aceito; matriz de conformidade registrada antes das alterações em PLAN-CONSISTENCIA-PUBLICA.md. A decisão desta revisão substitui a centralização da classificação descrita na revisão inicial acima. Ano nas abas e Participação central foram aprovados como padrões permanentes específicos do perfil geral; rótulos laterais continuam piloto restrito ao perfil.

### Referências e adoção

Guia: Navegação/localização, Tabelas/dados, Estados e Acessibilidade. Fluxo em README de design; hierarquia e consulta ao responsável no INDICE. Matriz antes de editar, decisões classificadas, revisão dos consumidores e distinção entre teste, inspeção e aceite viraram critérios explícitos de entrega. AGENTS e modelo da PR apontam para essas fontes. Guia autônomo e catálogo interativo foram reconciliados; o catálogo usa SectionTabs, ModeButtons, Legend e ProfileMatch reais.

- Grade única `.reference-legend`, pares em trilhas de sigla/significado. Eliminada a sobrescrita flex do perfil; geral, Elencos e disputa usam a mesma grade. PTS mantém os dois significados quando ambos aparecem.
- Confronto extraído do perfil do jogador para ProfileMatch, compartilhado por recentes/lista da equipe e pelo jogador. Siglas no celular com nome completo acessível; data/contexto, placar central, resultado ausente sem zero presumido. Sem pontos individuais na equipe.
- Um ano compacto ao lado das abas, fora de tablist, sem alterar recortes de URL. Participação central com contorno ajustado; modos depois dos filtros. Classificação à esquerda, jogadores conservam sua centralização. Fase/modo alinhados; margens herdadas de campos foram neutralizadas no perfil.
- Status textual14px/anel sem badge no cabeçalho; breadcrumb16px. Painel usa top layer do navegador e posição limitada ao viewport; não empurra o conteúdo. Escape/clique externo e troca de nível retornam foco; recortes públicos, seção e histórico preservados.

### Evidências observadas

- Matriz browser:20PASS em desktop/toque, oito abas nas larguras320/390/639/640/1366/1920, texto200%, legenda alinhada, controles/contornos, popover sem deslocamento, foco e vazios. Sem novos skips nem timeouts maiores.
- Perfil de jogador/acessibilidade:50PASS; inclui recentes, nomes longos, quatro abas,320px e axe nos consumidores públicos. Catálogo Chromium e WebKit:PASS nas seis larguras, zoom200%, interações e axe. Provas do catálogo não extrapoladas para a aplicação.
- Capturas inspecionadas: `.preview-artifacts/design-overview-1366.png`, `design-dispute-1366.png`, `design-general-1366.png`, `design-general-390.png`; capturadas também overview/disputa/Elencos em390/1366. Dados sintéticos. Imagens locais não são a referência normativa.
- Regressão ampliada inicial:102PASS/4falhas. Duas expectativas antigas exigiam que o painel deslocasse as abas, substituídas pela igualdade de posição aprovada. Duas falhas foram artefatos ENOENT causados por rodadas Playwright concorrentes no mesmo diretório; rodada de repetição usa saída própria. Não mascaradas por retries/timeouts/skips.
- Achado de acessibilidade no catálogo: aria-label em span genérico corrigido por nome completo semanticamente disponível. Revisão direta da fonte atual de web-interface-guidelines, sem instalação local da skill alegada; foco, semântica e nomes longos comparados nos arquivos alterados. Revisão autoral, sem parecer independente declarado.

### Diagnóstico do timeout de CI

CI manual45444517462 passou; execução de PR45444529563 falhou em uma prova fria de conquistas. Reprodução local da suíte:856PASS/1falha; prova zero levou31,756s com quatro workers, acima dos30s existentes. Isolada, a mesma fonte passou nos dois modos (36,73s somados). Prova inclui capacidade10000/10001 identidades e inicialização PostgreSQL/WASM. `vite.config.ts` limita concorrência a dois workers para reduzir disputa de CPU/memória; nenhuma asserção, SQL, limite de capacidade ou timeout alterado. Resultado da revalidação completa, SHA/CI e publicação devem ser conferidos no checkpoint e PR.

Sem migrations, dados humanos, Access ou alteração de contrato esportivo. Aceite humano do Worker e merge continuam pendentes.

### Fechamento da revisão

Fonte executável39fe76c2b145d1c1c06cc0c63e1fc7fd6827b1c3. `npm run gate` completo PASS:182arquivos/857unitários, transporte, banco local, builds, fronteira, Workers e segredos. O limite de dois workers resolveu a reprodução da prova fria sem mudar seu timeout; suíte completa338,33s. `npm run design:verify` completo PASS e catálogo WebKit PASS. Lint e formato focais finais PASS após extração da folha compartilhada do confronto. Rechecagem de navegação/perfil28PASS; regressão final jogador/axe50PASS. Os102casos inalterados da rodada ampliada e a matriz20PASS conservam suas provas; não foi adicionada dispensa.

Artefato técnico Piloto UIUX.html regenerado por design:verify foi mantido com seus bytes originais (estava limpo antes da rodada), sem incorporar bundle alheio nesta unidade. A implementação usa o guia vigente, não esse artefato.

Publicação pelo conector Cloudflare, com preparo/upload dos assets pelo Wrangler: admin versão86bf8a3a-2e30-4b14-b4c4-a81e9737c8d1/deployment9da50d48-736f-463e-97d2-f0bd86b2f082; preview versão4f516000-a1d0-4244-9824-da1b0db9f50f/deploymenta64b253b-eed1-4ac4-a27e-7728c9360c28,100% cada. Namespace/sessões, segredos, flag e identidades preservados; sem Access. Smoke200/headers39fe76c nos dois serviços, APIs privadas401/403,11assets comparados por SHA256 ao build. A primeira leitura do preview ainda mostrou3fdb4b9 durante propagação; repetição confirmou a nova fonte antes de declarar publicação verificada.

Navegador remoto real: geral com ano77,78px, Participação central e legenda grid; disputa com status14px/borda0, legenda grid e navegação imóvel ao abrir seleção. LUSB manteve9J/6V/3D/15PTS/575PP/439PC/136SLD/AVG1,31. Capturas design-live-general-1366.png e design-live-dispute-1366.png inspecionadas. Conferência remota somente de leitura. A CI da PR e o aceite humano são etapas distintas e ficam com estado real no checkpoint.

## Tabelas, filtros e buscas — 25/11/2026

Mesma PR89. [Matriz anterior à edição](../PLAN-TABELAS-FILTROS.md). Novos padrões expressamente aprovados para consultas públicas e administrativas; formulários de cadastro/edição/login preservam rótulos visíveis. O piloto lateral foi substituído nos documentos vigentes. Guia e catálogo interativo usam os componentes reais de consulta; o mapa de reutilização está em DESIGN-SYSTEM.md.

SearchInput mantém input nativo, lupa decorativa, nome acessível e teclado. QueryTableLayout limita filtros, modos e títulos/status pela tabela ou região visível. Métricas reservam formato inteiro/decimal, sinal, percentual e seta; siglas centrais e valores direitos. A identificação Participação continua central. RecentResultsCell compartilha a mesma folha entre classificação e campanhas. Limpar filtros depende de busca/recortes, preserva modo, ordem e colunas e restaura a primeira página. AVG e cálculos esportivos não mudaram.

### Automação e limites

- Gate completo PASS:182arquivos/857unitários,323,53s;19 testes de transporte,16 de banco local,35 de acesso/navegação/busca e1 de PDF; builds, fronteira e segredos PASS. Após a correção final exclusivamente visual, gate:ui PASS e matriz18PASS novamente. Reutilizadas provas de domínio/Worker materialmente inalterados, sem aumentar timeout nem remover asserção.
- Matriz final cobre cinco abas gerais e três da disputa em320/390/639/640/1366/1920px, texto200%, contornos, legendas, todos os cabeçalhos/valores de métricas e alternância de modos. Consultas administrativas repetem as seis larguras e zoom.20PASS nos contratos/capturas anteriores e18PASS na correção final. Capturas ficam anexadas por caminho no test-results, incluído no artefato da CI do próprio SHA.
- Estatísticas:4PASS com súmula e boxscore completo, zero, ausentes, percentuais, negativo grande e12.345.678; comparação geométrica antes/depois de modo e ordem; GD ocultada continua oculta após limpar, assim como modo e ordenação escolhidos. Equipes:2PASS com larguras totais/médias; campanhas:2PASS com cor/anel iguais e controles dentro do bloco.
- Regressão adicional:112PASS,32dispensas preexistentes de cenários exclusivos de desktop. As duas falhas iniciais procuravam textbox onde a busca agora é searchbox; seletores atualizados sem enfraquecer o fluxo,2PASS na repetição. Na rodada98, quatro casos exigiram correção do estilo antigo de busca/seletor e três navegações sob concorrência alta foram repetidas com dois workers:6PASS. Não registrar como uma única execução sem falhas.
- design:verify completo PASS; catálogo Chromium e WebKit PASS. Repetido catálogo Chromium após a correção visual final. Axe sem violações nos estados medidos; verificações automáticas não equivalem a conformidade integral nem aceite humano.

### Inspeção executada

Revisão autoral das telas reais com fixtures, no desktop e celular, e leitura das diretrizes atuais em https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md. Rótulos de consultas ocultos por classe explícita; opções iniciais identificáveis; lupa separada do texto; formulários com label visível. Legenda aberta ao fim do conteúdo, em grade (exemplo J/Jogos, PTS/Pontos marcados). Ordem das colunas, destaque da equipe, confrontos, títulos e rodapé preservados. Sem parecer independente ou aceite humano alegado.

O smoke publicado detectou cabeçalhos do perfil geral ainda sobrescritos por regras posicionais legadas. As regras explícitas de cabeçalho/valor da métrica passaram a prevalecer, Participação recebeu reserva legível e a suíte agora verifica todas as siglas nas seis larguras. Esta divergência foi corrigida antes do fechamento, não apresentada como conformidade. As [capturas](evidencias/2026-11-25-consultas/README.md) distinguem dados fictícios e consulta remota de leitura. Acesso administrativo autenticado foi exercitado com fixtures; no serviço real, somente login e proteção das APIs, sem editar dados humanos.

Publicação e SHA final estão no checkpoint e na PR. Sem API, schema, migration, DML/DDL, regra esportiva, Access ou novo Worker. Merge continua aguardando aceite explícito.

Fonte publicada final6c08a024a7ef46154df7f52e3dbeff9196c88920. Smoke200 e12assets por SHA256 nos dois serviços; APIs privadas401/403. Navegador remoto verificou siglas centrais e valores direitos na participação real da LUSB, sem escrita. Versões/deployments no checkpoint; o HEAD documental posterior preserva a mesma fonte executável. CI da PR permanece etapa distinta.

## Correção compacta — 25/11/2026

Plano aprovado e matriz em PLAN-TABELAS-FILTROS.md. Corrigida a interpretação anterior que reservava96px por métrica. Agora a reserva usa os valores reais formatados nos dois modos e participa da largura nativa da coluna, incluindo o maior peso tipográfico. Cabeçalho/célula compartilham limites, números permanecem à direita e siglas centrais; a ordenação preserva a maior reserva observada. Não muda valores, cobertura, cálculos, precisão ou API. Total substitui Totais apenas nos seletores; o plural do parser de PDFs permanece intacto.

RecentResultsCell mantém SVG, verde/vermelho e anel originais; a correção explícita da herança de cor conserva check/X brancos também no perfil da equipe. Campanhas preenchem a região desktop com colunas numéricas compactas e quebra nas três identificações. Guias PADROES/DESIGN-SYSTEM/PUBLICO/PERFIS-EQUIPES e catálogo reconciliados. Revisão autoral das [telas reais com fixtures](evidencias/2026-11-25-correcao-compacta/README.md) e das diretrizes atuais de interface; sem parecer independente ou aceite humano alegado.

### Provas executadas

- Gate completo PASS:182arquivos/857unitários em243,54s;11contratos de CI,19transporte,16banco local,35acesso/navegação/busca,1PDF, lint, formato, tipos, builds, fronteira e segredos. Sem novas dispensas ou aumento de timeout.
- Contratos de largura com valores grandes/negativos, percentuais, zeros e ausentes:4PASS. Comparação modo/ordem e todos os limites de cabeçalho/célula em campeonato, disputa e Elencos, campanhas em1366/1920px e restauração de colunas:6PASS.
- Regressão Chromium:132PASS/8falhas exclusivamente nas expectativas antigas de padding uniforme. Atualizadas para6px nas métricas, mantendo14/10px nas identificações; os8casos passaram na repetição. A rodada focal seguinte teve14PASS/1falha/1dispensa preexistente: reproduziu a sobreposição de entradas na preparação da súmula mobile. Corrigida empilhando cartões de equipes abaixo de1000px em qualquer ponteiro. Repetição final:5PASS/1dispensa preexistente nos três fluxos de súmula.
- Matriz dos perfis cobre320/390/639/640/1366/1920px, texto200%, oito abas e estados aplicáveis. Focais mantêm axe, teclado/toque e contenção. design:verify completo e catálogo WebKit PASS. WebKit dos tooltips PP%/5F:2PASS; rodada completa local42PASS/2falhas de overscroll: WebKit Windows retorna propriedade vazia, limitação já documentada em playwright.webkit.config.ts. As mesmas asserções permanecem obrigatórias na CI macOS; não adicionada dispensa.

### Diagnóstico da CI anterior

Run45629988602 não teve falha no gate completo nem no design:verify: esses jobs falharam no upload por armazenamento. Browsers também tiveram falhas reais e expectativas superadas: limpar inexistente no estado inicial, restaurar colunas indevidamente por limpar, cor do SVG, alinhamento do modo, comparação do rótulo oculto com formulário, sobreposição de entradas da súmula e toque no tooltip5F. Cada correção foi reproduzida focalmente; não foram desativadas verificações para contornar o problema.

Limpeza expressamente autorizada substituiu o arquivamento integral:1286artefatos superados/18.682.097.105bytes removidos,8preservados/38.306.023bytes confirmados por consulta final. IDs, autorização e auditoria individual local em C:\Users\12405304716\.codex\artifact-archives\base-do-basquete-next\2026-11-25. Capturas versionadas preservadas. O resultado de upload no novo SHA será conferido sem alterar cobrança ou tornar o upload opcional.

Publicação nos mesmos Workers e CI do SHA atual permanecem pendentes até confirmação registrada na PR/checkpoint. Nenhuma API, dado humano, schema, regra esportiva ou Access alterado. Merge depende de aceite explícito.
