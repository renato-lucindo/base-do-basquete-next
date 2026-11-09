# Progresso atual

## PR75 — visibilidade privada de jogos — 09/11/2026

Unidade `codex/campeonato-flexivel`, [PR #75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75), **aberta/draft**, sem merge. O recurso permite alternar a visibilidade de uma partida entre `published` e `draft` com histórico, autorização administrativa e proteção das leituras públicas. Nenhum jogo real foi convertido em rascunho.

### Ambiente e publicações

- **Cloudflare:** Worker isolado `base-do-basquete-next-pr75` implantado pelo Codex em 09/11, versão `c194c9db-3b70-4b37-be2b-1a6e78470727`, fonte `f8598a95389390d89102464f81d0efc59d33f754`, deployment `5d41c96a-762b-4a81-8741-cee87f363836` (100%). O preview permanece protegido por Access; segredos, DO, rate limit e bindings preservados. Workers principal (`base-do-basquete-next-preview`) e UIUX não foram atualizados.
- **Supabase dev compartilhado:** `nizmasjddyrhmevvfviz`. Migration `20261109163216_game_draft_visibility` aplicada, com 0 jogos alterados. A correção de compatibilidade do leitor legado é a migration **`20261109181057_legacy_standings_visibility`**, aplicada em 09/11, somente redefinição da função de consulta `public.get_public_standings`; nenhum DML, mudança em Auth/Access ou nas políticas RLS. Arquivo da branch alinhado ao número do histórico remoto.
- **Regressão:** o leitor legado agora filtra os IDs privados de jogos, placares, ocorrências e atribuições (grupo/série/pendências), preservando a fonte confirmada e os resultados das demais partidas. Sem rascunhos, devolve exatamente o objeto antigo. Teste com classificatória publicada e semifinal privada, com republicação, em `src/games/visibility-database.test.ts` executado no gate PGlite. No SHA `062612eb834762332799487d41ed56c61ec7bdd2` o job **checks** integral e os jobs design, WebKit e browsers (2) passaram; o browser (1) e o `validate` ainda precisavam de conclusão na última verificação. A renomeação posterior do arquivo de migration exige CI do novo HEAD; não atribuir testes do SHA anterior ao atual.
- **Verificação remota:** após aplicar a correção, o hash da fonte de classificação confirmada da disputa foi preservado (`535553f5e78e980f5d9c511ab7b480b8`). Advisors de segurança sem novas categorias; permissões RPC mantidas. Não houve teste de escrita no banco remoto.

### Partida existente e limites

Copa ES Sub-15, disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96`, semifinal `62d99b70-21c9-495f-b0d7-44c0f53b4380`, **IVV/Cetaf 88 × 35 Saldanha da Gama**, jogo administrativo v4 (v3→v4 por salvamento de documento idêntico), publicação v1. Permanece `finished` e publicada; **0 alterações de visibilidade**. O snapshot legado confirmado dessa disputa já possui 0 jogos, antes e depois da correção; preservar classificação significa que ela não desaparece por causa do rascunho, não preencher automaticamente os jogos que nunca integraram esse snapshot. O leitor flexível do preview utiliza a fonte pública ao vivo.

Limites não solucionados nesta etapa: jogos recém-criados começam publicados até a ação administrativa de mover a rascunho; a projeção de determinados agregados públicos pode depender de publicação/recalculo específico. O preview com Access não recebeu smoke remoto autenticado nesta inspeção.

**Próximo passo:** confirmar a CI do HEAD real e revisar a apresentação pública, depois obter **autorização humana específica** antes de mudar a visibilidade da semifinal. Não mesclar PR75 nem publicar os Workers principal/UIUX. Referência da entrega visual original: [evidências do bracket](evidencias/2026-11-08-bracket-eliminatoria.md).
