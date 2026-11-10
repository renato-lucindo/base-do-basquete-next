# Lista pública de Jogos

Unidade de 10/11/2026, branch `codex/jogos-publicos-lista`, base `91f11fb`. Escopo autorizado: implementar o protótipo aceito, com formato centralizado também no desktop expandido e W.O. em texto junto à fase. Sem merge, deploy, DDL ou publicação de dados.

## Implementação

- Lista única, sem paginação ou links nos confrontos; busca compartilhável na URL, contagem e recuperação do vazio.
- Ordenação decrescente de datas/horários, desconhecidos ao final e desempate estável. Número oficial e slot da série independentes.
- Contexto da eliminatória vem da definição pública ou da identificação explícita do jogo; formato single não inventa “Jogo 1”.
- Campo público aditivo `walkover`, com padrão false para respostas anteriores, derivado exclusivamente do resultado confirmado do tipo wo. Não expõe motivo privado, não altera elegibilidade pública e não exige migration.
- Mesmo componente, tokens e cabeçalho reais, com dados fictícios isolados no preview. Exatamente duas equipes e um local possuem nome longo.

## Verificação

- Testes focais de modelo/contrato: 23 PASS, incluindo ordenação, ausência versus zero, busca da lista inteira, slot explícito e distinção de W.O. de decisões administrativas.
- Browser Chromium: 46 PASS na execução conjunta inicial; quatro expectativas antigas de estado/link foram atualizadas para o aceite atual e passaram na repetição focal. Total de 50 cenários pertinentes aprovados.
- Resoluções: 320, 390, 1366 e 1920 CSS px; 683 e 960 CSS px para reflow correspondente a 200% dos desktops. Sem sobreposição ou transbordamento. Não declarar este último como zoom nativo ou teste em dispositivo físico.
- Axe nas listas de 390 e 1366 px: sem violações nos critérios executados. Busca persistida após reload, Escape, limpeza com retorno de foco e navegação pública adjacente verificados.
- Capturas locais em `.preview-artifacts/games-<largura>-<projeto>.png`; inspeção visual do desktop expandido e celular realizada pelo autor.
- `npm run gate`: **exit 0**, 804 unitários/171 arquivos, 11 testes de política de CI, 11 de transporte, 15 de banco isolado, 35 Worker/HTTP e um teste com os quatro PDFs no workerd. Lint, formato, tipos, builds, fronteira cliente e segredos aprovados. CI remota ainda não iniciada antes do primeiro push; consultar os checks do SHA atual na PR.

A primeira amostra de browser foi rejeitada pelo contrato por conter horário sem data no último jogo. A fixture foi corrigida para data e horário ausentes, sem afrouxar o contrato, e passou a ser validada também pelo teste unitário. Nenhum timeout foi aumentado ou teste desativado.

## Execução local e limites

`PUBLIC_PREVIEW_PORT=5186 npm run preview:public` serve o código real com uma API local de fixtures, sem credenciais ou conexão com banco. URL da amostra: http://127.0.0.1:5186/publico.html#f2200000-0000-4000-8000-000000000090?secao=jogos.

`npm ci --ignore-scripts` falhou por ENOSPC. A instalação parcial desta unidade foi preservada em `.preview-artifacts/npm-incomplete`; a exclusão recursiva foi rejeitada pela política automática. O worktree reutiliza dependências locais por junction, após conferir todas as versões diretas contra package.json, sem instalar versões diferentes. Checkout principal, CONTRIBUTING.md humano, skills locais e demais worktrees preservados.

Revisão pelo autor, sem parecer independente adicional. As verificações automatizadas e a inspeção visual não constituem certificação integral WCAG. A CI da PR permanece obrigatória no SHA atual; não há autorização de integração ou publicação nesta unidade.
