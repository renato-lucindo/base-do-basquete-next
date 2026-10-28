# Desempenho dos salvamentos administrativos

Objetivo autorizado: reduzir a espera real em jogos, súmula e importação, preservando autorização atual, versões, recibos e dados humanos. Uma branch existente codex/desempenho-sumula e uma PR diretamente para main; PR38 independente não participa.

## Diagnóstico e decisão

Estatísticas reais pg_stat_statements: salvar súmula média10,876ms/65chamadas, jogo5,746ms/13 e atleta importado4,845ms/255. Não incluem rede/Auth nem provam latência total. Amostra Cloudflare de137eventos/24h inclui saveGameEditor8298ms/8msCPU e diversas consultas com espera de segundos. A amostragem não contém todos os salvamentos e não permite atribuir tempos individuais de rede sem instrumentação.

Código: cada operação da sessão consulta Auth e depois admin_access em sequência; a identidade esperada já está no envelope cifrado da sessão. O importador dispara releitura do elenco a cada linha confirmada enquanto confirma outras linhas na mesma sessão serializada. Jogos/súmula ainda fazem POST e GET sequenciais.

Escolha reversível: consultar identidade e permissão em paralelo usando exclusivamente o ID do envelope cifrado, exigir sucesso de ambas e igualdade com Auth, sem cache de autorização e mantendo a fila/rotação/logout. Login inicial sem identidade conhecida mantém o caminho sequencial. Não usar user_metadata nem dados do browser como autoridade. Coalescer a releitura de elenco até o fim do lote, incluindo sucesso parcial. Instrumentar somente tempos/etapas e nomes fixos das operações afetadas, sem tokens, nomes ou corpos. Cache de permissão, remoção de autorização e mudança de plano não são soluções adotadas.

## Execução e validação

1. RED de paralelismo e rejeição de identidade/permissão/indisponibilidade; benchmark controlado antes/depois com os três providers reais e upstream fictício com RTT explícito, sem alegar que são tempos do preview.
2. Implementar a autorização paralela e confirmar regressões de refresh, revogação, logout e autoridade por operação.
3. RED desktop de ausência de releitura de elenco no meio do lote; corrigir e verificar final/erro parcial/retry/reauth. Sem esforço mobile novo.
4. Acrescentar tempos de fila/autorização/dados nos caminhos afetados para permitir confirmação remota sem credenciais. Ler apenas métricas necessárias; qualquer fixture remota deve usar rollback, sem DMLAuth/admin.
5. Gate/CI sobre unidade estável, preview protegido com smokes/revogação e checkpoint de evidências/limites. Reutilizar evidências inalteradas; nenhuma migration prevista nesta correção.

Se as medições mostrarem que a fila ou POST/GET continuam dominantes, registrar a limitação e tratar em unidade coerente seguinte, sem declarar a lentidão inteira resolvida por uma melhoria parcial.

## Estado da entrega

Correção inicial integrada pela PR41 e publicada na fontef1513c9, com gate588unit/25workerd e CI443browsersPASS/93SKIP, revisão automática sem apontamentos e smoke protegido/revogação. Detalhes, hashes e limitações em docs/VALIDACAO-DESEMPENHO-SALVAMENTOS.md. A etapa de observação end-to-end autenticada continua pendente; não é suprida pelo benchmark controlado nem pelo smoke sem sessão da aplicação.
