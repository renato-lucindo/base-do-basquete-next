# Progresso atual

Atualizado em 22/11/2026. Estado anterior preservado no [histórico](../historico/progresso/2026-11-22-antes-perfis-equipes.md).

## Perfis de equipes

- HTML revisado aceito e implementação autorizada em 22/11. [Requisitos](design/PERFIS-EQUIPES.md), [plano](PLAN-PERFIS-EQUIPES.md), [validação](design/VALIDACAO-PERFIS-EQUIPES.md).
- Branch `codex/perfis-equipes`, base `824a3d59da5323202d869a4d93a1038bcd377044`, worktree `C:/Users/12405304716/.codex/worktrees/perfis-equipes/Base do Basquete-v1`. Uma única PR para main será aberta com este código; conferir HEAD/PR reais na retomada.
- Implementados os modos geral e por inscrição, classificação/coletivos completos, jogadores por inscrição, campanhas/status, recentes por ano, jogos sem Resultado, conquistas históricas e legenda expandida. Busca, aliases antigos, filtros e retorno preservados.
- Gate completo local PASS em 22/11: 179 arquivos / 848 testes unitários, transportes, banco local, lint/formato/tipos, builds e runtime Worker/PDF, fronteira cliente e segredos. Código executável não mudou após esse gate; testes adicionais cobrem retorno mobile e larguras.
- Browsers focais: perfil 10 PASS; equipes 14 PASS; busca/navegação 30 PASS; axe geral/jogadores sem violações. Regressão completa de 1004 casos e design:verify em execução. Primeiro ensaio interrompido por falta de disco durante banco local, espaço liberado automaticamente ao terminar o banco e reexecução iniciada. Não declarar os testes interrompidos aprovados.
- CI desta branch ainda não executada. Próximo passo: concluir browsers/design, abrir/atualizar a PR única, acompanhar CI do HEAD e registrar resultados reais.

## Autorizações e continuidade

- Sem deploy, migration, DDL ou publicação de dados nesta unidade. Serviços remotos não alterados. CONTRIBUTING exige avaliação no Worker autorizado e novo aceite visual antes do merge; alvo/autorização de deploy desta unidade ainda não definidos.
- Automação existente `retomar-perfis-de-equipes` preservada, originalmente marcada para 22/11 às 15:40:23 de Brasília. Atualizar a mesma se for necessário aguardar CI ao encerrar; pausar quando restar somente ação humana. Última cota real consultada: 53% usados na janela 5h, reset Unix `1795385440`; não houve reset manual/créditos.
- PR #88 de limpeza de referências em outra branch preservada. Checkout original `sync/trabalho-casa` mantém alterações humanas em CONTRIBUTING e skills locais, não incorporadas nesta unidade.
