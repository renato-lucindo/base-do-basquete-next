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

Fonte executável final **805fc5b98584ae86d1c912e221bb1f535373b616**.
O encerramento seguinte atualiza somente documentação, catálogo de referência e capturas;
nenhum código/teste/runtime adicional ou republicação por documentação.

- Gate completo local em73dbbe8:865 unitários/183 arquivos,19 transportes,16 banco local,
  35 Worker/acesso,1 PDF runtime; lint/formato/tipos, builds, fronteira e segredos PASS.
- CI inicial [45889835643](https://github.com/renato-lucindo/next/actions/runs/45889835643):
  gate, catálogo e70 WebKit/macOS PASS. Chromium:951 PASS/125 SKIP preexistentes/2 FAIL,
  ambos no mesmo teste geométrico da súmula (desktop406 contra400; mobile468 contra460).
- Reproduzido localmente antes de corrigir. Em805fc5b, retirar padding do retorno
  compartilhado restaurou desktop394 e mobile502−46=456, sem alterar o teste, seus limites
  ou o alvo anterior de28px. Build foundation e **30 Chromium +26 WebKit finais PASS**.
  [Registro da regressão e correção](evidencias/2026-11-26-navegacao-classificacao/regressao-ci.json).
  -96 testes adicionais de consumidores do retorno PASS; mantidas asserções de origem,
  URL, filtros, paginação e rolagem. Catálogo final Chromium PASS após reconciliar exemplos.
- Fonte final publicada: **108 combinações reais** (seis páginas × nove larguras × Chromium/WebKit),
  sem overflow de página; identificação textual à esquerda e números da classificação centrais.
  [Medições publicadas](evidencias/2026-11-26-navegacao-classificacao/paginas-reais-publicadas.json).
  As24capturas desta pasta representam a fonte805fc5b, incluindo os perfis com retorno compacto.

**CI do HEAD de entrega:** [checks da PR #89](https://github.com/renato-lucindo/next/pull/89/checks).
O agente confere o resultado real antes de entregar e o registra na descrição da mesma PR.
Este link acompanha o HEAD documental; não atribuir aprovação ao run inicial reprovado.

[Preview](https://preview.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96) e
[admin](https://admin.renato-lucindo-jr.workers.dev/) publicados na fonte805fc5b.
Admin versão4b9e492a-91c2-419e-97a2-c93ce33d9c64/deploymentc9840f29-5715-44d9-b66f-3c3ea24ce78e;
preview versãoda9db656-e8de-41de-a756-4dd22ba12c15/deployment389d106d-bce7-416d-9a7c-7e65cca47f8d.
Health/raiz200, APIs privadas401/403 e76assets comparados porSHA256.
[HTTP/assets](evidencias/2026-11-26-navegacao-classificacao/publicacao-http.json) e
[versões/configurações](evidencias/2026-11-26-navegacao-classificacao/servicos-publicados.json).
Vínculos, namespace de sessões, aliases e configurações existentes conservados.

Admin-publicacao permaneceu exatamente na versão7c5830cf da PR #91, com fonte
pr91-53e177d-on-039d78a, deployment e configurações intactos. Nenhum teste com login
humano ou escrita de dados remotos; sem alegar aceite de sessão humana.

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
