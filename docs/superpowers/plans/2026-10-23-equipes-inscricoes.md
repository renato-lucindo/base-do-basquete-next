# C2 — equipes e inscrições

> Execução inline com executing-plans e test-driven-development; decisões reversíveis delegadas pelo responsável. Base `929b1938429eddb89428467a1225544d0dd5c3c3`, branch `codex/equipes-inscricoes`. Checkpoint central em PROGRESSO.md.

**Objetivo:** localizar/criar/editar equipes globais e inscrições distintas numa disputa salva, na mesma área de trabalho. Preservar a experiência do primeiro protótipo e os dados reais de C1.

**Arquitetura:** React → Worker de mesma origem → SessionStore autorizado → RPCs fixas PostgreSQL. Equipe e inscrição têm identidades e versões independentes. Cadastro global explícito precede a inscrição; se a segunda gravação falhar, a equipe permanece selecionável e não é criada novamente. Cada operação é atômica/idempotente. Alternativa descartada: regravar equipe global implicitamente a cada edição de inscrição causaria conflitos e alterações globais inesperadas.

**Spec:** pacote ESCOPO §§3/5/9, EXPERIENCIA F03 e CONTRATOS Identidade/Equipes. Sem transferências, elenco/pessoas (C3), importação de texto (C4), exclusão ou novas dependências nesta unidade.

**Contrato:** `teams(id,name,abbreviation,version,saved_at)` global; `registrations(id,dispute_id,team_id,name,version,saved_at)` contextual. Nomes não são chaves únicas; nunca fundir por texto. Pais de inscrição salva são imutáveis. Nome global não sobrescreve nome público de inscrições. Limites operacionais: nomes 120, sigla opcional 12; busca 120, páginas 20, offset até 100000, comando até 8192 bytes. Recentes atualiza os campeonatos afetados somente após escrita efetiva, sem incrementar versão de informações de C1.

## Foco de revisão

- Duas inscrições da mesma equipe e nomes iguais não fundem identidades; SQL e navegador.
- Alteração global conserva nomes públicos/contextos; SQL e UI com aviso explícito.
- Destino trocado/ID forjado/versão vencida não reatribui inscrição; SQL/HTTP.
- Resposta perdida reapresenta o mesmo comando, sem duplicar; contrato SQL e navegador.
- Mudança de aba/disputa/saída e reautenticação preservam ou confirmam descarte do trabalho; navegador.

## C2.1 — contrato e banco

Concluído: migration remota/local `20261023120105_teams_registrations`; dois testes de contrato TS e três cenários SQL PASS (do zero, upgrade de acesso, upgrade C1 com dados preservados). Contrato C2 também PASS no Supabase real com rollback; contagens finais campeonato/edição/disputas 1/1/2, equipes/inscrições/recibos C2 0/0/0, Auth/admin 1/1. Tipos regenerados. Advisor somente WARN já conhecido de senha vazada/Pro; nenhuma contratação. Leitura da documentação atual de grants/RLS confirmada; changelog markdown indisponível pelo leitor web, sem inferir mudança de plataforma. Sem teste multi-conexão/escala real.

- [x] Criar `src/teams/contract.test.ts` antes de `contract.ts`; comandos estritos `SaveTeam` e `SaveRegistration`, snapshots/listagens limitados.
- [x] Criar `supabase/tests/teams.sql`, anexar ao runner; observar falha por funções ausentes.
- [x] Gerar migration pelo CLI: tabelas, índices de FKs, RLS/SELECT admin, recibos privados com deny, leitores invoker e dois escritores privados delimitados. Testar do zero e upgrade com dados C1 preservados; comandos versionados, pais, revogação e rollback.
- [x] Inspecionar somente projeto novo; aplicar migration estável via plugin, executar contrato com fixtures isoladas/rollback, comparar contagens reais, gerar tipos e advisors. Não repetir contratos antigos contra dados reais.
- [x] Commit da unidade de banco após verificações focais.

## C2.2 — transporte

- [x] Testar adapter antes de implementar `src/teams/provider.ts`; rotas fixas list/get/save, erros sanitizados e limites iguais aos contratos.
- [x] Adicionar métodos específicos no SessionStore e rotas `/api/teams` e `/api/registrations` (GET listagem, GET UUID, POST); sessão/origem/query/body testados no workerd. Não expor tokens.
- [x] Commit após tipos/testes focais.

## C2.3 — experiência e entrega

- [x] Testes Playwright de criação global, duas inscrições/retomada/contexto, edição global, falha incerta/conflito e trabalho não salvo; observar vermelho antes da UI.
- [x] `src/teams/screen.tsx`: lista pesquisável com expansão por inscrição, cadastro/edição na página, escolha explícita de equipe global, sigla opcional, nome público independente. Vazio honesto de elenco até C3.
- [x] Integrar abas funcionais Informações e Equipes e elencos em `src/competition/screen.tsx`; não oferecer Jogos/Regulamento fictícios. URL conserva aba/disputa. Guardas de rascunho incluem ambos os editores, também ao sair/reautenticar.
- [ ] Focais, visual desktop/celular e gate consolidado quando estável; PR draft sobre C1, CI e publicação protegida do source exato. Preservar Access/cofre/namespace. Smokes novos e validação humana, sem senha do responsável.
- [ ] Atualizar PROGRESSO.md, registrar evidências válidas/limitações e seguir C3 conforme cota real. Revisão independente somente se ferramenta disponível; não inventar aprovação.
