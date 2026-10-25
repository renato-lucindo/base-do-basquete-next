# Perfil confirmado — evidências

## P1 — fundação local, 25/10/2026

Base material e00ba15 da tabela estatística; branch própria codex/perfil-confirmado, plano2026-10-25-perfil-confirmado e ADR017. Contratos novos de proposta, confirmação, publicação, estado/histórico e ACK; nomes homônimos porUUID, campos privados recusados, revisões com motivo e versões explícitas. Ainda sem API/DO/UI do perfil.

RED inicial de contrato por módulo ausente; depois asserções identificaram limites Unicode diferentes do esperado: max do runtime aceitou61emojis no nome/1001no motivo. Refinamento explícito string.length mantém limites UTF16 e rejeita nulo/surrogate solto.5contratos novos +2de pessoa PASS. Não alterou schema nem dados do cadastro anterior.

RED PostgreSQL do zero/upgrade: RPC ainda ausente. Migration gerada pela CLI fixada2.121.0 após help/RED: **20261025215131_player_profile_publications.sql**, SOMENTE LOCAL neste registro. Snapshots próprios, histórico/recibos/FKs/RLS/grants mínimos e guardas; authfresh, replay/versões, leitura serializada por identidade, revisão e Recentes. Nenhum bypass de autorização ou credencial de servidor no browser.

**10testes/4arquivos de composição PASS**: contratos, duas reconstruções do perfil, fonte estatística e projeção de resultados. SQL prova metadados opcionais nulos, nascimento privado sem inferência, homônimos, treinador sem atleta recusado, publicação/revisão, ACK original depois de nova publicação, edição não republica, histórico20+3, grants de anon/auth/service_role, RLS, imutabilidade/FKs, revogação e rollback atômico após escrita da projeção. Matriz TS×SQL de comandos/Unicode/metadados incluída. Falha intermediária no upgrade era harness tentando consultar helper depois do rollback da própria migration; movida a matriz para antes do rollback, sem enfraquecer produto.

Gate consolidado local **450unit/91arquivos,5transportes,13PG,18workerd,4PDFs/builds/tipos/fronteira/segredos565 PASS**. Sem nova suíte browser por contratos/SQL não consumidos; estatísticas e transferências usam CI e00ba15, que não inclui código do perfil. Artefatos inalterados/harness126 preservam evidências anteriores.

Pendente: aplicar uma vez no projeto novo após registrar a unidade, prova real BEGIN/ROLLBACK, reconciliar versão/tipos/advisors. Sem publicação humana de perfil, aceite humano, revisão independente, carga, corridaPGmulticonexão ou WCAGcompleta comprovados. Fonte de carreira e UI ainda não implementadas.
