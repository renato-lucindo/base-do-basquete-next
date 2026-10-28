# UI/UX desktop — etapa 3 (revisão incremental)

## Referências consultadas

- Figma Make: `Improve Player Profile and Game Details UI`, visual de perfil e detalhes de partida (protótipo de dados fictícios).
- Especificação visual vinculada ao Make: `plans/identidade-visual-base-do-basquete.md` (Sports Data Minimalism, azul #075FCA, tinta #101827, superfícies brancas, divisores e WCAG AA).
- Repositório histórico `renato-lucindo/base-do-basquete` está arquivado; não deve ser usado como alvo de commits.
- Produto ativo: `renato-lucindo/base-do-basquete-next`, consolidado na PR #33.

## Recorte implementado

- Estilos somente desktop, `min-width: 1000px`, sobre `.compact-pilot`; sem mudanças no mobile.
- Estados `:focus-visible` para navegação, ações e campos de formulário; destaque de linha por `:focus-within`.
- Cabeçalhos de tabelas com contraste mais forte, divisores consistentes e valores tabulares.
- Importação textual compacta: largura mínima de 1900px para 1220px no desktop quando dentro de `.compact-pilot`, redução de espaçamentos; preservada a rolagem horizontal quando os dados não couberem.
- Sem mudança em React, API, RLS, banco, regras, validações ou contratos.

## Limites e validação

- Esta primeira unidade cobre a base visual das tabelas e da importação; **não equivale** à conclusão da padronização de todos os formulários nem à auditoria WCAG.
- Confirmar montagem real de `.compact-pilot` sobre os fluxos de importação em capturas de 1366×768 e 1920×1080.
- Conferir casos de tabelas extensas, nomes longos, zoom de 200%, navegação Tab/Shift+Tab e perda de foco.
- Executar `npm run gate` e `npm run test:e2e` no SHA da branch; não declarar PASS sem consultar o workflow.
- PR deve continuar draft, sem merge ou deploy.

## Próximas unidades

1. Conferir por capturas reais a geometria das telas de Campeonatos, Jogos, Equipes, Pessoas e Regulamento, com a mesma fixture antes/depois.
2. Corrigir inconsistências comprovadas em cabeçalhos, formulários, tabelas e fluxos de edição, preservando controles existentes.
3. Validar foco de diálogos, contraste e reflow 200%; não substituir guards síncronos sem revisão de contrato.
4. Consolidar feedback de operações sem duplicar avisos nem ocultar erros persistentes.

## Continuidade sem empilhamento de PRs

- As implementações das PRs #33, #35 e #36 foram unificadas na branch `codex/ui-ux-desktop` após verificar ancestralidade e commits.
- Manter **somente a PR #33** como PR de revisão/merge; encerrar #35 e #36 como substituídas, sem merge.
- Não executar merge na branch base nem alterar banco, dados humanos ou configuração de deploy.
- Para a área de importação, acrescentar capturas automatizadas e verificação da largura mínima computada no desktop.

## Evidência visual na CI

- O workflow preserva os mesmos gates e publica capturas sintéticas geradas pelos testes de desktop como artefato `evidencias-uiux-desktop-SHA`.
- Rotas cobertas: Jogos, Equipes e elenco, Regulamento, importação de texto, edição e histórico de súmula e confirmadores já testados; as capturas têm resolução 1366×768 e 1920×1080 quando definida pelo teste.
- Apenas arquivos `.preview-artifacts/*after*.png` são incluídos no artefato; não há coleta de dados humanos, credenciais ou tráfego autenticado do preview.

## Continuação pós-consolidação — reflow, foco e importação (27/10/2026)

- O `AdminDialog` e os `AdminToast` já existiam na PR #33; não foram reimplementados.
- A súmula recebeu reflow de duas para uma coluna em largura CSS estreita em ambiente desktop com ponteiro fino e hover, além de rolagem horizontal local para a tabela ao vivo, foco visível e acesso pelo teclado (`sheet-workspace.css`, `sheet-live-tables.tsx`).
- A região rolável da importação ganhou indicador explícito de foco em ambientes desktop com mouse (`text-import/workspace.css`).
- Os testes Playwright de `sheet-desktop.spec.ts` simulam a área útil aproximada de zoom 200% em 1366×768 e 1920×1080 usando viewports 683×384 e 960×540, validando empilhamento de equipes, rolagem, Tab/Shift+Tab em modal e restauração do foco com Escape.
- `admin-compact.spec.ts` verifica rolagem horizontal por teclado na importação nessas larguras, indicador de foco, tratamento de nome longo e aguarda carregamento estável antes de capturar a conferência.
- As 22 capturas da execução anteriormente aprovada `40598292003`, commit `0099fad7`, foram baixadas e inspecionadas como referência. Uma delas mostrava estado transitório “Carregando inscrições…”; a espera do teste foi ajustada. **Essas capturas não validam os novos commits.**
- **Pendente:** obter o resultado de `npm run gate` e `npm run test:e2e` no novo HEAD, verificar as novas imagens e realizar teste de zoom 200% real no navegador. A simulação por viewport não substitui o teste de zoom real, nem comprova WCAG integral.
- O conector GitHub consultado só expõe consulta de workflow por SHA vinculada a eventos de pull request; o `ci.yml` atual dispara em `push`. Sem ID do novo run, nenhuma aprovação foi presumida.
- Manter a PR #33 aberta em Draft. Nenhum merge, deployment, migration ou alteração de banco foi solicitado ou feito nesta unidade.
