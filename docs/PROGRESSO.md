# Progresso atual

## Confrontos da fase regular — 26/11/2026

- Unidade `codex/confrontos-fase-regular`, [PR #91](https://github.com/renato-lucindo/next/pull/91). Código `7745178`, main atual incorporada por merge em `0a2c0dd`, base integrada `5c9605b`. Entrega solicitada: uma PR administrativa para main; outras PRs preservadas.
- Checkbox e quantidade no formato, prévia paginada por rodadas, um ou dois turnos e grupos. Usa inscrições reais; evita pares já cadastrados. IDs e comandos conservados em resposta perdida; itens confirmados não são reenviados.
- Correção expressa do responsável: **Trocar mando somente em Editar jogo**. Dados restantes continuam no editor existente. Bloqueios de jogo encerrado e decisões administrativas preservados.
- Evidência focal: 15 testes unitários PASS; oito testes novos de Chromium PASS em desktop/celular. Regressão ampliada: 45/46 PASS em paralelo; único timeout por sobreposição do seletor passou isoladamente, sem alterar o teste ou timeout. Desktop 1366/1920, celular 390/320 e axe conferidos. Quatro regressões do scanner da main incorporada PASS.
- [CI de `2c4bebef96c8461f2fb7c27971b7a5d34b911b0d`](https://github.com/renato-lucindo/next/actions/runs/45682538396) **SUCCESS**, sete checks aprovados, incluindo gate completo, dois shards de browsers, design, WebKit e validate. Gate local: 835 testes PASS; inicialização do banco de ordenação atingiu 10 s em paralelo, passou isoladamente (2/2), e as etapas restantes passaram. Nenhum timeout ou teste alterado. Revisão posterior exclusivamente documental reutiliza essa evidência de código inalterado.
- Revisão do autor com design system (ações, campos, checkbox, diálogo e tabela), `ui-ux-pro-max` e Web Interface Guidelines. Capturas e axe locais em `.preview-artifacts/`; sem parecer independente ou aceite humano declarado. [Plano](PLAN-CONFRONTOS-REGULARES.md).
- Preview atualizado em 26/11/2026 após instrução expressa do responsável: [admin-publicacao](https://admin-publicacao.renato-lucindo-jr.workers.dev/), versão `7c5830cf-6770-4cc6-84a2-7c47b1cdeb5f`. Composição preserva a fonte anterior `039d78a` e aplica somente o patch administrativo/testes da PR #91 em `53e177d`; cabeçalho `X-Bdb-Source: pr91-53e177d-on-039d78a`. Patch SHA256 `3c61d126d432e730f31d0c0797ce411b96cf1afed057d97dc9f1bd998482e8b2`.
- Build, dry-run, 15 testes unitários e oito browsers da composição PASS. Deploy alterou apenas três assets administrativos. Smoke remoto: raiz, `/admin`, health e bundle 200; bundle contém geração e troca de mando; catálogo e configuração sem sessão 401. Login humano remoto não exercitado. Configurações, segredos e bindings existentes preservados; outros serviços e PRs não foram alterados. Sem migration, DDL/DML remoto, merge ou publicação de dados.
- Alterações preexistentes de `CONTRIBUTING.md`, skills locais e `skills-lock.json` continuam no checkout original `sync/trabalho-casa`. Unidade em worktree próprio. PRs #89 e #90 apenas consultadas.
- Retomada manual em 26/11/2026 após reset conferido: janela de 5h com 100% restante e semanal com 55%. Nenhuma automação desta unidade foi criada; não há retomada pendente a cancelar.
- Unidade concluída para revisão na PR #91. Próximo passo: revisão/aceite do responsável. Não integrar nem implantar sem instrução correspondente.

## Contexto anterior

Checkpoint anterior, incluindo organizadores, súmula, jogos, serviços e outras unidades, preservado [integralmente no histórico](../historico/progresso/2026-11-25-antes-confrontos-regulares.md). Esses relatos não são novas execuções. Continuidade e cota em [CONTRIBUTING.md](../CONTRIBUTING.md).
