# Transferências e retornos — evidências

## T1 — contrato e planejador privados

24/10/2026. Branch codex/transferencias, basea9d0b8e/PR15, plano/decisão014 em0a60917. Sem DDL, rotas, alteração de vínculos reais ou deploy. O leitor/escritor autoritativo e integração ainda não existem.

RED observado: src/people/transfer.test.ts falhou por módulo transfer ausente antes da implementação. GREEN: **19novos cenários e23focais em4arquivos PASS**, composição dos contratos de pessoa/elenco/comissão. Log ignorado .preview-artifacts/transfers-t1-focal.log SHA256 **db67cd1101fcf762a6629997c1ddcab90042673618585f3030d5069e460a1251**. Tipos app/Worker, lint/formato focais PASS antes dos dois últimos cenários; repetidos sobre o estado final antes do commit.

Prévia fecha e abre no mesmo instante fornecido pelo futuro servidor, não modifica contexto e não aceita jogos/estatísticas como entradas ou saídas. Retorno cria novoID/período; origem encerrada exige ausência de outro ativo e última origem conhecida. Inscrições diferentes da mesma equipe global continuam distintas.0/00 e camisa histórica preservados; ocupação ativa conflitante bloqueia. Regra ausente/proibida, versão/fingerprint alterados, outra pessoa/disputa, ID usado e origem histórica ultrapassada bloqueiam. Contextos com dois ativos, camisa ativa repetida ou períodos sobrepostos são recusados. Datas mantêm microssegundos/equivalência de fuso; sobreposição de1µs não é arredondada. DTO adulterado/servidor forjado no comando são recusados.

Contexto completo e relógio autoritativo são precondições, não autorização de dados do browser. O planejador não prova SQL/atomicidade/RLS, não fecha o desvio atual de inativar→cadastrar outro vínculo, não valida sexo privado nem muda dados. T2 deverá provar e implementar essas guardas no banco, incluindo importador, locks/recibos/history/Recentes, configuração de regra e zero/upgrade. T3 integra a experiência no elenco.

Não repetir gates do previewO4 ou do P1 por sessão/documentação. T1 não tem CI/gate vertical/deploy próprio. Sem prova independente/corridaPGmulticonexão/carga/WCAG completa. Responsável sem disponibilidade para teste manual hoje; aceite pendente, não solicitar novamente. Definição de elegibilidade pública R3e continua pendente e independente.

## T2a — permissão opcional no regulamento

Quatro testes RED observados: TS/SQL recusavam transfers:null/allowed/forbidden e writer retornava invalid_regulation. Campo opcional e finito adicionado ao contrato e ao validador PostgreSQL. Ausência antiga não recebe default permitido nem modifica histórico. Valores booleanos/números/objetos/fórmulas/campos extras continuam recusados.

MigrationCLI20261025022803_transfer_permission aplicada pelo plugin somente no projeto novo como **20261025022957_transfer_permission**; arquivo renomeado para reconciliar a versão real, SHA256 **f7ed3cd6a9ba6652769beb4f86e4b3fc697c4dde495c03f2d8c542a5a630a8fb**. NÃO editar/reaplicar. CREATE OR REPLACE preserva OID, ACL, search_path/securityinvoker e vínculo do CHECK existente; sem tabela, grant, assinatura pública ou tipo gerado novo.

**4novos cenários**, matriz19casos TS×SQL, zero/upgrade com regulamentos/publicações existentes, gravação allowed→forbidden→null, replay e histórico imutável PASS. Composição afetada **51testes/5arquivos PASS**, incluindo3PG antigos do regulamento,17P1 públicos e19T1; log .preview-artifacts/transfers-t2a-composition.log SHA256 **c932524072e0a17639bcde01502ad26d225d574cf59a033f8cbde58d20d26293**. Tipos app/Worker/lint/formato/segredos469PASS.

Contrato real Supabase **BEGIN/ROLLBACK PASS**, proof .preview-artifacts/transfer-permission-proof.sql SHA256 **ed5824d72539f77218e92db4b22d52fb8a744876bb323896e47cb3f3ad54598f**.33migrations reconciliadas; contagens antes/depois0regras/publicationVersions/elenco/objetos,2inscrições/1Auth. Advisorsegurança somenteWARN conhecido de senha vazada/Pro, sem contratação. Fixtures sintéticas revertem inclusive admin_access no rollback; dados humanos preservados. Sem DDL em andamento.

Ainda não há leitor/escritor de transferência, fechamento do desvio de cadastro/importação, editor de permissão ou deploy do novo contrato. T2a somente prepara persistência da regra; não declarar operação pronta nem permissão efetiva no fluxo atual. Gate/CI vertical quando transação/API/UI estiverem estáveis; evidências O4/P1 imutáveis reutilizadas.
