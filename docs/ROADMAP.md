# Roadmap do produto

## MVP atual

O escopo e as pendências estão em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md); a execução observada está em [PROGRESSO.md](PROGRESSO.md). Este roadmap não declara etapas concluídas nem substitui decisões de domínio e critérios de aceite.

Concluir o MVP exige validar os percursos do escopo vigente, resolver bloqueios e obter os aceites aplicáveis. Funcionalidade adiada não vira automaticamente pós-MVP: preserve sua classificação e decisão originais até o responsável alterá-las explicitamente.

## Objetivos candidatos pós-MVP

Ideias registradas pelo responsável em 29/10/2026, fora do MVP e sem execução autorizada. A ordem dos IDs não representa prioridade.

### FUT-001 — Tempos debitados na súmula

**Status:** Ideia. **Origem:** pedido do responsável em 29/10/2026; autorizado somente o registro no roadmap.

**Objetivo e benefício:** registrar o minuto de cada tempo debitado por equipe na súmula, com entrada rápida por teclado e identificação do quarto.

**Comportamento solicitado:**

- Entrada `TO` → `ENTER` → minuto de `1` a `10`.
- Limite solicitado de dois tempos por equipe no primeiro tempo, compartilhados entre Q1/Q2; três no segundo tempo, compartilhados entre Q3/Q4. Não interpretar como limite por quarto.
- Fonte segue a coloração do quarto já definida para a súmula: vermelho nos ímpares, azul nos pares; preservar também a identificação textual do período.

**Dependências e pontos para o planejamento futuro:** identificar a equipe destinatária do comando e o quarto vigente; definir confirmação do minuto, correção/remoção e persistência/publicação compatíveis com o histórico da súmula. Conferir a regra FIBA oficial vigente antes de implementar, incluindo restrições dos minutos finais, prorrogações e significado do minuto informado (decorrido ou restante). Os limites acima registram o pedido, não uma verificação normativa completa. Não inferir transferência de tempos entre metades ou prorrogações.

### FUT-002 — Recordes da Carreira no perfil do jogador

**Status:** Ideia. **Origem:** pedido do responsável em 29/10/2026; autorizado somente o registro no roadmap.

**Objetivo e benefício:** mostrar as cinco maiores atuações individuais de cada estatística válida da carreira, como o career high da NBA, permitindo consultar o confronto de origem.

**Comportamento solicitado:** seção “Recordes da Carreira” no perfil do jogador, com ranking próprio por estatística, incluindo pontos, assistências, rebotes e outras métricas válidas disponíveis. Cada atuação deve identificar e referenciar seu confronto. Estrutura sugerida pelo responsável para pontos:

| Pos. | PTS | Ano  | Idade    | Campeonato |
| ---- | --- | ---- | -------- | ---------- |
| 1    | 53  | 2026 | 26a 12d  | Copa ES    |
| 2    | 48  | 2016 | 16a 342d | CBI-Sub 16 |
| 3    | 33  | 2026 | 25a 360d | CCB        |
| 4    | 33  | 2020 | 20a 1d   | Copa ES    |
| 5    | 29  | 2026 | 26a 17d  | Camp       |

Exemplo ilustrativo fornecido pelo responsável, sem validação de datas ou dados reais. A coluna da estatística varia conforme a métrica; a referência ao confronto deve estar acessível mesmo que não apareça nas colunas do exemplo. Idade corresponde à data do jogo, não à idade atual.

**Dependências e pontos para o planejamento futuro:** identidade histórica do jogador, jogos e estatísticas publicados elegíveis, cobertura por métrica e data de nascimento utilizável para calcular idade. Dados ausentes não viram zero nem idade estimada. Definir métricas elegíveis e fontes comparáveis, desempate e posições em empates (o exemplo usa posições sequenciais), tratamento de menos de cinco atuações e apresentação de idade indisponível. Preservar correções de resultados e evitar duplicar o mesmo jogo por suas diferentes fontes/versões. Não expor data de nascimento privada para calcular a idade no navegador.

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
