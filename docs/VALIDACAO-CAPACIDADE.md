# Capacidade das fontes confirmadas

## C1 — reconciliação e auditoria, 26/10/2026

Base e1d74851a8634654d08e05dd4693dc13c71f8c59, branch sequencial codex/capacidade-consultas, sem alterações humanas encontradas. Remoto reconciliado 0/0; PR20 draft OPEN/MERGEABLE/sem pareceres. CI40266720462 SUCCESS495unitários/338browsers continua válida para o preview72eb9b6. Não se repete esse gate por retomada. Cota inicial real5%usados5h/1%semanal, ferramentas permitiram trabalho; resets desta janela substituem os horários antigos do checkpoint.

Serviços reconferidos somente por leitura:43migrations imutáveis/última20261025221911, banco17.11 com1pessoa/1Auth/0jogos/0fontes estatísticas. Cloudflare deploymentbaf42899-9e0e-4c1d-9cfe-72ed37b50531/versão4d8be184-c483-4bef-8c29-03c0f61296fb100%; Access somente responsável, previewsOFF. Nenhum seed, DDL ou deploy remoto nesta investigação.

### Consumidores e dependências reais

| Caminho | Dependência atual | Consequência para a evolução |
| --- | --- | --- |
| Trigger confirmed_game_statistics → private.refresh_confirmed_statistics | public.published_games completos → public.published_statistics.snapshot agregado, guarda4MiB; rootlock antes da linha | A publicação G4 pode falhar por volume agregado. Remover a reconstrução do blob da escrita, preservando transação/recibo/linhagem. |
| private.statistics_publication_versions/changes | Metadados imutáveis e referências incrementais com FKs por disputa/jogo/versão | Já é incremental. Preservar integralmente; não copiar todos os jogos para cada nova versão. |
| Trigger confirmed_player_games → private.refresh_player_game | Varre snapshot.games do head para correlacionar jogo/versão e obter fase/mínimo | Não basta trocar o leitor HTTP: este consumidor precisa ler metadados confirmados e referência do jogo sem reconstruir o agregado. Ordem alfabética dos triggers deve continuar estatísticas → participações. |
| get_public_statistics_source → src/statistics/source-provider.ts | RPC pública fixa, resposta completa limitada5MiB, timeout8s | Estatísticas e equipes compartilham o leitor. Compatibilidade deve dar fonte completa correta ou erro explícito, nunca head compacto disfarçado de games vazio. |
| src/statistics/provider.ts e src/team-statistics/provider.ts | Validam/correlacionam a fonte antes do DTO, cálculos puros preservam cobertura/ausência | Carregamento em páginas exige versão única, fim verificável e limite total; nenhuma tabela parcial pode produzir totais. |
| get_player_career_source e src/player-profile/provider.ts | Projeções próprias public.published_player_games, não o blob estatístico; limite10000/4MiB próprio | Perfil depende do trigger de projeção durante a publicação, mas seu GET tem capacidade separada. Não declarar resolvido esse outro limite sem medir. |
| Tipos gerados / tests/access-worker.test.mjs / provider.test.ts | Assinatura e outbound da RPC atual | Atualizar tipos e contratos de transporte quando a interface nova estiver fechada; manter credenciais fora do browser. |
| supabase/tests/statistics.sql e player_participations.sql | Comparações da fonte completa, falha atômica, RLS, replay e histórico | Acrescentar provas para head/páginas e migração com dados preservados, sem editar migrations aplicadas nem desabilitar guardas. |

Índices observados no serviço novo: published_games PK(game_id) e contexto(dispute_id,published_at DESC,game_id); published_statistics PK(dispute_id) e (dispute_id,version); published_player_games PK(person_id,game_id), pessoa/contexto, publicação, contexto e versão estatística. Leitura keyset por disputa/game_id precisa de plano medido e, se necessário, índice correspondente; não inferir bom plano por existir índice de agenda/publicação.

### Ensaio descartável em preparação

`tests/fixtures/confirmed-capacity.ts` cria100inscrições explícitas,600atletas com camisas0/00,1000jogos agendados e publica pelo writer G4 real, com cinco titulares por lado, capitão-técnico explícito, banco DNP e todas as guardas/triggers ligados. Não usa padding, acesso remoto nem bypass. Runner separado do gate: `npx vitest run --config docs/evidencias/benchmarks/confirmed-capacity-db.config.ts`.

**RED reproduzido duas vezes:**706publicações concluídas, jogo707 recusado por PT413/statistics_source_too_large. A segunda execução acrescentou asserções de atomicidade/FKs e EXPLAIN:706súmulas/recibos/histórias/versões estatísticas/mudanças,7766participações, jogo707 ainda scheduled/versão1; todas essas asserções passaram antes da falha esperada na exigência1000jogos. Fonte atual4.193.169bytes, fixture planejada validada pelo contratoTS5.388.436bytes compactos/5.939.446JSONBtextual (diferenças de timestamps explicam poucos bytes entre execuções). Tempo da execução2 aproximadamente84s de publicações/87s total; não é latência de uma única publicação nem throughput de serviço.

Ambiente observado: Node24.18/Windowsx64, PGlite0.5.11/PostgreSQL18.6 WASM; o serviço real é17.11, portanto paridade da migration ainda exige prova própria nele. EXPLAIN local keyset depois do cursor500 usou PK(game_id), filtrando dispute_id depois do índice;100linhas, ExecutionTime0,404ms. Uma disputa isolada não prova bom plano com vários contextos; índice composto e volume misto ficam para C2. Artefatos capacity-c1-red.log/baseline JSON e capacity-c1-atomic-red.log/confirmed-capacity-db.json preservados ignorados; nenhuma aprovação de capacidade atribuída.

Planejado comparar JSONcompacto e octet_length(JSONB::text) de1000snapshots válidos, registrar ponto de falha e verificar ausência de recibo/súmula/versão/projeção parcial. Ambiente PGlite/PostgreSQL WASM local; não prova rede, edge, plano, carga ou concorrência multiconexão. Meta provisória de cálculo puro250ms permanece não atingida no benchmark anterior, registrada sem converter experimento em aprovação funcional.

Documentação consultada: changelog oficial Supabase em26/10, item25/09 Postgres15.19/17.11 trata extensões/operadores; esta unidade não cria esses objetos. Guia oficial de funções/isolamento/RLS deve ser correlacionado ao contrato antes da DDL. Nada altera autorização por user_metadata, histórico privado, fatos confirmados ou elegibilidade pública de rascunhos/agenda.
