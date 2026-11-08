# Progresso atual

## Classificatória e Eliminatória — implementação em08/11/2026

Unidade **codex/campeonato-flexivel**, worktree `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`, [PR75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75) **aberta/draft**. Base903dc9cb; entrada desta alteração f3f134a83f09f4f22ac89e5ead3380a0f921c401 (CI42517100300 inteiramente SUCCESS conferida). Material novo **56488576cc5186020ec837fec3531ba2f79cb39f**; checkpoint posterior somente documental. Não atribuir CI anterior a este código.

Responsável aceitou o protótipo e autorizou a implementação real nesta conversa. Navegação Classificatória/Eliminatória, bracket com todas as fases e cabeçalhos de jogos dentro dos cartões; jogo único/ida-volta/MD3/5/7, placares por inscrição/slot, ausências, conexões reais de vencedor/perdedor e conflitos preservados. Tabela/grupos existentes conservados, várias fases classificatórias no mesmo seletor e URLs legadas compatíveis. Sem API, cálculo, Worker ou banco novos. [Plano vigente](PLAN-CAMPEONATO-FLEXIVEL.md#classificatória-e-bracket--protótipo-aceito-em-08112026), [provas/revisão](evidencias/2026-11-08-bracket-eliminatoria.md).

**Verificação atual:**12testes unitários PASS;38browsers Chromium focais PASS;10WebKit focais PASS. Capturas1366/1920/390/320 e zoom200%;1366desktop e390mobile inspecionadas, axe dos casos de bracket sem violações. Revisão do autor, sem parecer independente. Teste RED→GREEN impediu duplicar placar quando uma série inválida resolve ambas as entradas para a mesma inscrição.

Gate inicial capturou o teste em RED durante a execução e falhou; gate seguinte encontrou5suites sem testes por ENOENT no cache SSR temporário do Vitest. As5suites/27testes passaram no rerun focal, sem código alterado. **Gate com TEMP/TMP isolados está em execução**, log `.preview-artifacts/bracket-gate-isolated.log`; não declarar gate PASS antes de ler conclusão real. Regressão completa **886browsers** em execução, log `.preview-artifacts/bracket-browsers.log`. Sessões locais: gate23908, browsers83327; servidor próprio6768. Nenhum timeout ampliado ou teste desativado.

## Serviço e proteções

**Preview ainda sem o bracket:** `https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev`, fonte b3908fbef221032de5b7c804056d0fbc82c7d17d, versão **b6161cb7-a16f-4f6c-978e-4d3f3d608f06** a100%, deployment8d28edc0-7c7f-4f9b-a11d-c4e4497bea8c. Estado real relido nesta execução; nenhum upload/deploy novo. [Release anterior](evidencias/2026-11-08-classificacao-apresentacao.md#preview-atualizado).

Baseline local novo `.preview-artifacts/pr75-bracket-baseline.json`: principal real `base-do-basquete-next-preview` versão139410ce-a8d6-4710-9b94-e1b1222cd3dc; UIUX versão1d839a25-c0f7-4e24-8602-63c8eb67fd20. Alvo autorizado exclusivo **base-do-basquete-next-pr75**, config `.worker-artifacts/pr75-release/wrangler.jsonc`. Preservar DO SESSIONS3552464a1346403ab7132137b7b39e6d, namespace rate limit751107202611, origem exata, featuretrue, dois segredos existentes e preview_urlsfalse. Access app e0700da3-fde2-4f2f-b833-81e3c9abcf1b, somente política owner-only7de2233d-9114-46f0-bcf6-58ed641fec30, sessão8h, relidos/inalterados.

Banco dev **compartilhado** nizmasjddyrhmevvfviz. Migration20261107213937 aplicada/imutável: não reaplicar/editar. Sem DML remoto de teste, seed Auth/admin ou publicação de dados fictícios/reais para teste. Fixtures de bracket exclusivamente locais. Aceite do protótipo não autoriza merge nem substitui aceite do preview real.

## Próximo passo e continuidade

Concluir os processos locais e ler seus resultados, diagnosticar qualquer falha; enviar o HEAD real e conferir CI/revisões da mesma PR. Ao esperar CI, programar a mesma automação **retomar-regulamento-fiba**, antes de encerrar, com HEAD/run reais e ação autorizada. Não executar o prompt documental antigo, que proibia incorretamente este novo release. Silêncio enquanto pendente/inalterado; corrigir falhas na mesma unidade.

Após validate SUCCESS e checks locais, regenerar builds/pacote novos do HEAD verificado: `npm run build:foundation`, `npm run build:worker` (dry-run), `node scripts/prepare-foundation.mjs`, `node .preview-artifacts/prepare-pr75-release.mjs SHA`. Publicar apenas via config PR75 com versions upload/deploy explícitos; preservar bindings/Access/segredos. Conferir manifesto/hashes/fonte, metadado true, API pública sem motivos privados e401 nos4privados. Smoke local `.preview-artifacts/pr75-standings-smoke.cjs SHA` lê manifesto atual; token Access efêmero restrito ao app apenas em memória/entrada TTY sem eco. Revogar PRIMEIRO política e DEPOIS token; confirmar zero temporários e owner-only. Comparar principal/UIUX com baseline, não alterar esses serviços. Atualizar PR/provas/checkpoint e entregar URL mantendo PR aberta; pausar automação quando restar somente aceite humano.

Cota real antes do gate isolado:67%usado5h/92%semanal, sem créditos/resets. Reconsultar antes de novos gates e após esperas; gatilho15%restante5h, checkpoint e reset real+2min se impedir. Checkout principal, CONTRIBUTING humano, skills/skills-lock e branches anteriores preservados. [Checkpoint antes do bracket](../historico/progresso/2026-11-08-antes-bracket-eliminatoria.md).
