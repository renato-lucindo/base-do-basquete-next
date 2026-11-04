# Progresso atual

Atualizado em 03/11/2026. Estado desta unidade conferido em Git/GitHub; histórico não autoriza execução. [Escopo](MATRIZ-ESCOPO.md) · [Roadmap](ROADMAP.md) · [Reforma de UI/UX](design/REFORMA-UIUX.md).

## Unidade ativa — piloto da reforma de UI/UX

- Branch `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478` (`origin/main` após PR50). Worktree: `C:/Users/12405304716/.codex/worktrees/reforma-uiux`. Implementação `298e1917ba3347a67b8be8a2aa7c4a9aa9a5a732`, publicada na [PR #51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51), **Draft aguardando aceite visual**. Checkpoint posterior somente documental; conferir HEAD real com Git.
- Responsável autorizou implementar o plano em 03/11: público primeiro no celular, admin desktop, tema claro/azul, busca global e tabelas/formulários compactos. Escolheu **piloto navegável antes da expansão**, com aceite visual humano. Contrato acima; nenhuma unidade dependente iniciada.
- Componentes compartilhados isolados e [piloto autocontido](design/prototipos/reforma-uiux/Piloto%20UIUX.html): jogadores, autocomplete, perfis, Jogos ordenável, Informações proporcional e equipes/elenco 30/70 com 12 atletas. Fixtures; salvamento só em memória. Não alteradas rotas reais, APIs, migrations ou serviços.
- Provas focais: tipagem PASS, 4 unitários PASS, nove cenários Playwright PASS, oito capturas e axe em oito telas/menus/diálogos nas três resoluções sem violações selecionadas. Revisão do autor pelas skills na [validação](design/VALIDACAO-REFORMA-UIUX.md). Gate local PASS (689 unitários, transporte 7, banco isolado 13, Worker/HTTP 29 e PDF/workerd 1); design:verify completo PASS. Refinamento final apenas de densidade CSS recebeu novamente os nove cenários/tipagem do piloto e verificações de linhas visíveis. CI da implementação **SUCCESS**, [run 41745327850](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41745327850): gate completo e design PASS; **689 unitários, 551 browsers PASS / 109 SKIP**. Prova do SHA acima, obtida diretamente do job/log. Esta atualização posterior é apenas documental e reutiliza esses artefatos; conferir CI do HEAD vigente antes de qualquer merge.
- Próximo passo: responsável avaliar [piloto local](http://127.0.0.1:4189/) ou HTML/capturas da PR #51 e confirmar o padrão visual. Retomar a mesma branch/PR para ajustes; após aceite, conferir revisão/CI do HEAD antes de integrar. Expandir às rotas reais somente após esse aceite e integrar esta unidade antes da dependente.

## Estado anterior e serviço

- PR50 conferida no GitHub como **mesclada**, merge `eff36fe0eda76962e6babbc4a9464a98c3dad478`; nenhuma PR aberta ao iniciar. Checkpoint herdado que ainda a tratava como aberta preservado no [histórico](../historico/progresso/2026-11-03-antes-piloto-uiux.md).
- Descrição atual da PR50 registra publicação em 03/11 às 19:48:43 de São Paulo: versão `35f5b882-70b1-48f7-8bb3-fda632bd458e`, deployment `09e26c1c-4e0e-46ea-8026-5d5c8a721d59`, origem `https://basedobasquete.com.br`. Registro consultado; serviço não inspecionado/publicado nesta unidade. Não extrapolar como smoke remoto novo.
- Nenhum deploy, DDL ou dado humano alterado. Publicação e migrations reais não fazem parte desta etapa. Preservar proteção dos previews e separar integração Git de operações remotas.

## Preservação e cota

- Checkout principal `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Nenhum outro worktree alterado.
- Cota oficial, última consulta após as verificações: 70% consumido na janela de 5h (**30% restante**) e 26% semanal consumido. Gatilho: **15% restante**, reset observado + dois minutos para a mesma retomada, conforme CONTRIBUTING.md. Nenhum reset/crédito consumido.
- Etapa entregue para aceite visual; não é pausa por cota. Nenhuma automação criada nem alterada a de outra conversa. Preview local HTTP 200, bytes idênticos ao HTML commitado; SHA256 `b27dc4e89f51a937dd66ea34fe5736add6c5b10999d18d43c895b05c8fbe927e`.
