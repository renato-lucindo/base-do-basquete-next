# Progresso atual

Atualizado em 02/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md), objetivos em [ROADMAP.md](ROADMAP.md), leitura seletiva em [INDICE.md](INDICE.md). O [checkpoint anterior da PR #46](../historico/progresso/2026-11-02-pr46-antes-integracao.md) preserva contexto documental e os estados antigos; não representa a situação atual.

## Domínio próprio — checkpoint de 03/11/2026

[PR #50](https://github.com/renato-lucindo/base-do-basquete-next/pull/50), branch `codex/dominio-proprio`, base `d84c09e`. Zona **active**, DNS propagado, domínio raiz associado ao Worker compartilhado e certificado universal **active**. Access continua somente do responsável. Origem alterada por settings, preservando bundle, assets, namespace e segredos: deployment `08b39ef7-51bc-4f1f-b33b-69e0f741b2de`, versão `188ff4c2-b3ae-40ec-bb90-e3df7192429c`, 100%. Configuração e transporte ajustados para os próximos deploys. Quatro testes focais e formato PASS; CI executável ainda pendente. Sem SQL ou envio de outro bundle. A rede corporativa bloqueia o domínio como high-risk; abertura HTTPS e login humano aguardam conferência em rede permitida. Detalhes, mudanças alheias preservadas e próximo passo em [DOMINIO-PROPRIO.md](DOMINIO-PROPRIO.md).

## Registro anterior — integração da PR #46

As notas seguintes registram 02/11. Em 03/11, o histórico de `origin/main` consultado já contém o merge da PR #46 em `d84c09e` e da PR #38 em `afe95a5`. Esta unidade de domínio não revalida seus aceites nem suas suítes.

- O responsável pediu “Realize todas as etapas” após receber a lista de atualização da main, validação/CI, conferência visual e merge da [PR #46](https://github.com/renato-lucindo/base-do-basquete-next/pull/46). Merge autorizado nesta conversa; não declarar aceite visual humano que não ocorreu. Sem autorização nova de deploy, produção ou operações no banco real.
- Branch existente `codex/implementacao-publica`, origem `a74584a32189f9ce42bdde5a3cd27eee0be4f8bd`; última CI desse SHA [41431013924](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41431013924) SUCCESS. Atualização por merge explícito de main `afe95a52ab1d357e0078f20cd169a8f62e7b4ec1`, que integrou a PR #38 com CI [41523717012](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41523717012) SUCCESS: 636 unitários, 485 browsers PASS/109 SKIP.
- Conflito textual somente em PROGRESSO, resolvido por síntese atual e preservação do histórico. Conflito semântico na composição automática de contrato de jogos: declaração duplicada de actualClock e contrato antigo de metadados versus escrita de horários da main. Mantido contrato vigente da main, que valida os mesmos horários opcionais na leitura/escrita. Teste de UI da PR atualizado para o editor vigente e para provar que editar local preserva agenda e horários reais. [Evidência de integração](evidencias/2026-11-02-integracao-pr46.md).
- Worktree exclusivo detached `C:/Users/12405304716/.codex/worktrees/pr46-integracao-20261102`. Unitários focais 46 PASS/6 arquivos; browsers 42 PASS e gate consolidado PASS (647 unitários/131 arquivos), com contratos descartáveis/Worker/builds/tipos/segurança. Nova CI ainda pendente. CI do novo SHA e CI integrada devem ser conferidas antes de concluir. Dois apontamentos antigos de revisão resolvidos; reconferir threads atuais antes do merge.

## Serviços e banco preservados

- Preview exclusivo da PR #46: https://base-do-basquete-next-pr46.renato-lucindo-jr.workers.dev/ — publicação anterior fonte a74584a, deployment `a6e71220-bb03-468c-aafe-bf542712bc0b`, versão 4 `aaabe60d-6f67-4c93-804d-8ea66fdcd968`. Não foi republicado nesta integração. Access exigiu novo login; foi solicitado ao responsável, sem copiar sessão ou alterar proteção.
- Preview PR #38 permanece fonte 4ae0535, deployment `ddab0f4e-7eac-4050-a9ad-57fb1930f086`, versão 5 `d0c80fe1-d77e-4911-b271-1bc85f183bf8`; compartilhado preservado. As correções finais da revisão #38 estão na main e não foram publicadas em serviço.
- Nenhuma consulta ou operação no Supabase real nesta integração. Migrations aplicadas imutáveis; testes usam fixtures e banco descartável. Merge não autoriza deploy ou SQL.

## Continuidade

- Checkout principal sync/trabalho-casa, modificação solicitada em CONTRIBUTING e não rastreados preservados. Worktree antigo da branch pública, em 3c75a41, conserva modificação preexistente de PROGRESSO; releases e demais branches/worktrees preservados.
- Próximo passo: concluir verificações locais, enviar atualização à mesma PR, conferir nova CI, revisão e conferência de navegador; merge commit com SHA esperado autorizado e CI obrigatória do SHA integrado. Sem nova branch/PR por sessão e sem publicação de serviços. Se houver pausa por cota, agendar retomada após reset conforme CONTRIBUTING.
