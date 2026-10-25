# Transferências e retornos — evidências

## T1 — contrato e planejador privados

24/10/2026. Branch codex/transferencias, basea9d0b8e/PR15, plano/decisão014 em0a60917. Sem DDL, rotas, alteração de vínculos reais ou deploy. O leitor/escritor autoritativo e integração ainda não existem.

RED observado: src/people/transfer.test.ts falhou por módulo transfer ausente antes da implementação. GREEN: **19novos cenários e23focais em4arquivos PASS**, composição dos contratos de pessoa/elenco/comissão. Log ignorado .preview-artifacts/transfers-t1-focal.log SHA256 **db67cd1101fcf762a6629997c1ddcab90042673618585f3030d5069e460a1251**. Tipos app/Worker, lint/formato focais PASS antes dos dois últimos cenários; repetidos sobre o estado final antes do commit.

Prévia fecha e abre no mesmo instante fornecido pelo futuro servidor, não modifica contexto e não aceita jogos/estatísticas como entradas ou saídas. Retorno cria novoID/período; origem encerrada exige ausência de outro ativo e última origem conhecida. Inscrições diferentes da mesma equipe global continuam distintas.0/00 e camisa histórica preservados; ocupação ativa conflitante bloqueia. Regra ausente/proibida, versão/fingerprint alterados, outra pessoa/disputa, ID usado e origem histórica ultrapassada bloqueiam. Contextos com dois ativos, camisa ativa repetida ou períodos sobrepostos são recusados. Datas mantêm microssegundos/equivalência de fuso; sobreposição de1µs não é arredondada. DTO adulterado/servidor forjado no comando são recusados.

Contexto completo e relógio autoritativo são precondições, não autorização de dados do browser. O planejador não prova SQL/atomicidade/RLS, não fecha o desvio atual de inativar→cadastrar outro vínculo, não valida sexo privado nem muda dados. T2 deverá provar e implementar essas guardas no banco, incluindo importador, locks/recibos/history/Recentes, configuração de regra e zero/upgrade. T3 integra a experiência no elenco.

Não repetir gates do previewO4 ou do P1 por sessão/documentação. T1 não tem CI/gate vertical/deploy próprio. Sem prova independente/corridaPGmulticonexão/carga/WCAG completa. Responsável sem disponibilidade para teste manual hoje; aceite pendente, não solicitar novamente. Definição de elegibilidade pública R3e continua pendente e independente.
