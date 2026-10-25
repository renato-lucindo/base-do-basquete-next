# Colocações e honrarias — plano de implementação

> Execução inline com TDD e continuidade durável. Reutilizar evidências inalteradas; decisões reversíveis delegadas. Novo checkout não é necessário: branch sequencial isolada codex/conquistas-honrarias sobre4b2f4d7, sem mudanças humanas. TransferênciasT3 têm gate local aprovado; aguardar CI40171975751 antes do preview preparado dessa fonte. Não sobrescrever seu manifesto/bundle ao iniciar esta unidade.

**Objetivo:** sugestões privadas de colocações a partir de fonte explícita, decisão revisável própria e honrarias confirmadas no contexto de campeonato/temporada/disputa, conforme pacote preservado.

**Arquitetura:** módulo pequeno `src/achievements`, consumindo contratos de regulamento/classificação existentes; sem cópia do motor nem dependência web/SDK no domínio. Persistência versionada separa rascunho, confirmação e histórico. ADR015 registra limites de inferência; documento atual/pacote prevalecem sobre referências antigas.

## Restrições

- Somente ZIPs preservados/feedback aceito; nunca consultar/clonar repo/serviços anteriores. Supabase sóprojeto nizmasjddyrhmevvfviz/vínculo autorizado. Cloudflare sópreview atual, protegido antes e depois do deploy.
- Nenhum campeão automático, resultado0–0 inventado, desempate porUUID, MVP por fórmula implícita ou atleta identificado por nome. Vínculo atual não substitui participação histórica.
- Posição compartilhada deve ser explícita; inscrição competitiva difere de equipe global. Campos privados não entram no DTO público. Rascunho e sugestão não publicam.
- Política de elegibilidade pública de inscritos/agenda futura segue pendente; não deduzir aceite da indisponibilidade humana para testar. Construir partes independentes sem repetir perguntas pendentes.
- Cota real entre unidades/antes de operações longas; aos85%usados5h, operação mínima/checkpoint/push/MESMAautomação reset+2. Sem compra/plano/reset manual/credenciais em código ou mensagens.

## A1 — contrato e sugestão privados, sem serviços

Arquivos novos `src/achievements/contract.ts`, `suggest.ts`, `suggest.test.ts` e `tests/fixtures/achievements.ts` somente quando a interface existente estiver examinada. Não usar DTO de classificação fornecido pelo browser como fonte autoritativa futura.

- [x] Examinar `regulation/view-contract.ts`, `organized.ts`, `groups.ts`, `series.ts` e contratos de publicação; usar a projeção real, sem segunda fórmula.
- [x] RED: fonte de grupo explícita e completa sugere inscrições distintas nas posições; partida pendente, classificação empatada/incompleta ou fonte fora do contexto bloqueia. Identidade competitiva preservada mesmo com mesma equipe global.
- [x] RED: final/bronze escolhidos explicitamente; campeão/vice e bronze sócom séries completas e entradas coerentes. Sem bronze, deixar demais posições pendentes. Não adivinhar dependências por nomes/ordem/data; recusar sobreposição de finalistas/bronze.
- [x] Contrato fechado da decisão privada: grupos de posição/inscrições sem repetição e honrarias ID/título/destinatários explícitos. Sem ator/fatos/fórmulas do browser; referências sóIDs e contexto conhecido. Limites compatíveis com o regulamento; normalização Unicode/UUID consistente.
- [x] GREEN focal, composição de regulamento/classificação afetada e tipos/lint/formato. Registar evidências e commit próprio; sem gate integral ou deploy por biblioteca pura.

## A2 — fonte e persistência próprias

- [ ] Inspecionar tabelas/FKs/contexto real e definir elegibilidade contextual dos destinatários sem depender de vínculo ativo. Separar fatos estatísticos de decisões de premiação. Verificar invariantes do pacote antes da DDL.
- [ ] RED PostgreSQL descartável do zero/upgrade: rascunho privado, fonte derivada/versionada, confirmação atômica, autor revogado, recibo/replay/conflito, motivo de revisão, nomes/IDs/contexto e invalidação de derivados. Histórico imutável e grants/RLS/índices próprios.
- [ ] Gerar migration pela CLI fixada após RED; nunca editar/reaplicar migrations anteriores. Matriz TS×SQL para validação compartilhada, gate quando estável; aplicar uma vez somente no projeto novo, reconciliar versão/tipos/advisors/prova real com rollback e preservar dados humanos.
- [ ] Consulta pública entrega somente premiação confirmada/DTO mínimo; confirmação não libera agenda futura ou rascunhos externos. Não implementar exposição enquanto seu contrato/invalidação não estiverem provados.

## A3 — integração e confirmação contextual

- [ ] Adapter/SessionStore/rotas com authfresh antes do corpo e no DO, limites/mesma origem, ACK e correlações. Repetir comando congelado na incerteza, somenteGET depois de ACK conhecido. Nenhum derivado aceito do browser.
- [ ] Administração dentro de Regulamento/contexto da disputa: escolher fonte da sugestão, revisar posições/honrarias, selecionar atletas por identidade e contexto, guardar rascunho, confirmar/revisar com motivo e mostrar impacto/pendências. Manter teclado/foco/guardas/320px e histórico.
- [ ] Focais desktop/mobile e composição, gate único estável, CI e preview protegido com smokes novos/revogação. Evidência remota/técnica não substitui aceite humano, carga/concorrência real ou auditoriaWCAG completa.
- [ ] PRdraft empilhado e checkpoint exato. Depois retomar exposição pública/perfis/estatísticas conforme pacote e pendências; não declarar etapas4/5 completas antecipadamente.
