# Perfil confirmado — evidências

## P1 — banco novo reconciliado, 25/10/2026 19:01UTC-03

Migration aplicada UMA vez pelo plugin no projeto novo nizmasjddyrhmevvfviz/vínculo link_6adaa8aab5688191b1e7ae1cddc55a82. Versão real **20261025215954_player_profile_publications.sql**, arquivo CLI215131 renomeado para o timestamp remoto, sem reaplicar; SHA256 **5c12f0d86bc28b53e9bd5d0c873d40af49d3bf1f1e6e5878ce878137e1f4816e**.42migrations reconciliadas, imutáveis após aplicação.

Após gate450, revisão focal encontrou validação de offset antes da autorização no leitor de estado. Novo caso de administrador revogado com offset inválido observou RED; autorização passou para antes da validação e dois cenários zero/upgrade GREEN. Somente essa ordem de leitura mudou após o gate; não repetir450 por isso. Tipos gerados e typecheck/lint posteriores aprovados.

Prova real **BEGIN/ROLLBACK PASS**, inclusive23confirmações sintéticas, histórico20+3, versões/motivos/grants/RLS/imutabilidade/revogação/rollback após escrita da projeção. Identidade administrativa humana foi reutilizada, sem trocar bootstrap; duas identidades Auth de fixture foram criadas somente na transação descartável. Nenhuma credencial usada ou emitida. Resultado real parseado pelos contratos TS,7focais PASS com BDB_REAL_PROFILE_PROOF=1. Prova JSON ignorada SHA256 **83c2a9762936082c4d84c845e838bccce42dc6821c01118a2b8f37b1b6491735**, log de validação **cc7bf6b86f6af5dc4fd48bbfab46b92d49e3c858540261d9b2c2f549530346f8**. Gate450 anterior SHA256 **fd8a98cd55a1c34c64160fc7ea835b27bf2a93992988c754ef502722df5d0e2a**; composição10 SHA256 **b36f958211f25931aea0c7bebe81e7231e8a42e337b570efd1d7762d60908762**.

Pós-rollback:1pessoa/2inscrições/1Auth/1adminativo,0perfis/versões/recibos/jogos/estatísticas/objetos. Advisor segurança somenteWARN conhecido de senha vazada/Pro;10INFO de FKs antigas, nenhuma nova do perfil; índices sem uso são esperados no banco sem dados publicados, sem remoções especulativas. Consulta do changelog atual sem mudança relevante para esta DDL/RLS. PlanoFree mantido, sem contratação.

Próximo P2: fonte indexada de participações confirmadas e matriz de adaptação SQL×TS, depois domínio de carreira/API/UI. Nada do perfil foi publicado no Worker: preview permanece e00ba15 estatístico. Sem CI específico do perfil ainda, nem aceite humano/revisão independente/corrida real multiconexão/carga/WCAGcompleta.

## P1 — fundação local, 25/10/2026

Base material e00ba15 da tabela estatística; branch própria codex/perfil-confirmado, plano2026-10-25-perfil-confirmado e ADR017. Contratos novos de proposta, confirmação, publicação, estado/histórico e ACK; nomes homônimos porUUID, campos privados recusados, revisões com motivo e versões explícitas. Ainda sem API/DO/UI do perfil.

RED inicial de contrato por módulo ausente; depois asserções identificaram limites Unicode diferentes do esperado: max do runtime aceitou61emojis no nome/1001no motivo. Refinamento explícito string.length mantém limites UTF16 e rejeita nulo/surrogate solto.5contratos novos +2de pessoa PASS. Não alterou schema nem dados do cadastro anterior.

RED PostgreSQL do zero/upgrade: RPC ainda ausente. Migration gerada pela CLI fixada2.121.0 após help/RED: **20261025215131_player_profile_publications.sql**, SOMENTE LOCAL neste registro. Snapshots próprios, histórico/recibos/FKs/RLS/grants mínimos e guardas; authfresh, replay/versões, leitura serializada por identidade, revisão e Recentes. Nenhum bypass de autorização ou credencial de servidor no browser.

**10testes/4arquivos de composição PASS**: contratos, duas reconstruções do perfil, fonte estatística e projeção de resultados. SQL prova metadados opcionais nulos, nascimento privado sem inferência, homônimos, treinador sem atleta recusado, publicação/revisão, ACK original depois de nova publicação, edição não republica, histórico20+3, grants de anon/auth/service_role, RLS, imutabilidade/FKs, revogação e rollback atômico após escrita da projeção. Matriz TS×SQL de comandos/Unicode/metadados incluída. Falha intermediária no upgrade era harness tentando consultar helper depois do rollback da própria migration; movida a matriz para antes do rollback, sem enfraquecer produto.

Gate consolidado local **450unit/91arquivos,5transportes,13PG,18workerd,4PDFs/builds/tipos/fronteira/segredos565 PASS**. Sem nova suíte browser por contratos/SQL não consumidos; estatísticas e transferências usam CI e00ba15, que não inclui código do perfil. Artefatos inalterados/harness126 preservam evidências anteriores.

Pendente: aplicar uma vez no projeto novo após registrar a unidade, prova real BEGIN/ROLLBACK, reconciliar versão/tipos/advisors. Sem publicação humana de perfil, aceite humano, revisão independente, carga, corridaPGmulticonexão ou WCAGcompleta comprovados. Fonte de carreira e UI ainda não implementadas.
