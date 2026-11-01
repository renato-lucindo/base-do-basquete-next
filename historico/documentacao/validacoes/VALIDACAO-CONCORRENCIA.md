# Concorrência real no PostgreSQL descartável

26/10/2026, branch codex/concorrencia-postgres/base0198cd2. Runner versionado `docs/evidencias/concurrency/native_postgres.py`; reprodução: `python docs/evidencias/concurrency/native_postgres.py`, após preparar os binários isolados descritos no plano2026-10-26-concorrencia-postgres-nativo. Nenhuma alteração de produto/migration/serviço remoto foi necessária.

## Ambiente e proveniência

Windowsx64/Python3.12.3/PostgreSQL **17.11 nativo**, semPGlite neste ensaio. Arquivo oficialHTTPS https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip:340719294bytes, SHA256 **6eabdf00d2893713b75db4336a23c3fdf505f056e217ec6e2e95d901750cfea3**. Hash calculado da cópia obtida, não checksum publicado: endpoint.sha256 retornou403; EXE informouNotSigned, não foi alegada assinatura verificada. Versão real conferida emCLI e conexão.21903entradasZIP verificadas contra caminhos absolutos/traversal/symlinks; somente1592debin/lib/share e headerlibpq extraídas,141057227bytes, diretório novo ignorado. Espaço livre conferido antes; sem instalador/serviço/PATHglobal.

Cada execução cria cluster novo dentro de .preview-artifacts/pg-native-run-<id>, com banco bdb_disposable_native, apenas127.0.0.1:55439/trust/dados fictícios. Verifica porta livre antes, diretório real do servidor apósconexão e44migrations/última20261026082747. Usuário postgres replica o proprietário da plataforma; rolesAuth/Storage são a fixture, semGoTrue/JWT real. Nenhuma credencial de conta humana foi solicitada/extraída. Processos semjanela; clientes fechados e pg_ctl do próprio diretório executado emfinally. Arquivos ignorados preservados, sem exclusão recursiva.

Primeira tentativa falhou **antes dos casos**, pois initdb com usuário test_owner não criava a rolepostgres referida por migrations. Corrigida somente a inicialização do cluster para corresponder à plataforma, nenhuma migration editada. Essa falha jácomprovoustop0/portClosedtrue. Segunda execução passou cinco casos; terceira acrescentou conferência das chaves reais de advisorylock e exigência de stopExit0, passando novamente. Sem omitir a falha de preparação nem produzir falha artificial no produto que jácumpria essas regras.

## Cinco sobreposições comprovadas

Barreira de teste somente no banco descartável, emBEFOREpublished_games, pausa o writer **depois** de ele obter autorização/comando/root. Não desabilita guardas nem usa bypassGUC/token. Controlador, escritoresA/B e leitor têm quatroPIDs distintos. A sequência depende de pg_stat_activity/pg_locks/pg_blocking_pids observados, não de tempo presumido porsleep. Polling sóaguarda a evidência comdeadline.

1. Mesmo requestId simultâneo: Baguarda o advisorylock publication-command deA, comclassid/objid/objsubid conferidos contra hashtextextended da chave exata. Liberação permite doisACKs iguais/versão1, uma súmula/publicação/recibo.
2. Comandos diferentes eversão antiga: Baguarda o rootcompetition deA (chave conferida). DepoisAcomita, BrecebePT409; repetição da mesma intenção antiga continuaPT409 e não cria recibo.
3. Revogação administrativa: UPDATEenabled=false não comitado mantémB esperando transactionid do controlador na autorizaçãofresca. ApósCOMMIT, BrecebePT403, semrecibo/publicação dessa intenção. O caso complementar de revogação iniciada depois doauthfresh ainda não foi executado.
4. Leitura pública durante correção: enquantoAestápausado, leitor retorna snapshot antigo completo sem esperar o root; depoisCOMMIT, página da versãoantigaPT409 e head passa2→3. Histórico privado anterior é exatamente igual ao snapshot anterior.
5. Jogos diferentes da mesmadisputa: Bespera o root deA; ambos publicam, sem perder projeção/versão. Fim:4jogos públicos,5versões/recibos/mudanças,44participações, headversão5/gameCount4. Os demais996jogos da fixture continuam sem publicação; nada vira0–0 ou fonte futura.

**PASS cinco casos** em09:42:37→09:42:44UTC (06:42:37→06:42:44SãoPaulo), PIDs controlador109236/A123532/B106056/leitor117652. Teste deixa de aceitar execuçãoPythoncomasserts desativados. **stopExitCode0/portClosedtrue**, nenhuma porta55439 emLISTEN apóso teste. EssesPIDs são evidência dessaexecução, não alvos para operações futuras.

Relatório .preview-artifacts/native-concurrency.json SHA256 **ef4317fed099b38e331deb7a04adaa526d7d2310be382db1f61bdd33ca00b4d6**, log native-concurrency-lock-identities.log **817e0276dc3e05e9b47e93e73ca26875a769d0dd0872ddd7356bb308aa7ad92a**, runner **9832416ab185237972be66a16b41345f301f221cad4dbdcada3ece50722d4479**. Tentativas anteriores/relatório inicial verde preservados ignorados. Hashes não convertem o ensaio em carga/latência de produção.

## Limites e reaproveitamento

Prova de locks/transações desses cinco casos emPostgreSQL17.11 real local, complementar aos contratosSupabase17.11 jáexecutados. Não simula a criptografia/serviçoGoTrue, StorageHTTP, todas as corridas de transferências/regulamento/inscrições, carga ou recuperação por perda de energia. CI dedicada émelhoria posterior opcional, ainda não executada. Sem revisão independente ou aceite humano.

Produto e artefatos ficaram idênticos à fontebbcda6a/CI515+352/preview protegido da acessibilidade. Reutilizar esses gates/smokes e SQL inalterados; não gerar novo deploy ou repetir515/352/harness126 por estes arquivos de teste/documentação. Nenhum projeto/serviço/dado anterior foi consultado para a prova e nenhum dado humano foi alterado. Produção permanece pendente.
