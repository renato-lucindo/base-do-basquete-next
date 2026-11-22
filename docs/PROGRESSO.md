# Progresso atual

Atualizado em 22/11/2026. Confira Git/PR/CI reais antes de retomar. O resumo anterior foi preservado integralmente em [histórico](../historico/progresso/2026-11-22-antes-perfis-equipes.md), incluindo as outras unidades e seus serviços.

## Perfis de equipes — WIP

- HTML revisado aceito e implementação autorizada em 22/11/2026. [Requisitos](design/PERFIS-EQUIPES.md), [HTML](design/prototipos/perfil-equipes-aceito.html), [plano](PLAN-PERFIS-EQUIPES.md).
- Branch `codex/perfis-equipes`, base `824a3d59da5323202d869a4d93a1038bcd377044`; worktree `C:/Users/12405304716/.codex/worktrees/perfis-equipes/Base do Basquete-v1`. O commit WIP deste checkpoint é identificado por `git log -1`. Ainda sem PR desta unidade; criar uma única draft desta branch após conferir a composição na retomada.
- Implementação inicial dos dois modos em `equipe.html`, composição de APIs públicas atuais, campanhas/jogos/pódios, tabelas embutidas e consulta de jogadores por inscrição. Busca global aponta ao perfil geral. Sem migration nova; dados fictícios só na referência e testes.
- Evidências focais: `npx vitest run src/team-profile src/public-ui/navigation.test.ts`: **20 PASS**; `npx playwright test tests/team-profile.spec.ts --workers=1`: **2 PASS**, desktop/celular; `npx tsc --noEmit`: **PASS**. ESLint focal passou antes das últimas mudanças de navegação; Prettier executado nos arquivos alterados. Ajuste textual posterior corrigiu nome da competição nas conquistas e ainda precisa de conferência visual.
- **Incompleto:** fixture do browser simula classificação ausente. Falta provar classificação completa/fase/grupo sem perder o ID da equipe, privacidade/prévia, erro/paginação, duas inscrições, busca/retorno e regressões da interface substituída. Faltam comparação visual, revisão final, gate e CI. Os testes iniciais não validam integralmente a entrega.
- Conferir: entradas sem resultado ainda direcionam à lista; filtros entre abas e retorno; restauração de contexto do elenco no celular; legendas somente das colunas visíveis e sem duplicação. O novo parâmetro `registrationId` de estatísticas é aplicado antes da agregação e validado na rota.

## Pausa por cota

- Ferramenta oficial: **85% usados / 15% restantes** na janela de 5 h e **21% restante** na semanal. Reset Unix `1795372703`: 22/11/2026 às 15:38:23 de Brasília. Nenhum reset/crédito consumido.
- Automação oficial **`retomar-perfis-de-equipes`**, ativa e confirmada por `automation_update view`, execução única hoje às **15:40:23 de Brasília**, reset + 2 min. A primeira criação com DTSTART foi recusada; a segunda sem DTSTART foi criada. Atualizar esta mesma automação se outra janela impedir; pausar ao concluir/cancelar.
- Próximo passo: consultar cota, status/SHA e PRs neste worktree e continuar a mesma unidade. Priorizar fixture válida de classificação e regressões antes do gate/PR/CI.

## Serviços e trabalho alheio

- Sem deploy, migration, DDL ou publicação de dados nesta unidade. Versões dos serviços não consultadas. Nenhuma CI deste WIP executada ou declarada aprovada. PR #88 de limpeza de referências, em outra branch, preservada.
- Checkout original `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Não incorporados ao WIP. O resumo antigo desse checkout estava desatualizado; a implementação parte de `origin/main`.
- CONTRIBUTING vigente exige avaliação da UI no Worker autorizado e novo aceite da implementação antes de integrar. Aceite do HTML não comprova deploy ou aceite do Worker. Conferir autorização concreta ao chegar a essas operações.
