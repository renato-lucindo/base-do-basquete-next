# Auditoria de reaproveitamento — Base do Basquete anterior

27/10/2026. Pedido do responsável: examinar primeiro o repositório anterior e a pasta local, antes de retomar as demandas. Problema prioritário: inscrever a mesma equipe em outra disputa exige reinserir o elenco manualmente.

## Fontes e alcance

- GitHub consultado pelo plugin oficial: `renato-lucindo/base-do-basquete`, ref `main`, README e implementação de cópia de inscrições/elencos.
- Pasta autorizada: `C:/Users/12405304716/Documents/Codex/Base do Basquete`; branch `codex/independent-registrations-copy`, HEAD `137b78b6039a6cb7f34848e05f17c4b95b707f9a`.
- Há **15 arquivos modificados sem commit** nessa pasta, incluindo importador, matching, motor manual, rota e HANDOFF. Origem externa a esta execução; todos preservados. A cópia local não pode ser tratada como sinônimo de `main`.
- Dois arquivos relevantes têm o mesmo blob no GitHub e no disco: rota `admin.competitions.$competitionId.registrations.copy.tsx` (`8717a7c519e7b1f5e486ce8eb29938221e4a880b`) e SQL `20261006115000_registration_copy_lateral_joins.sql` (`3e18a4f33de95a21b3ba3d11928ee0875bdb689a`). A referência de cópia não é apenas uma ideia em documentação.
- Inventariadas as13famílias de módulos,34componentes e31rotas TSX; leitura dirigida de fluxos, funções e testes relevantes. Inventário de13arquivos-chave e estadoGit em `.preview-artifacts/reuse-audit-inventory.json`, SHA256`598712ed51dc4bd8664162950077d28d9b398f34ab51f423ced488a063c53864`.
- Auditoria estática comparativa, não validação de todas as linhas do projeto ou de sua instalação real. Nenhum build/teste/script antigo foi executado; nenhum serviço, banco, segredo ou dado antigo foi acessado. Testes mencionados abaixo foram lidos, não declarados aprovados nesta auditoria.
- A autorização atual permite consultar e aproveitar referências do projeto anterior; não substitui os contratos atuais do ZIP/feedback nem autoriza migrar banco, copiar dados de produção ou aplicar migrations antigas.

## 1. Achado prioritário: reaproveitar elenco

### O que já existe na referência

1. **Sugestão no editor de elenco:** a rota do hub consulta inscrições anteriores da mesma equipe, nomes e camisas, identifica conflito com outra inscrição e entrega `suggestedRoster`/`suggestionLabel` ao componente.
2. **Origem identificada:** o usuário vê de qual inscrição/disputa veio a sugestão. Quando há A/B da mesma equipe na origem mais recente, o hub evita adivinhar e encaminha à escolha explícita.
3. **Cópia assistida de equipes e atletas:** tela própria escolhe disputa de origem da mesma edição, inscrições e atletas; apresenta conflito de nome público, vínculo já existente, incompatibilidade de naipe, inatividade ou elegibilidade pendente.
4. **Confirmação transacional:** a RPC revalida contexto, identidade e disponibilidade; preserva pessoas/equipe global, cria inscrições e vínculos novos, copia camisa e registra recibo privado. Replay consulta recibo antes das condições mutáveis.
5. **Testes úteis como casos de adaptação:** SQL comprova a intenção de preservar origem, separar vínculos, manter a equipe global, replay idêntico e recusar pedido divergente; teste HTTP verifica replay e autorização. Não transferir seus resultados de execução para a aplicação nova.

Arquivos de referência:

- `app/routes/admin.competitions.$competitionId.tsx:301` — inscrições de origem, desambiguação em319–328 e sugestão em410–449.
- `app/components/admin/roster-editor.tsx:95` — candidatos sem conflito; ação em156–157 e apresentação em170–185.
- `app/routes/admin.competitions.$competitionId.registrations.copy.tsx:170` — origem/contexto e prévia; confirmação em228–263; seleção explícita em335–385.
- `supabase/migrations/20261005193000_independent_team_registrations.sql` — contrato/base da cópia; definição final do writer em `20261006115000_registration_copy_lateral_joins.sql:4`.
- `app/routes/admin.registrations-copy-action.test.ts:33` e `supabase/tests/database/independent_team_registrations.test.sql:151` — casos a portar/adaptar.

### Lacuna comprovada na nova Base

A nova Base já compartilha a identidade global da equipe e da pessoa e permite a mesma pessoa em disputas diferentes. `one_active_registration_per_dispute` impede somente vínculos simultâneos dentro da mesma disputa. O problema está na jornada: salvar a inscrição não oferece elenco de origem e `SupabasePeople.listRoster` lê somente uma inscrição informada. `TargetPicker` permite escolher equipe global existente, mas isso não traz seu elenco. Preparação da súmula consulta histórico da própria inscrição, não resolve inscrição em nova disputa.

Assim, existem **duas funcionalidades distintas**: sugerir participantes para um jogo da inscrição atual (já disponível) e aproveitar atletas de outra inscrição da equipe (ausente). Uma não cobre a outra.

### Adaptação necessária antes de implementar

- Oferecer reaproveitamento tanto ao inscrever equipe existente quanto ao abrir uma inscrição já criada com elenco vazio. O responsável já criou o destino: não obrigar a criar outra inscrição para usar a cópia.
- Relacionar origem por `teamId`, e pessoa por `personId`; nome parecido nunca substitui identidade. Mostrar disputa/categoria/temporada de origem e permitir escolher entre elencos A/B, sem misturá-los silenciosamente.
- Priorizar origens do mesmo campeonato/temporada. A referência de sugestão do hub busca outros contextos amplamente; a cópia dedicada limita à mesma edição. Fechar no contrato atual qual consulta é oferecida, sem herdar implicitamente um desses alcances.
- Preservar os atletas que o responsável já cadastrou no destino. Mesma pessoa já vinculada vira “já incluído”, não pessoa/vínculo duplicado. Camisa divergente precisa de decisão explícita; `0`, `00` e ausência continuam distintos.
- Prévia compacta com atletas elegíveis selecionados, camisas editáveis, bloqueios explicados e confirmação. Não expandir uma lista geral nem enviar texto artificial para reconhecer novamente IDs já conhecidos.
- Revalidar servidor/banco ao confirmar; preservar recibos, versões, guardas, origem e histórico. Não transportar grants/locks/RPCs do schema antigo diretamente. Avaliar reutilizar as primitivas atuais de revisão/confirmação C4, com origem tipada, em vez de outro motor de cadastro.
- Não copiar titulares, participação, capitão ou técnico-capitão como se fossem dados do elenco; são escolhas do jogo. Comissão exige contexto/vigência próprios.
- Elegibilidade usa as regras efetivamente existentes. Não inferir limite etário pelo texto de uma categoria nem inventar nascimento para permitir a cópia.

## 2. Matriz de reaproveitamento por área

| Área                                 | Referência anterior examinada                                                                                      | Aproveitamento na nova Base                                                       | Decisão                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Equipe e inscrições independentes    | rota de cópia, SQL e testes citados acima                                                                          | origem identificada, seleção e conflitos, manutenção da identidade global         | **P0**, adaptar também para inscrição destino já existente                                      |
| Editor de elenco                     | `components/admin/roster-editor.tsx`, `admin-player-search.tsx`                                                    | resumo de selecionados/conflitos e apresentação da origem                         | **P0**, manter dropdown atual e adição sem apagar destino                                       |
| Importação de equipe/elenco          | `players/team-import-*`, rota `admin.players.import-text.tsx`                                                      | conferência por linha, escolha existente/novo, correção e decisão explícita       | **P0**, comparar com C4; não reimplementar parser/matching já corrigidos                        |
| Correspondência de jogadores/equipes | `boxscore/matching.ts`, `team-registration-resolution.ts`                                                          | normalização, alternativas, correspondência única e desambiguação                 | aproveitar casos; preservar matching conservador atual e IDs                                    |
| Súmula: preparação e grade           | `scoresheet/domain.ts`, `editor.tsx`, `compact-grid.tsx`, rota `scoresheets.new`                                   | 12vagas, busca/troca de atleta, última camisa e relação anterior                  | já coberto e refinado na nova Base; reutilizar somente lacunas demonstradas                     |
| Súmula: disciplina/eventos           | `manual-scoresheet-engine/domain.ts`, `scoresheet/domain.ts`                                                       | casos de sequência/desfazer e conferência visual                                  | não substituir motor atual; há incompatibilidade concreta com `U2`                              |
| Estatísticas simples                 | `statistics-explorer.tsx`, `statistics/public-statistics.server.ts`, `table-controls.ts`                           | colunas/legenda, ordenação, filtros, totais/médias, paginação e comparação visual | referência forte, mas público continua adiado; cálculo novo mantém cobertura e IDs de inscrição |
| Estatísticas boxscore                | `boxscore-statistics-explorer.tsx`, `boxscore-statistics-domain.ts`, `boxscore-metrics.ts`                         | tabelas, seleção de colunas, per30, amostra e ausência distinguida de zero        | boa base de apresentação/testes; adapter atual já separa fontes confirmadas                     |
| Jogo, atleta e equipe públicos       | `game-statistics.tsx`, `player-profile.tsx`, `team-profile.tsx`, domínios correspondentes                          | parciais, carreira, vínculos históricos, honrarias, navegação e seções            | preservar DTOs publicados novos; não consultar cadastro privado ao montar perfil                |
| Tabelas largas e busca contextual    | `scrollable-table.tsx`, `contextual-search.tsx`, `search/public-search-domain.ts`                                  | barra superior sincronizada, foco, indicação de rolagem, contexto e URL           | componente candidato para a etapa pública, sem criar serviço de busca agora                     |
| Cadastro de campeonato/edição        | `edition-wizard.tsx`, `edition-workflow.ts`, rotas administrativas                                                 | campos contextualizados, retorno e validações compreensíveis                      | adaptar padrões ao editor atual numa página; não impor wizard/pré-condições extras              |
| Regulamento, agenda e exceções       | `ruleset-editor.ts`, `ruleset-clone.ts`, `scheduling.ts`, `sports-exceptions.ts`                                   | cópia de estrutura privada, prévia de impacto e erros contextualizados            | regras principais já existem; clone/presets apenas se couberem no escopo priorizado             |
| Publicação e divergências            | `ingestion/comparator.ts`, rota `data-conflict`, `publication.ts`, `admin-readiness.ts`                            | conferência de fontes, motivos, conflitos e indicadores de pendência              | preservar publicação por jogo e modelo misto manual/PDF; não portar publicação rígida da edição |
| Remoção e histórico                  | `competition/admin-domain.ts`, política SQL de remoção                                                             | diferença entre excluir vazio e retirada com histórico                            | inscrição vazia/retirada já disponíveis; demais entidades seguem pendentes                      |
| Rascunhos, ações e erros             | `admin-drafts/*`, `sticky-action-summary.tsx`, `inline-field-error.tsx`, `unsaved-changes-guard.tsx`               | status claro, ações perto dos dados e proteção da edição                          | preservar rascunhos/ACK novos; não copiar armazenamento local de dados privados                 |
| Auth, HTTP, observabilidade e health | `auth/authorization.server.ts`, `http/security.server.ts`, `observability/operation.server.ts`, `health.server.ts` | padrões de correlação/sanitização como referência                                 | fundação nova existente; não transportar MFA obrigatório, sessão, credenciais ou infraestrutura |
| PDF FIBA/Site                        | `boxscore/parser.ts`, `site-parser.ts`, `extract.server.ts`, `review-editor.tsx`                                   | fixtures, contrato de extração, resolução assistida e testes                      | somente referência agora; correção do PDF real continua adiada pelo responsável                 |

## 3. Cuidados concretos: referências que não devem voltar como regressão

1. **Substituição de elenco:** `roster-editor.tsx:156–157` aplica `playerMap(availableSuggestion)` e seu formulário envia `replace-roster`. Copiar isso literalmente pode remover seleção/destino existente. A nova necessidade é reaproveitamento conferido, preservando o que já foi salvo.
2. **Cópia que sempre cria inscrição:** writer final antigo insere em `team_registrations` em214 e depois em `roster_entries`. Não atende diretamente ao destino que já existe. Reutilizar a jornada e os casos, não transplantar o SQL.
3. **Matching por substring:** cópia local modificada de `players/team-import-matching.ts:61` usa `a.includes(b) || b.includes(a)`. Pode voltar a sugerir “João Silva” para “João”, exatamente a reclamação anterior. Manter a correção conservadora já existente em `src/text-import/name-matching.ts` e sua paridade SQL.
4. **Parser ainda dependente de posição:** cópia local de `team-import-domain.ts:46–50` identifica camisa só no primeiro campo. Datas de dois dígitos e números sem unidade também diferem do MVP atual. Não regredir o parser novo; refinamento adicional está adiado.
5. **Decisão ausente vira criar:** `team-import-confirmation.ts:24` usa `decisions[index] ?? "create"`. Não aproveitar esse default na confirmação nova; identidade e criação devem ser escolhas verificadas.
6. **Disciplina incompatível:** `scoresheet/domain.ts:110` soma2antidesportivas para `U2`. No contrato atual, o sufixo2 indica lances livres; a falta `U` é contada uma vez (`src/domain/scoresheet.ts:265`). O motor atual e seus testes prevalecem.
7. **Fluxos obrigatórios excessivos:** `admin-readiness.ts` encadeia elenco/agenda/resultados/publicação e origem primária por disputa. Usar indicadores como ajuda; não bloquear jogos diretos nem substituir a regra confirmada de simples com todos os jogos e completa só com boxscore.
8. **Dados ausentes:** o domínio antigo de detalhe inicia totais emzero. O pipeline novo distingue indisponível, zero e amostra insuficiente; DTOs novos não devem receber zeros fabricados para preencher a tabela antiga.
9. **Busca e rascunho antigos não são substitutos automáticos:** `admin-player-search.tsx` exibe resultados em lista e `admin-drafts/client.ts` usa localStorage. Manter o dropdown compacto, guardas de respostas antigas e privacidade/retomada atuais.
10. **Schema e autorização diferentes:** números/bigints e entidades antigas `competitions/players/team_registrations` não correspondem a `championships/seasons/disputes/persons/registrations` com UUIDs e contas do novo projeto. MFA `aal2` obrigatório e políticas antigas são referência histórica, não requisito novo.

## 4. Ordem recomendada para as demandas após esta auditoria

1. **Reaproveitamento de elenco na inscrição existente:** consulta de origens da mesma equipe/contexto, prévia porIDs, seleção/camisas/conflitos e confirmação sem duplicar nem sobrescrever. Caso-base real: mesma equipe, mesmo campeonato/temporada, duas disputas,11atletas já cadastrados.
2. **Integrar no ato de inscrever/importar:** equipe global encontrada → inscrição de destino explícita → oferta de elenco já conhecido; texto fica como alternativa. Testar homônimos de equipe, A/B, destinatário já preenchido e importação repetida.
3. **Fechar unidade com provas novas:** zero/cópia parcial/elenco existente,0/00/null, naipes/vínculos, origem alterada/409, ACK/retry/reauth, indisponibilidade e rollback; backend antes da gravação e desktop compacto. Reutilizar as evidências inalteradas.
4. Concluir CI/publicação protegida da apresentação já implementada (`018050a`) em composição com essa correção prioritária, mantendo a possibilidade de revisar a unidade visual separadamente.
5. Aproveitar depois os componentes de apresentação pública das estatísticas e perfis, respeitando o adiamento atual. Outros candidatos da matriz entram por necessidade demonstrada, sem ampliar automaticamente o MVP.

## Resultado desta etapa

Auditoria registrada **antes de iniciar implementação da correção de elenco**, conforme solicitado. A principal perda de experiência foi identificada e há referência real reaproveitável, com adaptações delimitadas. Nenhum código, teste, banco ou serviço antigo/novo foi alterado; somente documentação na branch `codex/auditoria-reuso`, baseada em `0c42cba`. O código visual anterior e suas evidências permanecem válidos. A auditoria não equivale a aprovar ou migrar integralmente o projeto anterior.
