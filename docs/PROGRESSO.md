# Progresso atual

Ficha pública na [PR79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), branch `codex/perfil-atleta-aprovado`, base `a55dd7c`. O SHA desta rodada e seu `validate` estão nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/79/checks).

- A ficha usa até quatro linhas e mostra dados confirmados. A confirmação manual usa prévia, decisão explícita e motivo de revisão. O lote administrativo reaproveita as confirmações individuais, com conferência de elegibilidade e versões.
- Migration `20261114002816_player_profile_public_card.sql` saneia a projeção corrente, preserva o histórico privado e habilita o inventário autenticado para primeiras publicações. Aplicação no DEV e lote real aguardam autorização específica. Inventário preliminar: 225 atletas públicos, um perfil confirmado, 64 fichas elegíveis e 160 sem dados da ficha.
- Provas locais em `.preview-artifacts/ficha-browsers-final.log` e `.preview-artifacts/ficha-gate.log`. Verificação remota e estado do rollout no corpo da PR.
- [Preview separado](https://base-do-basquete-next-uiux-preview.renato-lucindo-jr.workers.dev/publico.html) ainda no SHA `de58931`, versão `bcdf7709-17ac-4a1f-aeae-2f8e967dc905`, deployment `223d6aef-c69d-49b0-b442-8aa2320770af`. Worker PR79 em `8f7b38d`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`. Checkout humano e demais worktrees preservados.

[Rodada anterior](../historico/progresso/2026-11-13-perfil-e-navegacao-por-ano.md). O próximo passo é conferir `validate` e obter a autorização do DEV.
