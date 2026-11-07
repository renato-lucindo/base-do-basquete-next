# Progresso atual

## Regulamento simplificado — 07/11/2026

Unidade `codex/regulamento-fiba`, [PR #72 draft](https://github.com/renato-lucindo/base-do-basquete-next/pull/72), base `39ed1c4`, material implementado **16734b3e5231847c1767dc1336e50a04dc9ab8a2**. Worktree `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. HEAD real inclui este checkpoint posterior. [Plano autorizado](PLAN-REGULAMENTO-FIBA.md), [decisão vigente](decisoes/021-regulamento-fiba-simplificado.md), [validação detalhada](VALIDACAO-REGULAMENTO-FIBA.md).

Implementados: política FIBA versionada com legado preservado; padrões 2/1 e W.O. 20–0/0; grupos/turnos; tela em três seções e regras avançadas recolhidas; exceções justificadas; adoção explícita em versões antigas; rascunhos privados com CAS/recibos, recuperação e escolha da versão confirmada; desempate manual com comentário privado e auditoria de autor/data no servidor. Decisão obsoleta deixa de valer sem bloquear consulta/publicação. Candidato e contrato públicos excluem/rejeitam notas privadas. Fora do escopo original preservado (sem insuficiência, reincidência, sorteio, geração, cópia ou mudanças no mata-mata).

## Evidências e pendências reais

Gate equivalente ao npm run gate, unitários com um worker: **758 PASS/159 arquivos**, transporte **11**, PostgreSQL isolado **15**, HTTP/Worker **33**, runtime PDF **1**; lint/formato/tipos/builds/fronteira/segredos PASS. O comando de fronteira via npm exec resolveu Node alpha no cache; repetido diretamente em **Node 24.18.0**, PASS, sem mudar dependências do projeto. Logs ignorados em `.preview-artifacts/regulation-full-gate.log`. Ajustes finais de UI (guarda/cancelamento do desempate e recarga de rascunho) tiveram tipos/lint/build/fronteira e browsers focais próprios PASS. HTTP novo de rascunho **1 PASS**, incluindo sessão/CSRF/corpo fechado/ACK incerto.

HTTP/Worker final: **34 PASS**. Chromium completo: **712 PASS, 116 SKIP existentes, 2 FAIL** por expectativas antigas de regras abertas. A adaptação preservou as asserções e revelou desalinhamento desktop, corrigido em `16734b3`: repetição **2/2 PASS**. Suíte final dos consumidores do regulamento: **69 PASS, 11 SKIP existentes** (80 casos), incluindo publicação e expansão administrativa. Fluxo novo isolado: **18 PASS**. Logs em `.preview-artifacts/regulation-{all-browsers,consumers-final,workflow-final}.log`. Capturas/axe em 1366, 1920, 390 e 320 px passaram. Fixtures sintéticas e SQL PGlite isolado, sem dados humanos.

[CI f610ce2](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42341718405) **FAILURE** somente nos dois cenários de expansão corrigidos. [CI final cdefbaf](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42342954644) **SUCCESS** em todos os jobs: 758 unitários, 714 Chromium, 116 skips existentes, 28 WebKit. Atualização de liberação acompanha os [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/72/checks). Sem remoção de cobertura, alteração de timeouts ou novos skips.

Revisão autoral separada do diff concluída; nenhuma ferramenta de revisor independente disponível. Em 07/11/2026, o responsável autorizou as migrations, integração e deploy pendentes. Próximo passo: conferir a CI deste checkpoint, integrar a mesma PR e validar a CI da main antes de publicar no preview UIUX. Não publicar dados reais nem alterar o serviço principal.

## Banco, serviços e preservação

Migrations aplicadas no **base-do-basquete-next-dev (`nizmasjddyrhmevvfviz`)** pela autorização direta “Autorizo” desta conversa. O MCP atribuiu IDs remotos `20261107055635` e `20261107055642`; os arquivos locais foram alinhados a esses IDs, sem mudar o SQL originalmente identificado por `20261107010722` e `20261107042840`. Nomes remotos conservam os IDs originais como prefixo. Não reaplicar as cópias antigas. RLS ativo, tabelas privadas sem privilégios diretos para anon/authenticated, RPCs sem EXECUTE anon e verificações administrativas preservadas. Advisors antes/depois: mesmos 4 INFO de políticas privadas, 3+3 WARN de consultas públicas e 1 WARN de senha vazada; nenhum novo apontamento. Regulamentos, rascunhos, recibos e classificações publicados: zero no momento da conferência. Sem DML nos dados da aplicação.

Sem deploy nesta unidade. Última publicação comprovada nesta conversa: preview UIUX origem `39ed1c4`, versão `c2ffca6b-66a5-4cfd-8925-edc6fc6be4f3`, deployment `61ed1489-8811-4af0-909c-3fceef987f7d`. Principal preservado em `139410ce-a8d6-4710-9b94-e1b1222cd3dc`. Não houve nova consulta ao serviço nesta retomada.

Checkout principal `sync/trabalho-casa`, alteração humana em CONTRIBUTING.md, skills/skills-lock e outros worktrees preservados. A automação **retomar-regulamento-fiba** retomou esta mesma unidade após o reset real, sem créditos/resets manuais; foi pausada ao entregar a implementação e permanece pausada durante esta liberação autorizada. Cota inicial desta retomada: 0% usado/5h; acompanhar pela ferramenta oficial e respeitar 15% restante.

Contexto anterior no [histórico](../historico/progresso/2026-11-06-antes-regulamento-fiba.md).
