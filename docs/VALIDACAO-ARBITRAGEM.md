# Arbitragem administrativa — evidências

## A1 — contratos e banco local

Base main e6e8bf49c7040070cfc0fe0aa9cf8eca1169de34, branch codex/arbitragem, worktree `C:/Users/12405304716/.codex/worktrees/uiux-validation/Base do Basquete-v1`. Plano aprovado em `docs/superpowers/plans/2026-10-28-arbitragem.md`.

- RED inicial de importação não executou asserções. Em seguida, schemas provisórios permissivos executaram e falharam nos quatro comportamentos: nomes, sequência/duplicidade e contrato fechado. Implementação passou quatro focais novos e três contratos antigos.
- PostgreSQL descartável zero/upgrade inicialmente recusou a RPC ausente. Nova migration gerada pela CLI fixada2.121.0: **20261028132846_game_officiating.sql**, somente local/NÃO APLICADA.
- Oito focais contratos/banco/locais PASS; composição posterior dez focais com preparação PASS.82casos TS×SQL em cada cenário zero/upgrade:64combinações de funções, entradas malformadas, IDs repetidos inclusive caixa diferente, Unicode/limites/vazio/controles. A matriz não testa carga.
- Ajustes diagnosticados: rollback da fixture de upgrade também desfaz DDL criada dentro da transação, portanto a asserção final verifica jogos revertidos; dependência de helper de Local quebrava seu teste de upgrade, removida por normalizador próprio; Zod4.6.7 limita strings por pontos de código, comprovado diretamente, então SQL usa length em vez de contagem UTF16. Espaços Unicode vazios produziram RED e ganharam normalização compatível, sem alterar helpers antigos.
- Contrato SQL também prova: seis funções opcionais/independentes, lacunas/duplicados/IDs ausentes recusados, normalização e homônimos explícitos, replay exato e conflito de recibo, paginação20+1, versão antiga recusada sem criar nomes, falha tardia desfaz oficial/jogo/recibo, writer legado preserva escala e seu ACK não pode receber escala adicional, limpeza explícita, histórico imutável e revogação antes de replay.
- `npm run test:db`: **13/13 PASS** com a nova migration na árvore, sem executar banco remoto. Log `.preview-artifacts/officiating-db-regression.log`.
- Typecheck aplicação, lint dos três arquivos novos, diff-check e segredos **752arquivos PASS**. Formato focal aprovado após formatação. Sem gate consolidado/CI da arbitragem ainda.

## Segurança e compatibilidade

Catálogo/vínculos/recibos privados com RLS e sem grants diretos. RPCs administrativas versionadas; save_game/get_game/list_games anteriores preservados. Mesma transação, versão do jogo e ordem command→competition→game→identidades ordenadas→nomes ordenados. Snapshots de nomes e recibos imutáveis; nenhuma seleção ou união por nome. Nenhuma exposição em DTO público.

Leitura do projeto novo nizmasjddyrhmevvfviz pelo vínculo autorizado: **48migrations,11jogos,167pessoas,18inscrições,1Auth,0objetosStorage** em28/10/2026. São dados humanos, preservados. Não foram executados DDL/DML/fixtures remotos. SQL de prova usa o administrador existente sem DMLAuth/admin; runner descartável cria seu administrador apenas localmente.

## A2a — adapter local

- Catálogo, leitura de editor num snapshot e salvamento versionado implementados em `src/games/officiating-provider.ts`. Quatro testes novos tiveram RED real e GREEN; composição com provider legado **8/8 PASS**.
- Saída fechada/página20, nome de RPC fixo, JWT somente servidor, validação antes do envio, correlação do jogo/ACK, homônimo explícito, idempotência e erros sanitizados. RPCs novas ainda não conectadas ao SessionStore/rotas/UI. Tipos gerados do banco remoto não foram alterados artificialmente.
- `npm run typecheck` aplicação+Worker PASS; lint dos arquivos do adapter e segredos **755arquivos PASS**. Não houve gate ou CI da unidade incompleta.
- Prova A1 após ordem final de locks: **6/6 PASS**, log `.preview-artifacts/officiating-a1-postlocks.log`, SHA256e8c6a5b1b3270f61b6cbca1ed5bdfd582ab8b7282875d8b53bb40954be607d90.
- Regressão13PG: SHA2562ef23401a2db17b53c2f431c89dc98e74c1cbc0f9c1b767f214b6e3987b6d2a6. Adapter8focais: `.preview-artifacts/officiating-provider-final.log`, SHA2565cbd8222973480f1f07e1148b77f50662a9bc8389f9b75353bc79c84e3e6f0f9.

## Próxima unidade

Revisão independente/corridas reais PG do novo writer/prova real com rollback e aplicação segura/tipos remotos. SessionStore/rotas/dropdowns/formulário, testes de interface, gate/CI e publicação. Não declarar arbitragem disponível no preview. Preview segue source1e73ae0/deployment1290ebc0-fedd-4d64-8c7a-e410c80e68d2, sem novo deploy.

## A1/A2 reais e A3 em validação — execução após autorização de retomada

Migration aplicada uma vez pelo plugin: **20261028163429_game_officiating.sql**, SHA256c9010f2ae15b20a706ca1509d0f6a39677a825205e486bb58c772b9f19ea481c, arquivo CLI renomeado para versão remota sem mudar bytes. Contrato real BEGIN/ROLLBACK PASS sem DMLAuth/admin; após rollback0oficiais/atribuições/recibos e0fixtures.49migrations remotas,12jogos/168pessoas/18inscrições/1Auth humanos preservados. Tipos gerados pelo plugin. SQL SHA2563a0d7399e6179ee1f77891334264e8e841b75619a1d231c7297a041f201823a7; resultado ignorado `.preview-artifacts/officiating-real-proof.json` SHA2567cd3c9dd33a2dedebbef4a9554906d59af6be08fa42629886c024ffcc0390a52.

Advisors: INFO RLS semPolicy nas três tabelas privadas semgrants é deny-all intencional, como Local existente; aviso conhecido de senha vazada/Pro, sem nova contratação. Índices cobrem todas as novas FKs. Sem revisão independente/carga/corridaPG multiconexão comprovadas desta unidade.

Rotas/SessionStore no3f409b9: dois workerd focais PASS após RED405→200, incluindo contrato antigo. Autoridade fresca antes de body/origem/8KiB/queries/ID. UI10browsers composiçãoPASS; expansão6PASS/3FAIL, locator e peso do título corrigidos,3focaisPASS. DensidadeRED260,5px por herança de `.teams-inline fieldset`; seletor local corrigido, dois layouts1366/1920PASS com seção<=220px e título igual Dados do jogo. Capturas finais inspecionadas. Ainda pendentes composição final, gate/CI e deploy; registros de pendência acima são históricos.

## A3 — fechamento local

Quinze cenários desktop novos abrangem vazio/opcional, persistência/reutilização, pessoa única, homônimo confirmado, seis funções, limpeza intermediária/de grupo com confirmação, consulta paginada/teclado, campos não selecionados, ACK conhecido+GET falho, reautenticação+ACK incerto,409 e dois tamanhos desktop. Sem novos testes mobile neste recorte.

- Composição final com Jogos/Local/decisões:30/31PASS; única falha na fixture de duas abas que só interceptava o endpoint legado. Fixture estendida ao editor versionado compartilhando o mesmo jogo/escala; focal do cenárioPASS, sem mudar comportamento de produto/timeout. Outros30casos aplicam-se a código inalterado.
- Descobertos/fixados por RED→GREEN: foco após seleção paginada reabria popup (ordem de foco/fechamento corrigida); ícone textual× gerava análise de rótulo inconclusiva (SVG decorativo com aria-hidden/label explícito); estado de carregamento referenciava listbox ausente (agora existe durante carregamento/erro, aria-busy). Três focais finais teclado/axe/carregamentoPASS.
- Axe sem violações/inconclusivos no formulário vazio/dropdown carregado; estado de carregamento sem violações. Não equivale a auditoria WCAG completa/leitor de tela. Capturas1366×768 e1920×1080 inspecionadas, títulos Dados do jogo/Arbitragem com16px/700 e últimas funções/ações visíveis. Sem altura fixa escondendo conteúdo.
- Revisão estática pelo próprio autor usando Web Interface Guidelines; sem ferramenta/subagente de revisão independente disponível. Busca limitada20, cancelamento de resposta antiga, foco/contraste/teclado, nomes de controles e proteção de alterações revisados. Gate consolidado e CI serão executados sobre o material estável seguinte, sem reutilizar resultado da main como se validasse esta unidade.

## Gate estável — cf8503ddcba65783287c3f985cba524aba0fdb77

`npm run gate` final **PASS/exit0**:583unitários/120arquivos,6transportes,13cenáriosPG,24workerd e prova dos4PDFs; lint/formato/tipos/builds/fronteira/segredos759PASS. Log `.preview-artifacts/officiating-final-gate-2.log`, SHA256 **7d92566ad4b70ffe2c70381e5fd3282a4361ae61384357db63540fb8232c6ef5**.

Primeira execução parou antes dos testes por tipagem da fila de callbacks na fixture de busca lenta. Fila tipada corrigida emcf8503d, typecheck e focal de carregamento PASS antes do gate final; não foi falha de produto nem suíte mascarada. Primeiro log preservado como `.preview-artifacts/officiating-final-gate.log`, exit2. Nenhuma mudança material de produto depois da fonte verificada; documentos de fechamento não exigem repetir a suíte local.

Pré-deploy Cloudflare confirmou conta/Worker corretos, owner único, previewsOFF, DO/rate/bindings de segredo preservados, zero tokens temporários e anônimo302 na raiz e catálogo. Smoke específico preparado/sintaxe validada em `.preview-artifacts/officiating-smoke.mjs`: mantém checks anteriores, acrescenta arbitragem/removal e usa dois desktops1366/1920.

## CI, publicação e integração — 28/10/2026

Fonte **6a1174760b3a1a2e5a9f97a0db51f17c9cd857c2**, [PR39](https://github.com/renato-lucindo/base-do-basquete-next/pull/39) integrada em **723ba522a8269648bd18d3e0270068cd45b2f78f**. [CI40731051190/job122967147446](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40731051190/job/122967147446) SUCCESS:583unit/120arquivos,441browsersPASS/91SKIP, gate completo. Log ignorado `.preview-artifacts/officiating-ci-final.log`, SHA25648012d68c69c84e9b865d4728065b466fb72c5854eb57d08584f3b29aee098db. Documentação posterior não altera produto nem exige repetição das suítes.

Pacote preparado de HEAD limpo:24assets, WorkerSHA256625f2ff994eb1ccec16de6e61bdeb4fabafa414477c5c595c0c32997859b7a6b. Upload pelo plugin Cloudflare com guarda owner-only/target retornou200. Deployment **eb9d5d53-87e4-47ba-95e7-3d659706ee14**, versão **a229efdb-e00e-4b49-9609-624cc4efa10d**,100%, no Worker existente base-do-basquete-next-preview.

Smoke remoto `.preview-artifacts/officiating-smoke.mjs` exit0:24assets/hashes/Xsource,43GETs privados e14POSTs sem sessão, catálogo/editor de arbitragem, health/sessão/Auth inválido, projeções públicas sem registros fictícios e dois browsers1366/1920. Não autenticou como responsável nem escreveu dados humanos; o salvamento real foi provado separadamente por contrato SQL com rollback e cenários de interface controlados. Aceite humano pós-publicação permanece pendente.

Credencial temporária transmitida somente por RSA em TTY; token6b411d40-4e66-4811-ac4f-a61203b4257e e política3df447ff-24c3-49bb-90f7-31cc7615e030 revogados imediatamente. Conferência posterior: zero tokens, somente política30cc3ab4-9331-4df6-8d13-d840c2652210 do responsável, raiz e `/api/games/officials` respondem302 para anônimo. PreviewsOFF, namespace DO0411ac931ca54d289d270606c7e87ef7, rate862073195184 e nomes dos bindings secretos preservados. Sem processos/credenciais pendentes. Automação desta unidade PAUSED.
