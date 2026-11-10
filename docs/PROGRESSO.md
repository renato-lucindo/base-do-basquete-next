# Progresso atual

Atualizado em 10/11/2026. Unidade: integração sequencial das PRs #75 e #76, autorizada expressamente pelo responsável, sem publicar nova versão do site.

## Integração

- PR #75 integrada por merge commit `6445091e8b5d8f1c16f2b1567c02bfbc721722e4`, HEAD revisado `a47c58f7cfb0e4a05510630dc9917416c4003063`. [CI da PR](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42840209632): 7/7 SUCCESS. CI do merge em conferência.
- PR #76 em composição com essa main por merge explícito; origem `8e4868c3dcad8c1275186fa7e39175518a556b31`. Branch local `codex/integracao-pr75-pr76` acompanha a PR existente `codex/partida-publica`, sem nova PR. SHA material será registrado após o merge local.
- Três conflitos tratados: checkpoint arquivado por origem, regras públicas preservando classificação e partida, painel PDF preservando ordenação de camisas e finalização flexível. Provider, tipos SQL e fixture Worker serão conferidos mesmo nos merges automáticos.
- SQL original de `20261110133504_public_game_detail_draft_guard` recuperado de `supabase_migrations.schema_migrations` do DEV e incorporado sem reaplicação. Dependências: visibilidade da PR75 → detalhe `130218` → guard `133504` → filtro aninhado `145957` → compatibilidade `150011`.

## Provas e limites

Gate completo e browsers da composição ainda pendentes; não integrar PR76 até aprovação integral. Evidências detalhadas serão consolidadas em [VALIDACAO-INTEGRACAO-PRS-75-76.md](VALIDACAO-INTEGRACAO-PRS-75-76.md).

Leitura do DEV confirmou semifinal IVV/Cetaf × Saldanha da Gama em **draft v1**, jogo finished v4 e publicação histórica v1; `get_public_game` e `get_public_game_detail` anônimos retornam null; fonte pública contém 26 jogos/resultados sem ID privado. Nenhum DDL, DML, seed ou deploy executado nesta unidade. Auth, Access, segredos e configurações de produção preservados. Estado publicado não foi auditado; versões previamente registradas continuam apenas como evidência histórica.

Checkout principal `sync/trabalho-casa` preservado, incluindo alteração humana em CONTRIBUTING.md, `.agents/skills/web-design-guidelines/` e `skills-lock.json`. Outros worktrees/branches não alterados. Históricos anteriores: [PR75](../historico/progresso/2026-11-10-antes-integracao-pr75.md) e [PR76](../historico/progresso/2026-11-10-antes-integracao-pr76.md).

Próximo passo: validar composição, publicar na mesma branch da PR76 sem force push, conferir CI do HEAD e do SHA integrado; nenhum deploy autorizado.
