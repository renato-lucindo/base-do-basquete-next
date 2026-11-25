# Progresso atual

## Confrontos da fase regular — 25/11/2026

- Unidade `codex/confrontos-fase-regular`, baseada em `origin/main` no SHA `0af33e38f080eab8c1bbddbfef6bd33e388c6ab8`. Entrega solicitada: uma PR administrativa para main; outras PRs preservadas.
- Checkbox e quantidade no formato, prévia paginada por rodadas, um ou dois turnos e grupos. Usa inscrições reais; evita pares já cadastrados. IDs e comandos conservados em resposta perdida; itens confirmados não são reenviados.
- Correção expressa do responsável: **Trocar mando somente em Editar jogo**. Dados restantes continuam no editor existente. Bloqueios de jogo encerrado e decisões administrativas preservados.
- Evidência focal: 15 testes unitários PASS; seis testes Chromium PASS em desktop/celular. Regressão ampliada e gate consolidado em execução; CI remota ainda não iniciada neste checkpoint. Resultado do SHA publicado nos checks da PR da unidade.
- Revisão do autor com design system (ações, campos, checkbox, diálogo e tabela), `ui-ux-pro-max` e Web Interface Guidelines. Capturas e axe locais em `.preview-artifacts/`; sem parecer independente ou aceite humano declarado. [Plano](PLAN-CONFRONTOS-REGULARES.md).
- Sem migration, DDL/DML remoto, merge, deploy ou publicação de dados. Serviço indicado: `admin-publicacao.renato-lucindo-jr.workers.dev`; versão remota não identificada nem alterada. Outros serviços fora do escopo.
- Alterações preexistentes de `CONTRIBUTING.md`, skills locais e `skills-lock.json` continuam no checkout original `sync/trabalho-casa`. Unidade em worktree próprio. PRs #89 e #90 apenas consultadas.
- Próximo passo: concluir verificações, publicar esta branch e abrir sua PR; conferir CI do HEAD e entregar o link. Não integrar nem implantar sem instrução correspondente.

## Contexto anterior

Checkpoint anterior, incluindo organizadores, súmula, jogos, serviços e outras unidades, preservado [integralmente no histórico](../historico/progresso/2026-11-25-antes-confrontos-regulares.md). Esses relatos não são novas execuções. Continuidade e cota em [CONTRIBUTING.md](../CONTRIBUTING.md).
