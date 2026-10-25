# Classificação pública confirmada — R3e

> Executar inline com superpowers:executing-plans/TDD; decisões reversíveis delegadas. Continuidade em docs/PROGRESSO.md. Não repetir evidências válidas por sessão.

**Goal:** disponibilizar classificação backend por disputa, com regras/efeitos/identidades confirmados, cobertura e critérios explicáveis, sem rascunhos ou dados privados.

**Architecture:** fonte pública mínima de uma confirmação consistente; cálculo puro existente no Worker, DTO fechado e leitura anônima própria. Writers privados com freshadmin→commandlock→competitionroot→head/links, versões/recibos/histórico. Correção G4 invalida resultado derivado na leitura seguinte; edição privada posterior não publica implicitamente.

**Tech Stack:** TypeScript/Zod4.6.7/React/Vite; Cloudflare Worker/SQLiteDO existente; PostgreSQL/Supabase novos existentes, sem SDK no browser/serviço novo.

**Spec:** especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/{ESCOPO,ARQUITETURA,CONTRATOS,EXPERIENCIA,VALIDACAO}.md; docs/decisoes/013-classificacao-publica-confirmada.md e012. Branch sequencial codex/classificacao-publica, base58b6f0c sobrePR14; previewO4 preservado.

## Global Constraints

- Produto somente ZIPs preservados/feedback aceito, nunca consultar/clonar repo anterior; preservar dados/mudanças humanos.
- Backend autoritativo, RLS/grants restritos, sem service-role genérica/user_metadata para autorização e sem credenciais em browser/Git/log/docs/agendamento.
- Mil registros/10mil jogos por contexto conforme núcleo atual; limites e origem dos pontos declarados.0/00 e identidade por inscrição preservados; ausência não vira zero.
- Publicação por jogoG4 continua atômica; regulamento privado não é publicação. Confirmar classificação não confirma honrarias/colocações.
- **Questão de elegibilidade pública pendente** na decisão013/pergunta assíncrona. P1 independente; P2/P3 incorporam resposta antes de expor agenda/inscrições sem resultado.

## Review Focus

- Jogo/inscrição/ator/motivo privado ou não atribuído não aparece nem em DTO/RPC/linhagem/erro.
- Correção G4 muda totais/cobertura/classificados e decisão antiga vira revisão, sem cache obsoleto ou substituição de adversários.
- Rascunho privado editado depois da confirmação não altera nomes/agenda/regras/efeitos públicos incidentalmente.
- Ausência/empate/critério incompleto não confirma classificado, final ou honraria; futura agenda não cria placar/participação.
- Replay/duas abas/revogação antes do corpo/operação/recibo e falha apóshead não deixam confirmação pública parcial.

## P1 — contratos mínimos e cálculo público independente

Arquivos novos src/regulation/public-contract.ts, public.ts, public.test.ts; fixture tests/fixtures/public-regulation.ts. Reusar persistence-contract/occurrences/view-contract/domínio, sem mudar contratos privados aplicados.

- [ ] RED de módulo ausente: fonte fechada recusa ator/motivo/sexo/nascimento completo/campos de rascunho; IDs duplicados/fora da disputa, jogo não atribuído ou efeito fora do conjunto recusados. Fonte já confirmada é precondição, não autorização forjada pelo browser.
- [ ] Definir publicStandingsSourceSchema e publicStandingsSchema: contexto mínimo, versão pública/regulamento/data, identidades públicas, agenda incluída, fatos e efeitos sem motivo/autor. Reusar validação de data/horário e invariantes, sem timestamp inventado.
- [ ] buildPublicStandings(source): validar fonte, adaptar metadado neutro sóinterno quando o domínio exigir motivo, calcular com previewRegulationDefinition e sanitizar/validar DTO. Sem devolver contexto bruto ou privados; IDs finais contidos na fonte pública. Não criar transição pública/honraria a partir do cálculo.
- [ ] Focais GREEN: grupos/eliminação/empate/cobertura, W.O./score null, desistência e correção de fato já publicado. Alterar fato fora do conjunto deve ser recusado, não refletir no DTO. Tipos/lint/formato/segredos; commit próprio, sem DDL/deploy/gate completo para contrato puro.

## P2 — confirmação persistida e leitura pública mínima

Arquivos novos supabase/tests/public_standings.sql e src/regulation/public-database.test.ts; migrations CLI próprias, tipos gerados. **Resolver elegibilidade conforme resposta do responsável antes de fixar fonte/escopo de publicação de jogos futuros.**

- [ ] Contratos privados publish/preview/state/history/ACK com IDs/versões/fingerprint/motivo/conferência de escopo. Nenhum derivado/autoria do browser. Publicação só do conjunto explicitamente confirmado; conjunto não atribuído permanece privado.
- [ ] PostgreSQL descartável RED antes da migration. História/âncoras imutáveis, RLS/grants/freshadmin/rootlocks/recibos, contexto público consistente e limitado. Fonte dinâmica usa somente resultadosG4 públicos atuais e regras/efeitos confirmados, snapshots de identidades/agenda para não expor edição privada.
- [ ] Provas zero/upgrade com G4/O4 humano preservado, anon/auth sem grants privados, DTO público sem metadado proibido, rollback entrehead/âncoras/recibo, replay após fonte mudar/revogação e lineage sem IDs não públicos. Matriz TS×SQL e correção G4 sem stale cache.
- [ ] Somente depois de focais GREEN aplicar no projeto novo/link autorizado, reconciliar migrations/contagens/advisors e tipos. Não reaplicar migrations anteriores; nenhuma limpeza de dados humanos.

## P3 — integração e avaliação

Novos provider/rotas públicos específicos e comandos privados SessionStore; UI contextual de confirmar/republicar junto da classificação, página pública por disputa e links de jogos. Vite/manifesto/smoke aceitam explicitamente o novoHTML, sem abrir HTML arbitrário.

- [ ] RED provider/workerd de fonte/escopo/ACK/privados/freshness/origem/limites/anon404 seguro, reauth/conflito sem reciclar versão antiga. Provar leitor público não depende da sessão administrativa nem usa genericservice-role.
- [ ] RED browsers desktop/mobile320: confirmação visível de escopo, antes/depois, nomes e critérios/cobertura, histórico e retomada, fonte corrigida/refetch, estados ausente/sem jogos/empate, nenhum privado/rascunho renderizado. Estado compartilhável por disputa, tabelas roláveis/focáveis.
- [ ] Gate único após vertical estável/CI; preview protegido com novos assets/rotas e smoke, credencial efêmera criptografada/revogada, preservar Access/cofre/namespace/previewsOFF. Reusar harness126/banco/runtime inalterados, sem alegar prova de carga/corridaPG/WCAG/revisão independente.
- [ ] Checkpoint exato/PR draft empilhado, avaliação humana assíncrona. Etapas4humano/5restante abertas até suas provas, sem merge/produção.
