# Progresso atual

Atualizado em27/11/2026. [Checkpoint anterior](../historico/progresso/2026-11-27-antes-tabelas-mobile.md).

## PR #89 — perfis, navegação, tabelas e cores públicas

Mesma branch `codex/perfis-equipes`; fonte publicada **1d6ce178dedc7b317cf17acf93fa12c7f185167a**.
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

Gate local completo aprovado em duas etapas após corrigir variável sombreada no teste:
**867 unitários/183arquivos,19 transportes,16 banco local,35 Worker/acesso e1PDF**; lint,
formato, tipos, builds, limites cliente/servidor e segredos aprovados. Catálogo/design/axe PASS.
Matriz final de oito larguras:16Chromium+16WebKit;62 consumidores Chromium e link mobile PASS;
32WebKit de toque/desktop anteriores PASS. [40 capturas sintéticas e provas publicadas](design/evidencias/2026-11-27-tabelas-mobile/).
Não usar a CI anterior de8418673 para aprovar esta fonte: o resultado obrigatório e o SHA atual
ficam nos checks vinculados e no registro atualizado da PR. Sem aumento de timeout/limite ou novos skips.

## Serviços e preservação

[Preview](https://preview.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96)
e [admin](https://admin.renato-lucindo-jr.workers.dev/), fonte1d6ce17.
Admin versão5f0cacf8-df68-4419-b3cf-6d8139ced9c8; deploymentd8e2bcb4-3152-4983-80f1-2c16cdbd68d4.
Preview versão745f2ee5-60b3-4cb3-82a2-a15485b2e4f9; deploymentb8c29d64-b89d-430e-9175-a896474d2997.
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
