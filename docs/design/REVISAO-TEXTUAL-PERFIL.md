# Revisão textual do perfil — 11/11/2026

O responsável reprovou o resultado visual da PR79 e solicitou um protótipo HTML mobile, precedido da correção documental. Evolução está fora do escopo. Legenda somente ao final da página; legendas e tooltips seguem o vocabulário curto de Jogadores/Equipes.

## Por que os textos passaram

1. **A proibição já existia.** PADROES.md, seção Textos de apresentação, proibia parágrafos explicativos e complementos locais; README.md já exigia revisão. Não faltava autorização para removê-los: a implementação e a revisão do agente não aplicaram a regra existente.
2. **Havia ambiguidade de apresentação nos documentos da área.** PUBLICO.md ainda mandava expor cobertura quando necessário e tratava Evolução como secundária/recolhida. Essas frases foram usadas como permissão ampla para manter conteúdo herdado, sem separar contrato técnico de texto visível nem respeitar o escopo efetivo.
3. **O perfil criou vocabulário próprio.** Em src/player-profile/public-page.tsx, J recebeu definições locais em cabeçalhos e no painel “Siglas e cobertura”; as demais métricas ganharam sufixos de modo e houve notas preventivas antes dos recordes. A página não reutilizou a apresentação e os textos curtos de StatisticsLegend/referenceMetric e STATISTICS_METRICS. Referências: src/statistics/reference/scoresheet-statistics-table.tsx e src/statistics/metrics.ts.
4. **A verificação cobriu outros contratos.** As suítes player-public e player-approved conferiram navegação, geometria, dados e expansão, mas não exigiram igualdade dos textos com o catálogo, posição única/final da legenda ou ausência dos parágrafos reprovados. A suíte anterior ainda esperava Evolução. CI verde foi evidência técnica desses cenários, não aceite textual ou visual.

## Correções documentais antes do protótipo

- PADROES.md define posição final/única, vocabulário curto exato e separação entre regras internas e texto visível.
- PUBLICO.md retira a autorização ambígua, registra a reprovação do resultado e exclui Evolução do novo estudo.
- README.md exige ler o conteúdo efetivo de notas/tooltips/legenda e comparar os termos com o catálogo, além de conferir o escopo. A evidência deve registrar exemplos e posição; geometria/axe não substituem a leitura.

## Contrato de texto a conferir

| Sigla | Único significado em tooltip/seletor/legenda |
| ----- | -------------------------------------------- |
| J     | Jogos                                        |
| PTS   | Pontos                                       |
| 2P    | Cestas de dois                               |
| 3P    | Cestas de três                               |
| LL    | Lances livres                                |
| FC    | Faltas cometidas                             |

Não anexar regras de participação, “média por jogo”, “total”, condições de cobertura/fase ou explicações sobre zero. Cabeçalhos completos não recebem tooltip de ajuda. O modo continua no controle apropriado. A legenda mostra apenas siglas efetivamente usadas no conteúdo ativo e fica depois da última seção/paginação, antes do rodapé.

## Limites desta correção

Esta etapa altera documentação e cria um estudo HTML local separado. Não corrige silenciosamente a aplicação React, não publica outro Worker e não altera banco, API, fontes ou cálculo. O Worker fc276b3 continua identificado como a versão anterior reprovada visualmente. A nova composição exige novo aceite antes de substituir a interface do produto. A PR79 permanece aberta, sem merge ou auto-merge.
