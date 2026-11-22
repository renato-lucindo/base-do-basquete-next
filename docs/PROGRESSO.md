# Progresso atual

Atualizado em 22/11/2026. Estado anterior preservado no [histórico](../historico/progresso/2026-11-22-antes-perfis-equipes.md).

## Perfis de equipes

- HTML revisado aceito e implementação autorizada em 22/11. [Requisitos](design/PERFIS-EQUIPES.md), [plano](PLAN-PERFIS-EQUIPES.md), [validação](design/VALIDACAO-PERFIS-EQUIPES.md).
- Branch `codex/perfis-equipes`, base `824a3d59da5323202d869a4d93a1038bcd377044`, worktree `C:/Users/12405304716/.codex/worktrees/perfis-equipes/Base do Basquete-v1`. [PR #89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), base main, única desta unidade. Código inicial completo `bf214f0`; conferir HEAD real na retomada.
- Implementados os modos geral e por inscrição, classificação/coletivos completos, jogadores por inscrição, campanhas/status, recentes por ano, jogos sem Resultado, conquistas históricas e legenda expandida. Busca, aliases antigos, filtros e retorno preservados.
- Gate completo local PASS em 22/11: 179 arquivos / 848 testes unitários, transportes, banco local, lint/formato/tipos, builds e runtime Worker/PDF, fronteira cliente e segredos. Código executável não mudou após esse gate; testes adicionais cobrem retorno mobile e larguras.
- Browsers finais do perfil 10 PASS (inclui foco de retorno mobile, 1366/1920 e reflow 320/texto200%); equipes 14 PASS; busca/navegação 30 PASS. Design build/verify PASS. Revisão posterior corrigiu seletores antigos, toque na escolha da inscrição e fixtures fora do contrato; 4 casos de acessibilidade/agenda e 7 regressões de busca/999 inscrições/boxscore passaram, com um skip preexistente de tipografia.
- CI inicial [45050998992](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45050998992), `bf214f0`: checks e design PASS; browsers/WebKit falharam e motivaram as correções acima. Atualizar a mesma PR com a revisão e exigir validate do HEAD. O resultado atual deve ser conferido na PR; este checkpoint não afirma CI aprovada.
- Próximo passo: acompanhar a CI completa da revisão, corrigir eventual falha e apresentar a implementação para avaliação. Primeiro ensaio local atingiu falta de disco; outro ensaio geral foi interrompido após detectar os defeitos já corrigidos. Não são prova de aprovação da regressão inteira.

## Autorizações e continuidade

- Sem deploy, migration, DDL ou publicação de dados nesta unidade. Serviços remotos não alterados. CONTRIBUTING exige avaliação no Worker autorizado e novo aceite visual antes do merge; alvo/autorização de deploy desta unidade ainda não definidos.
- Automação existente `retomar-perfis-de-equipes` preservada, originalmente marcada para 22/11 às 15:40:23 de Brasília. Atualizar a mesma se for necessário aguardar CI ao encerrar; pausar quando restar somente ação humana. Última cota real consultada: 64% usados na janela 5h, reset Unix `1795385440`; não houve reset manual/créditos.
- PR #88 de limpeza de referências em outra branch preservada. Checkout original `sync/trabalho-casa` mantém alterações humanas em CONTRIBUTING e skills locais, não incorporadas nesta unidade.
