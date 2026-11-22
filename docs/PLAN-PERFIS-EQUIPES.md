# Implementação dos perfis públicos de equipes

> Execução na mesma unidade e PR. Continuidade conforme CONTRIBUTING.md.

**Objetivo:** implementar os dois perfis aceitos em 22/11/2026, incluindo a última revisão do HTML.

**Arquitetura:** React/TypeScript nas rotas existentes; compor exclusivamente os leitores públicos atuais de catálogo, busca por identidade, classificação, status, conquistas, equipes e jogadores. Carregamento cancelável com concorrência limitada, limites explícitos e erros recuperáveis. Sem nova política de publicação, schema, migration ou dado sintético no produto.

**Referência:** `docs/design/PERFIS-EQUIPES.md` e HTML aceito em `docs/design/prototipos/perfil-equipes-aceito.html`.

## Restrições e foco de revisão

- Uma inscrição por linha; preservar identidades mesmo com o mesmo nome ou teamId.
- Disputas privadas/teste não participam dos agregados; site de disputa única e prévia limitam todo o carregamento ao contexto autorizado.
- Resultado esportivo contabilizado e estatística publicada são fontes distintas: não inventar colocação final, campanha, cobertura ou zero.
- Jogos sem data ficam depois dos datados; agenda não integra sequência de resultados.
- Links antigos, filtros, retorno e requisições concorrentes precisam conservar o contexto correto.

## Tarefas

- [x] 1. Contratos de rota e modelo: testes RED→GREEN para dois modos, aliases antigos, ano inicial, recortes, campanhas e pódios. Criar `src/team-profile/view-state.ts`, `model.ts` e testes focais.
- [x] 2. Leitura pública: criar `loader.ts` sobre os contratos existentes, com identidade por UUID, cancelamento, limites, paginação completa de catálogo e tratamento de 404 por fonte. Testar fontes vazias, privacidade, prévia e erro parcial explícito.
- [x] 3. Perfil geral e contextual: `public-page.tsx`, componentes próprios e CSS sobre o design system. Reutilizar tabela/controles de jogadores, coletivos, classificação e ícones existentes. Adaptar a classificação embutida para preservar o ID da equipe na URL. Testar navegação e todos os pedidos aceitos.
- [x] 4. Entradas e compatibilidade: montar o novo perfil em `equipe.html`, busca global com destino geral, inscrições com destino contextual, retorno compartilhável entre disputas. Atualizar testes que verificavam a interface substituída.
- [ ] 5. Validar e entregar: Vitest focal, browsers afetados, comparação visual com o HTML, revisão de diretrizes, gate consolidado e CI do SHA da PR. Atualizar checkpoint e evidências. Manter a PR aberta para avaliação no Worker e nova aprovação de integração conforme CONTRIBUTING.

## Registro de execução

- Base observada `824a3d59da5323202d869a4d93a1038bcd377044`; branch `codex/perfis-equipes`; worktree próprio. Checkout original e suas alterações preservados.
- Ruling: compor APIs públicas existentes em vez de criar uma nova API/migration — os contratos existentes já cobrem a entrega; evita duplicar autorização e domínio. Custo: mais requisições, limitadas por concorrência e capacidade explícitas.
- Execução e revisão final pelo agente principal; não há ferramenta de subagente disponível nesta sessão. Não declarar parecer independente.

- Implementação e revisão focal concluídas. Gate completo local aprovado (848 testes unitários, banco local, transportes, builds, Worker/PDF, fronteira cliente e segredos). Regressão completa de browsers e design em execução; CI ainda não executada. [Evidência](design/VALIDACAO-PERFIS-EQUIPES.md).
