# Validação da partida pública aceita

Implementação em `codex/partida-publica`, base `903dc9c`, código `a30349f5ac5c1b41ee24704651dfdaa7e1c53bdc`. Verificação local em Windows/Node 24, em 10/11/2026. Alterações documentais posteriores reutilizam essas provas quando o código permanece idêntico.

## Resultado e cobertura

- `npm run gate`: exit 0. Política de CI 11, unitários 763 em 163 arquivos, transporte 11, banco isolado 15, Worker/HTTP 34 e extração de quatro PDFs em workerd; lint, formato, tipos, builds, fronteira cliente e segredos aprovados.
- `npx playwright test tests/public-game-detail.spec.ts`: 14 casos aprovados em Chromium desktop/mobile. Elencos de 10/12 com 12 linhas; camisas 00 por último; preenchimento sem dados; apresentação normal de quem não entrou; máximos positivos/empates e totais nos seis recortes; zero conhecido e participação desconhecida; cinco faltas, GD antes da quinta e na quinta, sem antecipação. Cabeçalhos/legenda com definições compartilhadas e 2P/3P separados; parciais somente com pontos.
- Geometria e axe nos quatro tamanhos 1366, 1920, 320 e 390 px, inclusive diálogo aberto: zero violações detectadas. Teclado, retorno de foco, Escape, toque, tooltips, nomes longos, rolagem interna, colunas/linhas equivalentes e ausência de erros de página conferidos. Axe e inspeção do autor não constituem certificação WCAG integral.
- Zoom **nativo** de 200% em janelas 1366×768 e 1920×1080: CSS 675×336 e 952×492, `devicePixelRatio=2`, sem transbordamento da página; pares de linhas alinhados, coluna F alcançável, diálogo contido e retorno de foco. Capturas via CDP evitam o recorte incorreto de screenshots fullPage do Playwright com zoom nativo.

## Regressão e ocorrências

Regressão Chromium completa: 743 aprovados, 116 skips já existentes e três falhas de assertivas anteriores (ordem 0/00 e nome acessível de F). As assertivas foram atualizadas para o requisito novo; repetição focal nos dois projetos: três aprovados e um skip preexistente. Nenhum cenário foi dispensado, timeout ampliado ou retry acrescentado nesta unidade. A CI executa novamente a coleção completa no SHA final.

WebKit Windows: execução serial final **14 aprovados**, em 33,9 s. A execução anterior, concorrente com a regressão completa, excedeu 30 s em dois cenários de 390 px. Repetição isolada, sem alteração de código ou limites: ambos aprovados em 2,4/2,1 s. O WebKit macOS da CI fica registrado nos checks da PR.

Execuções anteriores foram interrompidas por falta de espaço no volume C. Artefatos e temporários dos browsers desta unidade foram direcionados ao volume Y. O gate foi repetido com TEMP local porque os repositórios Git temporários no volume de rede são recusados por ownership; não se alterou a configuração global de segurança do Git.

Teste de compatibilidade adicional: uma publicação legada pode validar LL no jogo inteiro sem corresponder ao período da penalidade. A projeção conserva essa regra oficial; não acrescenta uma rejeição de publicação válida por conveniência do recorte.

## Privacidade e ativação

Os testes SQL usam PGlite e fixtures descartáveis locais. A consulta nova lê somente snapshot público e documento da mesma versão imutável publicada. Alterar o rascunho não muda a resposta; documentos, identificadores internos, motivos e autorizações não são expostos. A consulta antiga e os snapshots permanecem intactos. PDF sem cobertura de quartos mantém filtros indisponíveis; ausência de eventos individuais nunca comprova ausência de participação.

Migration `20261110114500_public_game_detail.sql` **não aplicada remotamente**. Antes de ativar o novo provider em um serviço, aplicar e verificar essa migration no ambiente autorizado. Nenhum deploy, publicação de dados ou operação em banco real foi feito. Revisão do autor; sem parecer independente declarado. CI ainda não executada no momento desta redação; o resultado real do SHA final deve ser consultado nos checks da PR.

Logs ignorados no worktree: `.game-final-gate-green.log`, `.game-final-acceptance.log`, `.game-browsers-external-temp.log`, `.game-assertions.log`, `.legacy-detail-final.log`, `.game-webkit-final.log`. Capturas, traces e prova de zoom em `Y:/Codex-Validacao/partida-publica-20261110/`; são artefatos locais, não serviços publicados.
