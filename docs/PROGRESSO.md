# Progresso atual

Atualizado em 22/11/2026. Estado anterior preservado no [histórico](../historico/progresso/2026-11-22-antes-perfis-equipes.md).

## Perfis de equipes — implementação validada

- HTML revisado aceito e implementação autorizada em 22/11. [Requisitos](design/PERFIS-EQUIPES.md), [plano](PLAN-PERFIS-EQUIPES.md), [validação](design/VALIDACAO-PERFIS-EQUIPES.md).
- Branch `codex/perfis-equipes`, base `824a3d59da5323202d869a4d93a1038bcd377044`, [PR #89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), base main. Código executável validado em `cfee448fdd36cd288dd4a7861c643abb6a07d442`; atualização posterior somente documental. Worktree `C:/Users/12405304716/.codex/worktrees/perfis-equipes/Base do Basquete-v1`.
- Implementados perfis geral e da inscrição, classificação/coletivos completos, jogadores por inscrição, campanhas/status, recentes por ano, jogos sem Resultado, conquistas históricas e legenda expandida. Busca, aliases antigos, URL e retorno preservados.
- [CI do código](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45052047536) **PASS**, sete checks incluindo validate: 848 testes unitários/179 arquivos; Chromium desktop 502 PASS, mobile 377 PASS/125 skips preexistentes da matriz; WebKit 44 PASS; design e gate completo (banco local, transportes, builds, runtime Worker/PDF, fronteira cliente e segredos). Conferir checks do HEAD documental atual na PR antes de integrar; fontes executáveis permanecem idênticas ao SHA aprovado.
- Corrigidas na mesma unidade as falhas da primeira CI: seletores antigos, alvos de toque na escolha da inscrição e fixtures que interceptavam outras páginas ou excediam 100 jogos/página. Reexecuções focais passaram; nenhum teste desativado ou timeout ampliado. Ensaios locais gerais interrompidos, inclusive um por falta temporária de disco, não são apresentados como aprovação. Evidência completa na CI acima.
- Conferidos geral/jogadores/escolha de inscrição com axe, retorno mobile com foco, classificação por grupo após recarga e reflow 320 px/texto200%; larguras 390/1366/1440/1920. Sem mudança executável após a CI aprovada; esta atualização documental reutiliza essas provas.

## Preview publicado e próximo passo

- Responsável autorizou novo preview separado e depois determinou **não ativar Access**. Publicado pelo conector Cloudflare em [preview de perfis](https://base-do-basquete-perfis-equipes-preview.renato-lucindo-jr.workers.dev/publico.html). Perfil para avaliação: [LUSB](https://base-do-basquete-perfis-equipes-preview.renato-lucindo-jr.workers.dev/equipe.html#743dac4d-de4c-493a-ac28-5bc621aea526).
- Worker `base-do-basquete-perfis-equipes-preview`, versão `2164e6a6-6102-4f47-87d9-c7416c9ce9cc`, deployment `66f8e5cc-d513-4554-92d3-7ef99d238a50`. Fontes do produto idênticas a `cfee448`, transporte identifica `fc701f8`. Wrapper de avaliação local em `.preview-artifacts/perfis-equipes/`: somente consultas públicas GET/HEAD; operações privadas/admin bloqueadas, sem DO ou migration. Conector criou Worker e ativou versão; Wrangler enviou pacote/assets sem ativar versão. Configuração principal e serviços existentes preservados.
- Aplicação Access `87ddb60c-215f-45d9-a476-326b80cc4388` e política `b12a9251-c689-4c10-b951-173912d702ca` foram criadas e depois removidas por instrução direta do responsável. Conferidas sete aplicações anteriores preservadas; novo preview público, URLs de versões desativadas.
- Verificação remota em navegador: página e catálogo 200; catálogo com26 jogos públicos; health200 com SHA esperado; GET/api/session403, POST/api/session405. Browser sem login abriu o catálogo real CopaES/Sub15. Python com User-Agent padrão recebeu403 do filtro de borda; com User-Agent de navegador health/catalog200. Não confundir esse filtro com Access.
- PR #89 continua aberta. CI `cfee448` e documentação `fc701f8` aprovadas nos sete checks; HEAD documental `52b8caa` sem execução reportada. Não declarar CI desse HEAD aprovada. Evidências de fontes executáveis inalteradas reutilizadas; antes de integrar exigir checks do SHA a integrar.
- **Aguarda aceite visual do Worker antes de merge.** Nenhum merge, DDL, migration ou publicação de dados executado. Novo preview não altera os serviços atuais. Heartbeat deve ficar pausado enquanto restar apenas avaliação humana.
- Este checkpoint atualizado fica local, sem novo commit documental que perpetue a troca do SHA a verificar. PR recebe o registro remoto do deployment e das verificações.
- PR #88 em outra branch e checkout original `sync/trabalho-casa` preservados; alterações humanas não incorporadas.

## Correção em avaliação — Copa ES Sub-15

- Responsável relatou dados ausentes no perfil. Diagnóstico remoto: catálogo26resultados, classificação confirmada com games/fases vazios. Perfil descartava resultados publicados quando qualquer projeção existia.
- Ajuste na mesma unidade/PR: catálogo complementa somente jogos ausentes da projeção; estados explícitos prevalecem, inclusive exclusão/pendência. Campanha e sequência usam a mesma composição; posição/fase continuam oficiais. LUSB pública confirmada9J/6V/3D/575PP/439PC.
  -27testes focais e46browsers de perfil/equipes/acessibilidade PASS; gate completo em execução. Próximo passo: confirmar resultados, enviar commit para PR89 e atualizar somente o preview já autorizado (sem Access), verificando os9jogos reais no navegador. Não alterar banco/fases ou serviços atuais.
