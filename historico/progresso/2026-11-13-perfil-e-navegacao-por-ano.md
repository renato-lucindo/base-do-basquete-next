# Progresso atual

Atualizado em 13/11/2026. Perfil dos jogadores e navegação por disputas na mesma [PR79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), branch `codex/perfil-atleta-aprovado`, base `a55dd7c`. O SHA a publicar e seu `validate` são os do [HEAD desta rodada](https://github.com/renato-lucindo/base-do-basquete-next/pull/79/checks). A CI 43421897883 é da revisão anterior.

- Campeonatos agrupa ano, campeonato e naipe, com disputas abertas. O nome do campeonato expande só a edição atual e mantém a aba ao trocar. O mínimo de jogos fica vazio quando inativo.
- Identificação sem biografia. A data completa bloqueia o ano no cadastro, prevalece no servidor e fica congelada em coluna privada da versão do perfil. O público recebe a idade em anos completos e o ano confirmado. A consulta anterior continua disponível.
- Validação local registrada nos logs ignorados `followup-age-gate-final.log` e `followup-age-browser-final.log` em `.preview-artifacts/`. A CI exige o gate completo incluindo browsers e `validate`.
- Migration de esquema e de publicação versionada `20261113201054_player_profile_confirmed_age`. Aplicação remota, perfil do Fernando e smoke do Worker são etapas distintas. Os resultados operacionais desta rodada ficam no corpo da PR para evitar novo commit apenas de acompanhamento de CI.
- Baseline do [preview separado](https://base-do-basquete-next-uiux-preview.renato-lucindo-jr.workers.dev), sem Access: fonte `f1c9924`, versão `17355c61-98d5-42aa-886c-6c83c81ceba7`, deployment `521f54cd-eb01-447d-855d-0caf6d67fb88`. Worker da PR79: fonte `8f7b38d`, versão `80e95d3b-9a4f-45c7-a418-d8c6d4ac367e`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`.

Worktree da unidade: `C:/Users/12405304716/Documents/Codex/2026-11-10/perfil-jogador-prototipos/work/perfil-atleta-produto`. Checkout humano e demais worktrees preservados. [Rodada anterior](2026-11-13-ajustes-publicos-e-preview.md).
