# Progresso atual

## Confrontos da fase regular — 25/11/2026

- Unidade `codex/confrontos-fase-regular`, [PR #91](https://github.com/renato-lucindo/next/pull/91). Código `7745178`, main atual incorporada por merge em `0a2c0dd`, base integrada `5c9605b`. Entrega solicitada: uma PR administrativa para main; outras PRs preservadas.
- Checkbox e quantidade no formato, prévia paginada por rodadas, um ou dois turnos e grupos. Usa inscrições reais; evita pares já cadastrados. IDs e comandos conservados em resposta perdida; itens confirmados não são reenviados.
- Correção expressa do responsável: **Trocar mando somente em Editar jogo**. Dados restantes continuam no editor existente. Bloqueios de jogo encerrado e decisões administrativas preservados.
- Evidência focal: 15 testes unitários PASS; oito testes novos de Chromium PASS em desktop/celular. Regressão ampliada: 45/46 PASS em paralelo; único timeout por sobreposição do seletor passou isoladamente, sem alterar o teste ou timeout. Desktop 1366/1920, celular 390/320 e axe conferidos. Quatro regressões do scanner da main incorporada PASS. Gate local em execução; [CI observada](https://github.com/renato-lucindo/next/actions/runs/45682259403) em andamento. Resultado final do SHA nos checks da PR.
- Revisão do autor com design system (ações, campos, checkbox, diálogo e tabela), `ui-ux-pro-max` e Web Interface Guidelines. Capturas e axe locais em `.preview-artifacts/`; sem parecer independente ou aceite humano declarado. [Plano](PLAN-CONFRONTOS-REGULARES.md).
- Sem migration, DDL/DML remoto, merge, deploy ou publicação de dados. Serviço indicado: `admin-publicacao.renato-lucindo-jr.workers.dev`; versão remota não identificada nem alterada. Outros serviços fora do escopo.
- Alterações preexistentes de `CONTRIBUTING.md`, skills locais e `skills-lock.json` continuam no checkout original `sync/trabalho-casa`. Unidade em worktree próprio. PRs #89 e #90 apenas consultadas.
- Próximo passo: conferir os checks do HEAD da PR #91, concluir a verificação e entregar o link. Não integrar nem implantar sem instrução correspondente.

## Contexto anterior

Checkpoint anterior, incluindo organizadores, súmula, jogos, serviços e outras unidades, preservado [integralmente no histórico](../historico/progresso/2026-11-25-antes-confrontos-regulares.md). Esses relatos não são novas execuções. Continuidade e cota em [CONTRIBUTING.md](../CONTRIBUTING.md).
