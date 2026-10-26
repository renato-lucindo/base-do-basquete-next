# Remoção de inscrição vazia — evidência parcial

26/10/2026, branch `codex/ciclo-inscricoes`, base `0c2017f`, contrato L1 `dd03e9b`. Somente fontes do pacote e decisões delegadas. Plano `docs/superpowers/plans/2026-10-26-remocao-inscricao.md`. Nenhuma remoção de registro humano ou alteração remota realizada.

## Preparação e L1

Consulta no projeto novo confirmou 44 migrations, última `20261026082747`, e os dados humanos: duas equipes/duas inscrições/uma pessoa/um Auth/zero jogos. Foram mapeadas treze FKs de inscrições em onze tabelas, sem cascata. Histórico de regulamento e honrarias mantém links por versão; conferências de texto podem guardar destino em JSON antes do vínculo. O índice/changelog e a documentação atual de RLS foram consultados; falha do leitor web no Markdown foi contornada por HTTP local. Nenhum serviço anterior foi consultado.

Contrato fechado distingue available, blocked e removed, recusa derivados enviados pelo cliente e exige intenção com IDs/contexto/versão positiva. A remoção não incrementa a versão, permitindo inclusive 2147483647. O primeiro RED TS foi ausência do módulo, sem asserções executadas; depois todas as asserções passaram, junto ao contrato C2 existente: quatro testes em dois arquivos.

## L2 local — migration ainda NÃO APLICADA

RED PostgreSQL observado do zero e no upgrade: função de consulta ausente após carregar as 44 migrations. Migration própria **20261026133442_registration_removal.sql** gerada pela CLI fixada 2.121.0 após esse RED; nova versão sugerida da CLI não foi instalada. As 44 anteriores ficam imutáveis.

Writer usa autorização fresca, comando, raiz do campeonato e inscrição/linha, verifica dependências novamente, remove somente a linha vazia e conserva tombstone/ACK privado imutável. RLS e grants negam tabela diretamente, inclusive service_role; wrappers administrativos são específicos. Tombstone bloqueia reutilização de ID, mantém recibos antigos como confirmação histórica e evita ressurreição. Pai, irmã e dados ligados não são removidos. Destinos JSON de texto têm índice parcial de UUID com 36 caracteres, preservando documentos de outra forma sem índice grande sobre conteúdo arbitrário.

**Focais finais: seis testes PASS em três arquivos**, incluindo dois PostgreSQL do zero/upgrade, contrato novo e contrato C2. Provas: papéis, revogação inclusive replay, IDs/contexto/versão, ausência de acesso direto, elenco encerrado, comissão, agenda sem publicação, texto por FK/destino JSON, ACK/repetição/conflito, reutilização, preservação dos pais/irmã, imutabilidade e rollback final. Matriz de dezoito entradas TS×SQL por modo mais número JSON 1.0; guarda de catálogo para onze tabelas referenciadoras e ausência de cascata. Estado inicial integral da inscrição foi conservado no upgrade.

A matriz encontrou um RED real no UUID máximo em maiúsculas: SQL normalizava para minúsculas enquanto o contrato compartilhado/Zod o recusava. A migration nova, ainda local, passou a usar o validador UUID compartilhado sem essa transformação; paridade GREEN. O caso de FK futura inicialmente usava tabela temporária apontando para permanente, o que PostgreSQL recusa. Foi corrigida apenas a fixture: tabela privada no banco descartável, criada/removida na transação do teste e ausente do contrato que será exportado ao serviço real. Ela prova PT409 tardio sem retirar a inscrição ou gravar recibo.

Logs ignorados: `removal-contract-red.log`, `removal-contract-green.log`, `removal-db-red.log`, `removal-db-first-green.log`, `removal-matrix-green.log` (RED), `removal-matrix-final.log`, `removal-db-edges.log` (fixture inválida) e `removal-db-edges-final.log` (GREEN). Não confundir nome do arquivo com resultado. Hashes e prova nativa serão registrados ao fechar L2.

## Pendências

Concorrência nativa focal, referências/versionamento adicionais, gate da unidade estável, aplicação única/tipos/advisors/rollback real; depois adapter/Worker/UI e respectivos browsers/CI/preview. Não há API/UI de remoção disponível. Primeiro recorte não conclui A26 para outras entidades ou arquivamento. Preview continua source03d7ed8/CI515+370; não há motivo para redeploy por este WIP. Provas nativas antigas e artefatos de produto inalterados mantêm suas evidências; não repetir suítes por sessão.
