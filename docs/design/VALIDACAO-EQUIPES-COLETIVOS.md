# FR, T e GD — validação da unidade

Unidade `codex/equipes-fr-t-gd`, [PR64](https://github.com/renato-lucindo/base-do-basquete-next/pull/64). [Plano aprovado](../superpowers/plans/2026-11-05-equipes-fr-t-gd.md). Estado de execução no [checkpoint](../PROGRESSO.md).

## Resultado implementado

FR coletiva de súmula = FC adversária na mesma partida, antes de agregar. T automática por ocorrências de atletas/comissão/banco/sucessões, sem B2. GD exige total conferido por equipe, maior ou igual ao mínimo do motor; zero também precisa de confirmação. Boxscore conserva FR própria e métricas individuais não mudam.

FR/T são somente leitura. GD publicada só é recuperada para a mesma versão da súmula e permanece sem confirmação automática. Alterar total desmarca o check; alterar o documento invalida a conferência mesmo quando a alteração é desfeita. Resposta incerta conserva JSON/UUID e conflito exige recarga.

POST /api/games/:id/publication/team-statistics usa o documento congelado da versão pública corrente, com autorização administrativa atual, origem/tamanho/contrato fechados, locks, recibo e novas versões/projeções. Preserva integralmente súmula atual, relacionados, placar, atletas, eventos, versões anteriores e fase já publicada.

## Evidências

- Cálculo/guarda RED→GREEN; TS/SQL equivalentes, FR inclui exatamente FC dos atletas adversários. Entrada FR null/igual aceita, divergente rejeitada; GD mínima e explícita para os dois lados, incluindo0.
- Três adversários com FC diferentes e zero: FR soma5 e média5/3 pelo J da inscrição; filtros regular/mata-mata respeitados. Fonte mista e PDF com FR deliberadamente distinta da FC adversária preservam autoridade do PDF e todos os fatos individuais.
- T técnica de atleta, treinador e banco, códigos compensados, todas as sucessões, B2 excluída e capitão/treinador sem duplicação. SQL e TS também conferidos na última sucessão.
- Banco descartável: anon e não administrador negados; tipos, campos extras, motivo, limites e GD inválidos rejeitados; cópia congelada, versão esperada, preservação completa de fonte atual divergente, recibo idempotente inclusive após outra correção e projeções atualizadas.
- Browser súmula completo18PASS; colunas8PASS desktop/mobile. Conferência explícita de zero, preload sem check, erro inline/aria-invalid, invalidação por alteração/desfazer, cancelamento/recarga sem perder edição, conflito entre abas, foco, axe e tentativas incertas com JSON idêntico.
- Capturas ignoradas .preview-artifacts/team-statistics-review-_.png e team-statistics-viewport-_.png. Inspeção autoral em1366/1920/390; foco medido fora do cabeçalho fixo. Captura de elemento alto pode incluir o cabeçalho no meio; captura de viewport e geometria de foco comprovam o estado real.
- **Gate da composição03d8b32 exit0** (.collective-gate-composed.log):727 unitários/152arquivos, política11, transporte11, banco15, WorkerHTTP33 com build fresco, PDF1, lint/formato/tipos/build/fronteira/segredos. Gate anterior ao merge também passou (.collective-gate-resume.log:724/151,banco13,HTTP31), mas não substitui a prova da composição final.
- CI42143702440/5939567: checks/design/WebKit PASS; browsers falharam na expectativa antiga FR9 onde FC adversária é0. Teste reproduzido RED e corrigido; oito testes de colunas PASS. CI atual será conferida no HEAD enviado, sem somar recortes sobrepostos.

## Composição com a PR61

Main860742e incorporada por merge808ebda; comandos confirm_game_stages e revise_sheet_team_statistics preservados. Checkpoint recebido arquivado, sem alterar a unidade ou os serviços do outro agente.

A nova confirmação de fases fazia o trigger copiar a fase atual do editor durante qualquer republicação. Teste RED mostrou que a correção coletiva também mudava regular para mata-mata. Migration nova ajusta somente o trigger: quando snapshot, fonte, jogo e demais fatos são idênticos, exceto os coletivos e metadados da versão, usa o refresh integral existente, que conserva as fases públicas. Publicação normal continua usando refresh por jogo.

Ruling: reutilizar refresh integral para correções exclusivamente coletivas, preservando a atualização transacional existente e a fase pública. Custo: percorrer a disputa (limite existente10000 jogos), em vez de atualizar um único mapeamento; não criar sinal de sessão nem escrita direta nas projeções/históricos. Focais8PASS/4arquivos verificam regular/mata-mata, projeções, fonte divergente e integração de fases. Nenhuma migration aplicada foi editada.

## Revisão de interface

Revisão autoral com [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas novamente06/11; sem revisão humana independente ou celular físico. Revisão automática Codex do HEADbc43bf9 identificou perda de conferência ao salvar a súmula atual. Reprodução RED no browser e correção: estado dirty também bloqueia edição/salvamento/recarga da súmula, com aviso; publicação ou cancelamento libera a guarda. Suíte de súmula18PASS e gate:ui exit0 após o ajuste, sem alterar SQL aplicado. Logs locais collective-review-save-red/green/gate. CIbc43bf9/42213471509 passou integralmente; consultar checks da PR64 para o HEAD posterior e SHA integrado.

- src/publication/collective-review.tsx: controles com nomes/rótulos, erro de GD junto ao campo, aria-invalid/descrição; checks explícitos conforme plano.
- src/publication/sheet-panel.tsx: conferência permanentemente invalidada na primeira mudança do documento, com aviso de recarga.
- src/publication/team-statistics-panel.tsx: guarda de saída/recarga/cancelamento, alerta focável e conflito sem sobrescrita.
- src/games/sheet-workspace.css: campos curtos, duas colunas no desktop, checks compactos com alvo44px e margem de foco compatível com cabeçalho maior no celular.

A regra externa de manter submit habilitado cede à exigência explícita do plano de bloquear publicação sem GD conferida. Axe e revisão autoral não comprovam WCAG integral nem aceite humano.

## Operação autorizada e migration aplicada

Migration `20261106114943_complete_sheet_team_statistics.sql`, SHA256 **2c52e384be58aa78a0398ea89433dec1c8f00c82d264a1c0091b39ff395697c8**, aplicada em06/11/2026 às11:49UTC no **base-do-basquete-next-dev / nizmasjddyrhmevvfviz**. SQL idêntico ao testado; nome local reconciliado com a versão atribuída pelo servidor. Somente funções/triggers/privilégios; sem backfill, seed ou mudança em tabelas. Instala cálculo FR, guarda GD no escritor, preservação de fase e RPC de correção versionada. Rascunhos/históricos continuam legíveis. A guarda passa a rejeitar clientes antigos que publiquem súmula sem os dois totais GD.

[Quadro](../evidencias/2026-11-05-equipes-fr-t-gd.md)/JSON:25jogos/50lados,T15,**50GD confirmadas pelo responsável, soma4**. Leitura imediatamente anterior à migration:25/25 versões correspondem ao manifesto, mantendo a divergência do jogo15/publicação3/súmula7→8. Quatro totais1:CESB/jogo2,Veteranos VV/jogo1,Serra Extremos/jogo3,AMPRL/jogo16; demais46totais0 explicitamente confirmados. FR2 do IVV/Cetaf no jogo nº3 corresponde às FC2 registradas da LUSB; responsável aceitou o esclarecimento.

Cada comando mantém UUID/payload em caso de incerteza, confere versão atual e cria nova versão pública, preservando documentos atuais e anteriores. Não usar salvamento comum da súmula. Baseline local guarda hashes de jogos, súmulas atuais, entradas, históricos, demais fatos publicados e fases. Comprovantes posteriores devem confrontar cobertura50/50, agregados das duas disputas, fase/placar/fatos individuais e divergência atual preservados.

Autorização humana direta nesta conversa em06/11: “GD está correto” e, após esclarecer FR, “Eita, está correto então. Pode prosseguir”. Abrange as operações concretamente apresentadas: migration de desenvolvimento, integração da mesmaPR64 após CI, deploy somenteUIUX e25correções com os totais conferidos. Migration aplicada; demais operações e provas finais ficam registradas na [PR64](https://github.com/renato-lucindo/base-do-basquete-next/pull/64), sem presumir sua conclusão neste documento. Baseline previewUIUX:source860742e/deploymentb703ce35-941b-4e7a-9fa8-5249e4de1b98/versionc7df9b31-55e4-4fa3-9b94-fc8f290175f0,100%;25fases públicas regulares,FR/GD ausentes50/50,T presente16/50. Principal segue deployment00dffb6b-1d5c-4433-9214-768013ed6277/version139410ce-a8d6-4710-9b94-e1b1222cd3dc.

Advisors de segurança antes/depois da aplicação mantiveram os mesmos achados:4INFO de RLS sem policy em tabelas privadas,3WARN de funções públicas intencionais por papel e1WARN de proteção de senhas; baseline de performance aponta FKs sem índice/índices sem uso. [Catálogo dos lints](https://supabase.com/docs/guides/database/database-linter), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Nova RPC é invoker pública, definer privada com guarda administrativa e search_path vazio, sem EXECUTE para anon; grants conferidos após a migration. Referência de [funções/privilégio mínimo](https://supabase.com/docs/guides/database/functions).
