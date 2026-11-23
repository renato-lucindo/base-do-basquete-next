# Progresso atual

Atualizado em23/11/2026. Contexto anterior preservado no [histórico](../historico/progresso/2026-11-23-antes-nomes-curtos.md).

## Perfis de equipes e serviços de avaliação

- Uma unidade: branch `codex/perfis-equipes`, base `824a3d5`, [PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), HEAD `74dd49dd6ce732fac687e54003ef4c567412b256`. Worktree `C:/Users/12405304716/.codex/worktrees/perfis-equipes/Base do Basquete-v1`. Sem merge autorizado.
- Perfis geral/contextual implementados conforme HTML aceito. Resultados publicados complementam classificação vazia sem sobrescrever decisões oficiais; LUSB9J/6V/3D/66,7%/575PP/439PC, sequência5e cinco recentes confirmados no navegador. Classificação pública CopaES/Sub15 continua sem fases, sem posição inventada. [Requisitos](design/PERFIS-EQUIPES.md) e [validação](design/VALIDACAO-PERFIS-EQUIPES.md).
- CI `b886713` [45098405934](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45098405934) PASS nos7checks. HEAD74dd49d altera somente configs de nome/origem e checkpoint; código/assets inalterados. [CI74dd49d45162546283](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45162546283) **PASS nos sete checks, incluindo validate**, conferida em23/11 às08h30. Provas de fontes inalteradas reutilizadas, sem suítes locais repetidas.

## Endereços vigentes — nomes curtos

Responsável pediu somente prefixos admin e preview em23/11. Workers **renomeados via Edit Worker**, sem cópias, preservando IDs imutáveis, segredos, versões e referências dos domínios.

| Serviço | Endereço                                       | Worker ID                        | Versão                               | Deployment                           |
| ------- | ---------------------------------------------- | -------------------------------- | ------------------------------------ | ------------------------------------ |
| Admin   | https://admin.renato-lucindo-jr.workers.dev/   | bc902b39122a4806bd0b794523d8deb8 | dd805f10-372c-4d31-8c7a-44345928b058 | 2354a608-bd44-4487-bd2e-8388b6b83cee |
| Preview | https://preview.renato-lucindo-jr.workers.dev/ | 3b1231990bca4e9f83ee6ea44ae28172 | 07a6b2a6-49a1-4c0b-aaf7-23f3b09892c9 | 861099ac-7241-49e8-bad7-7f2797978ca1 |

- API confirma12Workers, somente admin/preview ativos, URLs de versões off; nomes longos antigos não existem mais. Demais10Workers preservados e desativados. Admin namespace `597c612fd69c447e81547f16d5dcca41` e dois segredos preservados; preview somente leitura pública, sem Access.
- Smoke real novos nomes: health/root200ambos, header74dd49d; admin/api/competitions401sem sessão, preview403. Atalho preview/foundation.html termina em admin.workers.dev/admin com200.
- Domínios admin/preview.basedobasquete.com.br continuam vinculados aos Workers renomeados e redirecionam navegação ao endereço canônico; responsáveis confirmaram funcionar na rede doméstica, porém rede corporativa bloqueia esses domínios. Não repetir testes ou alterar políticas de rede. Raiz/www não publicados.
- Configs versionadas `wrangler.admin.jsonc` e `wrangler.preview.jsonc` correspondem aos nomes/origens atuais. Wrangler enviou versões nos nomes anteriores antes da renomeação; conector renomeou e ativou as versões. Nenhum DO novo, migration, escrita de dados ou mudança em serviços alheios.

## Próximo passo

- Em23/11 o responsável confirmou a demonstração da PR75 e autorizou restaurar Formato e classificação, atualizar a mesma PR89 e os Workers. Causa confirmada por GET remoto/header74dd49d: código presente, mas FLEXIBLE_COMPETITION=false. Configs admin/preview agora true, incluindo leitores e finalização automática; serviço principal antigo continua desativado.
- PTS após Equipe usa leaguePoints das regras existentes. AVG na última coluna é PP/PC, três decimais, travessão sem cobertura/divisor zero; responsável confirmou explicitamente manter SLD e desempates. Tabelas pública/embutida e conferência administrativa atualizadas. [Plano](PLAN-CLASSIFICACAO-PTS-AVG.md).
- Focal atual:24unitários e54browsers desktop/mobile PASS; lint/formatação/types gerados PASS no gate parcial; tipagem app/Worker PASS com heap2048MB. Gate completo local interrompido por falta de memória, sem declaração de PASS; primeira execução browser teve asserções posicionais antigas corrigidas e a rodada posterior sofreu esgotamento local. Rodada final54PASS em2min/um worker. Captura `.preview-artifacts/standings-columns-after-desktop.png` conferida; sem alterações de ordenação, DML ou migrations.
- Próximo: build, commit/push na PR89, CI do SHA novo, upload/ativação admin e preview pelo conector e smoke somente leitura. Sem merge autorizado. CI74dd49d não valida esta nova composição. Nenhuma automação ativa.
- Checkpoint e histórico desta conclusão permanecem locais para não criar outro SHA só por registrar execução. Alterações humanas do checkout original e PR88 preservadas.
