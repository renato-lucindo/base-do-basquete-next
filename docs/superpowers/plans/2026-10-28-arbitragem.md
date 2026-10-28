# Arbitragem no cadastro do jogo

> Execução pela skill executing-plans, com testes focais antes da implementação. Plano aprovado pelo responsável nesta conversa em28/10/2026.

**Objetivo:** seis funções opcionais no diálogo Novo/Editar jogo, duas colunas compactas, catálogo global privado e vínculos por identidade/função, sem exposição pública.

**Base:** origin/main e6e8bf49c7040070cfc0fe0aa9cf8eca1169de34; branch única codex/arbitragem no worktree UI existente. Reaproveitamento de elencos permanece na PR38/acc1120, fora desta unidade. CI pós-merge40689943214 e CI WIP40690295696 reconciliadas SUCCESS antes de iniciar; não repetir essas suítes como baseline.

## Restrições

- Quadra: Árbitro → Fiscal1 → Fiscal2. Mesa: Apontador → Cronometrista → Operador de24s. Grupos independentes; uma pessoa por função e uma função por pessoa no jogo.
- Todos opcionais. Limpeza de predecessor com dependentes exige confirmação local para limpar somente o grupo correspondente.
- Catálogo por UUID, nome normalizado para busca, sem deduplicar identidades por nome. Novo homônimo requer confirmação explícita. Criação apenas dentro do salvamento bem-sucedido do jogo.
- Dados privados; estatísticas/página de arbitragem futuras fora desta entrega. Sem relações obrigatórias com atletas/coaches ou dados pessoais adicionais.
- Migrations anteriores imutáveis. Criar migration pela CLI fixada somente após RED. Não aplicar as migrations de reaproveitamento49/50 nem executar seeds Auth/admin no remoto.
- Uma PR diretamente para main. Salvar trabalho no mesmo branch/PR em resets. Não mudar preview antes de gate/CI/fonte estáveis. Credenciais somente nos cofres e smokes efêmeros existentes.

## Tarefas

- [x] A1 contratos TS e banco: RED para vazio/seis funções, dependências, IDs repetidos, homônimo, autorização, atomicidade, replay, versões e compatibilidade. Catálogo e vínculos privados com RLS/grants, índices por oficial, recibos imutáveis. RPCs versionadas preservam save_game/get_game/list_games anteriores. Testar zero/upgrade em PostgreSQL descartável e prova real com rollback sem DML Auth/admin antes de aplicar com segurança.
- [x] A2 transporte: provider, SessionStore, rotas de consulta paginada e editor/salvamento versionado; origem/limite/autorização fresca/identidade/ACK/contexto e tipos. Focais unitários e workerd.
- [x] A3 interface: dropdown reutilizável com busca/paginação, seleção porID, novo nome/homônimo; seis campos em duas colunas ao final do diálogo, dependências/limpeza confirmada, teclado/foco/rascunho/reauth/retry/409. Focais desktop1366×768 e1920×1080; sem novas colunas públicas/admin de lista.
- [x] A4 integração: revisão da unidade, gate único estável, CI da PR, publicação protegida e smokes novos/revogação. PR39 integrada, CI583unit/441browsersPASS/91SKIP, fonte6a11747 publicada; detalhes e limitações em docs/VALIDACAO-ARBITRAGEM.md. Sem revisão independente ou aceite humano pós-publicação declarado.

## Decisões técnicas

- Contrato de seleção: null, existente porUUID, ou novo porUUID/nome/confirmHomonym. UUID do novo é congelado no comando para retry seguro.
- Catálogo privado independente de persons: identidade estável suficiente para futuras contagens/parcerias, sem ampliar o cadastro obrigatório de atletas/coaches.
- RPCs de editor/salvamento versionadas evitam acrescentar campos aos DTOs estritos em uso pelo Worker publicado. Jogo e arbitragem compartilham versão e transação. Writer legado preserva vínculos existentes.
- Nomes usados no jogo são snapshots. Trocar o catálogo no futuro não reescreve jogos; o recibo de cada salvamento preserva a escala confirmada.

## Revisão e evidências

Conferir duplicação por retries, corrida de homônimos entre jogos, versão incorreta durante leitura, limpeza em cascata indevida e vazamento por DTO público. Registrar comandos/resultados em docs/VALIDACAO-ARBITRAGEM.md e checkpoint na pausa/conclusão.
