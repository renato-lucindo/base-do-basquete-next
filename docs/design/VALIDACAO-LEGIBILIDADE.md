# Legibilidade ampliada — validação

Unidade autorizada em 06/11/2026, [PR #66](https://github.com/renato-lucindo/base-do-basquete-next/pull/66), base `a3cd9745956a1d32709e0a4d35a9f3d0d9c3d691`. [Plano](../superpowers/plans/2026-11-06-legibilidade-rotulos-interface.md). O corpo da PR registra os resultados finais da CI do candidato e do SHA integrado, além do source/deployment efetivamente entregue no preview. A preparação local não constitui deploy.

## Comportamento implementado

Fonte raiz em 150% a partir de 640 CSS px; 100% até 639 px. As oito entradas reais compartilham essa regra. Texto, dimensões relacionadas e ícones usam unidades relativas; breakpoints e bordas de 1 px permanecem. A ampliação adicional do navegador continua disponível. Tabelas conservam rolagem interna, cabeçalhos e identificação fixos.

Na disputa, rótulos atuais usam o nome da inscrição da publicação mais recente, com desempate estável e antes do filtro de fase/fonte. Pesquisa conserva nomes anteriores e globais, sem dividir `IVV/Cetaf`. Formulários mantêm identidade global e inscrição em campos separados. PP% e 5F compartilham os textos Participação nos Pontos e Exclusões por cinco faltas. Títulos que apenas repetem a aba ficam semânticos; entidades/tarefas continuam visíveis e o foco retorna ao contêiner identificado.

## Revisão e regressões

Revisão autoral com `ui-ux-pro-max` e [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), fonte consultada em 06/11. Achados corrigidos:

- `src/statistics/reference/column-picker.tsx`: menu deslocado após redução de colunas; posição ancorada e limitada à viewport, com teste RED→GREEN.
- `src/public-ui/navigation.css`: marca/contexto comprimidos com texto ampliado; cabeçalho e contexto quebram linhas. A inspeção visual foi complementada por asserção de altura do contexto, pois ausência de overflow horizontal sozinha não detectava letras em coluna.
- `src/text-import/workspace.css` e `src/teams/screen.css`: palavras longas e links das abas escapavam em 320 px com texto/espaçamento ampliados. Quebra de palavras e limites flexíveis corrigidos, sem ocultar conteúdo.
- `src/team-statistics/public-page.tsx`: títulos redundantes e nome global repetido; títulos semânticos e foco na seção visível. Listas administrativas também apresentam uma denominação, preservando os formulários de edição.
- `src/statistics/simple-page.tsx`: resposta antiga podia restaurar filtro anterior; valida identidade/consulta atual antes de atualizar estado. Página corrigida pelo servidor agora encerra carregamento antes de canonicalizar a URL.
- `src/statistics/player-page.test.ts`: a fixture duplicava `scope=all` e anulava o recorte solicitado; corrigida. A busca por nome atual/histórico em fases diferentes foi efetivamente verificada e corrigida.

Axe continua executando suas regras. Em arbitragem, textos parcialmente cortados na borda rolável geravam contraste indecidível: conserva-se a análise integral e cada nó indecidível é reinspecionado visível, exigindo zero violações/indecidíveis. Não alegamos conformidade WCAG integral, leitura humana por leitor de tela, parecer independente ou teste físico de celular.

## Evidência verificável

- Gate local `npm run gate` no material `d43decd`: **PASS**, incluindo 731 unitários/153 arquivos, banco, HTTP/Workerd, build, limites do cliente e segredos. Log `.readability-gate-d43decd.log`. O último ajuste de CSS das abas é posterior; a CI do candidato final é a prova da composição completa.
- CI [42269664570](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42269664570), `d43decd`: gate, design e WebKit PASS; browsers falharam no link de aba a 320 px e numa expectativa antiga de foco. Ambas receberam correção focal, sem alterar timeouts, retries ou skips. Execuções anteriores e seus limites permanecem no [histórico](../../historico/progresso/2026-11-06-legibilidade-limite-excepcional.md).
- Focais: `.readability-final-consumers.log`, 57 PASS/11 skips preexistentes; `.readability-alias-green.log`, 16 unitários PASS. Testes novos de legibilidade cobrem os limites 639/640, 1920/1366/390/320, nomes, rótulos, foco e ampliação adicional. Regressão integral e estado final dos checks estão na PR; não somar execuções parciais como aprovação completa.
- Captura anterior real em 1920×1080: `.preview-artifacts/readability-real-before-1920.png`, mesma equipe AMPRL, 17 atletas, Por jogo, PPJ decrescente e 12 colunas da referência. Capturas finais do serviço e seus limites são entregues na conversa/PR.
- Baseline público das duas disputas, totais/médias, equipes e jogadores: `.preview-artifacts/readability-public-numbers-before-summary.json`, hash numérico `a476bdd57b0fedb9f78ee4f0df0ee5aa566edea74e7cc1cf2b06b377f29ece2a`. A comparação posterior exige igualdade dos números, ordem, IDs e versões; nenhum teste publica jogo humano.

Sem migration, DDL/DML ou mudança do formato das APIs. Preview UIUX é o único destino autorizado, após CI da PR e integrada. Principal, Access, segredos e bindings são comparados antes/depois. A preparação fixa explicitamente esse destino, mantém variáveis e não acrescenta migration de Durable Objects.
