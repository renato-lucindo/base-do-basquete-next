# Validação — tabelas mobile e cores públicas

Fonte de runtime: **917015bb1bd38494b5c4b47832efaf1a40b2112d**, PR89, branch codex/perfis-equipes.
O fechamento documental conserva o runtime; o HEAD real e o resultado obrigatório da CI ficam nos
[checks da PR](https://github.com/renato-lucindo/next/pull/89/checks), atualizados antes da entrega final.
[Matriz e decisões](../PLAN-TABELAS-MOBILE.md) · [provas](evidencias/2026-11-27-tabelas-mobile/).

## Resultado observado

- Jogadores e Elencos: sem coluna Camisa, número secundário após nome, zero/00 distintos e ausência sem travessão. Atleta varia com o maior nome exibido; somente a tabela rola quando necessário. Todas/Nenhuma e contagem do seletor correspondem às métricas; Total/Por jogo conservam alinhamento.
- Últimos jogos, Ver jogos e recordes: mesma linha compacta até639px, equipes com larguras iguais, nomes completos entre palavras e placar102×99 sem quebra; data e pontos ou posição/marca/data acima. Campeonato/categoria secundários. Tabelas desktop e estado/ordem dos recordes preservados.
- Ver top5/Recolher no grupo mobile, teclado/toque, recarga, voltar/avançar e links mantidos. Ausência de cobertura não virou zero. Somente uma apresentação nativa da tabela está ativa.
- Principal#075FCA, hover#064DA3, suave#EEF5FF; retorno sem sublinhado normal/hover e com foco visível. Cores de situação/vitória/derrota preservadas. Prorrogações azuis, inclusive as ímpares; Q1/Q3 vermelhos e Q2/Q4 azuis.

O gate completo abaixo valida1d6ce17. O ajuste final917015b altera somente CSS da variante de atletas
e sua asserção browser: tipos, lint/formato, build/fronteira/segredos e32browsers repetidos.
Provas do domínio/contratos/Worker inalterados foram reutilizadas, conforme CONTRIBUTING.

## Testes e inspeção

| Verificação                                                | Resultado                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Unitários focais: scoresheet, projection, page-contract    | 43PASS; cor dos períodos1–10 e camisa ausente/inválida                            |
| Suíte unitária completa                                    | 867PASS /183arquivos                                                              |
| Transportes / banco local / Worker e acesso / PDF real     | 19 /16 /35 /1PASS                                                                 |
| Lint, formato, tipos, builds, fronteira cliente e segredos | PASS                                                                              |
| Consumidores Chromium                                      | 62PASS; mais1teste final de links mobile; limites de densidade da súmula intactos |
| Matriz final após ajuste de tokens                         | 16Chromium+16WebKit, em320/375/390/430/639/640/768/1366                           |
| Matriz anterior com toque WebKit                           | 32PASS, sem alterações posteriores de comportamento                               |
| Catálogo e design completo                                 | PASS, incluindo axe e6larguras do catálogo                                        |
| Páginas publicadas reais                                   | 108PASS: nove páginas/seções × seis larguras × dois engines;0overflow             |
| HTTP e arquivos publicados                                 | Health/raiz200; privados401/403;76assets conferidos por SHA256                    |

Comandos principais: `npm run gate` (retomado no typecheck após correção do teste), `npm run design:build`,
`npm run design:verify`, `npx playwright test tests/public-mobile-tables.spec.ts --project=desktop` e
`npx playwright test --config playwright.webkit.config.ts tests/public-mobile-tables.spec.ts`.
Os demais testes focais e a revisão dos consumidores constam da matriz e do histórico da PR.

As40capturas sintéticas são da aplicação real com fixtures próprias; as12capturas publicadas usam
somente consultas públicas. [Inventário com hashes](evidencias/2026-11-27-tabelas-mobile/capturas.json)
e [medições das páginas publicadas](evidencias/2026-11-27-tabelas-mobile/paginas-reais-publicadas.json).
Inspeção visual executada nas capturas mobile e desktop, incluindo320px, nomes GS Nice de Paula,
IVV/Cetaf e Ana Maria de Souza Oliveira. Camisas0/ausente/00 e redução efetiva da largura de Atleta
foram verificadas na página; estatísticas fora da primeira tela seguem acessíveis por rolagem interna.

## Falhas diagnosticadas

- Conferência final da cascata: a âncora do nome ainda definia overflow-wrap:anywhere. O teste computado reproduziu a falha; a variante agora sobrescreve também a âncora com quebra normal. As oito larguras passaram novamente em Chromium/WebKit.

- Antes da correção, o teste dos períodos identificou prorrogações ímpares vermelhas; a expectativa nova foi mantida e passou.
- A validação de linha tentava usar min0 sobre um array que já tinha min1; Zod acumulava ambas as condições. O array público foi reconstruído com o mesmo elemento e limite101. Sem alteração do formato da API; ausência passa, valores inválidos continuam recusados.
- O gate encontrou uma variável document no teste sombreando o DOM; renomeada, typecheck aprovado. Sem aumento de timeout ou supressão.
- O catálogo isolado carrega CSS sem o cabeçalho público; adicionado fallback canônico aos aliases novos e revalidado contraste. Axe preservado integralmente.
- Expectativas antigas de abreviação mobile, cinco colunas de recordes e coluna Camisa foram substituídas pelas asserções da apresentação solicitada. As verificações desktop/densidade permaneceram.
- O smoke publicado passou após selecionar somente tabelas visíveis; a tabela de resumo inativa permanece corretamente oculta na aba Carreira/Ver jogos. A comparação de configurações desconsidera apenas fonte e anotações esperadas da versão, preservando todo o restante.

## Publicação e limites

A fonte917015b substitui1d6ce17 com a correção final de quebra; HTTP/assets e108combinações publicadas repetidos após a atualização.

Admin versão3323ac61-aee2-468a-b1a8-f8c8752d1a80, deployment4763e3f4-2d94-4b57-9273-56a1da74e3f4.
Preview versão096bfd65-dbac-400e-adf5-3a1ebd68258f, deployment743b8950-e8d3-4b92-bfdd-81bae5c946b1.
Fonte917015b nos dois serviços. [Conferência HTTP](evidencias/2026-11-27-tabelas-mobile/publicacao-http.json)
e [preservação dos serviços](evidencias/2026-11-27-tabelas-mobile/servicos.json).

admin-publicacao permaneceu na versão7c5830cf-6770-4cc6-84a2-7c47b1cdeb5f, deployment0550af8b-8e47-45ef-9d7d-5714a14e1ba9.
Sessões, vínculos, segredos/aliases/configurações preservados; sem escrita em dados humanos, banco remoto,
migration, alteração estatística ou merge. Fonte e arquivos da avaliação mudaram com autorização vigente.
Revisão autoral, sem ferramenta de subagente; sem leitor de tela humano ou aceite humano presumidos.
