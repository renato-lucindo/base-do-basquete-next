# Tabela de súmula centralizada no desktop

Plano explícito do responsável em05/11/2026. Unidade codex/jogadores-desktop-centro, criada de origin/main85ae37e521367150c498989d8ccdfe5019eb2c30 após PR58 integrada e CI do merge SUCCESS. Estado atual de PR/SHA/CI/preview no [checkpoint](../PROGRESSO.md).

## Resultado e implementação

Somente Jogadores com hasBoxscore estritamente false em larguras acima1050px: bloco de controles/tabela/paginação/legenda centralizado e dimensionado pelo conteúdo, limitado a100% do espaço. O cabeçalho e os filtros principais mantêm a composição. A tabela não distribui sobra entre as colunas; scrollbar vertical acompanha a última coluna. Cabeçalhos e atleta fixos, altura70vh, overscroll none e sincronização existente preservados.

CSS fit-content/max-content e contain:inline-size nos controles/legenda evitam que textos auxiliares imponham largura. Não há medições novas por JavaScript. Controles podem quebrar linha; Totais/Por jogo usa inline-flex nesse recorte para caber até quando só Pos./Atleta ficam visíveis. Wrapper de apresentação sem nova semântica interativa; mobile e boxscore não recebem as regras novas. Sem API, tipos, banco, cálculos, Equipes, perfil ou súmula alterados.

## Provas e revisão

RED em1366px:368,109375px de sobra interna. GREEN: testes geométricos exigem diferença máxima2px entre largura útil e tabela e centralização até1px. Toolbar e legenda compartilham largura; capturas1366×768/1920×1080 e colunas reduzidas inspecionadas. Teste anterior que exigia sobra no desktop atualizado para a nova decisão.

Cenários adicionais: colunas reduzidas e nenhuma métrica, mudança de largura natural, última página3linhas, filtros/estado vazio, Escape/foco, boxscore com largura anterior, limite1050/1051px, texto200% com overflow interno legítimo e cabeçalhos alinhados. As regressões existentes cobrem320/390px, nomes longos, reflow/zoom, teclado, axe, gestos e bordas. Foco de Escape em WebKit exercitado a partir do controle: Safari não foca checkbox por clique de mouse; não alterar produto nem reduzir a asserção por essa diferença de plataforma.

Primeira expectativa de overflow no zoom1366px foi incorreta: a tabela de fixture mediu1108px e ainda cabia no espaço. A prova usa1051px com texto200%, onde excede o espaço e precisa de scroll. Nenhum timeout ampliado ou skip novo. Novo teste mínimo encontrou17px de excesso nos controles ao ocultar todas as métricas; CSS corrigido e cenário passou.

Regressão Chromium inicial62PASS sem skips. Rodada de retorno do perfil/última página/Equipes/desktop:26PASS e quatro asserções históricas de sobra falharam; elas foram atualizadas SOMENTE para Jogadores (Equipes mantém a sobra) e os quatro casos passaram. Novo desktop mínimo passou após corrigir a quebra dos controles. Cinco cenários WebKit Windows passaram após esse ajuste; em revisão visual do texto200%, o contador ainda quebrava palavra a palavra. Uma base flexível de12rem permite que os controles mudem de linha antes de comprimir o contador. No CSS final, cinco cenários Chromium e cinco WebKit Windows passaram. Gate final exit0:704unitários/146arquivos, transporte11,banco isolado13,Worker/HTTP30,PDF1,lint/formato/tipos/build/fronteira cliente/segredos PASS. Logs locais desktop-center-gate-final.log, desktop-center-polish.log e desktop-center-webkit-ready.log; anteriores desktop-center-regression.log (62PASS), desktop-center-final.log (26PASS/4asserções antigas), desktop-center-public-final.log (4PASS após alinhar a decisão). Job WebKit macOS da CI ampliado para os cinco cenários desktop novos, além das bordas existentes. Windows WebKit não suporta CSS overscroll; não declarar confirmação nativa por essa plataforma, nem celular físico por emulação.

Revisão do autor com ui-ux-pro-max e [web-design-guidelines atualizadas](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas05/11. Escopo CSS, foco, semântica, containment apenas de tamanho, reflow e preservação do zoom conferidos; nenhum achado pendente nas mudanças. Sem parecer independente ou certificação WCAG integral.

## Entrega

Uma PR para main, CI atual e no merge antes de publicar. Build fresco do SHA integrado limpo e publicação somente no Worker independente base-do-basquete-next-uiux; preservar basedobasquete.com.br/Worker principal, Access, bindings, sessões, segredos e banco. A sequência inicial separava PP%/5F para depois do preview; após o responsável questionar a fragmentação e pedir testar as demandas juntas, os textos foram reunidos nesta mesma PR59 antes da entrega final, sem outra PR ou publicação intermediária.

Capturas finais com fixtures: [1366px](evidencias/desktop-sumula/desktop-1366.png), [1920px](evidencias/desktop-sumula/desktop-1920.png), [colunas reduzidas](evidencias/desktop-sumula/colunas-reduzidas.png), [texto200%](evidencias/desktop-sumula/texto-200.png). A identificação sem contexto público vem da fixture, não do serviço real.

## Correção da falha na CI

CI42064092027/HEAD7d57f28: WebKit macOS SUCCESS; validate passou gate/design, mas browsers terminaram638PASS/109skips prévios/1falha em tests/statistics.spec.ts:178. Trace real baixado do artifact13434453215, preservado localmente em .preview-artifacts/pr59-browser-evidence.zip/pr59-ci-trace.zip. A execução chegou ao clique após reload em2,4s e permaneceu27,6s na verificação de estabilidade; não consumiu o orçamento nas etapas anteriores. Último frame e snapshot mostram tabela/summary renderizados; o bloco não possui data-compact-desktop porque a fixture contém boxscore. Não se comprovou defeito na centralização, nem a causa específica que suspendeu frames nesse runner.

Diagnóstico controlado: Emulation.setVirtualTimePolicy pause após reload reproduziu a mesma espera de visible/enabled/stable; a abertura nativa por Enter funcionou com o painel visível e atributo open. O experimento e log ficam em .preview-artifacts/ci-frame-diagnostic-source.ts e ci-frame-diagnostic-cdp.log (não fazem parte da suíte nem do produto). Sobrescrever requestAnimationFrame na página não reproduziu porque Playwright usa contexto isolado; hipótese descartada e nenhum override mantido.

Somente o teste de restauração foi ajustado para exercitar a abertura pelo teclado após reload, verificando visibilidade e estado open antes de selecionar o escopo. Outros testes continuam cobrindo clique de mouse no mesmo summary. Não houve forceclick, retry, timeout ampliado, skip ou mudança de produto. Três repetições sem alteração passaram antes; após a correção,12cenários focais desktop/mobile (restauração, seleção/teclado e adicionar filtro, duas repetições) PASS. ESLint/tipos/formato PASS. Gate de produto já aprovado permanece aplicável ao produto idêntico; nova CI do HEAD ainda obrigatória.

## Textos reunidos na entrega final

Cabeçalho/tooltip e legenda de Jogadores usam os nomes exatos **Participação nos Pontos** (PP%) e **Exclusões por cinco faltas** (5F). Uma definição privada de apresentação fornece o mesmo nome aos dois lugares. A exportação referenceMetric, consumida por Equipes, e metrics.ts permanecem inalterados; não há mudança de API ou fórmula.

RED:2cenários desktop/mobile identificaram o nome antigo no cabeçalho. GREEN focal:4PASS, incluindo fluxo30linhas/pager e novo teste que verifica nome acessível, foco/hover/toque, Escape, legenda e axe. Logs .preview-artifacts/labels-red.log/labels-green.log. Retirada a expectativa da definição longa antiga. Teste incluído no recorte WebKit/macOS. CI final deve validar o conjunto no novo HEAD; CI aprovada do f4587e4 antecede os textos e não valida esta versão.

Validação conjunta:34 cenários Chromium PASS (desktop/mobile, centralização,320/390, zoom, bordas, filtros/retorno e consumidores de Equipes) e2WebKit de texto PASS. Inspeção das capturas revelou legenda estreita no desktop com poucas métricas: a grade fixa fragmentava Participação. Novo teste de legibilidade falhou; grade auto-fit restrita ao bloco compacto acima1050px corrigida. Na versão final,12Chromium +7WebKit PASS, sem skips novos. Gate:ui exit0; após último CSS, formato/lint/build focais conferidos antes do push. Provas de domínio inalteradas reutilizadas; nova CI do conjunto é obrigatória. Capturas finais inspecionadas: [rótulos desktop](evidencias/desktop-sumula/rotulos-desktop.png), [rótulos mobile](evidencias/desktop-sumula/rotulos-mobile.png). Fixtures, sem alegar confirmação em celular físico.
