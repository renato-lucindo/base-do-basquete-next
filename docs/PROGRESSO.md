# Progresso atual

Atualizado em 03/11/2026. [Escopo](MATRIZ-ESCOPO.md) · [Roadmap](ROADMAP.md). Checkpoint anterior preservado em [antes de Equipes/súmula](../historico/progresso/2026-11-03-antes-equipes-sumula.md).

## Unidade — PR #49, cadastro administrativo de jogos

- Pedido explícito: implementar na mesma [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49) o pop-up aprovado. Branch `codex/navegacao-publica`, worktree `C:/Users/12405304716/.codex/worktrees/navegacao-publica`. Base `ad15231`; implementação `7e5b1fc93ab6814a6799676661b53632ca9e0cf5`.
- Equipes pesquisáveis, agenda com início/fim existentes, rodada opcional, eliminatória com etapa lateral, arbitragem recolhível e ações fixas. Salvar e adicionar outro mantém data/local/rodada; recuperação de envio e ACK não duplica jogos. Dados administrativos, sem mudar regulamento/publicação. [Contrato, capturas e provas](evidencias/2026-11-03-dialogo-jogos.md).
- Banco descartável **2 PASS**, instalação nova e atualização. Browsers finais **99 PASS / 31 SKIP**, nove arquivos, desktop/mobile, 1366/1920/390/320 px, zoom equivalente, teclado e axe. Após ENOSPC no C:, temporários próprios em `Y:/Codex-Temp/pr49-jogos-20261103`; arquivos alheios preservados.
- Gate em execução com `VITEST_MAX_WORKERS=2` e TEMP/TMP no Y:; lint/formato/tipos aprovados, sem resultado consolidado ainda. Log `.preview-artifacts/game-editor-gate.log`, sessão 83095. CI anterior da base [41672122939 SUCCESS](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41672122939), sem validar este incremento. Conferir [CI do HEAD](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks) após o envio.
- Migration nova `20261103163618_game_editor_metadata.sql`, testada apenas localmente. A anterior `20261103153010_sheet_team_statistics.sql` também continua pendente. PR **draft**, sem merge, deploy, DDL remoto ou publicação humana.
- Próximo passo: concluir gate, enviar checkpoint e conferir CI do novo SHA na mesma PR. Migrations/deploy dependem de autorização específica.
- Resumo anterior completo em [antes do diálogo de jogos](../historico/progresso/2026-11-03-antes-dialogo-jogos.md); incrementos anteriores e suas provas preservados.

## Serviços e preservação

- [Preview protegido PR49](https://base-do-basquete-next-pr49.renato-lucindo-jr.workers.dev/publico.html) permanece na fonte `77209094d3b600ef39168d4f50b4b42b9e9950c2`, versão `61d47226-5f8b-4693-930c-44e5e33529ce`, deployment `b75c8e5a-2683-4af5-afd6-be57c0678b85`. Não contém este ajuste nem o de nomes/tooltips. Access owner-only e demais serviços preservados; sem nova implantação.
- Banco de desenvolvimento `nizmasjddyrhmevvfviz`: última migration aplicada conhecida `20261103102443_public_standings_confirmed`, por autorização anterior. Não consultado/modificado neste pedido. Nova fonte exige migration/deploy e revisão de publicação antes de produzir GD/FR completas.
- [Preview local com fixtures](http://127.0.0.1:5178/equipes.html#f9000000-0000-4000-8000-000000000801?mode=total&sort=points&direction=desc) serve o novo código nesta sessão, sem banco humano; processo da sessão 1125, módulo ignorado `.preview-artifacts/preview-team-sheet.mjs`. HTTP/DOM conferidos, sem alertas ou transbordamento. Preview anterior 5177 preservado.
- Checkout principal `sync/trabalho-casa`, CONTRIBUTING/skills humanos e outros worktrees/branches preservados. Automação `retomar-navega-o-p-blica-pr-49` permanece PAUSED; sem pausa por cota nesta execução. Regras em [CONTRIBUTING.md](../CONTRIBUTING.md).
