# Navegação e classificação pública — validação da PR #89

Pedido de26/11/2026. [Matriz e execução](../PLAN-NAVEGACAO-CLASSIFICACAO.md).
Mesma branch `codex/perfis-equipes`, partida `517c140`; sem nova PR ou merge.
A evidência específica desta revisão está em [capturas e medições](evidencias/2026-11-26-navegacao-classificacao/).
As provas anteriores de perfis/tabelas permanecem em VALIDACAO-PERFIS-EQUIPES.md.

## Referências e adoção

Guia aprovado: Navegação, Pesquisa/seleção, Dados e padrões de Perfis/Consultas.
DESIGN-SYSTEM, PADROES, PUBLICO e PERFIS-EQUIPES foram atualizados conforme as decisões explícitas:
ano primeiro; retorno contextual; números/siglas centrais só na classificação;
centralização do bloco somente na principal. Reutilizados PublicHeader/PublicFooter,
PublicSearchForm/Autocomplete, Icon, ScrollableTable, PublicStandingsTables e a grade de legenda.
Sem novo componente de produto, ícones de resultados ou alteração de contratos/cálculos.

## Verificações executadas

-18testes unitários de URLs/contexto PASS. Casos novos falharam antes da implementação.
-22browsers iniciais PASS em320/375/390/430/639/640/768/1366/1920px, com retorno/histórico,
alinhamento, largura natural/visível, perfis à esquerda, foco, painéis e axe.

- Regressão ampliada:114/120PASS; seis falhas de seletores antigos de retorno foram adaptadas
  ao novo link único, mantendo asserções de consulta/URL/rolagem. Retentativa10/10PASS,
  incluindo novos casos de critérios/zoom e tipo da busca. Rastros de runs simultâneos
  interferiram entre si; saídas finais separadas. Não alegar que o run inicial passou.
- WebKit reproduziu fechamento do Autocomplete ao clicar no filtro de entidade; mouse
  conserva foco e seleção reabre o painel.4focais PASS após correção, sem tolerância maior.
- Catálogo Chromium: navegação, seleção, grade de legendas, alinhamento do exemplo de
  classificação e estatísticas, formulário, diálogo e axe PASS nas seis larguras existentes.
- Páginas reais locais:108combinações, seis páginas × nove larguras × Chromium/WebKit;
  dados públicos da Copa ES por15GETs, sem fixture ou escrita de dados humanos.
  [Medições](evidencias/2026-11-26-navegacao-classificacao/paginas-reais-local.json).

A inspeção visual incluiu classificação, jogos, equipes, jogadores e os dois perfis.
Conferidos J → Jogos, PTS → Pontos de classificação e AVG → Cesta average na classificação;
legenda aberta no final, critérios anteriores, marca/dados do rodapé e indicadores originais.
Tabelas estatísticas mantêm valores à direita, identificação e larguras entre modos.
A captura revelou baseline da categoria distinta; corrigida com altura de linha compartilhada
no contexto, mantendo alvos e sobreposição. Critérios/legenda receberam espaços menores.

## Gates, CI e publicação

**Gate local completo PASS**:865unitários/183arquivos,19transportes,16banco local,
35acesso/Worker e1PDF runtime; tipos/lint/formato, builds, fronteira cliente e segredos PASS.
**Browsers novos finais:26Chromium +26WebKit PASS**, com as nove larguras,
zoom/reflow, estados, retornos e Autocomplete. Catálogo final Chromium PASS.
Regressão adicional dos consumidores antigos do retorno segue em execução, sem
alterar suas asserções de destino/filtros/rolagem. CI e publicação aguardam o SHA
final. O gate interrompido por falta de espaço no C: não é prova.
`servicos-antes.json` registra o estado observado antes de qualquer publicação.

Admin-publicacao está na versão7c5830cf da PR #91; essa versão atual, suas sessões e
configurações devem permanecer intactas. Não restaurar a versão antiga do checkpoint anterior.

## Revisão e limites

ui-ux-pro-max: pesquisa específica de navegação/teclado; web-design-guidelines consultada
na fonte atual [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).
Revisão autoral dos arquivos alterados: links nativos, rótulos completos, foco, Escape,
reflow, grade de legenda e CSS restrito. Nenhum achado adicional bloqueante conhecido.
A regra genérica de placeholder/virtualização não substitui as decisões do projeto.
Sem ferramenta de subagente nesta sessão, revisão do diff feita pelo implementador.
Axe e browser automatizado não equivalem a teste com leitor de tela humano nem a aceite humano.

Sem alteração de dados, banco, API, precisão, desempates, indicadores de Últimos jogos,
proteção de acesso ou escopo de fase em Jogadores. Merge permanece pendente de aceite explícito.
