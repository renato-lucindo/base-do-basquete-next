# Progresso atual

Atualizado em 11/11/2026. Unidade única: perfil do atleta, branch codex/perfil-atleta-aprovado, [PR79 aberta](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), sem merge ou auto-merge. O responsável reprovou o resultado visual e solicitou novo protótipo HTML mobile, com revisão documental antes da criação. Não implementar a nova composição no produto sem novo aceite.

## Revisão documental e estudo atual

- Regras de textos curtos já existiam, mas o perfil criou definições locais/notas técnicas e a revisão não comparou o conteúdo com o catálogo. PUBLICO.md mantinha trechos ambíguos sobre cobertura e Evolução. Causas, referências do código e correções em [REVISAO-TEXTUAL-PERFIL.md](design/REVISAO-TEXTUAL-PERFIL.md).
- PADROES.md e o checklist exigem uma única Legenda ao final de todo o conteúdo ativo, antes do rodapé; siglas/tooltip/seletor usam o mesmo nome curto de Jogadores/Equipes. J significa somente Jogos. Sem complementos sobre participação, cobertura, zero, filtros ou fases. Evolução fora do escopo.
- Protótipo local separado em outputs/perfil-jogador-mobile-v5 do chat perfil-jogador-prototipos, com abas Visão geral/Estatísticas/Carreira, cinco recentes, página de jogos e navegação local para equipes/partidas. Dados fictícios preservados das fixtures; nenhuma consulta ao banco. Relatório, capturas e verificações do estudo ficam nessa entrega local, sem declaração de aceite visual.
- A documentação foi corrigida antes da criação do novo HTML. A organização anterior permanece apenas como implementação histórica; o novo estudo não foi publicado em Worker.

## Fonte e serviço anteriores

- Fonte executável fc276b3f50d913bd43014938206d90d0bf205406, registro 00a76e00e28f0b41f8104aab0bed2f61d10e1d5b, base a55dd7c. [CI42961762268](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42961762268) SUCCESS: 810 unitários, 816 browsers/118 skips preexistentes, 42 WebKit e sete jobs aprovados. Valida a implementação anterior, não o novo HTML nem seu aceite. O check do registro documental atual é consultado no HEAD real da PR.
- Worker anterior: https://base-do-basquete-next-pr79.renato-lucindo-jr.workers.dev, versão 4efd167c-7778-429e-82a2-04bfd7aaaf48, deployment d56c620d-c918-4d32-b91b-316beb91f879. Continua sendo a composição reprovada visualmente; não houve novo deploy nesta revisão. [Provas técnicas anteriores](VALIDACAO-PERFIL-APROVADO.md).

## Preservação e próximo passo

Worktree da unidade em work/perfil-atleta-produto do chat; checkout humano sync/trabalho-casa e suas três mudanças preexistentes preservados. Protótipos e capturas anteriores mantidos. Intermediários próprios preservados por movimento individual/hash em //es-rdc01/recover/Codex-Worktrees/perfil-atleta-pr79-intermediarios; sem remoção recursiva ou alteração do sistema.

Próximo passo: avaliação humana do novo protótipo mobile. A PR79 permanece aberta. Sem alterações no código React, API, banco, dados, Auth/Access ou Workers nesta revisão. Histórico único anterior em [checkpoint anterior](../historico/progresso/2026-11-11-antes-revisao-mobile-perfil.md). A automação concluir-perfil-do-atleta-e-worker-pr79 estava pausada no fechamento anterior; eventual espera por CI segue CONTRIBUTING.md e a mesma automação.
