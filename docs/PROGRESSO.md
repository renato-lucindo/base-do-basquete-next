# Progresso atual

Atualizado em 03/11/2026. [Escopo](MATRIZ-ESCOPO.md) · [Roadmap](ROADMAP.md). [Checkpoint anterior](../historico/progresso/2026-11-03-antes-liberacao-publica.md) preserva as provas e decisões do cadastro de jogos.

## Liberação autorizada — PR #49 antes da PR #50

O responsável autorizou na conversa de liberação do domínio concluir validação, integração, migrations e deploy para campeonatos na raiz e administração em `/admin`. Mesma PR #49, branch `codex/navegacao-publica`, revisão em worktree detached exclusivo `C:/Users/12405304716/.codex/worktrees/pr49-liberacao-20261103`, origem `83ca28c8f0d5b372aa216504fa3226fb8f4f73b5`. A unidade de domínio da PR #50 aguarda esta integração, sem incorporação de WIP ou nova pilha.

- Corrigido thread de revisão: repetir busca com o mesmo termo após erro agora dispara requisição nova. Navegação pública 16 browsers PASS; teste novo 2 PASS.
- CI anterior [41683662938](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41683662938): gate/design PASS, 548 browsers PASS / 109 SKIP / 1 FAIL no alinhamento mobile. CSS corrigido sem afrouxar teste; focal original 2 PASS em desktop/mobile/zoom/320px. CI do novo HEAD ainda deve ser conferida.
- Migrations **aplicadas**, ledger conferido: `20261103174254_sheet_team_statistics.sql` e `20261103174303_game_editor_metadata.sql`. Nomes reconciliados com versões reais sem mudar SQL. Banco descartável 3 PASS; verificações remotas de estrutura/grants e inventário preservados, sem novo achado de advisor. [Evidência detalhada](evidencias/2026-11-03-liberacao-publica.md).
- Preview PR49 continua na versão anterior `61d47226-5f8b-4693-930c-44e5e33529ce`, fonte `7720909`; não foi republicado. Serviço do domínio permanece na versão de configuração `188ff4c2-b3ae-40ec-bb90-e3df7192429c`; raiz pública ainda não implantada.
- Checkout humano `sync/trabalho-casa`, CONTRIBUTING/skills e demais worktrees preservados. A revisão da liberação foi feita em cópia detached; o trabalho do cadastro continuou no worktree original da PR49. Não inventar nova execução de provas inalteradas.

## Cadastro de jogos — retomada desta conversa

- Pop-up aprovado implementado em `7e5b1fc`; teclado e limite de busca refinados. **99 browsers PASS / 31 SKIP**, gate local por composição, mais **24 browsers** e **2 focais** após refinamentos. [Contrato, capturas e provas](evidencias/2026-11-03-dialogo-jogos.md).
- Alinhamento pela base dos campos em `48d004b4e72aa2a765442277a333d4b67d409458`, incluindo rótulo de duas linhas e fonte ampliada: **34 browsers PASS**, lint/tipos/build. Substitui o ajuste paralelo de espaçamento fixo; requisito estrito do teste preservado. Integração de `52d430a` preserva a busca pública e as migrations reconciliadas, sem reaplicar SQL. Resultado consolidado do SHA enviado nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks).
- Esta conversa não executou merge da PR, DDL remoto ou deploy. As operações da unidade de liberação e seus limites estão na evidência própria acima. A automação `concluir-di-logo-de-jogos-na-pr-49` será pausada ao concluir; a anterior `retomar-navega-o-p-blica-pr-49` permanece pausada.

Próximo passo: publicar correções/checkpoint na mesma PR #49, conferir CI do novo SHA e thread resolvido; merge commit autorizado. Depois atualizar e concluir #50 sobre main, validar composição e publicar o domínio. CI obrigatória dos SHAs integrados; login humano/aceite visual não presumidos. Nenhuma retomada automática criada nesta liberação.
