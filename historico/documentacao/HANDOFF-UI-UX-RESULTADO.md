# Resultado UI/UX desktop — Base do Basquete

## Base e isolamento

Repositório: `renato-lucindo/base-do-basquete-next`.

Base: `codex/reaproveitar-elenco`,
commit `260713c138cc8595322d76102702325d90f08901`.

Branch: `codex/ui-ux-desktop`.

PR draft: https://github.com/renato-lucindo/base-do-basquete-next/pull/33

O handoff original foi consultado na branch de banco, sem merge.

Não houve alteração de migrations, Supabase, APIs, Auth, matching, RLS,
Worker, funções de cálculo, regras de publicação, PDFs ou dependências.
Não houve deploy, acesso a dados reais ou alterações na branch do banco.

## Mudanças

- `sheet-action-history.tsx`: organiza ações em colunas.
- `sheet-workspace.css`: torna campos proporcionais e reduz espaçamentos.
- `sheet-workspace.tsx`: confirmação modal ao excluir ação.
- `competition/screen.tsx`: confirmação modal para remover
  temporadas e disputas não salvas.
- Os filtros, o histórico, desfazer/refazer e os contratos foram mantidos.

A remoção em campeonato altera o rascunho local somente após
confirmação. A gravação continua dependente de Salvar campeonato.

## Testes

Arquivos de regressão modificados:

- `tests/sheet.spec.ts`
- `tests/sheet-desktop.spec.ts`
- `tests/competition.spec.ts`

Casos novos cobrem Escape, cancelar, confirmar e distribuição horizontal
das ações nos tamanhos 1366×768 e 1920×1080.

Verificação por commit:
https://github.com/renato-lucindo/base-do-basquete-next/actions?query=branch%3Acodex%2Fui-ux-desktop

A sessão de chat não dispõe de clone executável: o acesso por Git foi
bloqueado por DNS, e o Node local é 22, abaixo do mínimo 24.
O trabalho foi gravado pelo conector GitHub.

O código foi validado no commit `5b7985562fc8bc8d8b0004d0f0986315cae1812c`.

- [CI da implementação](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40576476229):
  gate aprovado; Vitest 573 testes aprovados; Playwright 416 aprovados,
  68 ignorados, zero falhas.
- [CI da referência](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40576484455):
  gate aprovado; Vitest 573 testes aprovados; Playwright 414 aprovados,
  68 ignorados, zero falhas.
- A nova cobertura acrescenta dois casos de navegador aprovados.
  A aprovação automatizada não dispensa aceite visual humano.

As falhas de formatação de execuções intermediárias foram corrigidas.
A configuração temporária de diagnóstico foi restaurada antes do gate
aprovado.

## Capturas

As capturas foram produzidas com a mesma fixture Playwright nas
resoluções 1366×768 e 1920×1080, usando somente dados sintéticos.

**Antes:** branch auxiliar `codex/ui-ux-desktop-baseline`, derivada
diretamente do commit-base. Modifica somente um teste de captura;
não altera componentes ou CSS. A
[execução 40576484455](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40576484455)
publicou o artefato `prototipo-4e78aef618e459cd535caed0b436e8fa64517c5a`,
com quatro PNGs:

- `sheet-history-before-1366x768.png`
- `sheet-history-before-1920x1080.png`
- `sheet-delete-before-1366x768.png`
- `sheet-delete-before-1920x1080.png`

**Depois:** commit validado `5b7985562fc8bc8d8b0004d0f0986315cae1812c`.
A [execução 40576476229](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40576476229)
publicou `prototipo-5b7985562fc8bc8d8b0004d0f0986315cae1812c`,
com seis PNGs:

- `sheet-history-after-1366x768.png`
- `sheet-history-after-1920x1080.png`
- `sheet-delete-after-1366x768.png`
- `sheet-delete-after-1920x1080.png`
- `competition-removal-after-1366x768.png`
- `competition-removal-after-1920x1080.png`

As imagens brutas foram conferidas: dez ações passam de dez linhas
verticais na referência para duas linhas com cinco ações na proposta.
A exclusão anteriormente revelava uma confirmação expandida abaixo
do histórico; agora apresenta diálogo modal centralizado. A evidência
de campeonatos mostra a remoção de disputa também em diálogo.

## Limites e próximo passo

A saída de formulários com rascunho ainda usa confirmação nativa
`window.confirm`. Os guards são síncronos; substituir esse fluxo
depende de mudança coordenada no controle de navegação.

Conferir visualmente layout, texto ampliado, contraste, teclado e foco.
Testes automatizados não comprovam conformidade WCAG completa.
A consolidação com a branch de banco deverá ocorrer separadamente.

Não existem mudanças não commitadas conhecidas nesta unidade,
pois os arquivos foram modificados somente pelo conector GitHub.
Não houve operação no checkout original do responsável.
