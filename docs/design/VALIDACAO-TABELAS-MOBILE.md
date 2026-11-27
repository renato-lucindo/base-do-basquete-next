# Validação — tabelas mobile e cores públicas

Fonte de runtime: **2d21f200c5e76694fc6db0e3a9ecab8543250bbe**, PR89, branch codex/perfis-equipes.
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

A revisão2d21f20 corrigiu o nome acessível da identidade e separou valor/rótulo dos pontos.
138Chromium (8dispensas preexistentes),16WebKit e1teste de súmula com três prorrogações aprovados.
Tipos/lint/formato/build/fronteiras repetidos; provas do domínio e Worker inalterados reutilizadas.

## Testes e inspeção

| Verificação                                                | Resultado                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unitários focais: scoresheet, projection, page-contract    | 43PASS; cor dos períodos1–10 e camisa ausente/inválida                           |
| Suíte unitária completa                                    | 867PASS /183arquivos                                                             |
| Transportes / banco local / Worker e acesso / PDF real     | 19 /16 /35 /1PASS                                                                |
| Lint, formato, tipos, builds, fronteira cliente e segredos | PASS                                                                             |
| Consumidores Chromium                                      | 138PASS na revisão final;8dispensas preexistentes; limites de densidade intactos |
| Matriz final após ajuste de tokens                         | 16Chromium+16WebKit, em320/375/390/430/639/640/768/1366                          |
| Matriz anterior com toque WebKit                           | 32PASS anteriores; nova revisão de toque incluída nos138Chromium                 |
| Catálogo e design completo                                 | PASS, incluindo axe e6larguras do catálogo                                       |
| Páginas publicadas reais                                   | 108PASS: nove páginas/seções × seis larguras × dois engines;0overflow            |
| HTTP e arquivos publicados                                 | Health/raiz200; privados401/403;76assets conferidos por SHA256                   |

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

- CI [45998870054](https://github.com/renato-lucindo/next/actions/runs/45998870054), HEAD450d458: gate/design e102WebKit PASS;978Chromium PASS,7FAIL,125dispensas preexistentes. A identidade tinha rótulo acessível sem o#visível (duas falhas axe); dois testes ainda buscavam a célula Camisa; uma asserção lia toda a célula mobile como data; outra incluía PTS no valor numérico; o teste de tempos esperava PR1 vermelha. Correções mantêm axe integral, identificam os campos e conferem camisa inline. O teste de tempos agora verifica PR1/PR2/PR3 azuis após recarga, limites e teclado. [Registro](evidencias/2026-11-27-tabelas-mobile/regressao-ci.json).
- Na conferência publicada, a navegação rápida interrompia requisições de placar no WebKit durante a interceptação de leitura. O driver passou a concluir as requisições antes de avançar; não filtra erros de JavaScript. A aplicação e seus timeouts não foram alterados por esse ajuste do driver.

- Conferência final da cascata: a âncora do nome ainda definia overflow-wrap:anywhere. O teste computado reproduziu a falha; a variante agora sobrescreve também a âncora com quebra normal. As oito larguras passaram novamente em Chromium/WebKit.

- Antes da correção, o teste dos períodos identificou prorrogações ímpares vermelhas; a expectativa nova foi mantida e passou.
- A validação de linha tentava usar min0 sobre um array que já tinha min1; Zod acumulava ambas as condições. O array público foi reconstruído com o mesmo elemento e limite101. Sem alteração do formato da API; ausência passa, valores inválidos continuam recusados.
- O gate encontrou uma variável document no teste sombreando o DOM; renomeada, typecheck aprovado. Sem aumento de timeout ou supressão.
- O catálogo isolado carrega CSS sem o cabeçalho público; adicionado fallback canônico aos aliases novos e revalidado contraste. Axe preservado integralmente.
- Expectativas antigas de abreviação mobile, cinco colunas de recordes e coluna Camisa foram substituídas pelas asserções da apresentação solicitada. As verificações desktop/densidade permaneceram.
- O smoke publicado passou após selecionar somente tabelas visíveis; a tabela de resumo inativa permanece corretamente oculta na aba Carreira/Ver jogos. A comparação de configurações desconsidera apenas fonte e anotações esperadas da versão, preservando todo o restante.

## Publicação e limites

A fonte2d21f20 substitui1d6ce17 com a correção final de quebra; HTTP/assets e108combinações publicadas repetidos após a atualização.

Admin versãobdaf4cad-994f-4a9f-90bb-ebfc7234c6e0, deploymentfa4fff45-59aa-48cb-88aa-27a360910ee1.
Preview versão5fdeddce-37b1-4d6d-a3c1-1a662522309c, deployment29d2c9d7-22af-49bd-af55-3df5640dd90a.
Fonte2d21f20 nos dois serviços. [Conferência HTTP](evidencias/2026-11-27-tabelas-mobile/publicacao-http.json)
e [preservação dos serviços](evidencias/2026-11-27-tabelas-mobile/servicos.json).

admin-publicacao permaneceu na versão7c5830cf-6770-4cc6-84a2-7c47b1cdeb5f, deployment0550af8b-8e47-45ef-9d7d-5714a14e1ba9.
Sessões, vínculos, segredos/aliases/configurações preservados; sem escrita em dados humanos, banco remoto,
migration, alteração estatística ou merge. Fonte e arquivos da avaliação mudaram com autorização vigente.
Revisão autoral, sem ferramenta de subagente; sem leitor de tela humano ou aceite humano presumidos.
