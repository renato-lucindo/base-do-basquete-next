# Progresso atual

Atualizado em04/11/2026. [Plano da reforma](design/REFORMA-UIUX.md) · [Validação pública](design/VALIDACAO-PUBLICO-UIUX.md) · [Unidade anterior](../historico/progresso/2026-11-04-pr52-integrada.md).

## Autorização e sequência

Piloto aceito; o responsável instruiu **“Realize todas essas etapas na sequencia”**: piloto/perfil → público real → busca global no servidor → administração → validação/preparação da liberação. Prosseguir sem nova confirmação da implementação autorizada. Uma unidade/PR por vez, integrando antes da dependente. Deploy, DDL real e publicação de dados permanecem operações distintas, sem execução/autorização inferida por merge. Preservar a súmula vigente e dados humanos.

## Integrações concluídas

- PR51: merge9cb3660fc19b74e322fb730643548901b07470a5; CI do HEAD41840654483 e da main41848486075 SUCCESS confirmadas. Perfil contínuo real; súmula atual preservada.
- [PR52](https://github.com/renato-lucindo/base-do-basquete-next/pull/52): merge **`834693f07069c025af62013247db57f21ebaf5c5`**, HEAD106765936de496b916c45773aac047e36f9001d7, material91b5fe1. CI [41863784899](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41863784899) SUCCESS no HEAD exato; avisos apenas de runtime das actions/ubuntu-latest. Revisão do autor, reviews/threads vazias, sem parecer independente. Gate local693unitários, transporte7, banco13, Worker/HTTP29, PDF1; browsers157PASS/7skips prévios+4PASS de alinhamento. Cabeçalho/tabelas/agenda/filtros/retorno públicos integrados.
- CI push do merge52: [41867956743](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41867956743) **SUCCESS**, conferida pelo SHA834693f. Nenhum deploy/DDL/publicação executado.

## Unidade ativa — busca global

Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch **`codex/busca-global`** criada diretamente de origin/main834693f após integrar52. Nenhuma PR aberta na consulta inicial. Recuperar HEAD por Git. O checkpoint local da espera anterior foi preservado e reconciliado nesta unidade.

Implementar consulta própria sobre fontes explicitamente publicadas: jogadores por participações/perfil/honrarias, equipes por identidade com participações públicas e campeonatos/disputas. Normalização e ranking exato/início/trecho antes de limite/paginação; sugestões5/grupo, filtros, debounce300ms, cancelamento, teclado, erro/vazio e retorno. Não carregar catálogo no browser para simular busca global, nem publicar cadastros por existência. Migrations novas via CLI e testes em PGlite isolado; nenhuma aplicação no banco real nesta preparação.

Implementados RPC/contratos/endpoint anônimo e autocomplete/resultados; provas em [VALIDACAO-BUSCA-PUBLICA.md](design/VALIDACAO-BUSCA-PUBLICA.md). SQL/provider4PASS, Workerd1PASS, browsers106PASS antes dos ajustes visuais finais +32PASS +44PASS da revisão final +10PASS de capturas finais. Gate final em execução, após4PASS SQL/provider e1PASS Workerd. Migration apenas local, sem aplicação real. Próximo passo: concluir revisão, capturas e gate; abrir draft com SQL exato para revisão da operação real necessária, sem integrar função ausente. Consulta antiga corta jogadores em50 e filtra equipes no cliente. Skill Supabase e ui-ux-pro-max aplicadas, Workers best practices para transporte; docs/design e fontes oficiais consultados. Administração começa somente após concluir/integrar esta unidade.

## Preservação e continuidade

Checkout humano `sync/trabalho-casa` com CONTRIBUTING.md modificado, web-design-guidelines/skills-lock.json não rastreados preservado; demais worktrees intocados. Previews locais4189/5177 herdados, sem mudança de serviço remoto. Mesma automação `retomar-piloto-uiux-pr-51` mantém a continuidade da sequência; não duplicar nem parar após um marco.

Última cota real23% restante/5h,38% semanal, reset1793823611; medir antes de gate/outra unidade. Aos15% restante, checkpoint e atualização da mesma automação para reset observado+2min, sem créditos/reset manual.
