# Progresso atual

Atualizado em 10/11/2026. Unidade ativa: lista pública de Jogos, com protótipo aceito e autorização para implementar, executar localmente e abrir uma PR. Merge, deploy e publicação de dados não foram autorizados.

## Unidade e evidências

- Branch `codex/jogos-publicos-lista`, criada de `origin/main` **91f11fb** em worktree gerenciado isolado. Implementação material **ce6c4356f6ba0513827578491f8412f526a76c7d**; o commit posterior deste checkpoint é documental.
- Formato centralizado em todas as larguras; número/data/horário no topo, confronto, fase/série e local. W.O. é texto junto à fase, derivado de decisão confirmada. Lista completa, busca, contagem, vazio e ausência versus zero preservados; sem links nos confrontos.
- Gate consolidado **PASS/exit 0** no conteúdo material: 804 unitários, 11 transporte, 15 banco isolado, 35 Worker/HTTP e teste dos quatro PDFs; lint, formato, tipos, builds, fronteira cliente e segredos aprovados. 50 cenários pertinentes de browser aprovados, incluindo quatro repetições focais de expectativas atualizadas. Detalhes e limites em [VALIDACAO-JOGOS-PUBLICOS.md](VALIDACAO-JOGOS-PUBLICOS.md).
- CI remota: ainda não iniciada no momento deste checkpoint, anterior ao primeiro push. Conferir os checks do SHA atual na [PR da branch](https://github.com/renato-lucindo/base-do-basquete-next/pulls?q=is%3Apr+head%3Acodex%2Fjogos-publicos-lista); resultado local não substitui CI. Revisão pelo autor, sem parecer independente adicional.

## Execução e preservação

Projeto executado em http://127.0.0.1:5186/publico.html#f2200000-0000-4000-8000-000000000090?secao=jogos via `preview:public`: código real com API local de fixtures, sem banco, credenciais ou publicação. Serviço remoto não consultado nem alterado; nenhum DDL, DML ou deploy.

`npm ci` foi interrompido por falta de espaço. Instalação parcial desta unidade preservada em `.preview-artifacts/npm-incomplete` após rejeição da exclusão pela política automática; dependências diretas compatíveis conferidas e reutilizadas por junction. Artefatos de execução e dependências não entram no commit.

Checkout principal `sync/trabalho-casa` preservado: alteração humana em CONTRIBUTING.md, `.agents/skills/web-design-guidelines/` e `skills-lock.json`. Nenhum outro worktree/branch alterado. Contexto único da integração anterior das PRs75/76 preservado no [histórico](../historico/progresso/2026-11-10-antes-jogos-publicos.md).

## Próximo passo

Conferir a CI remota e revisar a PR desta mesma unidade. Integrar ou publicar somente mediante autorização própria do responsável; não iniciar uma branch dependente ou alterar dados de produção.
