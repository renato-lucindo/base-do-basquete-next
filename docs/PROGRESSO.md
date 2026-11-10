# Progresso atual

Atualizado em 10/11/2026. Unidade ativa: lista pública de Jogos, com protótipo aceito e PR77 aberta. Pedido posterior autorizou publicar somente um Worker PR77 sem Access. Merge, deploy no principal e publicação de dados não foram autorizados.

## Unidade e evidências

- Branch `codex/jogos-publicos-lista`, criada de `origin/main` **91f11fb** em worktree gerenciado isolado. Implementação material **ce6c4356f6ba0513827578491f8412f526a76c7d**; o commit posterior deste checkpoint é documental.
- Formato centralizado em todas as larguras; número/data/horário no topo, confronto, fase/série e local. W.O. é texto junto à fase, derivado de decisão confirmada. Lista completa, busca, contagem, vazio e ausência versus zero preservados; sem links nos confrontos.
- Gate consolidado **PASS/exit 0** no conteúdo material: 804 unitários, 11 transporte, 15 banco isolado, 35 Worker/HTTP e teste dos quatro PDFs; lint, formato, tipos, builds, fronteira cliente e segredos aprovados. 50 cenários pertinentes de browser aprovados, incluindo quatro repetições focais de expectativas atualizadas. Detalhes e limites em [VALIDACAO-JOGOS-PUBLICOS.md](VALIDACAO-JOGOS-PUBLICOS.md).
- [PR77](https://github.com/renato-lucindo/base-do-basquete-next/pull/77), fonte **4b0026263d131da9f2fbe38138d933ebdc49bdae**: [CI42868504280](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42868504280) **7/7 SUCCESS**, incluindo validate. Este checkpoint posterior é documental; conferir sua CI na mesma PR antes de eventual integração. Revisão pelo autor, sem parecer independente adicional.

## Execução e preservação

Projeto executado em http://127.0.0.1:5186/publico.html#f2200000-0000-4000-8000-000000000090?secao=jogos via `preview:public`: código real com API local de fixtures, sem banco, credenciais ou publicação. Preview local preservado. Worker remoto exclusivo **base-do-basquete-next-pr77** publicado por autorização posterior, sem Access, fonte **4b00262**, versão **42d37a81-7ce7-45b3-aecc-2e952f0c6255**,100%. [Aba Jogos](https://base-do-basquete-next-pr77.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96?secao=jogos). Smoke HTTP/36assets/26jogos PASS; APIs privadas401. Sessões e limitador próprios; banco dev compartilhado, sem DDL/DML ou publicação de dados. Outros Workers inalterados. [Evidências do deploy](evidencias/2026-11-10-worker-pr77.md).

`npm ci` foi interrompido por falta de espaço. Instalação parcial desta unidade preservada em `.preview-artifacts/npm-incomplete` após rejeição da exclusão pela política automática; dependências diretas compatíveis conferidas e reutilizadas por junction. Artefatos de execução e dependências não entram no commit.

Checkout principal `sync/trabalho-casa` preservado: alteração humana em CONTRIBUTING.md, `.agents/skills/web-design-guidelines/` e `skills-lock.json`. Nenhum outro worktree/branch alterado. Contexto único da integração anterior das PRs75/76 preservado no [histórico](../historico/progresso/2026-11-10-antes-jogos-publicos.md).

## Próximo passo

Validar visualmente a aba Jogos no Worker PR77 sem Access e conferir a CI documental da mesma PR. Controle de navegador local indisponível nas configurações Work; smoke HTTP aprovado. Integrar ou publicar no serviço principal somente mediante autorização própria do responsável; não iniciar uma branch dependente ou alterar dados de produção.
