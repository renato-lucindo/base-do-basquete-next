# Etapa 4 — jogo completo

> Execução inline com executing-plans/TDD e continuidade existente. Autorizado em23/10: “ok, siga com as próximas etapas”. Decisões reversíveis delegadas; protótipos já apresentados. Branch codex/jogos sobre017db15, PR futuro empilhado sobre#7. Sem repetir gates de artefatos inalterados.

**Objetivo da entrega:** cadastrar jogo diretamente na disputa, preparar relacionados e comissão, preencher súmula ou revisar PDF, confirmar/publicar e consultar resultado coerente. Não exigir fase/grupo/chave. A etapa só termina com esse percurso completo; unidades internas não equivalem a aceite da etapa.

**Fontes:** ZIP original README→ESCOPO/EXPERIENCIA→ARQUITETURA/CONTRATOS→VALIDACAO etapa4; feedback em AJUSTES-DE-EXPERIENCIA.md. Importador complementar e ajustes C4 preservados. Somente projeto novo; nenhum repositório/serviço anterior.

## G1 — cadastro direto de partidas

- [x] Contrato TS/SQL RED para duas inscrições distintas da mesma disputa (mesma equipe global pode ter inscrições diferentes), data/hora/local/número opcionais, reabertura, isolamento, versão/idempotência/RLS/grants e Recentes somente ao salvar. PostgreSQL real descartável e preservação C1–C4 antes de DDL.
- [x] Migration própria CLI, public.games administrativa e recibos privados, leitores invoker e writer privado fixo, autorização fresca antes de replay/dados. FK composta de inscrições/contexto. Banco revalida pais e não aceita transferência de jogo para outra disputa. Não criar placar0–0 ou publicar agenda implicitamente.
- [x] Modelo de agenda preserva data sem hora: date ISO nullable/time HH:mm nullable; hora exige data. Fuso fixo America/Sao_Paulo nesta versão; scheduledAt somente quando ambos existem, convertido no backend. Local/número opcionais, nenhum número único presumido. Situação inicial programado; ocorrências/regulamento entram na etapa5.
- [x] Aplicar apenas projeto novo depois dos contratos locais; contrato real com rollback, tipos gerados/advisors e commit. Atualizar evidências sem inventar corrida multi-conexão/escala.
- [ ] Provider/SessionStore/rotas específicos com testes de fronteira; UI aba Jogos/lista/filtros/cadastro na mesma área, seleção e criação contextual de inscrições, rascunho/reautenticação/conflito. Gate quando unidade vertical estável; CI e preview protegido com smokes dos novos artefatos, preservar cofre/namespace/Access.

## G2 — participantes e súmula persistida

- [x] Relacionados/camisa da ocasião/participação por jogo, snapshots e comissão ligados às identidades existentes. Capitão sempre explícito; sem técnico próprio capitão assume, assistente só com técnico próprio. Cinco titulares por equipe para publicar; não inferir do elenco. Alterar elenco global não reatribui histórico.
- [x] Motor fornecido integrado por adaptador de UUID/slots, entradas por teclado e feedback aprovado; backend/SQL validam documento, regras, naipe, participantes e versões. Rascunhos/desfazer/refazer/recuperação, gate128/8SQL/9workerd e58 browsers aprovados. API/UI G2 aguardam publicação por OAuth Cloudflare; CI será registrada após commit estável.
- [ ] Imutabilidade dos relacionados/camisas confirmados e motivos de revisão/fallback entram com confirmação/publicação G4, sem declarar etapa4 completa antes do percurso inteiro.

## G3 — PDFs e fontes

- [ ] Integrar extração/parsers fornecidos com as quatro fixtures; limites de arquivo/páginas/texto, Storage privado e contexto administrativo. Revisão durável por documento, destino alterável sem reupload, matching/homônimos e cadastros auxiliares na tarefa, duplicidade por hash/jogo possível.
- [ ] Domínios de autoridade/capacidades por fonte; ausência permanece ausência. Site game_total não vira quarto, false do parser não inventa DNP/titular/capitão; sem dados coletivos/plus-minus fabricados. Fonte divergente exige decisão explícita.

## G4 — confirmar/publicar e corrigir

- [ ] Transação por jogo publica somente fatos/identidades necessários, resultado/estatísticas/snapshot consistentes. Falha de um jogo não desfaz outros; idempotência/versionamento duráveis; nenhuma exposição de outros drafts ou campos privados.
- [ ] Consulta pública mínima do jogo/resultado e estatísticas da etapa4, separada dos readers administrativos e sob origem/proteção apropriada. Salvar/republicar com motivo, autoria/versões anteriores e derivados coerentes; estatística segue contratos fornecidos.
- [ ] Gate consolidado da entrega estável, CI/preview correspondente, smokes/admin/públicos, comparação de artefatos e avaliação humana. Só então registrar etapa4 concluída; regulamentação/transferências/ocorrências avançadas na etapa5 e exploradores completos na6.

## Continuidade

Consultar cota real no início/entre unidades/antes de longas. Aos85%usados5h, menor operação segura, checkpoint em PROGRESSO.md com evidência/branch/SHA/pendências/próximo exato/reset real, push seguro e atualizar a mesma automação para reset+2; semanal também, sem compras/resets manuais. Nunca segredos em Git/log/agendamento. Mudanças alheias preservadas. Revisão independente indisponível não é evidência de aprovação.

## Checkpoint G1, cota85%

DB ab6e80b e API17d9fb2 salvos remotamente, PRdraft#8. UI em WIP e seis browsers focais PASS; faltam cadastro auxiliar, regressoes da composicao, inspecao visual, gate/CI/deploy. Migration real20261023192926, contratos/tipos/seguranca verificados. Retomar pelo proximo exato de PROGRESSO.md, sem repetir SQL/harness inalterados.
