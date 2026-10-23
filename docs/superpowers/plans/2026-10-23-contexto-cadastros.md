# Contexto e cadastros — plano de implementação

> Execução nesta conversa pelo agente principal com executing-plans e test-driven-development. Decisões reversíveis já delegadas pelo responsável; protótipo e pacote definem a experiência, sem nova rodada de aprovação técnica.

**Objetivo:** etapa 3 em unidades verticais: começar por campeonato recorrente, edições anuais e disputas persistidas, na mesma página; seguir com equipes, pessoas, elencos, texto e Recentes.

**Arquitetura:** React existente chama apenas Worker da mesma origem. JWT permanece no SessionStore; acesso ao banco acontece dentro da sessão autorizada. PostgreSQL resolve pais e grava o agregado em transação, com RLS, versão e idempotência. Sem SDK/browser ou credencial genérica de serviço.

**Stack:** ferramentas/versões já fixadas, nenhuma dependência nova. PostgreSQL real descartável PGlite e contrato SQL compartilhado com o projeto novo.

**Spec:** pacote imutável, ESCOPO §§3–5/9, EXPERIENCIA F01/F02, CONTRATOS identidade, VALIDACAO etapa 3; feedback em AJUSTES-DE-EXPERIENCIA.md.

## Decisões da unidade C1

Campeonato mantém identidade própria e versões; edições têm ano único por campeonato. Disputa pertence a uma edição, tem naipe masculino/feminino, categoria e divisão opcional; não é movida por um ID fornecido pelo cliente. IDs estáveis e UUID de comando permitem repetir envio sem duplicar. Excluir dados já salvos não integra esta unidade; remoção de linhas novas ainda não salvas é local. Não apagar disputas implicitamente por omissão do payload.

Escolha do implementador: três tabelas relacionais, funções de leitura invoker e uma escrita transacional estritamente delimitada em schema privado, SECURITY DEFINER com search_path vazio, nomes qualificados e autorização administrativa fresca antes de qualquer acesso. Wrapper público invoker tem EXECUTE explícito; tabelas não concedem escrita aos clientes. Não usar definer genérico, SQL dinâmico ou service-role. Alternativas descartadas: JSON sem FKs dificultaria isolamento; grants de escrita direta permitiriam contornar a transação do agregado. Nenhuma gestão genérica de papéis/usuários.

Limites operacionais iniciais: nome 120, categoria/divisão 80 caracteres, até 32 edições e 64 disputas por edição, anos 1–9999. Registrar como limites de envio, sem fingir regra esportiva. Frontend mostra validação/estado salvo/falha, conserva edição em falha e exige recarga explícita em conflito; sair da edição com alterações exige confirmação. Recentes ordena por salvamento efetivo, nunca por visita.

## C1.1 — contrato e banco

- [x] `src/competition/contract.ts` e `.test.ts`: schema compartilhado estrito, normalização, IDs únicos, ano/disputa duplicados e limites; vermelho → implementação → verde.
- [x] Migrations pelo CLI: `public.championships`, `seasons`, `disputes`, recibos privados, RLS/grants e funções `list_competitions`, `get_competition`, `save_competition`. Pais/omissão/idempotência/versão/usuário verificados. Relógio e versão só no banco. Aplicadas como `20261023112423` e `20261023112534`.
- [x] Contrato SQL no PostgreSQL descartável e Supabase real, com rollback; do zero/upgrade e tipos/advisors verificados. Não foi realizado teste multi-conexão real de corrida; proteção por locks/constraints não equivale a essa evidência. Advisor Auth/Pro registrado na decisão 005, sem mudança de plano.

## C1.2 — sessão e transporte

- [x] `src/competition/provider.ts`: REST por JWT no servidor, limites/timeout, schema da resposta e erros sanitizados. `PersistentSession.runAuthorized` mantém token/renovação na fila; SessionStore expõe operações específicas. Três testes de adaptador e cenário novo de fila/saída PASS; testes existentes de sessão preservados.
- [x] Rotas GET/POST implementadas e cenário workerd PASS para sessão/origem/schema/contexto/query, RPCs fixos e ausência de tokens. Quatro cenários workerd totais PASS, tipos/ESLint focais PASS. Provedor substituído por fixture, distinto da prova de SQL real.

## C1.3 — percurso e publicação

- [ ] `src/competition/screen.tsx` e CSS: lista/busca/Recentes, nova competição e edição única com temporadas/disputas, categoria/divisão, seleção explícita de contexto, salvar/recarregar/retornar, falha e conflito sem sobrescrever. Não oferecer abas funcionais de equipes/jogos/regulamento antes das unidades correspondentes.
- [ ] Testes de navegador desktop/celular/teclado e reflow 320; integração real de servidor/banco validada por contrato SQL + transporte real. Nenhum seed fictício persistido no projeto de desenvolvimento.
- [ ] Gate consolidado ao estabilizar; CI, PR draft empilhado sobre fundação e preview protegido com artefato identificado. Reutilizar harness/protótipo inalterados. Atualizar checkpoint e preservar sessão/cofre/Access existentes. Não declarar validação humana nova sem resposta do responsável.

## Depois de C1

C2: equipes globais/inscrições e lista expansível. C3: identidade de pessoa, atletas e treinadores vinculados à mesma pessoa, capitão-técnico conforme feedback. C4: texto com revisão e resultado parcial, homônimos e pendências preservadas. Cada unidade define seus próprios contratos/testes antes da DDL; transferências/regulamento avançado ficam na etapa 5.
