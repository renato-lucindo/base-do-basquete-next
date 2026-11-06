# Progresso atual

Atualizado em 06/11/2026. Unidade: [PR #61](https://github.com/renato-lucindo/base-do-basquete-next/pull/61), branch `codex/fases-estatisticas-publicadas`. HEAD anterior `ab3c461`; main `fb3f26bb30c76a8020cc86259071c302dbe2896e` (PR #63) incorporada por merge explícito. Recuperar SHA corrente e CI pela PR. Checkpoints preservados: [PR61 antes da reconciliação](../historico/progresso/2026-11-05-pr61-antes-reconciliacao.md) e [main após PR63](../historico/progresso/2026-11-06-main-pr63-antes-pr61.md).

## Validação e integração

CI de `ab3c461` [42128700378](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42128700378) **SUCCESS**, conferida nesta retomada: scope, checks, design, browsers 1/2, WebKit e validate. Gate local anterior exit0:706 unitários/147 arquivos, banco15, WorkerHTTP32 e demais checks; logs ignorados em `.preview-artifacts/pr61-gate-final.log`. Provas de código inalterado são reutilizadas; a CI da nova composição com PR63 deve ser conferida antes do merge e novamente no SHA integrado. Reviews e threads consultadas vazias; revisão do agente, sem parecer independente declarado.

## Banco, preview e autorização vigente

Migration `20261105220937` aplicada uma vez no projeto `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`); corpos das três funções/grants conferidos por leitura, sem reaplicação. Última prévia:25 jogos/575 projeções sem fase. SQL conector usa `postgres` sem `auth.uid()`. Nenhum DML desta retomada. Reexecutar prévia e comparar baselines antes do comando; procedimento em [CONFIRMACAO-FASES-ESTATISTICAS.md](CONFIRMACAO-FASES-ESTATISTICAS.md).

O responsável autorizou expressamente integrar a PR e, após CI aprovada, publicar somente `base-do-basquete-next-uiux` e executar a correção auditada pela sessão administrativa real já aberta. Preservar domínio principal, Access, bindings, segredos, sessões, placares e fatos esportivos. Não pedir novamente essas autorizações. O domínio principal é bloqueado na rede; usar o preview Worker. Conferir validade da sessão e versão publicada antes de operar; nunca extrair credenciais, simular ator ou editar projeções diretamente.

Pacote anterior `ab3c461` com dry-run PASS preservado em `.preview-artifacts/pr61-preview/`; regenerar a partir do SHA integrado limpo, preservando a configuração existente do Worker uiux. Não executar o uploader canônico. Ensaio PostgreSQL concorrente multi-conexão não realizado; PGlite/Workerd isolados não equivalem a ele.

## Continuidade

Automação `retomar-conclus-o-pr61-ap-s-reset` disparou a retomada após o reset observado. Cota conferida:2% usada na janela5h,72% semanal; seguir a medição real e o gatilho15% de [CONTRIBUTING.md](../CONTRIBUTING.md). Pausar a automação ao concluir integração/CI integrada/preview/correção auditada. Próximo passo: publicar reconciliação, conferir nova CI, integrar com SHA esperado e executar as operações autorizadas com pós-condições. Evidências finais e estado do serviço serão registrados na descrição da PR61.

Checkout humano `sync/trabalho-casa`, `CONTRIBUTING.md` modificado e skills pessoais não rastreadas preservados. Outros worktrees e automações intocados. PR60 concluída; filtros FUT-004 continuam ideia pós-MVP. Contexto único das outras unidades permanece nos históricos acima.
