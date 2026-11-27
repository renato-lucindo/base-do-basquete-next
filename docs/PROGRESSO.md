# Progresso atual

Atualizado em27/11/2026. [Checkpoint anterior](../historico/progresso/2026-11-27-antes-tabelas-mobile.md).

## PR #89 — perfis, navegação, tabelas e cores públicas

Mesma branch `codex/perfis-equipes`; fonte publicada **917015bb1bd38494b5c4b47832efaf1a40b2112d**.
[PR89 e resultado real da CI do HEAD](https://github.com/renato-lucindo/next/pull/89/checks) ·
[matriz](PLAN-TABELAS-MOBILE.md) · [validação](design/VALIDACAO-TABELAS-MOBILE.md).

[![CI atual](https://github.com/renato-lucindo/next/actions/workflows/ci.yml/badge.svg?branch=codex%2Fperfis-equipes&event=pull_request)](https://github.com/renato-lucindo/next/pull/89/checks)

Atleta reúne nome e camisa secundária, sem coluna Camisa; largura por conteúdo e rolagem interna.
Jogadores e Elencos compartilham a correção e seletor somente de métricas. Camisas0/00/ausente preservadas.
Últimos jogos, Ver jogos e recordes usam confronto compacto compartilhado até639px, nomes completos,
placar sem quebra, data/PTS ou posição/marca/data acima; toggle no grupo. Desktop preservado.
Todas as prorrogações azuis; principal pública#075FCA e retorno discreto sem sublinhado.
Corrigida a validação de camisa ausente já pretendida pelo DTO, sem mudar seu formato.
Navegação/classificação da revisão anterior permanecem; provas antigas no checkpoint arquivado.

Gate completo da fonte1d6ce17 aprovado em duas etapas após corrigir variável sombreada no teste:
**867 unitários/183arquivos,19 transportes,16 banco local,35 Worker/acesso e1PDF**; lint,
formato, tipos, builds, limites cliente/servidor e segredos aprovados. Catálogo/design/axe PASS.
Ajuste final917015b: CSS do link também impede quebra dentro de palavras; teste novo falhou antes e passou depois.
Tipos, lint/formato, build e matriz final foram repetidos; provas unitárias do código inalterado reutilizadas.
Matriz final de oito larguras:16Chromium+16WebKit;62 consumidores Chromium e link mobile PASS;
32WebKit de toque/desktop anteriores PASS. [40 capturas sintéticas e provas publicadas](design/evidencias/2026-11-27-tabelas-mobile/).
Não usar a CI anterior de8418673 para aprovar esta fonte: o resultado obrigatório e o SHA atual
ficam nos checks vinculados e no registro atualizado da PR. Sem aumento de timeout/limite ou novos skips.

## Serviços e preservação

[Preview](https://preview.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96)
e [admin](https://admin.renato-lucindo-jr.workers.dev/), fonte917015b.
Admin versão3323ac61-aee2-468a-b1a8-f8c8752d1a80; deployment4763e3f4-2d94-4b57-9273-56a1da74e3f4.
Preview versão096bfd65-dbac-400e-adf5-3a1ebd68258f; deployment743b8950-e8d3-4b92-bfdd-81bae5c946b1.
Health/raiz200, APIs privadas401/403 e76assetsSHA256 conferidos. Mais108combinações reais
publicadas (nove páginas/seções × seis larguras × Chromium/WebKit) e12capturas aprovadas. Configurações/vínculos/sessões
comparados antes/depois; somente fonte, código/assets e anotações da versão mudaram.

**admin-publicacao intacto:** fontepr91-53e177d-on-039d78a, versão7c5830cf-6770-4cc6-84a2-7c47b1cdeb5f,
deployment0550af8b-8e47-45ef-9d7d-5714a14e1ba9, namespace2f3752c7b23049e0a4dec04ba7b05e8f.
Sem banco remoto, migration, alteração de cálculos, escrita de dados humanos ou merge.
Checkout humano sync/trabalho-casa, CONTRIBUTING/skills locais, PR91 e demais worktrees preservados.
Revisão autoral; sem parecer independente, leitor de tela humano ou aceite humano presumidos.

Próximo passo: avaliação visual do responsável e aceite explícito para integrar, condicionado à CI do HEAD.
A escolha Todos/Fase regular em Jogadores continua fora desta revisão.
