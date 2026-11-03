# Índice de documentação — Base do Basquete Next

Criado em 31/10/2026; referências reconciliadas em 01/11/2026. Atualizar ao reorganizar ou adicionar documentos.

Este índice orienta agentes iniciando em novas sessões. Leia o documento que corresponde à área do trabalho — não toda a documentação. A [seção 8 deste índice](#8-hierarquia-de-decis%C3%B5es) é a fonte única da hierarquia documental; as instruções de Git estão em `AGENTS.md` e `CONTRIBUTING.md`; não as repita aqui.

---

## 1. Leitura obrigatória sempre

| Documento                               | Quando ler                                                                |
| --------------------------------------- | ------------------------------------------------------------------------- |
| [`AGENTS.md`](../AGENTS.md)             | Início de qualquer sessão. Regras de Git, cota, CI e workflow.            |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Início de qualquer sessão. Comandos, branches, verificação e entrega.     |
| [`docs/PROGRESSO.md`](PROGRESSO.md)     | Início de qualquer sessão. Estado atual, unidades ativas e próximo passo. |

---

## 2. Planejamento e escopo

| Documento                                                                                                       | Conteúdo                                                              |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`docs/MATRIZ-ESCOPO.md`](MATRIZ-ESCOPO.md)                                                                     | Situação de cada percurso do MVP: entregue, pendente, bloqueado.      |
| [`docs/ROADMAP.md`](ROADMAP.md)                                                                                 | Ideias registradas; não autoriza implementação sem decisão explícita. |
| [`historico/documentacao/analises/CONSOLIDACAO-PRS.md`](../historico/documentacao/analises/CONSOLIDACAO-PRS.md) | Inventário e destino das PRs históricas fechadas.                     |

---

## 3. Matriz de leitura por tipo de tarefa

> [!IMPORTANT]
> Leia **apenas** as fontes operacionais listadas para o tipo de tarefa. Relatórios, planos e handoffs arquivados são consulta pontual de evidência, nunca leitura obrigatória de toda a área. Não leia toda a documentação em toda sessão.

### 3.1 Interface administrativa (geral)

1. [`docs/design/README.md`](design/README.md) — fluxo de agentes e hierarquia de decisões de design
2. [`docs/design/PADROES.md`](design/PADROES.md) — padrões comuns (acessibilidade, tabelas, responsividade)
3. [`docs/design/ADMIN.md`](design/ADMIN.md) — percursos e aceite proporcional do admin
4. [`docs/design/PADROES-ADMIN.md`](design/PADROES-ADMIN.md) — componentes, CRUD, formulários, modais, filtros e feedback (admin)

### 3.2 Interface pública

1. [`docs/design/README.md`](design/README.md) — fluxo de agentes e hierarquia de decisões de design
2. [`docs/design/PADROES.md`](design/PADROES.md) — padrões comuns
3. [`docs/design/PUBLICO.md`](design/PUBLICO.md) — fluxos, páginas e regras de publicação da área pública

### 3.3 Formulários, tabelas, modais e componentes

1. [`docs/design/PADROES.md`](design/PADROES.md) — seções "Tabelas e ações" e "Acessibilidade"
2. [`docs/design/PADROES-ADMIN.md`](design/PADROES-ADMIN.md) — componentes e comportamentos específicos
3. [`docs/design/ADMIN.md`](design/ADMIN.md) — percursos e aceite proporcional

### 3.4 Acessibilidade

1. [`docs/design/PADROES.md`](design/PADROES.md) — seção "Acessibilidade e responsividade" (WCAG 2.2 AA, targets, zoom)
2. [`historico/documentacao/validacoes/VALIDACAO-ACESSIBILIDADE.md`](../historico/documentacao/validacoes/VALIDACAO-ACESSIBILIDADE.md) — evidências históricas de acessibilidade, somente para comparar cobertura
3. [`historico/documentacao/validacoes/VALIDACAO-ACESSIBILIDADE-ADMIN.md`](../historico/documentacao/validacoes/VALIDACAO-ACESSIBILIDADE-ADMIN.md) — evidências históricas do admin, somente quando pertinentes
4. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/EXPERIENCIA.md` — seção "Acessibilidade" (meta WCAG, referência normativa)

### 3.5 Banco de dados e segurança

1. [`docs/decisoes/`](decisoes/) — decisões arquiteturais numeradas (001–019); ler apenas as relevantes ao contexto
2. [`historico/documentacao/analises/ACESSO-ADMINISTRATIVO.md`](../historico/documentacao/analises/ACESSO-ADMINISTRATIVO.md) — evidência histórica de bootstrap concluído (consultar somente se necessário; regra vigente nos ADRs 003/004)
3. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/ARQUITETURA.md` — módulos, dependências e segurança
4. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` — fórmulas, formatos e interfaces dos módulos

> [!CAUTION]
> Migrations aplicadas são imutáveis. Mudanças de schema exigem migration nova. Nunca executar DDL/seed com dados humanos sem autorização explícita do responsável.

### 3.6 Regras de negócio e competições

1. [`docs/decisoes/`](decisoes/) — em especial: `006-equipes-inscricoes.md`, `012-regulamento-declarativo.md`, `013-classificacao-publica-confirmada.md`
2. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/ESCOPO.md` — requisitos e vocabulário do produto
3. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` — regras esportivas e interfaces dos módulos
4. [`docs/MATRIZ-ESCOPO.md`](MATRIZ-ESCOPO.md) — situação de cada percurso; o que já foi validado

### 3.7 Jogos, súmulas e estatísticas

1. [`docs/decisoes/009-sumula-persistida.md`](decisoes/009-sumula-persistida.md) — contrato de persistência da súmula
2. [`docs/decisoes/016-estatisticas-de-snapshots-confirmados.md`](decisoes/016-estatisticas-de-snapshots-confirmados.md) — fonte das estatísticas
3. [`docs/design/INTEGRACAO.md`](design/INTEGRACAO.md) — contrato dos protótipos de súmula e estatísticas (colunas, cálculos, UX)
4. [`historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md`](../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md) — evidências históricas e limites dos protótipos
5. [`historico/documentacao/validacoes/VALIDACAO-SUMULA-DESKTOP.md`](../historico/documentacao/validacoes/VALIDACAO-SUMULA-DESKTOP.md) — evidência histórica de validação da súmula desktop real
6. [`historico/documentacao/validacoes/VALIDACAO-ESTATISTICAS.md`](../historico/documentacao/validacoes/VALIDACAO-ESTATISTICAS.md) — evidência histórica de validação das estatísticas
7. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` — fórmulas e regras esportivas

> [!NOTE]
> O diretório `docs/design/prototipos/` contém HTML navegável para referência de UX; **não** representa a implementação real. A implementação está em `src/games/` e `src/statistics/`.

### 3.8 Importação e gerenciamento de atletas/equipes

1. [`docs/decisoes/007-pessoas-e-papeis.md`](decisoes/007-pessoas-e-papeis.md) — identidade compartilhada atleta/técnico
2. [`docs/decisoes/008-importacao-de-elenco.md`](decisoes/008-importacao-de-elenco.md) — revisão e importação textual de um elenco
3. [`docs/decisoes/006-equipes-inscricoes.md`](decisoes/006-equipes-inscricoes.md) — equipes e inscrições
4. [`docs/ESCOPO-IMPORTADOR-DE-EQUIPES.md`](ESCOPO-IMPORTADOR-DE-EQUIPES.md) — escopo do importador
5. [`historico/documentacao/analises/ANALISE-IMPORTADOR-DE-EQUIPES.md`](../historico/documentacao/analises/ANALISE-IMPORTADOR-DE-EQUIPES.md) — análise histórica, somente para investigar proveniência
6. [`historico/documentacao/validacoes/VALIDACAO-IMPORTADOR.md`](../historico/documentacao/validacoes/VALIDACAO-IMPORTADOR.md) — evidência histórica de validação do importador
7. [`historico/documentacao/validacoes/VALIDACAO-PESSOAS.md`](../historico/documentacao/validacoes/VALIDACAO-PESSOAS.md) — evidência histórica de validação de cadastro de pessoas
8. [`historico/documentacao/validacoes/VALIDACAO-EQUIPES.md`](../historico/documentacao/validacoes/VALIDACAO-EQUIPES.md) — evidência histórica de validação de equipes
9. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` — regras de matching e identidade

### 3.9 Testes, CI e publicação

1. [`CONTRIBUTING.md`](../CONTRIBUTING.md) — seção "Implementar e verificar": gate, browsers, lint, CI
2. [`histórico de validações`](../historico/documentacao/README.md#validacoes) — evidências de validação pertinentes à área alterada (apenas as relevantes)
3. [`docs/MATRIZ-ESCOPO.md`](MATRIZ-ESCOPO.md) — o que já foi validado e o que está pendente de aceite
4. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/VALIDACAO.md` — entregas, cenários de aceite e critérios

---

## 4. Referências de especificação

Estes documentos estão em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/`. São insumos originais do produto, preservados byte a byte. Não alterar.

| Documento             | Conteúdo                                                                               |
| --------------------- | -------------------------------------------------------------------------------------- |
| `docs/ESCOPO.md`      | Requisitos, vocabulário e limites do produto                                           |
| `docs/EXPERIENCIA.md` | Fluxos, preferências visuais e protótipos — **referência, não prova de implementação** |
| `docs/ARQUITETURA.md` | Módulos, dependências, segurança e especificação lógica do banco                       |
| `docs/CONTRATOS.md`   | Fórmulas, formatos de entrada, regras esportivas e interfaces dos módulos              |
| `docs/VALIDACAO.md`   | Entregas, cenários de aceite e critérios                                               |

---

## 5. Design e padrões de UI/UX

| Documento                                                                                                                           | Conteúdo                                                                           | Área    |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------- |
| [`docs/design/README.md`](design/README.md)                                                                                         | Índice, fluxo de agentes, hierarquia de decisões e skills                          | Ambas   |
| [`docs/design/PADROES.md`](design/PADROES.md)                                                                                       | Padrões comuns: hierarquia, acessibilidade, tabelas, responsividade                | Ambas   |
| [`docs/design/PADROES-ADMIN.md`](design/PADROES-ADMIN.md)                                                                           | Componentes, CRUD, formulários, modais, filtros, combobox, feedback                | Admin   |
| [`docs/design/ADMIN.md`](design/ADMIN.md)                                                                                           | Percursos e aceite proporcional                                                    | Admin   |
| [`docs/design/PUBLICO.md`](design/PUBLICO.md)                                                                                       | Fluxos, páginas de disputa e regras de publicação                                  | Público |
| [`docs/design/INTEGRACAO.md`](design/INTEGRACAO.md)                                                                                 | Contrato dos protótipos de súmula e estatísticas                                   | Ambas   |
| [`docs/design/SKILLS.md`](design/SKILLS.md)                                                                                         | Origem, licença, hashes e uso das skills `ui-ux-pro-max` e `web-design-guidelines` | Ambas   |
| [`historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md`](../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md) | Evidências históricas dos protótipos públicos (consulta pontual)                   | Público |

---

## 6. Decisões arquiteturais (ADRs)

Diretório: [`docs/decisoes/`](decisoes/). Leia **apenas** as decisões relevantes ao contexto. Os 19 ADRs foram preservados. Notas de vigência identificam os recortes históricos e as substituições parciais (001, 003, 009, 016 e 018); nenhuma decisão foi revogada apenas por idade. Novidades da PR #38 permanecem condicionadas à sua integração.

| Decisão | Assunto                                 |
| ------- | --------------------------------------- |
| 001     | Protótipo local                         |
| 002     | Preview protegido por Cloudflare Access |
| 003     | Autorização e migrations                |
| 004     | Sessão no servidor                      |
| 005     | Contexto transacional                   |
| 006     | Equipes e inscrições                    |
| 007     | Pessoas e papéis                        |
| 008     | Importação de elenco                    |
| 009     | Súmula persistida                       |
| 010     | PDF e fontes                            |
| 011     | Publicação por jogo                     |
| 012     | Regulamento declarativo                 |
| 013     | Classificação pública confirmada        |
| 014     | Transferência atômica e retorno         |
| 015     | Colocações e honrarias confirmadas      |
| 016     | Estatísticas de snapshots confirmados   |
| 017     | Perfil publicado independente           |
| 018     | Equipes de resultados confirmados       |
| 019     | Fonte estatística limitada por página   |

---

## 7. Histórico e evidências

Entrega pública atual: [classificação e estatísticas de equipes](evidencias/2026-11-03-tabelas-classificacao-equipes.md), com testes, capturas e deployment da PR #49. Consulte apenas quando a tarefa exigir essas provas; o resumo de execução permanece em PROGRESSO.md.

Preservados para consulta pontual. **Não substituem decisões vigentes.**

| Local                                                                       | Conteúdo                                                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [`historico/documentacao/`](../historico/documentacao/README.md)            | Planos, relatos, análises e handoffs preservados; pendências vigentes estão na matriz/checkpoint |
| [`historico/progresso/`](../historico/progresso/README.md)                  | Checkpoints anteriores de progresso                                                              |
| [`histórico de validações`](../historico/documentacao/README.md#validacoes) | Evidências de validação técnica (por percurso)                                                   |
| [`docs/evidencias/`](evidencias/)                                           | Benchmarks, concorrência e capturas de testes                                                    |
| [`docs/design/evidencias/`](design/evidencias/)                             | Evidências dos protótipos públicos                                                               |

> [!NOTE]
> `historico/documentacao/AJUSTES-DE-EXPERIENCIA.md` contém feedbacks de protótipo de 22–27/10. Regras permanentes aplicáveis foram absorvidas em `docs/design/`. Não tratar as orientações históricas como requisitos atuais sem verificar se foram incorporadas.

---

## 8. Hierarquia de decisões

Quando houver contradição entre documentos, resolva pela precedência abaixo. Não escolha arbitrariamente; identifique a origem, a data e o escopo:

1. **Restrições obrigatórias:** segurança, privacidade e acessibilidade (WCAG 2.2 AA)
2. **Instruções atuais do responsável:** decisões explícitas e diretas, independente do canal
3. **Especificações e regras de negócio vigentes:** `docs/decisoes/`, `CONTRATOS.md`, `ESCOPO.md`
4. **Padrões permanentes do projeto:** `docs/design/PADROES.md`, `PADROES-ADMIN.md`, `ADMIN.md`, `PUBLICO.md`
5. **Recomendações das skills:** `ui-ux-pro-max`, `web-design-guidelines` — técnicas, não substituem identidade ou decisões do projeto
6. **Preferências genéricas dos agentes**

Os contratos de produto do nível 3 podem evoluir por decisão explícita e autorizada do responsável, com atualização da fonte pertinente e respeito às restrições do nível 1.

Entre documentos de mesma prioridade, aplique a regra mais específica ao escopo em questão somente após confirmar sua vigência. Verifique substituições explícitas e decisões autorizadas formalmente integradas às fontes vigentes, com referência ao que substituem. A data mais recente, isoladamente, não comprova revogação; se escopo ou vigência continuarem ambíguos, siga o procedimento de decisão humana abaixo.

PRs abertas, protótipos e documentos históricos não substituem automaticamente decisões vigentes. Aprovação de um protótipo vale para seu escopo explicitamente aprovado; sua existência ou implementação não autoriza mudanças adicionais de produto. Código e testes demonstram o comportamento implementado, mas não constituem, por si só, autorização para alterar regras de negócio.

Persistindo uma contradição, registre as fontes conflitantes (caminho/seção, versão e escopo), o ponto de discordância e solicite decisão humana. Suspenda apenas as ações dependentes dessa decisão e prossiga com atividades independentes dentro do escopo autorizado.

---

## 9. Exemplos de documentos por tarefa

### Editar um jogo (entrada de dados / súmula)

Leia: `AGENTS.md` → `CONTRIBUTING.md` → `PROGRESSO.md` → `decisoes/009-sumula-persistida.md` → `design/INTEGRACAO.md` (seção Súmula) → evidência de súmula no histórico, se necessária → `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` (regras esportivas) → `design/PADROES-ADMIN.md` (formulários e feedback)

### Adicionar um atleta (cadastro / importação)

Leia: `AGENTS.md` → `CONTRIBUTING.md` → `PROGRESSO.md` → `decisoes/007-pessoas-e-papeis.md` → `decisoes/006-equipes-inscricoes.md` → `ESCOPO-IMPORTADOR-DE-EQUIPES.md` → `design/ADMIN.md` (adicionar atleta ao elenco) → `design/PADROES-ADMIN.md` (combobox, diálogo, feedback)

### Melhorar o layout de uma tabela administrativa

Leia: `AGENTS.md` → `CONTRIBUTING.md` → `PROGRESSO.md` → `design/README.md` → `design/PADROES.md` (seção Tabelas e ações) → `design/PADROES-ADMIN.md` → `design/ADMIN.md` → evidência de acessibilidade no histórico, se necessária

---

## 10. Manutenção deste índice

- Atualize ao criar ou arquivar documentos.
- Não acrescente documentos ao índice que não existam no repositório.
- Links relativos partem de `docs/INDICE.md`; ajuste se o arquivo for movido.
- Preserve a separação entre documentos ativos (seções 1–7) e histórico (seção 7).
