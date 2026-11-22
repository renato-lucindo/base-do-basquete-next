# Progresso atual

Atualizado em 22/11/2026. Estado anterior preservado no [histórico](../historico/progresso/2026-11-22-antes-perfis-equipes.md).

## Perfis de equipes — implementação validada

- HTML revisado aceito e implementação autorizada em 22/11. [Requisitos](design/PERFIS-EQUIPES.md), [plano](PLAN-PERFIS-EQUIPES.md), [validação](design/VALIDACAO-PERFIS-EQUIPES.md).
- Branch `codex/perfis-equipes`, base `824a3d59da5323202d869a4d93a1038bcd377044`, [PR #89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), base main. Código executável validado em `cfee448fdd36cd288dd4a7861c643abb6a07d442`; atualização posterior somente documental. Worktree `C:/Users/12405304716/.codex/worktrees/perfis-equipes/Base do Basquete-v1`.
- Implementados perfis geral e da inscrição, classificação/coletivos completos, jogadores por inscrição, campanhas/status, recentes por ano, jogos sem Resultado, conquistas históricas e legenda expandida. Busca, aliases antigos, URL e retorno preservados.
- [CI do código](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45052047536) **PASS**, sete checks incluindo validate: 848 testes unitários/179 arquivos; Chromium desktop 502 PASS, mobile 377 PASS/125 skips preexistentes da matriz; WebKit 44 PASS; design e gate completo (banco local, transportes, builds, runtime Worker/PDF, fronteira cliente e segredos). Conferir checks do HEAD documental atual na PR antes de integrar; fontes executáveis permanecem idênticas ao SHA aprovado.
- Corrigidas na mesma unidade as falhas da primeira CI: seletores antigos, alvos de toque na escolha da inscrição e fixtures que interceptavam outras páginas ou excediam 100 jogos/página. Reexecuções focais passaram; nenhum teste desativado ou timeout ampliado. Ensaios locais gerais interrompidos, inclusive um por falta temporária de disco, não são apresentados como aprovação. Evidência completa na CI acima.
- Conferidos geral/jogadores/escolha de inscrição com axe, retorno mobile com foco, classificação por grupo após recarga e reflow 320 px/texto200%; larguras 390/1366/1440/1920. Sem mudança executável após a CI aprovada; esta atualização documental reutiliza essas provas.

## Próximo passo e autorizações

- Responsável autorizou **novo preview separado** em 22/11. Alvo preparado: `base-do-basquete-perfis-equipes-preview.renato-lucindo-jr.workers.dev`, SHA `fc701f8`. Build e dry-run PASS, 41 assets. Transporte local de avaliação somente leitura, sem DO/migration, em `.preview-artifacts/perfis-equipes/`; não integra o código do produto. Ainda **não publicado**.
- Bloqueio real: app Cloudflare pede reautenticação. Wrangler local autenticado lê Access, mas POST de criação da aplicação de proteção retorna **403 / auth.forbidden**; nenhuma proteção/Worker criada. Não publicar sem proteção. Solicitada reconexão do app Cloudflare. Depois, criar Access restrito ao responsável, verificar política, publicar no novo alvo, testar APIs/tela e enviar link para aceite visual. Autorização não cobre alterar serviços atuais ou merge.
- CI do HEAD `fc701f8`: [45053481697](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45053481697) PASS nos sete checks. Fontes executáveis continuam idênticas a `cfee448`.
- Sem deploy, migration, DDL ou publicação de dados nesta unidade; serviços remotos não alterados. Não integrar ou publicar por causa do aceite do HTML, da CI ou desta retomada.
- Heartbeat existente `retomar-perfis-de-equipes`: pausar quando restar somente ação humana. Se a CI do checkpoint documental ainda estiver pendente ao encerrar, atualizar a mesma automação para conferir a PR/HEAD reais; não criar duplicata. Última cota real: 73% usados/27% restantes na janela 5h, reset Unix `1795385440`; nenhum reset manual/crédito consumido.
- PR #88 em outra branch e checkout original `sync/trabalho-casa` preservados. As alterações humanas em CONTRIBUTING e skills locais não foram incorporadas nesta unidade.
