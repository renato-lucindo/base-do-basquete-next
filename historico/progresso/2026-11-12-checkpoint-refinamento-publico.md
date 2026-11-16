# Progresso atual

Atualizado em 12/11/2026. **Pausa solicitada pelo responsável por cota semanal.** Unidade única: refinamento público do perfil e componentes compartilhados, na mesma [PR #79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79). WIP fora da main; sem merge, deploy ou operação de banco.

## Branch e implementação preservada

- Branch `codex/perfil-atleta-aprovado`; commit material **`88d877f61edab8ad0c9935ae657c29de82bb2708`**. O checkpoint documental vem depois; recuperar o HEAD efetivo com Git e conferir o remoto/CI antes de retomar.
- Worktree: `C:/Users/12405304716/Documents/Codex/2026-11-10/perfil-jogador-prototipos/work/perfil-atleta-produto`. A PR #79 permanece a unidade; não criar outra branch/PR ou pilha.
- Implementados os oito itens: campeonato/categoria inline sem Adulto nessa célula; FC padrão respeitando URL/seleção vazia; trajetória permanente; títulos internos redundantes removidos; legenda e tokens compartilhados; atuações/contagem/paginação/filtros somente com `fact.played`; apelido sem prefixo; reserva de altura desktop limitada e sem `scrollIntoView`, com altura natural mobile.
- Superfícies, tabelas, recordes sem marca positiva, busca, retorno e placares refinados. Teste de texto200% encontrou compressão/transbordamento: tabelas passaram a ter contenção e largura mínima, grid pode encolher, navegação adapta-se e timeline empilha anos/nome quando necessário. Não muda cálculos, API, dados ou publicação.
- [Plano](PLAN-REFINAMENTO-PUBLICO.md), [validação e limites](VALIDACAO-REFINAMENTO-PUBLICO.md), [comparação visual](design/evidencias/refinamento-publico/COMPARACAO.md). Contexto v9 anterior preservado em [histórico](../historico/progresso/2026-11-12-antes-refinamento-publico.md).

## Evidência real e pendências

- Suíte final local: **167 PASS / 7 SKIP**, 174 combinações, em `.preview-artifacts/refinement-browsers-complete.log`. Inclui quatro abas, 320/390/640/1366/1920, estados vazios/zero/ausência, filtros/URL/retorno, teclado/toque/Axe, nomes longos, texto200% e viewport/DPR equivalente a zoom200%. Os sete skips evitam duplicar matrizes explícitas no projeto mobile. Sem novos retries ou timeouts aumentados.
- Gate consolidado local anterior ao último ajuste de zoom: **PASS**, 814 unitários/173 arquivos, CI-plan11, transporte19, banco isolado15, Worker35 e PDF1, builds, formato, boundary e segredos. Depois do ajuste final: **lint, typecheck e build público PASS**, além da suíte final acima. Logs `refinement-gate-final.log`, `refinement-lint-final.log`, `refinement-types-final.log`, `refinement-build-final.log` em `.preview-artifacts/`. Não tratar o gate anterior como execução posterior ao ajuste.
- **CI nova ainda não conferida.** Última CI remota aprovada antes deste refinamento: `43119417175`, fonte `a465e9c`; não valida o novo WIP. A publicação deste checkpoint na mesma PR inicia nova CI, a conferir na retomada.
- Capturas reais antes/depois preservadas e seleção versionada. Matriz completa em `.preview-artifacts/refinement/`. Houve inspeção visual de telas principais; completar revisão final das capturas/zoom e do diff antes de declarar entrega/aceite. Revisão pelo implementador; sem novo parecer independente declarado.
- Prioridade na retomada: conferir CI do HEAD remoto; resolver falhas reais sem alterar timeouts; concluir revisão visual e documental; só então retirar Draft. Nenhuma autorização para merge ou deploy.

## Serviço e preservação

Nenhum Worker remoto foi alterado nesta unidade. Último serviço registrado: PR79, fonte `8f7b38d`, versão `80e95d3b-9a4f-45c7-a418-d8c6d4ac367e`; não reinspecionado nesta pausa. Os comandos Worker/PDF foram dry-run. Sem alterações de banco, Auth/Access, dados humanos, produção ou dependências.

Checkout humano `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `skills-lock.json` e `.agents/skills/web-design-guidelines/` não rastreados. Outros worktrees preservados. O servidor local estático antigo da própria PR foi interrompido para testar a fonte atual; os servidores de teste encerram com a suíte. Não confundir essas fontes locais com a versão remota publicada.

## Retomada por cota

Ferramenta real na pausa: 61% restante na janela5h e 7% semanal; o responsável pediu checkpoint ao alertar proximidade de3%. Reset semanal observado: **17/11/2026, 08:14:04 BRT**. Retomada oficial criada e confirmada para **17/11/2026, 08:16:04 BRT**, neste chat, uma ocorrência: `retomar-refinamento-p-blico-da-pr79`. Atualizar essa mesma automação se necessário; não duplicar. A automação anterior do perfil v9 pertence a outro chat e continua PAUSED.

Próxima ação concreta: consultar cota, `git status`, HEAD/remoto e `gh pr view 79 --json headRefOid,isDraft,statusCheckRollup`, depois conferir `docs/VALIDACAO-REFINAMENTO-PUBLICO.md` e as capturas da mesma unidade. Pausar a automação ao concluir ou se o responsável cancelar.
