# Liberação do domínio próprio — 03/11/2026

## Autorização e resultado esperado

O responsável pediu domínio próprio sem Access, campeonatos na raiz e administração em /admin. Respondeu “sim” à autorização explícita de concluir validação, integração, migrations e deploy. Não se ampliou escopo nem se presumiu aceite visual humano.

## Git e CI observados

- PR #49: head 63917c9aabd1e780c433b3df4bb71b8c5877409e com CI41691195491 SUCCESS; quatro conversas resolvidas. Merge e310a0c30da753c9ee7f82f32e4349e7825cbeae em 22:10:12 UTC, sem bypass. CI integrada [41728403239](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41728403239) SUCCESS: 140 arquivos/685 unitários, gate/design e 551 browsers PASS/109 SKIP.
- PR #50: merge explícito de main em05d45c2, conciliação de roteamento/checkpoint. Revisão encontrou smoke no hostname antigo; corrigido em b18759e5664f6daa947dfae1bb3c86607e22748b, incluindo página pública na raiz, login em /admin e remoção da exigência de credencial Access do domínio público. Thread conferido resolvido. CI [41728987340](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41728987340) SUCCESS: 140 arquivos/685 unitários, gate/design e 551 browsers PASS/109 SKIP.
- Merge da PR #50: eff36fe0eda76962e6babbc4a9464a98c3dad478 em 22:34:09 UTC, sem bypass. Diff de árvore b18759e..eff36fe vazio. CI integrada [41731938394](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41731938394): **SUCCESS**: 140 arquivos/685 unitários, gate/design e 551 browsers PASS/109 SKIP.

## Verificações focais e pacote

Build foundation e Worker dry-run PASS; seis testes focais PASS (teste HTTP raiz/admin com assets reais, descoberta pública e quatro testes de transporte). Lint/sintaxe do smoke PASS. O pacote de publicação gerado pelo prepare-foundation a partir do checkout limpo conserva o adapter já testado, a allowlist de assets e X-Bdb-Source. Os módulos gerados são enviados pelo Wrangler autenticado, sem ler valores de credenciais. Não foi necessário transportar conteúdo secreto ou bundle através do chat.

Artefatos reaproveitados porque a árvore integrada é idêntica à da PR validada. Fonte do pacote: eff36fe0eda76962e6babbc4a9464a98c3dad478; 32 arquivos no manifesto. SHA256 do Worker antes do wrapper: 470ccc46b90c98f3686b4b76997bb3d8ae001f321df75e69b3c8121469831509. Dry-run do wrapper gerado PASS: 5225.76KiB, gzip1238.59KiB. Teste local do pacote em Workerd PASS: raiz pública e aliases/admin entregam bytes esperados/no-store, source header correto; API administrativa anônima401, host estranho421, módulo privado404. Não repetir suíte completa local de artefatos inalterados; CI executa composição obrigatória.

## Banco

As migrations 20261103174254 e20261103174303 já foram aplicadas antes da pausa, com SQL preservado byte a byte. Nenhuma nova operação de banco, seed ou mudança de ledger nesta retomada. Provas detalhadas e limites em [liberação pública](2026-11-03-liberacao-publica.md).

## Publicação e verificação remota

Publicação concluída em 03/11/2026 às 22:48:43 UTC (19:48:43 America/Sao_Paulo). Worker base-do-basquete-next-preview, fonte eff36fe0eda76962e6babbc4a9464a98c3dad478, versão 35f5b882-70b1-48f7-8bb3-fda632bd458e, deployment 09e26c1c-4e0e-46ea-8026-5d5c8a721d59 em **100%**. API confirmou domínio habilitado, origem canônica, namespace de sessões e limiter preservados, segredos presentes por nome/tipo e preview exclusivo do responsável. Nenhuma leitura ou rotação de valores secretos. Domínio próprio sem Access, previews preservados.

Comando: Wrangler deploy do arquivo .worker-artifacts/release-bundle/index.js com --no-bundle e --keep-vars, tag dominio-eff36fe0eda7 e mensagem com o SHA da fonte. Enviado o mesmo bundle testado em Workerd, SHA256 928e986176a43a3b6323563f701b482c8189aa14d85e9464be098acd9b49e238; startup remoto 84ms. CLI confirmou upload e triggers do Worker/domínio. API confirmou a versão única em 100% e os cinco apps Access anteriores, sem domínio próprio nas destinations.

Teste HTTP direto com timeout limitado, sem alterar DNS/proxy/TLS: HTTPS /api/health retornou TimeoutError; HTTP / retornou 503 com Web Page Blocked, sem X-Bdb-Source. É a política corporativa, sem prova de falha da aplicação. Smoke completo e login humano não foram executados remotamente nesta rede.

Rede corporativa bloqueia o domínio; não foi contornada. Testes locais e metadados remotos não equivalem a login humano nem teste HTTP remoto da versão publicada.

## Continuidade e cota

Retomada automática após reset confirmada pela ferramenta: 03/11/2026 às 19:09:37 America/Sao_Paulo. Cota ao retomar: 1% consumido na janela de 5h/15% semanal. Automação retomar-libera-o-do-dom-nio-ap-s-reset: **PAUSED**, confirmado pela ferramenta oficial após a entrega. Procedimento permanente de checkpoint e reset+2min já está em CONTRIBUTING.md; autorizações vigentes preservadas. Alterações humanas de CONTRIBUTING/skills no checkout sync/trabalho-casa e demais worktrees preservadas.
