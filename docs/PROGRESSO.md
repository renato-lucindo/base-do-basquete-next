# Progresso atual

Atualizado em27/11/2026. [Checkpoint anterior](../historico/progresso/2026-11-27-antes-tabelas-mobile.md).

## PR #89 — perfis, navegação, tabelas e cores públicas

Mesma branch `codex/perfis-equipes`; fonte publicada **2d21f200c5e76694fc6db0e3a9ecab8543250bbe**.
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
Fonte2d21f20 completa a identidade acessível com#camisa, campos de data/pontos consistentes e palavras inteiras.
Tipos, lint/formato, build e fronteiras repetidos;138Chromium+16WebKit e1súmula com3OT azuis PASS.
A CI450d458 aprovou gate/design/102WebKit, mas reprovou7asserções Chromium; causas e correções na
[validação](design/VALIDACAO-TABELAS-MOBILE.md). Não tratar esse run como aprovação; conferir o HEAD atual.
Matriz final de oito larguras:16Chromium+16WebKit, incluída na revisão ampliada acima;
32WebKit de toque/desktop anteriores PASS. [40 capturas sintéticas e provas publicadas](design/evidencias/2026-11-27-tabelas-mobile/).
Não usar a CI anterior de8418673 para aprovar esta fonte: o resultado obrigatório e o SHA atual
ficam nos checks vinculados e no registro atualizado da PR. Sem aumento de timeout/limite ou novos skips.

## Serviços e preservação

[Preview](https://preview.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96)
e [admin](https://admin.renato-lucindo-jr.workers.dev/), fonte2d21f20.
Admin versãobdaf4cad-994f-4a9f-90bb-ebfc7234c6e0; deploymentfa4fff45-59aa-48cb-88aa-27a360910ee1.
Preview versão5fdeddce-37b1-4d6d-a3c1-1a662522309c; deployment29d2c9d7-22af-49bd-af55-3df5640dd90a.
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
