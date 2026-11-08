# Progresso atual

## Campeonato flexível — preview entregue em 07/11/2026

Unidade **codex/campeonato-flexivel**, base `903dc9cb2ab17db8fd892bf9eea3593e906ab34a` (PR74). Worktree: `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. [PR75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75) **aberta/draft, aguardando validação humana**. Não mesclar nem fechar antes do aceite. Nenhuma revisão/comentário na consulta desta entrega; revisão do autor, sem parecer independente declarado.

Material publicado **`b450824bb7912f489ef88ac2cb3b3c0cf5f3b105`**, [CI42417041244](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42417041244) **SUCCESS em todos os jobs**, incluindo gate/checks, Chromium1/2, WebKit, design e validate. `b83aac9` e o checkpoint desta entrega alteram somente documentação; não atribuir a eles a CI do material nem mudar a proveniência do pacote. Conferir o resultado real da CI documental após o push; não é necessário repetir suítes locais do produto inalterado.

**Preview:** [painel administrativo](https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev/admin), exclusivamente no novo Worker `base-do-basquete-next-pr75`. Versão ativa `7d370f87-be7b-4028-8c1c-d8fa51ad5aa2`, 100% do tráfego; fonte b450824 conferida remotamente. Access restrito ao responsável, sessão8h; sessões, segredo de sessão e rate limit próprios. Feature ativada apenas nele. Principal e UIUX existentes tiveram configurações e deployments comparados antes/depois, sem diferenças.

Implementado: FIBA por padrão, grupos, vagas diretas/extras, séries por fase, seleção manual e estrutura livre; rascunho privado; finalização/correção em uma ação; classificação por resultados confirmados; associação opcional no cadastro de jogo. Organização incompleta não bloqueia jogos/resultados. [Plano](PLAN-CAMPEONATO-FLEXIVEL.md), [ADR022](decisoes/022-campeonato-flexivel.md) e [provas detalhadas](evidencias/2026-11-07-preview-isolado-pr75.md).

Verificações: gate local PASS (775 testes,15contratos SQL,35Worker,11transportes e runtime PDF), percursos de configuração/PDF/súmula e regressões de associação/rascunhos/resultados fora do formato; CI completa confirmou o material posterior às correções. Smoke remoto:35assets HTTP200 com hashes/fonte, HTML administrativo idêntico ao build exceto metadado da feature,26jogos públicos sem comentários privados e4endpoints privados HTTP401. Após revogar token/política temporários: nenhum token de smoke restante, somente política owner-only; acesso anônimo redireciona302 ao Access. Escrita autenticada remota fica para o aceite humano; não foram criados dados de teste remotos.

Migration **20261107213937_flexible_competition_setup** já aplicada/conferida no `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`), imutável: **não reaplicar/editar SQL**. Banco dev compartilhado porque branching foi recusado pelo plano Free, sem upgrade/cobrança. Alterações feitas pelo responsável no preview persistem nesse banco. Nenhum seed de Auth/admin, DML de teste ou publicação de dados reais para teste. Hash aplicado e privilégios/RLS nas provas.

Autorização cobre implementação, migration e preview isolado; não inclui deploy em principal/UIUX nem integração antes do aceite. Próximo passo: responsável validar a tela e os percursos no Worker; incorporar ajustes nesta mesma unidade/PR. Após aceite, conferir Git, CI e pareceres reais antes de qualquer integração autorizada.

Automação `retomar-regulamento-fiba` (“Retomar campeonato flexível PR75”) **PAUSED**, confirmado pela ferramenta oficial ao concluir a entrega. Cota real na retomada:2% usado5h/80% semanal; nenhum reset/crédito consumido. Retomada anterior havia sido agendada para o reset real+2min. Não reativar monitoramento periódico enquanto depende do aceite humano.

## Preservação

Checkout principal `sync/trabalho-casa`: CONTRIBUTING.md humano, skills locais e skills-lock preservados. Branches anteriores e checkpoint `12ca471` preservados. Nenhum deploy em principal/UIUX nesta unidade. Resumo anterior no [histórico](../historico/progresso/2026-11-07-antes-campeonato-flexivel.md); relatos históricos não substituem consulta real.
