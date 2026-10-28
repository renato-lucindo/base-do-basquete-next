# Concorrência em PostgreSQL nativo descartável

Unidade posterior à publicação da acessibilidade, ainda não iniciada. Objetivo da VALIDACAO§Infraestrutura: provar sobreposições reais de transações e locks, além do PostgreSQL WASM de conexão única. Produto/contratos continuam exclusivamente o ZIP e feedback aceito; não consultar banco/repositório anterior. Não alterar o projeto Supabase humano para experimentar concorrência.

**Execução26/10:** N1/N2 e evidências locaisN3 concluídos em3e3c378/PR23 sobre22. Cinco sobreposições reais passaram em17.11/Winx64, chaves/PIDs/bloqueios conferidos, stop0/porta fechada; primeira falha de preparação/limites/proveniência emVALIDACAO-CONCORRENCIA.md. CI dedicada e variante opcional revogação apósauthfresh não executadas. Produto/artefatos idênticos ao previewbbcda6a; sem novo gate/deploy por teste/docs.

## N1 — ambiente isolado e verificável

- [ ] Reconciliar cota/Git/CI/preview e abrir branch sequencial codex/concorrencia-postgres. Binários PostgreSQL/psql/Docker ausentes doPATH; não usar instâncias/dados existentes. Metadados do fornecedor oficial confirmaram arquivo https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip, HTTP200/applicationzip/340719294bytes; checksum .sha256 respondeu403, sem retry em loop ou autorização inventada.
- [ ] Se necessário baixar somente arquivo oficialHTTPS em diretório próprio ignorado; registrar URL/tamanho/SHA256, verificar entradas doZIP contra traversal antes de extrair em diretório novo, conferir versão real. Não executar instalador, registrar serviço, mudarPATH global ou abrir janela. Conferir espaço disponível antes (última leitura≈7,25GB livres; consumo precisa ser limitado). Se não houver forma segura, manter limitação explícita e seguir parte independente.
- [ ] Criar cluster novo em .preview-artifacts/pg-native-test, usuário fixo de fixture/trust somente127.0.0.1/porta não ocupada e banco cujo nome começa bdb_disposable_. Sem senha/segredo ou acesso externo. Processos de ajuda Start-Process devem ser Hidden. Caminhos absolutos resolvidos precisam ficar no workspace; nunca iniciar/parar serviço existente. Definir timeout/cleanup antes de iniciar: pg_ctl do próprio diretório, stop fast nofinally; manter arquivos ignorados, sem exclusão recursiva necessária.

## N2 — contrato e sobreposição determinística

- [ ] Runner reproduzível fora do gate rotineiro, sem dependência de segredos. Preferir libpq via biblioteca padrão Pythonctypes se disponível, conectando exclusivamente ao cluster novo; preparar funções PQconnectdb/PQexec/PQsendQuery/PQconsumeInput/PQisBusy/PQgetResult/PQresultErrorField/PQfinish com tipos explícitos. Erros devem devolver somente SQLSTATE/mensagem da fixture; deadlines curtos e rollback/disconnect/stop garantidos.
- [ ] Aplicar platform fixture e44migrations imutáveis no cluster vazio; gerar dados somente fictícios por confirmed-capacity.ts e confirmar FKs. Controlador, escritoresA/B e leitor têm conexões/PIDs realmente distintos. Não usar sleep como prova de concorrência: observar pg_stat_activity/pg_locks/pg_blocking_pids e registrar quem bloqueia quem.
- [ ] Barreira somente no banco descartável: trigger de teste antes de published_games espera advisorylock mantido pelo controlador. Assim o writer real jáobteve authfresh→command→root/linhas. Não desabilitar guardas produtivas, inventar bypassGUC/token nem alterar migrations aplicadas.
- [ ] Mesmo comando simultâneo: A parado na barreira, B bloqueado pelo comando deA; liberar e exigir doisACKs iguais/uma publicação/súmula/recibo/mudança/projeção.
- [ ] Comandos distintos com versões antigas para o mesmo jogo: B bloqueado pelo root; apósAcommit, B rejeita409 e outra tentativa antiga continua409, sem recibo/efeito parcial. Histórico anterior intacto.
- [ ] Revogação: controlador mantém UPDATEenabled=false semcommit; writer deve esperar a linha admin. ApósCOMMIT, rejeita403 sempublicação/recibo. Opcional complementar: revogação iniciada depois doauthfresh espera o writer jáautorizado; próxima operação após revogação recusa403.
- [ ] Páginas públicas durante correção: leitor vê fonte antiga completa enquantoA não comitou; apóscommit, versão antiga retorna409 e nova versão écoerente. Não bloquear GET público no root nem expor história privada. Guardar snapshots/recibos/contagens antes/depois e prova dos bloqueios, sem dados de conta humana.

## N3 — evidências e fechamento

- [ ] Observar RED para suporte ausente/comportamento incorreto; provas focais antes de corrigir algo. Runner de concorrência não deve mudar produto se ele jácumprir o contrato. Serviço local17.11 não equivale a AuthGoTrue real; complementaridade com contratos jáexecutados emSupabase17.11, sem atribuir um ao outro.
- [ ] Provar término de todos os processos/porta fechada ao sair e registrar versão/ambiente/SHAs/tempos/limitações. CI opcional dedicado com serviço PostgreSQL17.11 apenas se runner/ambiente estiverem estáveis; não repetir515/352/harness126 ou gates completos por artefatos de teste/documentação sem alteração de produto.
- [ ] Preservar migrations/segredos/dados humanos/preview; docs/VALIDACAO-CONCORRENCIA.md e PROGRESSO.md governam continuidade. Sem merge/produção/revisão independente ou carga inferidos.

Cota real antes de preparar/baixar/iniciar e entrecasos; ao85%usados5h sómenor operação segura (inclusive parar cluster próprio), checkpoint/push/MESMAautomação resetefetivo+2. Nunca deixar banco de teste/porta ativa por limite de cota; não comprar créditos/plano/resetmanual. Aceites/agenda/StorageHTTP adiados continuam pendentes sem repetir perguntas.
