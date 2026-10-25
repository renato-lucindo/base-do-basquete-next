# Transferências e retornos — plano de implementação

> Executar inline com superpowers:executing-plans/TDD; sem ferramentas de subagentes disponíveis. Decisões reversíveis delegadas, checkout sequencial isolado em branch própria. Checkpoint em docs/PROGRESSO.md, sem repetição de evidências válidas.

**Goal:** transferir/retornar no elenco contextual conforme regra explícita, encerrando e criando períodos sem reatribuir participações.

**Architecture:** contrato/planejador puro privado; leitor/escritor PostgreSQL específico com prévia e recibo; integração no Worker e elenco existentes. Histórico de vínculo imutável e vigência do servidor, alteração atômica sob autorização fresca/versões. Não expor dados públicos novos.

**Tech Stack:** TypeScript/Zod/React, Worker/SQLiteDO e Supabase PostgreSQL existentes; nenhuma dependência nova.

**Spec:** especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/{ESCOPO,ARQUITETURA,CONTRATOS,VALIDACAO}.md; docs/decisoes/014-transferencia-atomica-e-retorno.md. Branch codex/transferencias sobre a9d0b8e/PR15; ZIPs preservados e feedback aceito como única fonte do produto.

## Global Constraints

- Preservar dados/mudanças humanos, não consultar/clonar repositório ou serviços anteriores. Supabase sóprojeto nizmasjddyrhmevvfviz/link autorizado; Cloudflare/Access atuais preservados.
- Regra ausente bloqueia transferência; não contornar por cadastro/importação comum. Não inventar política adicional, programar regras arbitrárias ou fazer gestão de permissões multiusuário.
- Camisa string,0/00 distintos; inscrição é identidade competitiva, não equipe global. Um vínculo ativo na disputa, retorno cria período/ID novo, histórico publicado permanece consultável.
- Vigência do servidor na gravação, sem retroação/agendamento inicial; não transportar personId derivável nem fatos/estatísticas no comando.
- Sem pedidos de testes manuais hoje, aceite permanece pendente. Elegibilidade pública R3eP2/P3 aguarda definição; esta unidade é independente.
- Cota real entreunidades/anteslongas;85%usados5h→checkpoint/push/MESMAautomação reset+2, sem compra/plano/resetmanual/segredos.

## T1 — contrato e prévia privada puros

Novos src/people/transfer-contract.ts, transfer.ts, transfer.test.ts e tests/fixtures/transfers.ts. Contrato usa apenas os metadados necessários dos vínculos, regra, destino e instante autoritativo; não reutiliza dados pessoais privados ou jogos completos.

- [x] RED de módulo ausente; casos funcionais: transferência fecha/abre no mesmo instante sem mutar contexto; retorno cria período novo; origem encerrada sem ativo permite retorno, com ativo diferente bloqueia; destino igual ao ativo pede edição comum.
- [x] Fonte completa fornecida pelo futuro leitor: histórico da pessoa na disputa e ocupação ativa do destino; validar escopo, unicidade de ativos/camisas e períodos. Contrato fechado recusa ator/pessoa/tempo/fatos inseridos pelo browser; comando inclui versões da origem/destino/regulamento, fingerprint, motivo e confirmação.
- [x] Prévia bloqueia regra ausente/proibida, versão/fingerprint diferentes, camisa ocupada, IDnovo já usado e origem histórica ultrapassada. Camisa0/00 distinta; não confundir inscrições da mesma equipe. Não aceitar transferência entre disputas. Relógio preserva microssegundos e equivalência de fuso.
- [x] GREEN focal e composição de contratos de pessoas/elenco; tipos/lint/formato/segredos, evidências e commit. Sem DDL/rotas/deploy; não atribuir prova de autorização/atomicidade/RLS ao planejador.

## T2 — regulamento e transação no banco

Novos supabase/tests/transfers.sql, src/people/transfer-database.test.ts; migrations próprias via CLI. Não editar/reaplicar migrations existentes. Ler guardas de sexo, writers de pessoa/elenco/importação e lock order antes da nova DDL.

- [ ] RED PostgreSQL: configuração de permissão compatível com regulamentos antigos, contexto integral/autorizado, sem fonte/ator do browser. Autoridade deriva pessoa/disputa/campeonato da origem/destino. Hash/versionamento de todos os vínculos relevantes.
- [ ] Writer atômico exige motivo/confirmação; fecha origem ativa, cria vínculo novo e história/âncoras/recibo/Recentes. Origem encerrada sóúltima conhecida sem ativo. Checar camisa ativa, sexo/naipe, registro existente e permissão atual sob lock. Respeitar ordem atleta→campeonato.
- [ ] Fechar desvio via save_roster_entry/importador: primeira inscrição legítima continua, novo período com histórico sóoperação autorizada. Preservar dados/história/publicações e fluxos C3/C4. Zero/upgrade, matriz TS×SQL, falha intermediária/replay/conflito/revogação, RLS/grants/sem service-role genérica.
- [ ] Tipos/advisors/contratos reais com rollback no projeto novo depois dos focais; sóaplicar migration estável uma vez. Sem migração humana/limpeza/seed.

## T3 — Worker e experiência contextual

- [ ] Adapter/SessionStore/rotas específicos, sessão fresca antes do corpo/operação, limites/mesma origem/erro seguro. Prévia backend, ACK conhecido recupera sóGET; replay congelado na resposta incerta/reautenticação.
- [ ] Editor da permissão no Regulamento e operação dentro da expansão do elenco. Buscar inscrição de destino na mesma disputa,0/00, motivo/impacto explícitos, histórico por período, retorno/versão409 preservando edição. Não ocultar participações publicadas após inativação.
- [ ] Browsers desktop/mobile320 e composição equipes/pessoas/importador/regulamento/jogos; conflitos/duasabas/reauth, foco/saída/retomada. Gate único estável/CI/previewAccess/smokes novos e revogação. Não repetir suites por sessão/docs; registrar limitações de corrida/carga/WCAG/revisão independente.
- [ ] PRdraft empilhado, checkpoint exato, avaliação humana futura sem solicitar hoje. Etapas4/5 não encerradas apenas por este bloco.
