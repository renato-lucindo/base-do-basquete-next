# Progresso atual

Atualizado em 02/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md), objetivos em [ROADMAP.md](ROADMAP.md), leitura em [INDICE.md](INDICE.md). Histórico anterior em [checkpoint preservado](../historico/progresso/2026-11-02-antes-publicacao-isolada-pr38.md).

## Unidade ativa — integração da PR #38

- [PR #38](https://github.com/renato-lucindo/base-do-basquete-next/pull/38), branch `codex/reaproveitar-elenco-banco`, base main `c6004eba2c891a2049edd8f7768b37777ea6d523`. Aceite e merge autorizados pelo responsável: “Validei as correções. Pode iniciar o procedimentos para merge”. [Autorização](https://github.com/renato-lucindo/base-do-basquete-next/pull/38#issuecomment-6582888204). Sem autorização de produção ou novo deploy.
- Retomada automática após reset em 02/11/2026 às 17:36: cota real 0% usada/100% disponível na janela 5h, semanal 39% usada. Automação `retomar-merge-da-pr-38-ap-s-reset`; pausar ao concluir. Regra solicitada de retomada obrigatória após pausa por cota incorporada em CONTRIBUTING.
- Candidato anterior `f089dd6775a1fc0edb99376aed2d95303286cfe2`, CI [41489382068](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41489382068) SUCCESS (636 unitários, 481 browsers PASS/109 SKIP). A tentativa de merge foi bloqueada pelo GitHub por dois apontamentos novos de revisão abertos; nenhuma proteção contornada.
- Correções focais no mesmo escopo: excluir jogador já incluído das escolhas de reaproveitamento, preservando camisa de destino; limitar papéis de comissão aos permitidos na súmula v1, mantendo intercâmbio em v2. Regressões RED→GREEN; 15 browsers PASS/1 SKIP (desktop/mobile, salvamento/recarga, ações, ACK/conflito). Gate e CI do novo candidato pendentes. [Evidência de integração e revisão](evidencias/2026-11-02-integracao-pr38.md).
- Código funcional anterior: correções de TO v1, arbitragem/horários reais em jogo encerrado e camisa após ações com autoria contextual estável. UI separa Date Picker e intervalo início/fim, com opção de dia seguinte. [Legado](evidencias/2026-11-02-edicao-jogos-legados-pr38.md), [horários](evidencias/2026-11-02-data-intervalo-horarios-pr38.md). Snapshots públicos preservados; republicação é explícita.

## Preview e banco

- Preview exclusivo [PR #38](https://base-do-basquete-next-pr38.renato-lucindo-jr.workers.dev/), fonte `4ae05356e49108ec237b82ffa275dd5e1b69b228`, deployment `ddab0f4e-7eac-4050-a9ad-57fb1930f086`, versão 5 `d0c80fe1-d77e-4911-b271-1bc85f183bf8`, 100% confirmado pela API na publicação anterior. Access proprietário/mesmo IdP/8h; sessão e rate limiter exclusivos; anônimo 302. Leitura autenticada conferida, sem salvamentos de teste em dados humanos. Novas correções de revisão ainda não publicadas.
- Dev `nizmasjddyrhmevvfviz`: 56 migrations. `20261102154118_legacy_sheet_editing.sql` corresponde ao ledger por SQL/checksum; somente rename do nome local antigo, blob Git preservado. Sem repair, reaplicação, DDL ou DML nesta integração. Contagens/checksums de 12 tabelas e advisors preservados na publicação anterior. [Evidências e limites](evidencias/2026-11-02-preview-isolado-pr38.md).
- Preview compartilhado e PR #46 (`a74584a32189f9ce42bdde5a3cd27eee0be4f8bd`) preservados. Nenhum serviço publicado nesta retomada.

## Preservação e próximo passo

- Worktree de implementação isolado `C:/Users/12405304716/.codex/worktrees/pr38-legacy-edit-20261102`; HEAD real consultável por Git, checkpoint local anterior `671ad13`. Release `pr38-time-picker-20261102` permanece no SHA publicado.
- Checkout humano `sync/trabalho-casa`/`89eff57`, alteração solicitada em CONTRIBUTING, não rastreados e modificação antiga de PROGRESSO no worktree da PR #46 preservados. Não limpar, trocar ou sobrescrever branches alheias.
- Próximo passo: concluir gate, publicar correções na mesma PR, conferir nova CI, responder e resolver apontamentos comprovadamente corrigidos; integrar por merge commit autorizado com SHA esperado e confirmar CI do SHA integrado. Não repetir suites de artefatos inalterados nem publicar serviços por consequência do merge.
