# Remoção de inscrição vazia — evidência parcial

26/10/2026, branch `codex/ciclo-inscricoes`, base `0c2017f`, contrato L1 `dd03e9b`. Somente fontes do pacote e decisões delegadas. Plano `docs/superpowers/plans/2026-10-26-remocao-inscricao.md`. Nenhum cadastro humano excluído; alteração do esquema novo registrada abaixo.

## Estado atual L2 — aplicado e reconciliado

Migration **20261026135708_registration_removal.sql** aplicada uma vez e reconciliada (versão CLI inicial133442, renomeada para135708 após observar o ledger real). Conteúdo idêntico, SHA256 `ca525c6f32f362474d58dae93a0cb05bbeea09b5f1b02e8fceeb5bea5d93e4af`; agora integra as **45 migrations imutáveis**. Novos tipos gerados do schema real acrescentam somente duas RPCs; typecheck posterior PASS.

Gate de backend **PASS** em52d8c87: 519 unitários/106 arquivos, cinco transportes, treze PostgreSQL, 22 workerd, quatro PDFs, builds/tipos/fronteira/segredos668. Log `removal-backend-gate.log`, SHA256 `7b9bee2e5f1d213e53abf4fd55eb42763c24a719a7f580490b40937b387641b5`. Provas adicionais posteriores de fixture não alteraram a migration ou o produto; não repetir esse gate por elas.

**Contrato real BEGIN/ROLLBACK PASS**, exportado por `scripts/export-registration-removal-proof.mjs`, SHA256 `dba188afbbd5c8e2e3e6e69fbf617e93cc5fd0c0229a9bc0d07d142f119eac2b`. Exportação exige administrador já habilitado e não contém INSERT/UPDATE/DELETE em admin_access. Identidade administrativa existente é usada somente na transação para os próprios registros sintéticos, com não administrador sintético ao testar perda de acesso; nenhum cadastro administrativo real é modificado. Pós-rollback: duas equipes/duas inscrições/uma pessoa/um Auth/um admin ativo, zero remoções e zero Auth sintético. RLS ativo, anônimo sem EXECUTE e autenticado sem DELETE direto.

As duas primeiras tentativas da prova não foram aprovadas: uma fixture tentava criar segundo administrador e atingiu singleton; depois a exportação por substituição de string reduziu `$$` a `$`. Ambas deram rollback, com contagens reais inalteradas. Novo modo local `existing_admin` reproduziu a primeira falha e protege dados pré-existentes; gerador usa callbacks de substituição e o arquivo exato passa nesse modo antes do envio. **Sete focais PASS** (três PostgreSQL + quatro contratos) e types/lint posteriores; log `removal-service-export-local.log`. Revogação efetiva do admin sintético continua nos modos locais vazios; no serviço, a conta real permanece intacta. Isso não é login HTTP/GoTrue.

Após ajuste da fixture, repetidos apenas os três casos nativos afetados, todos PASS/stop0/porta fechada. Relatório atual `removal-native-concurrency.json` SHA256 `b52076e2d7e13cf741276d0d238839d40fa96aa5c49270a140c73b012ddac29e`, log `removal-native-final.log` SHA256 `9fea8d270baca4540c41ebac706be39735229551dce6f905fbade79364877545`. A primeira prova abaixo é histórica; os cinco casos nativos G4 permanecem válidos sem repetição.

Advisors: nenhum aviso novo de segurança, nem FK nova sem índice; permanecem dez INFO de FKs antigas e 58 INFO de índices sem uso no banco quase vazio. WARN conhecido de [proteção contra senha vazada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sem contratação. Não remover índices por isso.

**Estado atual:** L3 adapter/Worker/UI implementados localmente, commits9d98115 e WIP2475ff3; gate consolidado/CI/preview da unidade pendentes. PR draft25 sobre24. Não há remoção publicada ainda. Preview continua source03d7ed8/deployment08840940-5c46-4add-af20-639f054c9d7c/CI515+370. Worker/cliente locais agora mudaram; manifesto antigo não pode ser reutilizado. Registros seguintes descrevem etapas anteriores.

## L3b local — painel e teclado

Painel contextual com conferência autoritativa, bloqueios, nome da inscrição/equipe preservada e confirmação somente quando disponível. Comando congelado no retry incerto; ACK conhecido seguido de falha de leitura recupera só GET. Duas abas/409 exigem nova conferência; reautenticação conserva intenção. Lista, contexto e foco são atualizados somente após ACK ou leitura de remoção confirmada. Não há cascata nem exclusão de registro humano por ferramentas.

Oito RED iniciais antes da UI; primeira execução posterior teve sete PASS e um timeout mobile no login. Trace mostrou interceptação do clique pelo formulário; nova asserção revelou reflow de367px em viewport320px com texto200%, RED nos dois projetos. `overflow-wrap:anywhere` no h1 do login corrigiu a largura sem alterar autorização. Dois focais GREEN, depois **24/24 browsers de composição PASS** (remoção/equipes/a11y administrativo), desktop/mobile. Types e lint focais PASS. Quatro varreduras axe nos estados bloqueado/disponível: zero violations e incomplete; dois browsers dedicados PASS. Isso não prova WCAG completa, zoom nativo ou leitor de tela.

Logs ignorados e SHA256:

- `removal-browser-composition.log`: `211e4551e0225c627c5a3162343ec9d2d608cdf7b230690a45084f1799cccf9d`.
- `removal-login-reflow-red.log`: `670cbd3ba3e8bd0257eb9b29363e02cd16ce5aaa600ff31b594fbb28873b4817`.
- `removal-login-reflow-green.log`: `eff19d542c2e5030846518c2a8dde15c86e4ba26ad6ca80cdc5aafd800fd2db1`.
- `removal-a11y.log`: `557c1ec75e8d74f35dba6dd34d28f9219365d4785c0d9dfc48408967dfb69aa2`.

Formato e segredos674 PASS ao salvar2475ff3. **Gate final não iniciado:** consulta antes dele atingiu85% usados/15% restantes em cinco horas. Gate519 anterior não inclui API/UI posteriores. Próximo passo: gate consolidado único sobre unidade estável, diagnosticar focalmente eventual falha, CI e somente depois pacote novo/preview protegido/smokes/revogação. A26 integral permanece pendente.

## Preparação e L1

## L3a local — adapter/Worker/HTTP

Adapter e SessionStore específicos implementados; consulta/ACK limitados a8KiB, correlação de IDs/disputa/versão e recusa de dados privados. 409 distingue dependência, remoção anterior, comando divergente e versão; 404 de função ausente permanece indisponibilidade. JWT fica somente nos cabeçalhos do provedor, erros SQL não são copiados. **Oito testes focais de provider/contrato PASS**; RED anterior observou métodos ausentes. Log `removal-provider-green.log` SHA256 `07ac3a4f42c4a734eb950fe552f676bef9a4a208f423187fc74e73a88f803004`.

GET/POST `/api/registrations/:id/removal` locais validam consulta/corpo/contexto e origem; autorização fresca ocorre antes de ler o corpo de mutação e novamente na operação. Body≤8KiB, identificador do path deve corresponder ao comando, DELETE não é exposto. Workerd focal **2/2 PASS**, incluindo CRUD C2 existente e remoção com ACK perdido/retry, GET de removido, conflitos, CSRF/limites/consulta duplicada e revogação antes de JSON inválido. RED HTTP405 observado antes das rotas; primeiro ensaio GREEN encontrou contador de autorização ausente na nova fixture, corrigido só no mock. Log final `removal-route-green.log` SHA256 `5e0c86632a61d995fc2dc887a8c215265dddd9cd90532e434e17797116677b1e`.

Composição ampliada teve **22/23 PASS**, falhando somente a inicialização do runtime do teste de texto: diretórios temporários Miniflare de cache/DO/rate/email ausentes antes de HTTP/RPC. Focal desse caso **1/1 PASS** sem mudança de código; causa do desaparecimento dos diretórios não determinada. Não marcar o grupo integral PASS nem trocar SDK por essa observação. Logs `removal-http-composition.log` SHA256 `21ba3f494186154a696fb1b018d11817d1b763a4c149334d638de66c9b9a77a1` e `removal-text-transport-isolated.log` SHA256 `e7ffc0aede338650bc914e3b341dc781e232df192979053a122647099eb9f970`.

Build Worker/tipos e lint/formato focais aprovados; HTTP novo ainda sem CI/deploy. UI pendente. O manifesto/payload ignorado03d7ed8 pertence ao preview anterior; Worker local agora inclui rotas novas e exige nova fonte/gate/CI antes de futuro deploy. Demais evidências de arquivos/artefatos inalterados continuam válidas.

## Registro L1 anterior

Consulta no projeto novo confirmou 44 migrations, última `20261026082747`, e os dados humanos: duas equipes/duas inscrições/uma pessoa/um Auth/zero jogos. Foram mapeadas treze FKs de inscrições em onze tabelas, sem cascata. Histórico de regulamento e honrarias mantém links por versão; conferências de texto podem guardar destino em JSON antes do vínculo. O índice/changelog e a documentação atual de RLS foram consultados; falha do leitor web no Markdown foi contornada por HTTP local. Nenhum serviço anterior foi consultado.

Contrato fechado distingue available, blocked e removed, recusa derivados enviados pelo cliente e exige intenção com IDs/contexto/versão positiva. A remoção não incrementa a versão, permitindo inclusive 2147483647. O primeiro RED TS foi ausência do módulo, sem asserções executadas; depois todas as asserções passaram, junto ao contrato C2 existente: quatro testes em dois arquivos.

## L2 local — migration ainda NÃO APLICADA

RED PostgreSQL observado do zero e no upgrade: função de consulta ausente após carregar as 44 migrations. Migration própria **20261026133442_registration_removal.sql** gerada pela CLI fixada 2.121.0 após esse RED; nova versão sugerida da CLI não foi instalada. As 44 anteriores ficam imutáveis.

Writer usa autorização fresca, comando, raiz do campeonato e inscrição/linha, verifica dependências novamente, remove somente a linha vazia e conserva tombstone/ACK privado imutável. RLS e grants negam tabela diretamente, inclusive service_role; wrappers administrativos são específicos. Tombstone bloqueia reutilização de ID, mantém recibos antigos como confirmação histórica e evita ressurreição. Pai, irmã e dados ligados não são removidos. Destinos JSON de texto têm índice parcial de UUID com 36 caracteres, preservando documentos de outra forma sem índice grande sobre conteúdo arbitrário.

**Focais finais: seis testes PASS em três arquivos**, incluindo dois PostgreSQL do zero/upgrade, contrato novo e contrato C2. Provas: papéis, revogação inclusive replay, IDs/contexto/versão, ausência de acesso direto, elenco encerrado, comissão, agenda sem publicação, texto por FK/destino JSON, ACK/repetição/conflito, reutilização, preservação dos pais/irmã, imutabilidade e rollback final. Matriz de dezoito entradas TS×SQL por modo mais número JSON 1.0; guarda de catálogo para onze tabelas referenciadoras e ausência de cascata. Estado inicial integral da inscrição foi conservado no upgrade.

A matriz encontrou um RED real no UUID máximo em maiúsculas: SQL normalizava para minúsculas enquanto o contrato compartilhado/Zod o recusava. A migration nova, ainda local, passou a usar o validador UUID compartilhado sem essa transformação; paridade GREEN. O caso de FK futura inicialmente usava tabela temporária apontando para permanente, o que PostgreSQL recusa. Foi corrigida apenas a fixture: tabela privada no banco descartável, criada/removida na transação do teste e ausente do contrato que será exportado ao serviço real. Ela prova PT409 tardio sem retirar a inscrição ou gravar recibo.

Logs ignorados: `removal-contract-red.log`, `removal-contract-green.log`, `removal-db-red.log`, `removal-db-first-green.log`, `removal-matrix-green.log` (RED), `removal-matrix-final.log`, `removal-db-edges.log` (fixture inválida) e `removal-db-edges-final.log` (GREEN). Não confundir nome do arquivo com resultado. Hashes e prova nativa serão registrados ao fechar L2.

## Pendências

## Concorrência nativa focal — L2

**Três casos PASS** em PostgreSQL17.11 nativo, Windows, 26/10/2026 13:49:29–13:49:36 UTC (10:49 UTC-03). Runner novo `docs/evidencias/concurrency/registration_removal.py` reutiliza somente libpq/observação de locks do runner anterior, sem executar novamente seus cinco casos inalterados. Cluster novo em `.preview-artifacts/removal-native-run-c20f8a83/data`, porta127.0.0.1:55440, banco `bdb_disposable_removal`, 45 migrations locais, somente registros sintéticos. Três PIDs distintos: controlador124416, A119040, B116336; são evidência histórica, não alvos futuros.

1. Writer real de jogo retém a raiz antes de inserir; remoção aguarda a chave real. Após COMMIT do jogo, remoção recebe PT409; inscrição permanece e não há recibo de remoção.
2. Remoção real retém raiz/linha antes de DELETE; writer de jogo aguarda a raiz. Após remoção, jogo recebe PT400; não há jogo órfão nem recibo de jogo.
3. Mesmo comando de remoção simultâneo: B aguarda a chave exata do comando de A, dois ACKs iguais e um tombstone/recibo.

Barreiras são triggers apenas do cluster descartável; nenhum bypass ou alteração em guardas produtivas. `pg_stat_activity`/`pg_locks`/`pg_blocking_pids` confirmaram quem bloqueava quem e as identidades das chaves. Final: duas remoções, dois jogos (um da fixture, um novo), um recibo de jogo. **stopExitCode0/portClosedtrue**, porta55440 sem LISTEN; clientes/cluster encerrados e arquivos ignorados preservados, sem exclusão recursiva. Isso não comprova todas as corridas, carga, GoTrue ou serviços remotos.

- Runner SHA256 `83bc6cedc73c5f6728e805145ab792c902c2d52530f95545f117156ff47bf3c1`.
- `.preview-artifacts/removal-native-concurrency.json` SHA256 `27aebd7612b2772f10cade77308c5b332f5841fc8e00371120000cea9de32fe3`.
- `.preview-artifacts/removal-native-first.log` SHA256 `be2df43979cf94db91ed05d5f983d05c9a6ff067db083c5f7e315b907a13a277`.
- SQL focal final `.preview-artifacts/removal-db-edges-final.log` SHA256 `be87daf4d11b293c0b4fdc677ebb32609f36c3a752cdd54b0a5e5b011a181d2d`.
- Migration local SHA256 `ca525c6f32f362474d58dae93a0cb05bbeea09b5f1b02e8fceeb5bea5d93e4af`.

Tipos/lint/formato/segredos focais aprovados no WIP `f0c1758`; não há CI ou gate consolidado novo ainda. Aplicação remota, geração de tipos, contrato real e camada HTTP/UI continuam pendentes. Não aplicar novamente migration só por retomar sessão.

## Pendências após prova nativa

Concorrência nativa focal, referências/versionamento adicionais, gate da unidade estável, aplicação única/tipos/advisors/rollback real; depois adapter/Worker/UI e respectivos browsers/CI/preview. Não há API/UI de remoção disponível. Primeiro recorte não conclui A26 para outras entidades ou arquivamento. Preview continua source03d7ed8/CI515+370; não há motivo para redeploy por este WIP. Provas nativas antigas e artefatos de produto inalterados mantêm suas evidências; não repetir suítes por sessão.
