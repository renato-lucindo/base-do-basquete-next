# Progresso atual

## Auditoria de rascunhos e compatibilidade — 10/11/2026

Na PR #75, o leitor público agora remove referências de jogos privados de `configuration.assignments`, `configuration.customDefinition` e `legacyDefinition`, incluindo `groupPhases[].groups[].gameIds` e `series[].games`. A configuração administrativa e os registros de partidas não são alterados. Teste de regressão em `src/games/visibility-database.test.ts` cobre fonte anônima legada/customizada, manutenção do cálculo público e histórico privado.

Migration imutável `20261110145957_public_nested_definition_visibility.sql` aplicada em `base-do-basquete-next-dev`. Consulta anônima após a aplicação: 26 jogos e resultados públicos, ID da semifinal ausente e detalhe privado bloqueado, inclusive após a migration independente `20261110150011_public_detail_visibility_compat` da PR #76. Advisors sem novas categorias. O jogo IVV/Cetaf × Saldanha continua `draft`, sem alteração de placar, súmula ou versões. A CI do código teve o gate completo aprovado antes de alinhar o nome da migration; conferir CI do HEAD atual antes do merge.

A PR #76 continua independente e contém a correção complementar no leitor de detalhes. Não fazer merge de nenhuma PR sem aprovação específica; nenhum Worker principal/preview foi publicado nesta etapa.

---

## PR75 — rascunhos privados e classificação pública — 10/11/2026

Unidade `codex/campeonato-flexivel`, [PR #75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75), **draft/sem merge**. A função de visibilidade `draft/published` tem auditoria e mantém súmulas/publicações históricas. Testes de código anteriores passaram em [CI #42673679723](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42673679723) (7/7, SHA `4a53e1f`); não inferir que PASS antigo valida commits posteriores.

### Incidente resolvido no leitor de classificação flexível

Depois da conversão autorizada da semifinal em rascunho (09/11), a página pública da Copa ES Sub-15 passou a mostrar erro de classificação. Causa comprovada: `private.competition_setups.document.assignments` ainda referenciava o jogo privado como `unassigned`, enquanto `get_live_competition_source` enviava apenas jogos públicos. A validação de `buildCompetitionDefinition` rejeitava essa associação ausente, provocando erro na API.

Correção na mesma PR:

- `src/regulation/setup-provider.ts`: a projeção pública descarta associações sem ID no catálogo público, sem modificar a configuração administrativa.
- Migration de leitura **`20261110115128_public_competition_draft_assignments.sql`**: `public.get_live_competition_source` remove previamente de `configuration.assignments` qualquer referência a jogo fora dos `games` públicos, sem exibir o ID privado no payload. Nenhuma DML; privilégios e RLS preservados.
- `src/regulation/setup-database.test.ts`: teste PGlite publica dois jogos, coloca um em draft, valida tabela e placar do outro jogo, ausência de ID privado na fonte pública e preservação da configuração no admin. Também testa compatibilidade do cliente com resposta antiga contendo associação privada.

O job **checks** da [CI #42810041580](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42810041580) (SHA `45d7a0ad`) concluiu **SUCCESS** com gate completo e o teste de banco; design e WebKit também passaram, Chromium ainda estava executando na última consulta. A renomeação do arquivo da migration e este checkpoint geram novos SHAs; conferir CI do HEAD atual antes de integrar. Não há mudança de bundle publicada desde a versão descrita abaixo.

### Serviço, dados e verificações

- Supabase DEV: `base-do-basquete-next-dev` / `nizmasjddyrhmevvfviz`. Migrations aplicadas: `20261109163216_game_draft_visibility`, `20261109181057_legacy_standings_visibility` e agora `20261110115128_public_competition_draft_assignments` (**SUCCESS**, nome do SQL alinhado ao histórico remoto). Verificação anônima depois da última migration: **26 jogos/26 resultados**, `configuration.assignments=[]`, ID da semifinal ausente do payload, `get_public_game` retorna `null`. Segurança: advisors sem novas categorias.
- Semifinal real Copa ES Sub-15 masculino: disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96`, game `62d99b70-21c9-495f-b0d7-44c0f53b4380`, IVV/Cetaf **88×35** Saldanha. Alteração administrativa autorizada em 09/11 20:28:47 UTC, command `df6c522a-e59f-40c7-9057-7664b857e2b9`. Permanece **draft v1**, jogo `finished` v4, publicação histórica v1, placar e súmula preservados. A configuração admin ainda contém `unassigned` deste game: não foi sobrescrita.
- Cloudflare: preview isolado `base-do-basquete-next-pr75` protegido por Access, deploy existente `c194c9db-3b70-4b37-be2b-1a6e78470727` (fonte `f8598a9`). O SQL corrigido é lido imediatamente pelo preview sem rebuild; contudo **nenhum smoke de interface autenticado foi realizado** após esta migration. Workers principal e UIUX não foram publicados.

**Próximo passo:** confirmar CI do novo HEAD, testar visualmente a página pública da classificação no preview com Access e registrar evidência. Não republicar a semifinal, não fazer merge/deploy de Workers/produção sem autorização separada.
