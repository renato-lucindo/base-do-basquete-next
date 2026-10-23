# C3 — pessoas, atletas, técnicos e elencos

> Execução inline com executing-plans/test-driven-development; decisões reversíveis delegadas. Branch `codex/pessoas-elencos`, base C2 `22b9f39`. Checkpoint central PROGRESSO.md. Revisão independente indisponível; revisão pelo autor não equivale a aceite.

**Objetivo:** localizar/cadastrar pessoas sem fusão por nome, compartilhar identidade entre atleta e técnico e montar elenco/comissão dentro da inscrição. Spec: ESCOPO §5/Perfil, EXPERIENCIA F03/F04, CONTRATOS Identidade/Perfil e AJUSTES-DE-EXPERIENCIA.md. Capitão-técnico, assistente condicionado e cinco titulares são escolhas do jogo na etapa 4.

## C3.1 — identidade e especializações

- [x] RED→GREEN de contratos TS e SQL: campos opcionais, sexo obrigatório de atleta, papéis compatíveis, homônimos explícitos, autorização fresca/RLS, privacidade, versão/idempotência.
- [x] Migration própria CLI `20261023122129_person_identity`; `persons`, `private.athletes` e tabela própria `coaches` compartilham identidade. Sem nome único, fusão por nome ou remoção silenciosa de papéis.
- [x] PostgreSQL do zero/upgrade com dados C1/C2; contrato Supabase real isolado/rollback, tipos gerados e dados reais preservados. Advisors somente aviso conhecido de senha vazada/Pro, sem contratação.

## C3.2 — elencos e comissão

- [x] `20261023122809_roster_membership`: camisa textual 0/00/1–99, vínculo ativo único por pessoa/disputa e camisa por inscrição, FK composta de contexto, versão/idempotência e vigência. Inativos imutáveis, sem reabertura/transferência automática.
- [x] `20261023123042_roster_context_guards`: mudanças posteriores de sexo/naipe não invalidam vínculos ativos. Ordem de locks atleta → campeonato preservada.
- [x] `20261023161538_registration_staff`: técnico/assistente por inscrição referenciam `coaches`; pais/pessoa/papel imutáveis, histórico preservado. Edição global de pessoa atualiza Recentes dos contextos vinculados, sem efeito de mera leitura/replay.
- [x] `20261023161949_person_search_context`: candidatos contêm somente dados públicos de desambiguação e participação por inscrição, incluindo naipe/ano/categoria/divisão e ativo/histórico; papéis simultâneos não duplicam contexto. Detalhes privados apenas ao abrir cadastro administrativo.
- [x] Contratos TS/SQL focais e quatro cenários de banco PASS; comissão/candidatos também no Supabase real com rollback. Sem fixtures permanentes, dados do responsável preservados.
- [x] Provider com métodos fixos/JWT privado, SessionStore e rotas de pessoa/elenco/comissão com limites de corpo/query/schema/sessão/origem. Oito contratos/provider/API focais e seis cenários workerd aprovados em `f9ee516`.

## C3.3 — experiência e entrega

- [x] Elenco na expansão da inscrição, ordem de camisa 0 antes de 00, identidade pública contextual, localizar/criar atleta/técnico/assistente, mesmo cadastro nos dois papéis e edição global explícita. Dados privados separados dos públicos opcionais.
- [x] Rascunho/foco, envio incerto com mesmo comando, conflito até recarga explícita, reautenticação em memória e confirmação de saída/troca de inscrição. Contexto usa o naipe salvo, mesmo com rascunho diferente em Informações.
- [x] Oito cenários novos de navegador desktop/celular e dezesseis regressões de acesso/C1/C2 PASS. Fechamento temporal/histórico e resolução do conflito de camisa verificados. Reflow 320px com rolagem da tabela contida e operável por teclado. Capturas com fixtures inspecionadas; não são dados remotos.
- [x] Gate consolidado estável, PR draft #6 sobre C2, CI `39989303613` SUCCESS do source `81f5f41`, 54 cenários Linux.
- [x] Preview protegido do source exato, smoke por hash/transporte/negação e revogação dos acessos temporários. IDs/hashes em VALIDACAO-PESSOAS.md.
- [ ] Avaliação humana C3 solicitada; não bloqueia desenvolvimento independente C4.
- [ ] Checkpoint e próximo bloco C4 texto com revisão/pendências/parcial; ao gatilho real, salvar remoto e atualizar a mesma automação oficial para reset+2.

Reutilizar evidências do ZIP/harness/protótipo inalterados. Nenhuma prova de corrida multi-conexão real, escala ou auditoria completa de acessibilidade foi produzida. Transferências/regulamento avançado e preparação da súmula não são antecipados.

Limites iniciais: nome/apelido/cidade 120, posição/estado 80, biografia 4000, registro privado 120, ano público 1–9999; altura/peso positivos até 1000. Sexo privado male/female, mão dominante left/right/both opcional. Nenhum campo opcional ausente impede cadastro.
