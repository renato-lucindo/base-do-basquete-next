# Ocorrências da disputa — implementação R3d

> Executar inline com superpowers:executing-plans/TDD; decisões reversíveis delegadas. Continuidade em docs/PROGRESSO.md. Especificação: especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/ESCOPO.md§4/7 e arquitetura/contratos atuais. Não consultar repositório anterior.

**Objetivo:** registrar e revisar W.O., adiamento, interrupção, cancelamento, decisão administrativa e desistência com motivo, prévia, autorização e histórico, sem reescrever placar/súmula/estatísticas de origem.

**Arquitetura:** efeitos competitivos privados versionados separados dos fatos G4, heads explícitos e recibos; contexto mínimo de regulamento inclui somente efeitos ativos. Fonte é lida sob rootlock compartilhado e writers usam authfresh→commandlock→competitionroot exclusivo→head/links. Public wrappers securityinvoker, implementação privilegiada privada/search_path vazio; sem grants diretos e RLS defensiva. API/provider existentes continuam específicos e de mesma origem; nenhum SDK/segredo no browser.

**Escolhas relevantes:** efeito null é retirada explícita da ocorrência com nova versão/motivo, não DELETE; conserva rascunhos e permite conclusão/reagendamento pelos fluxos existentes. W.O. exige regra atual configurada; alterar regra recalcula o efeito após prévia de regulamento, não cria estatística. Publicação/agenda corrigida depois da decisão torna aquela ocorrência conflito pendente de revisão; não aplicar silenciosamente efeito vinculado a outra versão nem tornar toda consulta indisponível. Leitura histórica anterior mantém o snapshot original. Desistência lista explicitamente jogos anteriores, manter/desconsiderar, sem W.O. automático futuro.

**Contexto inicial:** branch codex/ocorrencias-disputa sobre c11f7ab (PR13), novo projeto nizmasjddyrhmevvfviz/link_6adaa8aab5688191b1e7ae1cddc55a82. Inspeção real24/10~21h confirmou0jogos/0regulation_versions/2inscrições/1Auth e migrations193855/194626; preservar novosdadoshumanos. ChangelogSupabase/docsRPC/privilegios/locks consultados24/10; TLS antigo/extensões especiais não usadas. Sem DDL de ocorrências aplicada no início. Usar CLI2.121.0/migration new, PostgreSQL descartável real/PGlite antes daDDL remota; apply_migration somente para migration estável, nunca editar já aplicada.

## Interfaces e revisão

O1domínio lê versões antigas de efeitos e retorna conflito; O2SQL recusa escrever com versões antigas. Distinguir tolerância de leitura de autorização de escrita. R3getRegulation_context fornece efeitos; getVersion usa snapshot imutável. SQL não recebe placar/projeção/autor do browser. Fingerprint do contexto inclui head de ocorrência/desistência e suas versões; concorrente em qualquer fonte exige nova prévia. Retirada mantém token/head de revisão, mesmo fora da lista de efeitos ativos.

Revisar: correçãoG4 com ocorrência antiga; W.O. sem regra ou regra removida; troca de adversários antes de confirmação; política de desistência com resultado novo fora da relação; replay após revogação/mudança de fonte; histórico/FKs e dados G4 preservados. Não alegar revisão independente/carga/corrida multi-conexão por mocks/banco vazio.

## O1 — domínio e contratos de ocorrência

- [ ] Testes RED src/regulation/occurrences.test.ts e organized.test.ts: decisão de versão de agenda/publicação anterior vira conflict/occurrence_review, efeito/outcome null e dependentes bloqueados; regraWO removida vira revisão pendente, sem500/award. Referência a jogo inexistente/UUID inválido e efeito estruturalmente inválido continuam recusados. Guardas de escrita antigas passam ao contrato de comando, não são retiradas da segurança.
- [ ] Implementar tolerância de fonte antiga somente na leitura/pura, preservar bytes/snapshot e propagar pendência; não contar resultado conflitante em classificação/série. Criar src/regulation/occurrence-contract.ts/test.ts para save/preview/get/history/ACK: IDs/disputa/versões/fingerprint fechados, motivo3–2000, efeito fechado nullable, impacto explícito. Comando até64KiB, histórico20/página, contexto≤10000jogos/1000inscrições; sem campos/fatos arbitrários.
- [ ] Focais contrato/domínio/types/lint/formatoGREEN, commit próprio. Reutilizar regressões inalteradas; semDDL/deploy nesta unidade.

## O2 — banco de ocorrências por jogo

- [ ] Escrever supabase/tests/game_occurrences.sql e src/regulation/occurrence-database.test.ts; usar fixtureG4+regulamento em transação/rollback. ObservarRED de RPC ausente antes de migrationCLI.
- [ ] Tabelas privadas game_occurrence_versions (id/game/disputa/revisão/effectnullable/motivo/autor/time/regulationVersion/gameVersion/publicationVersion/contextFingerprint), heads e commands. Histórico imutável, FKs contextuais/jogo/publicação histórica, índicesFKs/RLS/revogação de grants. Leiturahead/versão/paginação comfreshadmin. Auth antes de receipt, payload/ator iguais→ACK, diferentes→409.
- [ ] Escrita exige versões atuais de jogo/publicação/regulamento/contexto; winner deve ser adversário, award points/score coerentes, WO exige regra; referênciaforaDisputa/motivo/camposinjetados recusados. Antes de corrigir efeito sobre publicação existente, exigir motivo/impacto; retirar ocorrência também gera nova versão. AtualizarRecentes uma vez. Nenhuma alteração em public.games, published_games, drafts, PDFs, elenco ou estatísticas. Registro ativo ancora adversários; mudança contextual exige rever/desativar primeiro ou leitura bloqueia efeito obsoleto.
- [ ] Contexto regulamento passa a carregar efeitos ativos e revisões/tokens de todos heads, inclusive inativos. Adaptar contrato de contexto/fingerprint sem violar snapshots antigos: campo de revisões opcional no leitor antigo, sempre preenchido pelo novo; histórico pré-O2 continua válido. Não alterar migration193855/194626. Migrations de complemento próprias.
- [ ] Provas zero/upgrade preservandoG4/R3, RLS/grants/replay/revogação/impacto/FK/rollback, matrizSQL×TS do efeito; tipos/advisors/contagens reais depois de aplicar somente no projeto novo. Reconciliar versões/SHAs, não reaplicar por sessão.

## O3 — desistências e retorno explícito

- [ ] Contrato/SQL próprios por inscrição (head/version/id/ativo/policy/previousGameIds/reason/context/recibos). previousGameIds deve corresponder aos jogos com fato/award já revisados da inscrição nessa disputa; preservarâncoras e versões na gravação. Retirada de desistência gera histórico, não apaga fatos. Dois desistentes e novos resultados geram revisão explícita, nunca vencedor implícito.
- [ ] Testes RED→GREEN manter/desconsiderar resultados; histórico não reatribui estatística/participação, futuro não viraWO, evento fora da lista exige revisão. Guardas de versão/rootlocks/RLS/freshadmin e idempotência iguais às ocorrências; sem cascata.

## O4 — integração administrativa e consulta mínima

- [ ] Provider/métodosSessionStore/rotas específicas/get/preview/save/versão. Derivados calculados no backend de fonte atual, ACK correlacionado e sem pre-read que quebre replay. Limites/origem/sessão fresca antes do corpo/operação; testesworkerd com comandosidos/reauth/conflito/oversize.
- [ ] UI contextual em jogo/disputa: situação/motivo/efeito, prévia antes/depois, salvar/retirar/revisar, retomar sem perder edição. WOregra explícita dentro do regulamento, nenhuma pontuação sugerida universal. Preservar agenda/súmula/interrupção, retorno aos fluxos existentes; erro por item não descarta outro jogo. Browser desktop/mobile320/duasabas/reauth/ACK.
- [ ] Consulta pública de classificação (R3e): só regulamento confirmado e efeitos permitidos; DTO mínimo de identidade pública/grupo/fase/classificação/cobertura/lineage, sem autor/motivo/dados pessoais/rascunhos/jogos não atribuídos. Leitor consistente não usa projeção obsoleta após correçãoG4. Resultado público de jogo deve distinguir fonte/fato do efeito competitivo, sem0–0 ou stats inventadas.
- [ ] Gate único ao estabilizar unidade vertical/CI, previewAccess protegido e smokes novos; sem liberar URL. Reusar evidências válidas do harness126/banco/source inalterado. Etapas4humano/pilotoStorageHTTP e5restante permanecem abertas até prova/aceite correspondente; sem merge/produção por este plano.
