# Resultado da unidade UI/UX desktop

## Referência e isolamento
- Repositório: `renato-lucindo/base-do-basquete-next`.
- Base: `codex/reaproveitar-elenco` em `260713c138cc8595322d76102702325d90f08901`.
- Head: `codex/ui-ux-desktop`; PR draft [#33](https://github.com/renato-lucindo/base-do-basquete-next/pull/33).
- O arquivo orientador `HANDOFF-UI-UX-OUTRO-AGENTE.md` foi lido remotamente na branch do banco, sem incorporar seus commits à branch de UI.
- Não houve mudanças em Supabase, migrations, RLS, API, Worker, Auth, cálculo da súmula, matching, publicação, PDFs, CI ou dependências. Não houve deploy ou operações com dados humanos. A branch de banco permaneceu intocada.

## Mudanças implementadas
1. `src/games/sheet-action-history.tsx` e `sheet-workspace.css`: eventos do histórico em colunas adaptáveis à largura disponível. Os mesmos filtros, a distinção de cor por quarto, a sequência, as anotações e os botões Editar/Excluir continuam acessíveis. Grupos sem eventos deixam de consumir espaço.
2. `src/games/sheet-workspace.tsx`: confirmação de exclusão antes expandida na página substituída por `AdminDialog` nativo do site, com fundo inerte, texto contextual, cancelamento por botão/Escape e retorno do foco ao lançamento após excluir. A remoção continua sujeita a `deleteAction`, `mutate`, desfazer/refazer e persistência existentes.
3. `src/competition/screen.tsx`: remoções locais de temporadas/disputas não salvas passam por confirmação modal. O texto explicita que a alteração só será enviada após Salvar campeonato; a referência usa IDs estáveis e preserva a restrição de não remover itens já salvos.
4. Campos/filtros da súmula receberam redução de margens internas e espaçamento, preservando tamanhos de fonte legíveis e crescimento de texto.

## Testes e capturas
- Alterados `tests/sheet.spec.ts`, `tests/sheet-desktop.spec.ts` e `tests/competition.spec.ts`.
- Casos previstos: exclusão/cancelamento via Escape, exclusão com desfazer, confirmação de temporada/disputa, ausência de remoção antes da confirmação e duas larguras de viewport.
- Capturas **depois**: `dist/ui-ux-captures/sheet-history-after-1366x768.png`, `sheet-history-after-1920x1080.png`, `competition-removal-after-1366x768.png` e `competition-removal-after-1920x1080.png`. São geradas por Playwright com fixtures, sem registros reais; quando a CI concluir com sucesso, serão incluídas no artefato `prototipo-<SHA>` da execução.
- Capturas **antes** do mesmo estado ainda não obtidas, pois o ambiente de chat não permite clonar/executar a base nem acessar o preview privado. Reproduzir a fixture na base indicada, com os mesmos viewports, antes de atestar comparação pareada. Não utilizar screenshots de outro commit/estado como se fossem desta validação.
- Execução local indisponível: o checkout GitHub via conector foi possível, mas `git clone`/npm no executor local falharam devido ao bloqueio de rede e o Node local é 22, inferior ao Node 24 exigido. Por isso, não há resultado local de build, gate ou Playwright.
- CI da branch: verificar [GitHub Actions](https://github.com/renato-lucindo/base-do-basquete-next/actions?query=branch%3Acodex%2Fui-ux-desktop) por SHA. Execuções iniciais tiveram `format:check` com falha (lint aprovado); os ajustes de formatação posteriores ainda precisam de comprovação definitiva. Não declarar PASS por haver apenas testes escritos.

## Limites e pontos para revisão
- Alterações de navegação com rascunho não salvo ainda usam `window.confirm` por contrato síncrono de guards: converter para modal exigiria coordenação de estado de navegação para não perder a proteção. Esta é uma candidata identificada, **não** convertida.
- A área pública, parser, PDFs e workflows não fazem parte desta unidade. Os componentes administrativos já compactados existentes foram mantidos, não reescritos.
- Verificar visualmente linhas extensas de histórico, diálogos longos, contraste, zoom e foco em 1366×768 e 1920×1080; cobertura automatizada não equivale a avaliação WCAG completa.
- Não há alterações locais não commitadas conhecidas: escrita exclusivamente por API GitHub em branch separada; nenhuma pasta de outro agente foi acessada.

## Próximo passo
Acompanhar a CI por SHA, resolver qualquer falha sem relaxar testes, obter capturas antes/depois reais e revisar a compactação com o responsável. Só integrar após a validação coordenada com a branch de banco, sem mesclar a PR automaticamente.
