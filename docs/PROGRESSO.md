# Progresso atual

Atualizado em 02/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md), objetivos em [ROADMAP.md](ROADMAP.md), leitura em [INDICE.md](INDICE.md). O [checkpoint anterior](../historico/progresso/2026-11-02-antes-publicacao-isolada-pr38.md) preserva implementação, autorização e pausa por cota.

## Unidade ativa — PR #38

- Branch remota `codex/reaproveitar-elenco-banco`, [PR #38](https://github.com/renato-lucindo/base-do-basquete-next/pull/38) Draft para main, HEAD validado/publicado `bcfaabaaeeef6714473a3ec704a5f996d9201d51`. CI [41440728522](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41440728522) SUCCESS: 630 unitários; 479 browsers PASS / 109 SKIP. Gate local PASS; regressões e causas na [evidência da correção](evidencias/2026-11-02-edicao-jogos-legados-pr38.md).
- Corrigidos TO v1, arbitragem/horários reais de jogo encerrado e camisa após ações com identidade/autoria contextual estável. Preservadas validações, concorrência, recibos, 0/00 e correção/republicação explícita. Nenhuma mudança funcional durante a publicação.
- Preview autorizado publicado: https://base-do-basquete-next-pr38.renato-lucindo-jr.workers.dev/ — Worker exclusivo, deployment `0217b1fc-b00f-4e68-9716-92ae908651d4`, versão 4 `a285a09b-94ad-4457-9b9f-7ea38f3cf854`, 100% pela API; anotação com SHA completo. Build e dry-run da release passaram.
- Access restrito ao proprietário, mesmo IdP/8h; sessão DO e chave novas, rate limiter exclusivo, URLs de versões desativadas. Anônimo recebe 302 para Access. Após login do responsável, browser conferiu lista de Jogos, editor encerrado, súmula antiga/camisas habilitadas, resultado e estatísticas. Não houve gravação de teste em dados humanos. Desktop/mobile e salvamento/conflito/reenvio foram comprovados em fixtures/CI; no remoto, apenas leitura.

## Banco e preservação

- Migration incremental autorizada aplicada somente no dev `nizmasjddyrhmevvfviz`: SQL do arquivo `20261102112205_legacy_sheet_editing.sql`; conector registrou `20261102154118_legacy_sheet_editing`, 56 migrations. Trigger ativo, grants/search_path conferidos, SQL do ledger idêntica ao arquivo por checksum. Antes de futuro db push, reconciliar histórico via migration repair; não reaplicar pelo timestamp original. Migration original não editada; sem backfill/seeds/DML de negócio.
- Contagens e checksums de 12 tabelas de jogos/súmulas/elencos/arbitragem/publicações idênticos antes/depois. Advisors sem mudança. [Provas, IDs, correspondência da migration e limites](evidencias/2026-11-02-preview-isolado-pr38.md).
- Settings/deployments/subdomain dos Workers compartilhado e PR #46 idênticos antes/depois; Access anterior intacto. PR #46 continua em `a74584a32189f9ce42bdde5a3cd27eee0be4f8bd`. Ambos usam o mesmo dev, agora com a migration compatível autorizada. Não foi incorporada a UI pública da PR #46 neste preview.
- Checkout humano `sync/trabalho-casa`/`89eff57`, não rastreados e modificação antiga de PROGRESSO no worktree da PR #46 preservados. Release em worktree destacado `C:/Users/12405304716/.codex/worktrees/pr38-preview-20261102`, limpo no SHA publicado. Checkpoint documental local no worktree de implementação; sem push de código adicional, merge ou produção.
- Próximo passo: avaliação das correções no novo preview, eventual revisão/aceite e reconciliação do ledger antes de próxima operação de migrations. Merge e produção continuam sem autorização. Nenhuma automação, reset ou crédito consumido.
