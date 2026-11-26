# Progresso atual

## Confrontos da fase regular — 26/11/2026

- Unidade `codex/confrontos-fase-regular`, [PR #91](https://github.com/renato-lucindo/next/pull/91). Código `7745178`, main atual incorporada por merge em `0a2c0dd`, base integrada `5c9605b`. Entrega solicitada: uma PR administrativa para main; outras PRs preservadas.
- Checkbox e quantidade no formato, prévia paginada por rodadas, um ou dois turnos e grupos. Usa inscrições reais; evita pares já cadastrados. IDs e comandos conservados em resposta perdida; itens confirmados não são reenviados.
- Correção expressa do responsável: **Trocar mando somente em Editar jogo**. Dados restantes continuam no editor existente. Bloqueios de jogo encerrado e decisões administrativas preservados.
- Evidência focal: 15 testes unitários PASS; oito testes novos de Chromium PASS em desktop/celular. Regressão ampliada: 45/46 PASS em paralelo; único timeout por sobreposição do seletor passou isoladamente, sem alterar o teste ou timeout. Desktop 1366/1920, celular 390/320 e axe conferidos. Quatro regressões do scanner da main incorporada PASS.
- [CI de `2c4bebef96c8461f2fb7c27971b7a5d34b911b0d`](https://github.com/renato-lucindo/next/actions/runs/45682538396) **SUCCESS**, sete checks aprovados, incluindo gate completo, dois shards de browsers, design, WebKit e validate. Gate local: 835 testes PASS; inicialização do banco de ordenação atingiu 10 s em paralelo, passou isoladamente (2/2), e as etapas restantes passaram. Nenhum timeout ou teste alterado. Revisão posterior exclusivamente documental reutiliza essa evidência de código inalterado.
- Revisão do autor com design system (ações, campos, checkbox, diálogo e tabela), `ui-ux-pro-max` e Web Interface Guidelines. Capturas e axe locais em `.preview-artifacts/`; sem parecer independente ou aceite humano declarado. [Plano](PLAN-CONFRONTOS-REGULARES.md).
- Sem migration, DDL/DML remoto, merge, deploy ou publicação de dados. Serviço indicado: `admin-publicacao.renato-lucindo-jr.workers.dev`; versão remota não identificada nem alterada. Outros serviços fora do escopo.
- Alterações preexistentes de `CONTRIBUTING.md`, skills locais e `skills-lock.json` continuam no checkout original `sync/trabalho-casa`. Unidade em worktree próprio. PRs #89 e #90 apenas consultadas.
- Retomada manual em 26/11/2026 após reset conferido: janela de 5h com 100% restante e semanal com 55%. Nenhuma automação desta unidade foi criada; não há retomada pendente a cancelar.
- Unidade concluída para revisão na PR #91. Próximo passo: revisão/aceite do responsável. Não integrar nem implantar sem instrução correspondente.

## Contexto anterior

Checkpoint anterior, incluindo organizadores, súmula, jogos, serviços e outras unidades, preservado [integralmente no histórico](../historico/progresso/2026-11-25-antes-confrontos-regulares.md). Esses relatos não são novas execuções. Continuidade e cota em [CONTRIBUTING.md](../CONTRIBUTING.md).
