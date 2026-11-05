# Progresso atual

Atualizado em 05/11/2026 para a conclusão documental da [PR #60](https://github.com/renato-lucindo/base-do-basquete-next/pull/60). Relatos anteriores de serviços e entregas estão [preservados no histórico](../historico/progresso/2026-11-05-antes-conclusao-pr60.md); não representam nova verificação desses ambientes.

## Unidade documental — filtros avançados

- FUT-004 registrado no [roadmap](ROADMAP.md): perfil do jogador e estatísticas dos jogadores do campeonato, seleção múltipla pesquisável e recálculo por recorte. Continua **ideia pós-MVP**, sem autorização de implementação.
- Mesma branch `codex/roadmap-filtros-jogadores`, commit original `aad3c14`, atualizada por merge explícito da `origin/main` em `76b90da142ed6ffc6331e9cd47852ee5c4519c07`; recuperar o HEAD corrente pelo Git/PR. Conflito limitado a este checkpoint, preservando o roadmap e o contexto anterior no histórico.
- CI original: `validate` SUCCESS, WebKit CANCELLED na [execução 42073877143](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42073877143). Essa execução não valida a reconciliação atual. As verificações documentais locais e os resultados reais da CI do HEAD e do merge são registrados na descrição da PR #60 após cada execução.
- Próximo passo: validar o diff documental, conferir a CI atual, integrar por merge commit conforme autorização do responsável nesta conversa e conferir a CI do SHA integrado. A evidência final de encerramento permanece na PR #60.

## Outras unidades e serviços

- PR #59 integrada em `76b90da`; CI do SHA integrado [42086467499](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42086467499) **SUCCESS**, consultada nesta execução. Não houve verificação nem atualização do preview por esta unidade documental.
- PR #61 permanece aberta e Draft; HEAD observado `0880ca5cfe85ed30074b696ae67ba00c9df5990b`. A integração de regular/eliminatória continua uma dependência a confirmar para implementação futura dos filtros. Não foi incluída nem validada nesta PR.
- Checkout humano `sync/trabalho-casa` preservado com `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Demais worktrees e automações de outras unidades não foram alterados.
- Sem deploy, migrations, DDL/DML ou publicação de dados. Versão dos serviços publicados não consultada nesta tarefa; o histórico preserva os últimos relatos com seus limites.

## Continuidade

O procedimento vigente de cota/retomada está em [CONTRIBUTING.md](../CONTRIBUTING.md). Não reutilizar percentuais, horários ou autorizações operacionais de checkpoints antigos. Ao retomar outra unidade, consultar Git, PRs, CI e serviço reais antes de agir.
