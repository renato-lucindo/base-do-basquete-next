# Equipes — refinamento conforme Jogadores

Unidade de05/11/2026, branch `codex/equipes-refinamento`, base inicial `76b90da` (PR59). Pedido integral em [spec](../superpowers/specs/2026-11-05-equipes-refinamento.md), execução no [plano](../superpowers/plans/2026-11-05-equipes-refinamento.md). Esta entrega reúne UI, contrato, cálculos, filtros e testes na mesma PR.

## Contrato e cálculos

A rota existente opta pelo DTO `confirmed-teams-list-v2` com `pageSize=all`. O caminho sem esse parâmetro continua retornando20linhas, formato e cálculo anteriores; o perfil permanece no contrato legado. O v2 acrescenta PB/PB%, cobertura interna, opções completas por registrationId e hasBoxscore antes dos filtros. Nenhuma migration ou mudança de publicação.

Contagens por jogo usam J e precisão integral, percentuais usam totais ponderados. Ranking por inscrição após filtros, empates1,1,3; nome e ausentes sem posição. Valores positivos máximos do conjunto inteiro recebem negrito, inclusive faltas, preservando a interpretação anterior de desempenho.

PB de súmula soma atletas reservas confirmados na partida inteira. Em PDF, o coletivo publicado prevalece quando os pontos têm a mesma autoridade PDF; pontos manuais usam os fatos individuais correspondentes. Não somar coletivo aos atletas. Cobertura incompleta produz —, zero comprovado permanece0. Fonte inválida (incluindo titulares sem confirmação) continua recusada integralmente pelo contrato público preexistente, sem inferir reservas. O agregador isolado também preserva ausência e médias/percentuais indefinidos sem jogos.

Seleção usa parâmetros registrationId repetidos; Todas/Nenhuma são compactos. Consultas acima de7000caracteres usam POST JSON de leitura na mesma rota, com limite80KB e verificação de origem. O link usa referência local acima de1800caracteres; sessão contém os IDs integrais. Referência ausente e falha de armazenamento são explícitas. Nenhuma infraestrutura remota nova.

## Interface e provas focais

Título Equipes, padrões Por jogo/Todos/PTS desc somente quando ausentes; busca normalizada com debounce300ms, cancelamento de respostas anteriores e controles estáveis. Seleção completa preservada em busca e fase vazias. Súmula tem16colunas fixas, sem Dados/Mais opções/Colunas ou paginação; boxscore preserva os controles. Legenda sempre visível só das métricas apresentadas. Perfil conserva paginação e retorno.

CSS restrito à listagem de súmula: largura intrínseca/centralização acima1050px, scrollbar junto a GD, padding14/10px, max-height70vh, sticky vertical inclusive Pos., identificação horizontal, sincronização já existente e overscroll:none nos dois eixos. Sem mudanças em ScrollableTable, Jogadores ou layout de boxscores por esses ajustes.

Provas focais observadas:44testes de domínio de Equipes PASS antes do último caso de identidade;28cenários Chromium desktop/mobile PASS;4novos cenários de seleção999IDs/reload/perfil/POST e última resposta/máximos PASS. A revisão final acrescentou caso RED de busca pela identidade pública completa dentro de uma fase; validação final da composição ainda será registrada abaixo. Gate completo em execução; não declarar concluído antes de seu resultado real.

[1366px](evidencias/equipes-refinamento/equipes-1366.png) · [1920px](evidencias/equipes-refinamento/equipes-1920.png) · [390px](evidencias/equipes-refinamento/equipes-390.png) · [320px](evidencias/equipes-refinamento/equipes-320.png). Fixtures sintéticas, com nomes longos; capturas serão renovadas após o ajuste final de largura da identificação no celular.

## Revisão e histórico

Aplicadas ui-ux-pro-max (busca keyboard focus filtering: Focus States/Focus Not Obscured) e [web-design-guidelines atualizadas](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas05/11/2026. Conferidos semântica, teclado, foco, controles de formulário, async status, overflow, tipografia e URL. As recomendações gerais de virtualização cedem ao pedido de tabela integral e limite explícito1000; sem dependência nova.

Revisão autoral, sem ferramenta de subagentes disponível e sem alegar parecer independente. Foi encontrado e corrigido conflito de especificidade que tornava Pos. estática; teste geométrico RED→GREEN. Em execução exploratória sobreposta, um servidor encerrado pela primeira suíte gerou ERR_CONNECTION_REFUSED; execução sequencial posterior passou, sem alterar timeout/retries/skips. Dois erros de preparação de testes de PB (atleta já reserva e fixture PDF sem coletivo) foram corrigidos após inspeção; não mudaram regra de produto.

[Quadro histórico atual](../evidencias/2026-11-05-equipes-historico.md):25jogos/50lados,34sem agregado coletivo novo;15técnicas reconstituídas e mínimoGD4. PB disponível nos50lados. Documentos originais preservados; FR/GD ainda dependem de conferência onde ausentes. Não há republicação, backfill ou substituição privada da consulta pública.

## Entrega e limites

CI da PR e do SHA integrado são obrigatórias. Publicação autorizada somente no Worker independente base-do-basquete-next-uiux, depois da integração validada. Principal e Access/segredos/banco/dados humanos preservados. Estado real no checkpoint.

Emulação Chromium/WebKit não confirma comportamento em celular físico. WebKit Windows não implementa overscroll-behavior; a prova nativa dessa propriedade depende do job macOS. Axe e inspeção manual não certificam WCAG integral.

## Checkpoint de pausa por cota

Gate consolidado concluído com exit0:715unitários/149arquivos, política11, transporte11, banco descartável13, Worker/HTTP30 e PDF1, além de lint/formato/tipos/build/fronteira/segredos. Última revisão corrigiu identidade pública estável entre fases e validação do DTO;48focais PASS, seguidos de13testes de precisão/PB/fontes mistas PASS após acrescentar os últimos casos. Não somar os recortes, que se sobrepõem. CI remota final ainda necessária.

Rodada ampliada:56cenários Chromium PASS e2falhas por ENOSPC na gravação de traces. Os2afetados passaram na repetição sequencial (.equipes-disk-repeat.log), com traceoff apenas nessa repetição local, sem skips/retries/timeouts adicionais. Um Vitest concorrente também encontrou ENOENT de arquivo temporário; repetição sequencial13PASS. A causa de ambiente foi confirmada por discoC com cerca de130MB livres; não corrigir o produto para mascará-la. Removido somente o map PDF gerado nesta execução. Não remover artefatos alheios para liberar espaço.

WebKit Windows:2cenários geométricos desktop/mobile PASS, incluindo sticky/sincronização/1050–1051/zoom e texto200. Não confirma overscroll nativo em Windows nem celular físico. A CI macOS inclui agora o teste de Equipes. Capturas mobile renovadas depois do ajuste de largura do nome; restantes preservadas.

Pausa real em13% restante5h, reset1793934163. Retomada automática oficial `retomar-refinamento-de-equipes` ACTIVE, confirmada por view e arquivo da automação para este chat:06/11/2026 às00:04:43 America/Sao_Paulo (03:04:43UTC), reset+2min. Não há PR criada, CI remota, merge ou deploy desta unidade. Não iniciar outro gate nesta janela. Próximo passo:reconciliar main/PR61/serviço, fechar focais pendentes de revisão/formato, abrir e validar a única PR, integrar e publicar somente o Worker autorizado.
