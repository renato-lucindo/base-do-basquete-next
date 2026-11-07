# Progresso atual

## Regulamento simplificado — 07/11/2026

Unidade `codex/regulamento-fiba`, [PR #72 draft](https://github.com/renato-lucindo/base-do-basquete-next/pull/72), base `39ed1c4`, material implementado **16734b3e5231847c1767dc1336e50a04dc9ab8a2**. Worktree `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. HEAD real inclui este checkpoint posterior. [Plano autorizado](PLAN-REGULAMENTO-FIBA.md), [decisão vigente](decisoes/021-regulamento-fiba-simplificado.md), [validação detalhada](VALIDACAO-REGULAMENTO-FIBA.md).

Implementados: política FIBA versionada com legado preservado; padrões 2/1 e W.O. 20–0/0; grupos/turnos; tela em três seções e regras avançadas recolhidas; exceções justificadas; adoção explícita em versões antigas; rascunhos privados com CAS/recibos, recuperação e escolha da versão confirmada; desempate manual com comentário privado e auditoria de autor/data no servidor. Decisão obsoleta deixa de valer sem bloquear consulta/publicação. Candidato e contrato públicos excluem/rejeitam notas privadas. Fora do escopo original preservado (sem insuficiência, reincidência, sorteio, geração, cópia ou mudanças no mata-mata).

## Evidências e pendências reais

Gate equivalente ao npm run gate, unitários com um worker: **758 PASS/159 arquivos**, transporte **11**, PostgreSQL isolado **15**, HTTP/Worker **33**, runtime PDF **1**; lint/formato/tipos/builds/fronteira/segredos PASS. O comando de fronteira via npm exec resolveu Node alpha no cache; repetido diretamente em **Node 24.18.0**, PASS, sem mudar dependências do projeto. Logs ignorados em `.preview-artifacts/regulation-full-gate.log`. Ajustes finais de UI (guarda/cancelamento do desempate e recarga de rascunho) tiveram tipos/lint/build/fronteira e browsers focais próprios PASS. HTTP novo de rascunho **1 PASS**, incluindo sessão/CSRF/corpo fechado/ACK incerto.

HTTP/Worker final: **34 PASS**. Chromium completo: **712 PASS, 116 SKIP existentes, 2 FAIL** por expectativas antigas de regras abertas. A adaptação preservou as asserções e revelou desalinhamento desktop, corrigido em `16734b3`: repetição **2/2 PASS**. Suíte final dos consumidores do regulamento: **69 PASS, 11 SKIP existentes** (80 casos), incluindo publicação e expansão administrativa. Fluxo novo isolado: **18 PASS**. Logs em `.preview-artifacts/regulation-{all-browsers,consumers-final,workflow-final}.log`. Capturas/axe em 1366, 1920, 390 e 320 px passaram. Fixtures sintéticas e SQL PGlite isolado, sem dados humanos.

[CI f610ce2](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42341718405) **FAILURE** somente nos dois cenários de expansão corrigidos; demais jobs, inclusive WebKit, passaram. Nova CI acompanha o HEAD deste checkpoint nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/72/checks), fonte vigente para a conclusão final, também registrada na descrição da PR. Sem remoção de cobertura, alteração de timeouts ou novos skips.

Revisão autoral separada do diff concluída; nenhuma ferramenta de revisor independente disponível. Próximo passo: conferir a CI do HEAD e entregar esta mesma PR. Manter fora da main enquanto migrations remotas estiverem pendentes, conforme AGENTS.md; não iniciar outra unidade dependente. A liberação exige autorização própria para banco e deploy.

## Banco, serviços e preservação

Migrations **somente locais**, não aplicadas remotamente: `20261107010722_regulation_fiba_policy.sql` e `20261107042840_regulation_private_workflow.sql`. A segunda acrescenta estado/recibos privados de rascunho, funções autenticadas e auditoria/redação dos comentários. Aplicação remota, deploy e publicação de dados reais não estão autorizados por este plano. Autorização permanente de funções somente de leitura não cobre esta DDL de escrita/tabelas.

Sem deploy nesta unidade. Última publicação comprovada nesta conversa: preview UIUX origem `39ed1c4`, versão `c2ffca6b-66a5-4cfd-8925-edc6fc6be4f3`, deployment `61ed1489-8811-4af0-909c-3fceef987f7d`. Principal preservado em `139410ce-a8d6-4710-9b94-e1b1222cd3dc`. Não houve nova consulta ao serviço nesta retomada.

Checkout principal `sync/trabalho-casa`, alteração humana em CONTRIBUTING.md, skills/skills-lock e outros worktrees preservados. A automação **retomar-regulamento-fiba** retomou esta mesma unidade após o reset real, sem créditos/resets manuais; pausar ao encerrar a implementação e entregar a pendência de liberação. Cota inicial desta retomada: 0% usado/5h; acompanhar pela ferramenta oficial e respeitar 15% restante.

Contexto anterior no [histórico](../historico/progresso/2026-11-06-antes-regulamento-fiba.md).
