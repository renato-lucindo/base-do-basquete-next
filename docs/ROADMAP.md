# Roadmap do produto

## MVP atual

O escopo e as pendências estão em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md); a execução observada está em [PROGRESSO.md](PROGRESSO.md). Este roadmap não declara etapas concluídas nem substitui decisões de domínio e critérios de aceite.

Concluir o MVP exige validar os percursos do escopo vigente, resolver bloqueios e obter os aceites aplicáveis. Funcionalidade adiada não vira automaticamente pós-MVP: preserve sua classificação e decisão originais até o responsável alterá-las explicitamente.

## Objetivos registrados

A ordem dos IDs não representa prioridade. O identificador original é preservado mesmo quando um objetivo muda de fase. Cada entrada informa seu escopo e status atuais.

### FUT-001 — Tempos debitados na súmula

**Status:** Priorizada para o MVP; implementação técnica relatada na [PR #38](https://github.com/renato-lucindo/base-do-basquete-next/pull/38), ainda Draft e não integrada/aceita. Situação de execução e CI no [checkpoint](PROGRESSO.md). **Origem:** pedido de 29/10/2026. **Decisão do responsável em 30/10/2026:** incluir os pedidos de tempo no MVP, deixando de ser exclusivamente pós-MVP. Esta atualização registra a prioridade; não inicia a implementação nem altera as PRs ativas.

**Objetivo e benefício:** registrar o minuto de cada tempo debitado por equipe na súmula, com entrada rápida por teclado e identificação do quarto.

**Comportamento solicitado:**

- Entrada `TO` → `ENTER` → minuto de `1` a `10`.
- Limite solicitado de dois tempos por equipe no primeiro tempo, compartilhados entre Q1/Q2; três no segundo tempo, compartilhados entre Q3/Q4. Não interpretar como limite por quarto.
- Fonte segue a coloração do quarto já definida para a súmula: vermelho nos ímpares, azul nos pares; preservar também a identificação textual do período.

**Dependências e pontos para o planejamento futuro:** identificar a equipe destinatária do comando e o quarto vigente; definir confirmação do minuto, correção/remoção e persistência/publicação compatíveis com o histórico da súmula. Conferir a regra FIBA oficial vigente antes de implementar, incluindo restrições dos minutos finais, prorrogações e significado do minuto informado (decorrido ou restante). Os limites acima registram o pedido, não uma verificação normativa completa. Não inferir transferência de tempos entre metades ou prorrogações.

### FUT-002 — Recordes da Carreira no perfil do jogador

**Status:** implementação parcial na [PR #79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), mantida aberta. **Origem:** pedido de 29/10/2026; em 11/11/2026 o responsável aceitou o protótipo e autorizou implementar e publicar o Worker da unidade.

**Recorte aprovado e implementado:** PTS, 2P, 3P e LL, somente em atuações públicas com cobertura confirmada. A primeira marca permanece na linha principal; “Ver top 5” acrescenta 2º–5º sem repetição. Marca abre o jogo publicado, nomes abrem as equipes; data e campeonato acompanham o confronto. Isso substitui a indefinição anterior do elemento clicável e da composição para essas quatro métricas. Idade na data do jogo e outras métricas, como assistências/rebotes, permanecem futuras e exigem fonte elegível; não foram inventadas nesta entrega. [Evidências e serviço](VALIDACAO-PERFIL-APROVADO.md).

**Objetivo e benefício:** mostrar as cinco maiores atuações individuais de cada estatística válida da carreira, como o career high da NBA, permitindo consultar o confronto de origem.

**Comportamento solicitado:** seção “Recordes da Carreira” no perfil do jogador, com ranking próprio por estatística, incluindo pontos, assistências, rebotes e outras métricas válidas disponíveis. Cada atuação deve identificar e referenciar seu confronto. Ao clicar no elemento associado a uma atuação, abrir a página do jogo em que ela ocorreu. O elemento clicável (célula, link, ação ou outro) será definido com o responsável no planejamento futuro; não fixar essa escolha agora. Complemento registrado em 30/10/2026.

Estrutura sugerida pelo responsável para pontos:

| Pos. | PTS | Ano  | Idade    | Campeonato |
| ---- | --- | ---- | -------- | ---------- |
| 1    | 53  | 2026 | 26a 12d  | Copa ES    |
| 2    | 48  | 2016 | 16a 342d | CBI-Sub 16 |
| 3    | 33  | 2026 | 25a 360d | CCB        |
| 4    | 33  | 2020 | 20a 1d   | Copa ES    |
| 5    | 29  | 2026 | 26a 17d  | Camp       |

Exemplo ilustrativo fornecido pelo responsável, sem validação de datas ou dados reais. A coluna da estatística varia conforme a métrica; a referência ao confronto deve estar acessível mesmo que não apareça nas colunas do exemplo. Idade corresponde à data do jogo, não à idade atual.

**Dependências e pontos para o planejamento futuro:** identidade histórica do jogador, jogos e estatísticas publicados elegíveis, cobertura por métrica e data de nascimento utilizável para calcular idade. Dados ausentes não viram zero nem idade estimada. Definir métricas elegíveis e fontes comparáveis, desempate e posições em empates (o exemplo usa posições sequenciais), tratamento de menos de cinco atuações e apresentação de idade indisponível. Preservar correções de resultados e evitar duplicar o mesmo jogo por suas diferentes fontes/versões. Não expor data de nascimento privada para calcular a idade no navegador.

### FUT-003 — Equipes e elencos em duas colunas

**Status:** Priorizada para a reforma de UI/UX em03/11/2026, substituindo o adiamento pós-MVP; piloto aceito e composição integrada às rotas reais na PR54 após autorização da sequência. Provas e limites em [validação administrativa](design/VALIDACAO-ADMIN-UIUX.md); liberação e aceite de produção permanecem distintos. **Origem:** conversa de 30/10/2026. **Decisão atual e critérios:** [reforma de UI/UX](design/REFORMA-UIUX.md). Estado real, branch e CI no [checkpoint](PROGRESSO.md).

**Objetivo e benefício:** abrir o elenco ao lado da lista administrativa de equipes, facilitando a troca de equipe e evitando que a expansão do elenco alongue a página.

**Comportamento definido:**

- Desktop: duas colunas sem sobreposição; aproximadamente 30% da largura para equipes à esquerda e 70% para o elenco à direita. Ajustar ao espaço disponível e à legibilidade.
- Clicar em uma equipe destaca sua inscrição e mostra o elenco correspondente no painel direito; selecionar outra troca o conteúdo do painel mantendo a lista visível.
- Antes da seleção, mostrar “Selecione uma equipe para ver o elenco”.
- Com edição pendente, confirmar descarte antes de trocar de equipe, preservando as proteções atuais de salvamento.
- No celular ou quando a largura não comportar as colunas, mostrar somente o elenco selecionado com “Voltar às equipes”; ao retornar, restaurar busca e posição da lista.
- Manter os diálogos existentes de cadastro e edição.

**Dependências e aceite futuro:** adaptar a expansão atual da inscrição sem alterar identidade global, vínculos ou contratos de persistência; preservar busca, paginação, foco, teclado e guardas de edição/salvamento. Validar 1366×768, 1920×1080, celular, zoom e nomes longos; dimensionar o ponto de mudança de layout pela legibilidade do conteúdo.

### FUT-004 — Filtros avançados de estatísticas dos jogadores

**Status:** Ideia pós-MVP, com comportamento definido; implementação não iniciada. **Origem e decisão:** conversa com o responsável em 05/11/2026; autorizado somente o registro no roadmap, sem ampliar o MVP.

**Objetivo e benefício:** analisar o desempenho dos jogadores em situações específicas, no perfil individual e na página de estatísticas dos jogadores de um campeonato, recalculando os números conforme o recorte escolhido.

**Comportamento definido:**

| Filtro                         | Perfil do jogador                          | Estatísticas do campeonato                           |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------- |
| Campeonato, edição e categoria | Opções do histórico do atleta              | Omitidos quando já definidos pelo contexto da página |
| Equipe defendida e adversário  | Opções do histórico do atleta              | Opções daquele campeonato                            |
| Resultado                      | Vitórias e derrotas                        | Vitórias e derrotas                                  |
| Etapa                          | Regular e eliminatória                     | Regular e eliminatória                               |
| Condição na partida            | Titular e reserva                          | Titular e reserva                                    |
| Margem do placar final         | 1–5, 6–10, 11–15, 16–20 e 21+ pontos       | Mesmas faixas exclusivas                             |
| Datas                          | Intervalo de datas dos jogos               | Intervalo dentro da edição                           |
| Mínimo de participações        | Para os agrupamentos estatísticos exibidos | Para qualificação no ranking                         |

- Equipes, adversários, campeonatos, edições e categorias usam seleção múltipla por checkboxes com pesquisa por nome. Pesquisar preserva seleções anteriores e ignora acentos e diferenças entre maiúsculas e minúsculas. Oferecer remoção individual e limpeza das seleções.
- Na página do campeonato, os filtros avançados ficam em painel expansível, aproveitando os controles existentes sem duplicação. O botão **Aplicar filtros** confirma as seleções; recolher o painel preserva o recorte aplicado, com indicador de filtros ativos e resumo visível.
- Opções do mesmo campo se somam; campos diferentes se combinam. Exemplo: equipes A ou B, apenas em vitórias nas eliminatórias.
- Selecionar jogos e participações antes de calcular totais e médias. Recalcular quantidade de participações, números e posições do ranking; aplicar o mínimo de participações depois do recorte. Não selecionar jogadores por uma atuação e manter seus números gerais.
- Resultado considera a equipe defendida pelo jogador naquela partida; margem corresponde ao placar final, incluindo prorrogações. Titular/reserva corresponde à condição inicial em cada jogo; reserva que não entrou não conta como participação.
- No perfil, atualizar o resumo estatístico e a lista de jogos. Recordes da Carreira (FUT-002) e conquistas mantêm seus escopos próprios.

**Padrões de referência:** iniciar sem restrições e sem mínimo de participações; datas inicial e final inclusivas; preservar o recorte na navegação e permitir compartilhamento pela URL, sem dados privados.

**Dependências e aceite futuro:** confirmar a integração da classificação cadastrada regular/eliminatória com as fontes estatísticas publicadas, inclusive para jogos anteriores; a investigação desta conversa identificou a necessidade de correção, sem comprovar sua execução. Usar apenas dados publicados elegíveis e informar cobertura e tamanho da amostra; ausência de informação não vira zero nem classificação presumida. Validar combinações de filtros, limites das faixas, jogador alternando entre titular/reserva e passagens por equipes diferentes. Sem filtros, preservar os resultados atuais; com filtros, conferir totais, médias, participações e ranking. Verificar pesquisa, checkboxes, aplicação/limpeza, painel recolhido, resultado vazio, teclado e celular, seguindo os padrões públicos vigentes. Não alterar contratos públicos ou executar migrations/publicações apenas por este registro.

**Ampliações possíveis, fora da primeira entrega:** estatísticas de equipes com os filtros compatíveis; comparação de recortes lado a lado; últimos N jogos; recortes por quarto; condições individuais por atuação, como 20+ pontos. Não constituem compromisso de implementação.

Ao registrar novas ideias, use:

| Campo        | Conteúdo                                                        |
| ------------ | --------------------------------------------------------------- |
| ID e título  | Identificador estável, por exemplo FUT-001, e nome curto        |
| Objetivo     | Resultado desejado e para quem                                  |
| Benefício    | Problema que resolve ou oportunidade                            |
| Descrição    | Resumo suficiente para retomar a ideia                          |
| Dependências | Dados, funcionalidades e decisões necessárias; ou não avaliadas |
| Status       | Ideia, Em avaliação ou Priorizada                               |
| Decisão      | Data, responsável e referência quando houver aceite             |

## Regra de priorização

Registrar, avaliar ou priorizar uma ideia não altera o escopo do MVP e não autoriza implementação. Somente decisão explícita do responsável permite abrir uma unidade de execução. Antes disso, avaliar benefício, custo e dependências; depois registrar escopo e critérios de aceite no plano próprio. Agentes não antecipam objetivos futuros enquanto concluem outra tarefa.

Este arquivo guarda objetivos do produto; não cria tarefas, agendamentos ou Goals automáticos no aplicativo.
