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

As primeiras execuções da CI reprovaram somente na formatação.
Consultar o run correspondente ao commit final para resultado efetivo.
Não afirmar sucesso sem conclusão do gate e dos navegadores.

## Capturas

Os testes gravam imagens após a mudança em `dist/ui-ux-captures/`.
A CI deverá incluí-las no artefato `prototipo-SHA` após sucesso.

Arquivos:

- `sheet-history-after-1366x768.png`
- `sheet-history-after-1920x1080.png`
- `competition-removal-after-1366x768.png`
- `competition-removal-after-1920x1080.png`

Capturas anteriores da mesma fixture não foram produzidas neste chat.
Precisam ser reproduzidas na base citada antes de uma comparação
antes/depois validada. Não tratar imagens de outro estado como equivalentes.

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
