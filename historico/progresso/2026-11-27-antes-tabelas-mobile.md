# Progresso atual

Atualizado em 26/11/2026. [Histórico anterior](../historico/progresso/2026-11-26-antes-refinamento-navegacao.md).

## PR #89 — navegação e classificação pública

Mesma branch `codex/perfis-equipes`; fonte publicada **805fc5b98584ae86d1c912e221bb1f535373b616**.
[PR e checks do HEAD](https://github.com/renato-lucindo/next/pull/89/checks) ·
[plano/matriz](PLAN-NAVEGACAO-CLASSIFICACAO.md) · [evidência](design/VALIDACAO-NAVEGACAO-CLASSIFICACAO.md).

[![CI atual da branch](https://github.com/renato-lucindo/next/actions/workflows/ci.yml/badge.svg?branch=codex%2Fperfis-equipes&event=pull_request)](https://github.com/renato-lucindo/next/pull/89/checks)

Implementados contexto iniciado pelo ano, retorno contextual único, busca mobile compacta,
bloco tabela → critérios → legenda, números centrais somente na classificação e rodapé em fluxo normal.
Perfis mantêm o bloco à esquerda; Últimos jogos e estatísticas fora desse componente preservados.
Design system e catálogo reconciliados. [24 capturas e medições](design/evidencias/2026-11-26-navegacao-classificacao/).

Gate completo local PASS em 73dbbe8: **865 unitários**, 19 transportes, 16 banco local,
35 Worker/acesso, 1 PDF e builds/checks. CI inicial [45889835643](https://github.com/renato-lucindo/next/actions/runs/45889835643)
aprovou gate/design/70 WebKit, mas reprovou a altura da súmula em desktop/mobile (406/468 contra limites400/460).
Correção mínima em805fc5b: retorno sem padding extra, métricas394/456; teste original intacto,
**30 Chromium +26 WebKit finais PASS**, incluindo navegação nas nove larguras, zoom/reflow,
busca, toque, estado vazio e acesso direto. 96 regressões de retorno anteriores PASS.
Execução CI do HEAD documental e resultado consolidado são vinculados pelos checks acima e na PR;
não usar o run inicial reprovado como aprovação. Sem alterações posteriores de runtime/testes.

## Avaliação publicada e preservação

[Preview](https://preview.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96) e
[admin](https://admin.renato-lucindo-jr.workers.dev/), fonte805fc5b.
Admin versão4b9e492a-91c2-419e-97a2-c93ce33d9c64; preview versãoda9db656-e8de-41de-a756-4dd22ba12c15.
Health/raiz200, privados401/403,76assetsSHA256 e108combinações de páginas publicadas Chromium/WebKit conferidos.
Sessões, aliases, segredos/vínculos e configurações comparados antes/depois, sem mudança alheia.

**admin-publicacao intacto:** fontepr91-53e177d-on-039d78a, versão7c5830cf-6770-4cc6-84a2-7c47b1cdeb5f,
deployment0550af8b-8e47-45ef-9d7d-5714a14e1ba9. Não publicar/reverter esse Worker.
Checkout humano `sync/trabalho-casa`, CONTRIBUTING/skills locais, PR #91 e demais worktrees preservados.
Sem banco remoto, migrations, regras esportivas/API, escrita de dados ou merge.
Escolha anterior Todos/Fase regular em Jogadores fora desta revisão e não presumida.

Próximo passo de produto: aceite explícito do responsável para integração, condicionado à CI do HEAD.
Revisão autoral; sem parecer independente, leitor de tela humano ou aceite humano declarado.
