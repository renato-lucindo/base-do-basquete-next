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

Uma PR para main, CI atual e no merge antes de publicar. Build fresco do SHA integrado limpo e publicação somente no Worker independente base-do-basquete-next-uiux; preservar basedobasquete.com.br/Worker principal, Access, bindings, sessões, segredos e banco. Nova solicitação de textos PP%/5F fica para DEPOIS da conclusão desta unidade e atualização do preview, conforme ordem explícita do responsável.

Capturas finais com fixtures: [1366px](evidencias/desktop-sumula/desktop-1366.png), [1920px](evidencias/desktop-sumula/desktop-1920.png), [colunas reduzidas](evidencias/desktop-sumula/colunas-reduzidas.png), [texto200%](evidencias/desktop-sumula/texto-200.png). A identificação sem contexto público vem da fixture, não do serviço real.
