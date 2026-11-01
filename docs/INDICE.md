# Índice de documentação — Base do Basquete Next

Criado em 31/10/2026. Atualizar ao reorganizar ou adicionar documentos.

Este índice orienta agentes iniciando em novas sessões. Leia o documento que corresponde à área do trabalho — não toda a documentação. A hierarquia de decisões está neste índice e em `docs/design/README.md`; as instruções de Git estão em `AGENTS.md` e `CONTRIBUTING.md`; não as repita aqui.

---

## 1. Leitura obrigatória sempre

| Documento | Quando ler |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | Início de qualquer sessão. Regras de Git, cota, CI e workflow. |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Início de qualquer sessão. Comandos, branches, verificação e entrega. |
| [`docs/PROGRESSO.md`](PROGRESSO.md) | Início de qualquer sessão. Estado atual, unidades ativas e próximo passo. |

---

## 2. Planejamento e escopo

| Documento | Conteúdo |
| --- | --- |
| [`docs/MATRIZ-ESCOPO.md`](MATRIZ-ESCOPO.md) | Situação de cada percurso do MVP: entregue, pendente, bloqueado. |
| `docs/ROADMAP.md` (pendente de integração na main) | Ideias registradas; não autoriza implementação sem decisão explícita. |
| [`docs/CONSOLIDACAO-PRS.md`](CONSOLIDACAO-PRS.md) | Inventário e destino das PRs históricas fechadas. |

---

## 3. Matriz de leitura por tipo de tarefa

> [!IMPORTANT]
> Leia **apenas** os documentos listados para o tipo de tarefa que você está executando. Não leia toda a documentação em toda sessão.

### 3.1 Interface administrativa (geral)

1. [`docs/design/README.md`](design/README.md) — fluxo de agentes e hierarquia de decisões de design
2. [`docs/design/PADROES.md`](design/PADROES.md) — padrões comuns (acessibilidade, tabelas, responsividade)
3. [`docs/design/ADMIN.md`](design/ADMIN.md) — percurso, componentes e aceite proporcional do admin
4. [`docs/design/PADROES-ADMIN.md`](design/PADROES-ADMIN.md) — componentes, CRUD, formulários, modais, filtros e feedback (admin)

### 3.2 Interface pública

1. [`docs/design/README.md`](design/README.md) — fluxo de agentes e hierarquia de decisões de design
2. [`docs/design/PADROES.md`](design/PADROES.md) — padrões comuns
3. [`docs/design/PUBLICO.md`](design/PUBLICO.md) — fluxos, páginas e regras de publicação da área pública

### 3.3 Formulários, tabelas, modais e componentes

1. [`docs/design/PADROES.md`](design/PADROES.md) — seções "Tabelas e ações" e "Acessibilidade"
2. [`docs/design/PADROES-ADMIN.md`](design/PADROES-ADMIN.md) — componentes e comportamentos específicos
3. [`docs/design/ADMIN.md`](design/ADMIN.md) — tabela de componentes e feedback

### 3.4 Acessibilidade

1. [`docs/design/PADROES.md`](design/PADROES.md) — seção "Acessibilidade e responsividade" (WCAG 2.2 AA, targets, zoom)
2. [`docs/VALIDACAO-ACESSIBILIDADE.md`](VALIDACAO-ACESSIBILIDADE.md) — evidências e limites dos testes de acessibilidade
3. [`docs/VALIDACAO-ACESSIBILIDADE-ADMIN.md`](VALIDACAO-ACESSIBILIDADE-ADMIN.md) — evidências específicas do admin
4. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/EXPERIENCIA.md` — seção "Acessibilidade" (meta WCAG, referência normativa)

### 3.5 Banco de dados e segurança

1. [`docs/decisoes/`](decisoes/) — decisões arquiteturais numeradas (001–019); ler apenas as relevantes ao contexto
2. [`docs/ACESSO-ADMINISTRATIVO.md`](ACESSO-ADMINISTRATIVO.md) — sessão administrativa e bootstrap
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
4. [`docs/design/VALIDACAO.md`](design/VALIDACAO.md) — evidências e limites dos protótipos
5. [`docs/VALIDACAO-SUMULA-DESKTOP.md`](VALIDACAO-SUMULA-DESKTOP.md) — validação da súmula desktop real
6. [`docs/VALIDACAO-ESTATISTICAS.md`](VALIDACAO-ESTATISTICAS.md) — validação das estatísticas
7. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` — fórmulas e regras esportivas

> [!NOTE]
> O diretório `docs/design/prototipos/` contém HTML navegável para referência de UX; **não** representa a implementação real. A implementação está em `src/games/` e `src/statistics/`.

### 3.8 Importação e gerenciamento de atletas/equipes

1. [`docs/decisoes/007-pessoas-e-papeis.md`](decisoes/007-pessoas-e-papeis.md) — identidade compartilhada atleta/técnico
2. [`docs/decisoes/008-importacao-de-elenco.md`](decisoes/008-importacao-de-elenco.md) — reaproveitamento de elenco
3. [`docs/decisoes/006-equipes-inscricoes.md`](decisoes/006-equipes-inscricoes.md) — equipes e inscrições
4. [`docs/ESCOPO-IMPORTADOR-DE-EQUIPES.md`](ESCOPO-IMPORTADOR-DE-EQUIPES.md) — escopo do importador
5. [`docs/ANALISE-IMPORTADOR-DE-EQUIPES.md`](ANALISE-IMPORTADOR-DE-EQUIPES.md) — análise detalhada
6. [`docs/VALIDACAO-IMPORTADOR.md`](VALIDACAO-IMPORTADOR.md) — validação do importador
7. [`docs/VALIDACAO-PESSOAS.md`](VALIDACAO-PESSOAS.md) — validação de cadastro de pessoas
8. [`docs/VALIDACAO-EQUIPES.md`](VALIDACAO-EQUIPES.md) — validação de equipes
9. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` — regras de matching e identidade

### 3.9 Testes, CI e publicação

1. [`CONTRIBUTING.md`](../CONTRIBUTING.md) — seção "Implementar e verificar": gate, browsers, lint, CI
2. [`docs/VALIDACAO-*.md`](.) — evidências de validação pertinentes à área alterada (apenas as relevantes)
3. [`docs/MATRIZ-ESCOPO.md`](MATRIZ-ESCOPO.md) — o que já foi validado e o que está pendente de aceite
4. `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/VALIDACAO.md` — entregas, cenários de aceite e critérios

---

## 4. Referências de especificação

Estes documentos estão em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/`. São insumos originais do produto, preservados byte a byte. Não alterar.

| Documento | Conteúdo |
| --- | --- |
| `docs/ESCOPO.md` | Requisitos, vocabulário e limites do produto |
| `docs/EXPERIENCIA.md` | Fluxos, preferências visuais e protótipos — **referência, não prova de implementação** |
| `docs/ARQUITETURA.md` | Módulos, dependências, segurança e especificação lógica do banco |
| `docs/CONTRATOS.md` | Fórmulas, formatos de entrada, regras esportivas e interfaces dos módulos |
| `docs/VALIDACAO.md` | Entregas, cenários de aceite e critérios |

---

## 5. Design e padrões de UI/UX

| Documento | Conteúdo | Área |
| --- | --- | --- |
| [`docs/design/README.md`](design/README.md) | Índice, fluxo de agentes, hierarquia de decisões e skills | Ambas |
| [`docs/design/PADROES.md`](design/PADROES.md) | Padrões comuns: hierarquia, acessibilidade, tabelas, responsividade | Ambas |
| [`docs/design/PADROES-ADMIN.md`](design/PADROES-ADMIN.md) | Componentes, CRUD, formulários, modais, filtros, combobox, feedback | Admin |
| [`docs/design/ADMIN.md`](design/ADMIN.md) | Percurso, componentes específicos e aceite proporcional | Admin |
| [`docs/design/PUBLICO.md`](design/PUBLICO.md) | Fluxos, páginas de disputa e regras de publicação | Público |
| [`docs/design/INTEGRACAO.md`](design/INTEGRACAO.md) | Contrato dos protótipos de súmula e estatísticas | Ambas |
| [`docs/design/SKILLS.md`](design/SKILLS.md) | Origem, licença, hashes e uso das skills `ui-ux-pro-max` e `web-design-guidelines` | Ambas |
| [`docs/design/VALIDACAO.md`](design/VALIDACAO.md) | Evidências e limites dos protótipos públicos | Público |

---

## 6. Decisões arquiteturais (ADRs)

Diretório: [`docs/decisoes/`](decisoes/). Leia **apenas** as decisões relevantes ao contexto. Não presuma que uma decisão revogou outra sem conferir datas e escopo.

| Decisão | Assunto |
| --- | --- |
| 001 | Protótipo local |
| 002 | Preview protegido por Cloudflare Access |
| 003 | Autorização e migrations |
| 004 | Sessão no servidor |
| 005 | Contexto transacional |
| 006 | Equipes e inscrições |
| 007 | Pessoas e papéis |
| 008 | Importação de elenco |
| 009 | Súmula persistida |
| 010 | PDF e fontes |
| 011 | Publicação por jogo |
| 012 | Regulamento declarativo |
| 013 | Classificação pública confirmada |
| 014 | Transferência atômica e retorno |
| 015 | Colocações e honrarias confirmadas |
| 016 | Estatísticas de snapshots confirmados |
| 017 | Perfil publicado independente |
| 018 | Equipes de resultados confirmados |
| 019 | Fonte estatística limitada por página |

---

## 7. Histórico e evidências

Preservados para consulta pontual. **Não substituem decisões vigentes.**

| Local | Conteúdo |
| --- | --- |
| [`historico/documentacao/`](../historico/documentacao/README.md) | Feedbacks, planos e handoffs de UI/UX encerrados |
| `historico/progresso/` (pendente de integração na main) | Checkpoints anteriores de progresso |
| [`docs/VALIDACAO-*.md`](.) | Evidências de validação técnica (por percurso) |
| [`docs/evidencias/`](evidencias/) | Benchmarks, concorrência e capturas de testes |
| [`docs/design/evidencias/`](design/evidencias/) | Evidências dos protótipos públicos |

> [!NOTE]
> `historico/documentacao/AJUSTES-DE-EXPERIENCIA.md` contém feedbacks de protótipo de 22–27/10. Regras permanentes aplicáveis foram absorvidas em `docs/design/`. Não tratar as orientações históricas como requisitos atuais sem verificar se foram incorporadas.

---

## 8. Hierarquia de decisões

Quando houver contradição entre documentos, resolva pela precedência abaixo. Não escolha arbitrariamente; identifique a origem, a data e o escopo:

1. **Requisitos obrigatórios:** segurança, privacidade, WCAG 2.2 AA e contratos do domínio
2. **Instruções atuais do responsável:** decisões explícitas e diretas, independente do canal
3. **Especificações e regras de negócio vigentes:** `docs/decisoes/`, `CONTRATOS.md`, `ESCOPO.md`
4. **Padrões permanentes do projeto:** `docs/design/PADROES.md`, `PADROES-ADMIN.md`, `ADMIN.md`, `PUBLICO.md`
5. **Recomendações das skills:** `ui-ux-pro-max`, `web-design-guidelines` — técnicas, não substituem identidade ou decisões do projeto
6. **Preferências genéricas dos agentes**

Quando não for possível resolver com segurança, identifique a origem e solicite esclarecimento do responsável.

---

## 9. Exemplos de documentos por tarefa

### Editar um jogo (entrada de dados / súmula)

Leia: `AGENTS.md` → `CONTRIBUTING.md` → `PROGRESSO.md` → `decisoes/009-sumula-persistida.md` → `design/INTEGRACAO.md` (seção Súmula) → `VALIDACAO-SUMULA-DESKTOP.md` → `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/CONTRATOS.md` (regras esportivas) → `design/PADROES-ADMIN.md` (formulários e feedback)

### Adicionar um atleta (cadastro / importação)

Leia: `AGENTS.md` → `CONTRIBUTING.md` → `PROGRESSO.md` → `decisoes/007-pessoas-e-papeis.md` → `decisoes/006-equipes-inscricoes.md` → `ESCOPO-IMPORTADOR-DE-EQUIPES.md` → `design/ADMIN.md` (adicionar atleta ao elenco) → `design/PADROES-ADMIN.md` (combobox, diálogo, feedback)

### Melhorar o layout de uma tabela administrativa

Leia: `AGENTS.md` → `CONTRIBUTING.md` → `PROGRESSO.md` → `design/README.md` → `design/PADROES.md` (seção Tabelas e ações) → `design/PADROES-ADMIN.md` → `design/ADMIN.md` → `VALIDACAO-ACESSIBILIDADE-ADMIN.md`

---

## 10. Manutenção deste índice

- Atualize ao criar ou arquivar documentos.
- Não acrescente documentos ao índice que não existam no repositório.
- Links relativos partem de `docs/INDICE.md`; ajuste se o arquivo for movido.
- Preserve a separação entre documentos ativos (seções 1–7) e histórico (seção 7).
