# Regulamento persistido — implementação R3

> Executar inline com superpowers:executing-plans/TDD. Decisões reversíveis delegadas. Especificação exclusiva: ESCOPO§4/7, ARQUITETURA§integridade e VALIDACAO A21–A24 do ZIP preservado, mais ajustes aceitos. Não consultar outro repositório.

**Objetivo:** salvar regulamento e atribuições com versões/histórico, ler fatos oficiais no backend e apresentar prévia de impacto antes da confirmação. Não confiar em placar/classificação/autor do browser.

**Arquitetura:** definição declarativa versionada em JSONB, com referências externas protegidas por tabelas-âncora/FKs e validação fechada do grafo no SQL/TypeScript. Grupos/fases/séries são entidades identificadas dentro da definição imutável; nomes são só apresentação. Essa escolha mantém a unidade de configuração atômica; migração para linhas físicas por fase/grupo pode ser feita depois se consultas demonstrarem necessidade. Não há scripts enviados pelo usuário, modelo genérico de escrita nem service-role no frontend.

**Stack:** TypeScript/Zod, Worker/SessionStore existente, PostgreSQL/PGlite e Supabase novo. Usar migrationCLI2.121.0. Banco real somente link_6adaa8aab5688191b1e7ae1cddc55a82/projeto nizmasjddyrhmevvfviz; preservar dados humanos e migrations aplicadas. SkillsSupabase/Postgres lidas, RLS/docs/changelog consultados24/10; não fazer upgrades de plataforma por esse trabalho.

## Contrato e escolhas relevantes

`RegulationDefinition` fechado contém registrationIds, occurrenceRules, groupPhases[{phaseId,name,rules,groups[{id,name,registrationIds,gameIds}]}], knockoutPhases[{id,name}] e series[{id,phaseId,name,format,home,away,games[{slot,gameId}]}]. Catálogo de inscritos selecionados, referências existentes/ciclos, unicidade das atribuições e slots são validados. Nomes não determinam formato/dependência. Permitir configuração vazia/incompleta sem produzir qualificado; rótulos1–100caracteres, sem controles. Limites do núcleoR2 permanecem, corpo da definição/comando até1MiB.

Salvar é operação administrativa específica: `{commandId,disputeId,expectedVersion,expectedContextFingerprint,definition,reason,acknowledgeImpact}`. SQL decide autoria/data/versão e recusa campos extras. FingerprintSHA256 é calculado no banco sobre contexto autoritativo ordenado, incluindo versões de agenda/publicação; nunca aceitar esses fatos no comando. Qualquer resultado existente exige motivo e confirmação explícita de impacto, inclusive configuração inicial tardia. Fingerprint conservador considera todos jogos da disputa: mudança de jogo direto ainda não atribuído pode pedir nova prévia; isso favorece consistência e pode ser refinado futuramente.

Versões de regulamento e contexto de origem são imutáveis. Snapshot guarda dados mínimos autoritativos e versão do algoritmo, permitindo reconstruir a prévia histórica sem substituir fatos das partidas; mudança de semântica exige versão de algoritmo própria. Nenhum autor/segredo/token entra na definição ou consulta pública. Ocorrências persistidas e consulta pública correspondente são subunidades posteriores; não disponibilizar editor parcial como entrega completa.

## R3a — contratos e adaptação

Criar src/regulation/{persistence-contract,persistence-contract.test}.ts.

- [ ] RED: definição sem fatos/código, referências e labels estritos, fase de mata-mata existente e distinta de grupo, inscrições selecionadas e atribuições únicas/ciclo; snapshot/ACK correlatos, comando/versões/fingerprint/motivo. RegraWO segue contratoR2.
- [ ] Implementar schemas e adaptador que combina definição com contexto do banco para previewOrganizedCompetition; label nunca vira regra, placar só vem do contexto. Versão atual versus proposta explícita. Histórico usa snapshot correspondente.
- [ ] GREEN focal/types/lint/format, commit; semDDL/deploy nessa subunidade.

## R3b — banco e histórico do regulamento

Criar supabase/tests/regulation.sql e src/regulation/persistence-database.test.ts, observarRED antes da migrationCLI.

Tabelas privadas: regulation_versions(dispute/version/definition/context/fingerprint/algorithm/reason/actor/time), regulation_heads(aponta versão atual), regulation_registration_links e regulation_game_links(FKs contextualizadas e publicação histórica quando existente), regulation_commands(recibos). Nenhum grant direto paraanon/authenticated/service_role; RLS defensiva em todas, histórico/âncoras imutáveis e índices nasFKs. Não duplicar dados pessoais ou estatísticas completas.

- [ ] Contrato SQL: criação zero/upgrade com publicaçõesG4 existentes e preservadas; leitura/versão/histórico paginado, ACK, idempotência igual/conflitante/outroautor/admin revogado; anon/service-role/usuário sem autorização recusados; campos extras/contexto/refs/ciclos/versões/fingerprint/motivo incorretos recusados. Replay/leitura não mudamRecentes. Atualização legítima altera head eRecentes uma vez; histórico/fatos intactos; FK protege registro com história.
- [ ] Migrations próprias CLI: validadores fechados de definição/grafo, contexto mínimo oficial/fingerprint e APIs privadas autorizadas. Public wrapperssecurityinvoker; segurança comsearch_path vazio e privilégios explícitos. Rootlock compartilhado nas leituras e exclusivo no writer, compatível com writersG4; auth FORSHARE antes do recibo, commandlock→competitionroot→regulation/links, sem inverter atleta/root. Não bloquear ou reescrever publicaçãoG4.
- [ ] Preparar leitura de contexto como única fonte de fatos para o Worker. SQL captura dado/versões do snapshot sob rootlock, não mistura momentos diferentes. Limites excedidos falham explicitamente, sem truncar classificação. Registro das referências no mesmo commit/tx.
- [ ] Zero/upgrade/focais e contrato realSupabaseBEGIN/ROLLBACK, advisor/tipos/contagens, registrar SHA/migration aplicada. Não reaplicar por sessão; gerar tipos pelo plugin sem extrair chave.

## R3c — API e editor administrativo

- [ ] Provider fixo/getState/getVersion/save com schemas/correlação; SessionStore exige sessão fresca antes de ler/gravar. Transporte mesma origem/limite1MiB/contexto/disputa; versão antiga ou fingerprint alterado exige nova prévia, sem trocar tokens automaticamente.
- [ ] Editor contextual Regulamento: modelos iniciais pontos corridos/eliminatória/grupos+matas são definições editáveis, junto da classificação correspondente. Selecionar inscrições/grupos/atribuições, nomes/formato/slots/cortes; não exigir estrutura para cadastrar jogo direto. Campos/painéis opcionais progressivos; teclado/foco/retorno/rascunho/reauth/duasabas/320px.
- [ ] Alteração com resultado existente mostra antes/depois/conflitos e pede motivo/confirmar. Resposta incerta congela comando, ACK conhecido repete sóGET. Histórico privado por versão sem tocar rascunho. Não sobrescrever adversário publicado nem confirmar colocação porUUID.

## R3d/e — ocorrências autoritativas e consulta

- [ ] Writer específico de ocorrência/desistência com contextos/versões/motivo/efeitos/locks/recibos/histórico e as mesmas provasSQL. Prévia e aplicação não criam fatos individuais; preservam agenda/rascunhos/fontes e as duas políticas de desistência. Reagendamento usa agenda existente com guards próprios.
- [ ] Consulta pública mínima usa apenas regulamento explicitamente confirmado e identidades necessárias, fatos oficiais/efeitos permitidos, sem contexto administrativo de jogos não atribuídos/rascunhos/motivos privados/autor. Cálculo no backend a cada leitura consistente evita projeção obsoleta após correçãoG4. Nenhum placar/classificação recebido do browser vira autoridade.
- [ ] Integração com correção de jogo: regras/derivados recalculam sobre versão nova e mostram conflitos de chave; preservar fatos/identidades históricas. Transferências/retornos/colocações/honrarias permanecem tarefas da etapa5, sem exposição antes de confirmação.

## Verificação e fechamento

- [ ] Focais durante implementação, gate/CI quando vertical estável; reutilizar harness126 e evidências de artefatos inalterados. Medir100inscrições/1000jogos e ambiente, sem alegar escala pela medição pura/banco vazio. Revisão independente se ferramenta disponível, sem inventar parecer.
- [ ] Preview protegido/smokes novos, piloto humano e classificação de cada formato. P4humano/StorageHTTP da etapa4 ainda aberto, não encerrado pela bibliotecaR2. Sem produção/merge sem condições documentadas.

PROGRESSO.md governa continuidade. Cota real entreunidades/antesdelongas; aos85%usados5h menoroperação/checkpoint/push/MESMAautomação reset+2 e semanal aplicável. Sem compra/plano/resetmanual nem credenciais em logs/docs/agendamento. Não alterar serviços anteriores nem dados humanos.
