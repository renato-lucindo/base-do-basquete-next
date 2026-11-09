# Progresso atual

## PR75 — visibilidade privada de jogos — 09/11/2026

Unidade `codex/campeonato-flexivel`, [PR #75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75), **aberta/draft**, sem merge. O recurso permite alternar partidas entre `published` e `draft` com controle administrativo, histórico e filtragem pública. CI do último SHA de código `4a53e1f8577ee4de4642345e7ea57104d7d9de1e`: [execução #42673679723](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42673679723), **SUCCESS na tentativa 2, 7/7 jobs** (checks, Chromium 1/2, WebKit, design, scope e validate). A falha de tentativa anterior foi `Internal server error` do GitHub Actions sem jobs. O commit deste checkpoint é apenas documentação; verificar sua própria CI separadamente.

### Ambientes

- **Cloudflare:** Worker isolado `base-do-basquete-next-pr75` implantado em 09/11, versão `c194c9db-3b70-4b37-be2b-1a6e78470727`, fonte `f8598a95389390d89102464f81d0efc59d33f754`, com Access e bindings preservados. Os Workers principal (`base-do-basquete-next-preview`, associado a `basedobasquete.com.br`) e UIUX não foram alterados. Mudanças posteriores da PR75 são SQL, testes e documentação; nenhuma publicação adicional do Worker foi realizada.
- **Supabase desenvolvimento:** projeto `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`). Migrations aplicadas e versionadas: `20261109163216_game_draft_visibility` e `20261109181057_legacy_standings_visibility`. A última altera somente a RPC pública de leitura legada, preservando o snapshot e omitindo games privados sem ocultar toda a disputa. Advisors sem novas categorias após a migration.
- **Teste:** regressão PGlite `src/games/visibility-database.test.ts` verifica calendário, classificação, placares e inscrições quando uma semifinal publicada passa a draft e volta a ser publicada. Gate completo verde no SHA citado.

### Semifinal real — alteração autorizada e executada

**Copa ES Sub-15 masculino**, disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96`, game `62d99b70-21c9-495f-b0d7-44c0f53b4380`, **IVV/Cetaf 88 × 35 Saldanha da Gama**, `finished`, game v4, publicação v1. Com autorização expressa do responsável, em **09/11/2026 20:28:47 UTC**, `public.save_game_visibility` foi executada no Supabase DEV sob contexto da única conta administrativa habilitada e verificada. Command `df6c522a-e59f-40c7-9057-7664b857e2b9`, resposta: `visibility=draft`, versão de visibilidade **1**. Motivo: semifinal cadastrada antes de concluir a classificatória; manter privada até confirmação dos confrontos. Auditoria `private.game_visibility_heads/versions/commands` verificada.

**Verificações remotas após a operação:** game v4, `finished`, publicação v1 e placar histórico 88×35 **inalterados**, 27 fatos de jogos preservados fisicamente no banco. Sob role `anon`: `public.get_public_game` da semifinal é `null`; publicação da semifinal inacessível; fonte pública flexível apresenta **26 jogos e 26 resultados**, sem seu ID; 26 partidas permanecem visíveis em `published_games`. Estatísticas públicas têm 26 jogos e os registros de atletas da semifinal são filtrados. Não havia conquistas públicas derivadas na disputa. O leitor legado continua retornando objeto não nulo, mas seu snapshot publicado já possuía **0 jogos antes da alteração**; não inventar dados de classificação não confirmados.

### Próximo passo e restrições

Validar visualmente no preview protegido por Access, em sessão administrativa e anônima, que a partida desapareceu das páginas públicas e segue acessível no editor privado. Depois decidir os ajustes restantes e eventual merge/deploy **sob autorização separada**. Não republicar a semifinal sem ordem expressa. Não alterar dados reais adicionais, Access, secrets, Worker principal, ou integrar PR75 por inferência.
