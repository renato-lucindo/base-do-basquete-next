# Remoção de inscrição sem dependências

> Execução inline com as skills executing-plans, test-driven-development e verificação antes de conclusão. Decisões reversíveis já delegadas pelo responsável; nenhuma autorização para apagar seus registros por ferramentas.

**Objetivo:** permitir excluir uma inscrição criada por engano somente quando não tiver histórico ou dependências; conservar equipe global, disputa e demais inscrições. Primeiro recorte de ESCOPO§7/VALIDACAO A26; outras entidades e arquivamento continuam pendentes.

**Base:** branch sequencial `codex/ciclo-inscricoes`, `0c2017f45c84570e378c47239bbdddf2f5644144`, sobre PR24. Stack TypeScript estrito, RPC administrativa limitada, Postgres/Supabase novo e Worker de mesma origem. Sem SDK de banco no navegador.

## Decisões e limites

- Prévia administrativa fechada com nome/contexto, versão e categorias de bloqueio. Comando aceita somente commandId, registrationId, disputeId e expectedVersion positiva; elegibilidade é recalculada pelo servidor.
- Excluir fisicamente a linha sem filhos e registrar tombstone/recibo privado imutável, sem FK para a entidade excluída; impedir reutilização de ID. Não apagar comandos antigos, registros vinculados ou arquivos. Reenvio do mesmo comando recupera o ACK, autorizado novamente; intenção diferente não recria nada.
- Ordem: autorização fresca → comando → campeonato → inscrição/linha. Writers existentes e inserções de filhos ficam protegidos pela mesma raiz/FKs. FK descoberta tardiamente deve recusar a remoção atomicamente, sem tombstone/recibo parcial. Nenhuma cascata.
- Auditoria real encontrou 13 FKs em onze tabelas, todas sem cascata: elenco/comissão, jogos/súmula, publicação, decisões/desistência, regulamento, transferências, texto e honrarias. Conferências de texto também têm destino em JSON, a verificar explicitamente. PDF depende de jogo/elenco existentes. Links de regulamento/honrarias preservam cada versão, inclusive escolhas antigas.
- Snapshots imutáveis de contexto incluem inscrições elegíveis não escolhidas. Esses valores autocontidos e recibos operacionais não são novas referências vivas; conservá-los não exige manter um cadastro nunca selecionado. Referências selecionadas possuem links/FKs e bloqueiam remoção. Testar essa distinção.
- Banco real: apenas link_6adaa8aab5688191b1e7ae1cddc55a82/projeto nizmasjddyrhmevvfviz, Free. 44 migrations reconciliadas, imutáveis. Antes de qualquer DDL nova, comprovar contrato local do zero/upgrade. Nenhuma remoção de cadastro humano será executada por esta unidade.

## L1 — contratos e evidência RED/GREEN

- [x] `src/teams/removal-contract.test.ts`: comando fechado/IDs/limites; estados available/blocked/removed coerentes; rejeitar derivados e dados privados. Observar ausência inicial antes de implementar `removal-contract.ts`, depois executar todas as asserções.
- [x] DTO mínimo de prévia e ACK, enums determinísticos de dependência; prévia available exige blockers vazio e blocked exige ao menos um. Registro removido não recebe cadastro editável nem versão nova inventada.

## L2 — banco descartável antes de serviço

- [x] `supabase/tests/registration_removal.sql` e `src/teams/removal-database.test.ts`: RED antes da migration. Criar fixtures próprias sintéticas; preservar dados-base no upgrade. Matriz TS/SQL, papéis/revogação/contexto/versão/replay/capacidade; FKs e referências JSON/históricas.
- [x] Gerar migration própria pela CLI fixada, sem editar as 44 anteriores. Tabela privada de remoções/recibos, RLS/grants restritos, helpers de dependência e writer pequeno com locks/Recentes. Trigger de reutilização de ID não admite bypass.
- [x] Erro não retira filho/origem/versão pública nem grava recibo; excluir uma inscrição deixa equipe/disputa/irmã. SQLSTATE/ACK e leitura de removido coerentes. Atualização de fingerprint de fontes de contexto invalida prévias anteriores normalmente.
- [x] Prova de concorrência nativa focal: gravação de dependência antes/depois da remoção; resultado serializável, sem órfão. Reusar cinco casos nativos antigos não afetados, sem rodá-los por troca de sessão.
- [x] Somente depois de unit estável: aplicar uma vez no projeto novo, gerar tipos/reconciliar migration/advisors e contrato real BEGIN/ROLLBACK com IDs fictícios próprios. Exportar prova com cleanup garantido; nunca apagar dados humanos para teste.

## L3 — fronteira e experiência contextual

- [x] Adapter/SessionStore/rotas específicas de consulta e comando, testes de Worker e limites de corpo/origem/sessão antes do body. Mesma origem; sem aceite de derivados do browser.
- [x] Painel de exclusão na inscrição, texto explícito com nome/disputa/equipe preservada. Bloqueios explicados e retorno à operação histórica existente; confirmar apenas se elegível. Busy, comando congelado, ACK incerto/GET falho, duas abas/409/reauth, foco e 320px.
- [x] Remover da lista somente após ACK ou leitura confirmada de removido, atualizar contexto/Recentes e preservar filtros; outros rascunhos continuam íntegros. Sem botão que execute cascata ou exclua equipe global junto.

## L4 — gate e preview

- [ ] Gate consolidado quando vertical estável, CI e PR draft empilhado sobre24; fonte/artefatos exatos, preview protegido e smokes atualizados, política/token efêmeros revogados. Reusar artefatos inalterados, não repetir harness126/gates por sessão/docs.
- [ ] Checkpoint com SHA/cota/reset real e próximo passo. Aos85%usados5h, somente mínima operação consistente/push e mesma automação reset+2. Aceites humanos adiados e política de inscritos/agenda seguem pendentes.

## Revisão focal

Cadastro homônimo de outra disputa, inscrição antiga retirada do regulamento, rascunho em JSON, ID previamente excluído, dependência criada durante conferência, resultado incerto seguido de reautenticação e leitor público durante a operação. Nenhuma alegação de A26 integral, revisão independente, carga, WCAG completa ou produção.

Documentação atual do provedor consultada: [RLS e grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [changelog](https://supabase.com/changelog), [PostgreSQL17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) e [TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated). Não são especificação de produto. O índice Markdown exigiu leitura HTTP local após falha do leitor web por content-type.
