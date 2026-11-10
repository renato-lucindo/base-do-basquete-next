# Classificatória e Eliminatória — 08/11/2026

Mesma unidade `codex/campeonato-flexivel`, PR75 aberta/draft. Material implementado `56488576cc5186020ec837fec3531ba2f79cb39f`. Base desta alteração: `f3f134a83f09f4f22ac89e5ead3380a0f921c401`; CI42517100300 SUCCESS confirmada antes da implementação. Protótipo aceito pelo responsável nesta conversa, incluindo títulos dos jogos dentro da borda e maior espaço entre confrontos. A aprovação do protótipo autoriza a implementação, não o merge ou o aceite do Worker atualizado.

## Comportamento e revisão

- Navegação raiz Classificatória/Eliminatória, com liberação por participantes resolvidos antes de jogos/resultados. Tabela de grupos preservada; várias fases usam opções agrupadas no seletor. URLs novas com etapa, links antigos por fase, recarga e Voltar conferidos.
- Bracket usa somente definição/projeção/jogos públicos existentes. Jogo único, ida-volta com Total oficial, MD3/5/7, slots explícitos, mandos alternados, zero versus ausência, referências reais de vencedor/perdedor e terceiro lugar. Não calcula classificados, resultados ou confrontos; não escreve nada.
- Cabeçalhos Jogo1…N (com espaço entre palavra e número na tela) dentro dos cartões, fonte compacta e placares visíveis sem clique. Vitória de jogo em negrito; nome de classificada somente por resultado completo da projeção. Inscrições desconhecidas usam A definir; placares ausentes/dispensados usam—.
- Em mudança de adversários ou duplicação de inscrição, não atribui o placar antigo às linhas recalculadas; revisão/empate concreto permanece visível. Sem aviso genérico ou justificativa privada. Estado incompleto não altera a agenda ou o lançamento manual.
- Cartões/colunas adaptam largura ao formato. Altura real máxima dos cartões define o passo vertical com intervalo, incluindo nomes longos e conflitos. Conexões SVG recalculadas após resize, preservando rolagem/zoom nativos; perdedores têm conexão tracejada e origem acessível. Sem dependência nova.
- Revisão do autor separada da implementação, com [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultadas em08/11/2026. Sem parecer independente: não havia ferramenta de subagente de revisão nesta execução. Identificada/corrigida a repetição de inscrição com teste RED→GREEN. Sem achado bloqueante restante no diff revisado; não declara WCAG integral.

Checklist de design: textos somente para estados concretos; cabeçalhos completos sem tooltip/botão; MD3/5/7 usam somente a definição curta no tooltip compartilhado; legenda existente da Classificatória preservada, nenhuma nova legenda técnica no bracket; alinhamento, nomes acessíveis, teclado/toque, reflow e movimento reduzido conferidos proporcionalmente. Nomes de fases/séries e de inscrições permanecem publicados, sem truncar a fonte.

## Verificações e limites

- RED de navegador antes da alteração: faltava a navegação Etapas da classificação/Classificatória/Eliminatória. Após implementar,38cenários Chromium focais PASS (classificação, últimos jogos e bracket, desktop/mobile). Os12casos unitários cobrem seleção de etapa, links legados, slot/orientação/zero/ausência, formatos, conexões reais de vencedor/perdedor, conflitos e dependências dentro da mesma fase.
- Revisão reproduziu em RED uma série com a mesma inscrição nas duas entradas recebendo placares antigos; correção conferida com12testes unitários PASS. Gate inicial havia capturado esse teste durante o RED e terminou com1falha/786PASS; não reutilizar esse resultado como gate aprovado.
- Capturas do bracket de quartas MD3 em1366×768,1920×1080,390×844 e320×844.1366desktop/390mobile inspecionadas; cabeçalhos internos, três placares por equipe, espaçamento e ausência de transbordamento conferidos. Nomes de120caracteres/MD7 e zoom200% também exercitados; axe dos cenários de bracket sem violações no Chromium.
- WebKit focal:10cenários desktop/mobile PASS, configuração local ignorada reaproveitando os mesmos testes. Gate seguinte encontrou5suites sem testes por ENOENT em arquivos do cache SSR temporário;27testes dessas5suites passaram no rerun focal, sem código alterado. Gate com TEMP/TMP próprios aprovou787testes/164arquivos e15SQL, tipos/lint/formato/transportes/builds; falhou na etapa Worker apenas com TEMP alternativo. Reproduzido diferencial normal/alternativo no mesmo teste, sem código alterado. Com TEMP normal,35Worker PASS, runtime4PDFs PASS e fronteira/segredos PASS (sequência final exit0). O comando gate isolado não teve exit0; não ocultar essa distinção. CI42526153336 no HEAD35ae33f aprovou checks (gate completo), design, WebKit e scope; lotes de navegador/validate ainda pendentes na última consulta. Regressão Chromium completa886casos local ainda em execução. Logs ignorados: `.preview-artifacts/bracket-gate-final.log`, `bracket-browsers.log`, `bracket-webkit.log`.

Os cenários de quartas usam fixtures locais, sem seed, Auth/admin, DML remoto ou publicação de dados fictícios no banco compartilhado. Contratos públicos/Worker/banco/migrations inalterados. Não inferir cobertura de escrita autenticada remota dessas provas.

## CI e preview

Enviar na mesma PR75 após validação local; conferir o HEAD/run real. Ao aguardar CI, atualizar a automação existente, sem duplicata. O release autorizado continua restrito a `base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev`, com novos builds/pacote do SHA cujo validate passou. Preservar Access, bindings, sessões, segredos, rate limit e banco compartilhado. Sem merge/fechamento, deploy principal/UIUX, migration ou DML remoto.

Nesta redação, o serviço publicado continua sendo a fonte b3908fb, versão b6161cb7-a16f-4f6c-978e-4d3f3d608f06. Ainda não houve upload/deploy do bracket; registrar provas remotas e novo SHA/versão apenas após execução efetiva.

## Retomada de21:49UTC

HEAD82b658bc48b5cb01475a6d26fb4220240fbcc262; CI42526714531 em andamento, design/scope SUCCESS e demais jobs ainda em andamento na consulta real. Sem tópicos de revisão. Regressão local encerrada:762PASS,118skipped,6FAIL, exit1 em21,6min. As6falhas desktop (flows145/214, public-accessibility18/41, withdrawals469/538) são ENOENT de traces/ENOSPC ao escrever relatórios/traces, sem asserção de bracket falha. Não declarar integralPASS nem corrigir produto para contornar artefatos; verificar capacidade e saídas independentes antes de rerun focal ou registrar prova equivalente integral da CI. Nenhum upload/deploy novo.

Pausa conforme limite do responsável:14%restante5h,95%usado semanal. Reset real23:13:58UTC; retomada na mesma automação para23:15:58UTC (20:15:58Brasília) em08/11/2026, sem créditos/reset manual.

## Release do bracket — 23:21UTC

Retomada após o reset real: HEAD limpo **4f0e99768c7f7d4f363a814ed8a72d202b4f51ef**, material56488576. [CI42527229564](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42527229564) desse HEAD conferida inteiramente SUCCESS: validate128876885477, checks128873686416, design128873686422, scope128873646813, WebKit128873686432 e Chromium128873686521/128873686510.

Os logs Chromium confirmam443PASS no lote1 (11,1min) e325PASS/118skipped no lote2 (6,3min): **768PASS e118skipped,886casos**, prova integral equivalente utilizada para liberar o preview. O resultado local permanece762PASS/118skipped/6FAIL por gravação de artefatos; não se declara PASS local nem se altera produto para contornar ENOENT/ENOSPC. Capacidade livre na retomada cerca de4,47GB; não houve exclusão de artefatos alheios. Evitar runners concorrentes com o mesmo outputDir.

### Publicação efetiva

Executados sequencialmente, exit0: `npm run build:foundation`, `npm run build:worker` (dry-run), `node scripts/prepare-foundation.mjs`, `node .preview-artifacts/prepare-pr75-release.mjs 4f0e99768c7f7d4f363a814ed8a72d202b4f51ef` e dry-run de versions upload. Artefatos NOVOS com35assets e source4f0e997; hash worker.js **0e5c714cc48c0f715326684e8a92a72487ba9ddbf793c6690b4245dc591c0609**, backend igual ao anterior.

Upload real e deploy explícito somente por `.worker-artifacts/pr75-release/wrangler.jsonc`, Wrangler4.152.0, alvo **base-do-basquete-next-pr75**. Versão **f8f2ad0c-f6d5-4298-baeb-b420f9e227b4**, tag pr75-bracket-4f0e997, deployment **ae0c2a37-bab8-47db-a6c7-3a06534df745** a100%, criado **2026-11-08T23:21:03.956976Z**. Inspeção da versão antes do deploy confirmou os dois segredos existentes e DO/rate limit/origem/feature preservados, migration_tag v1 sem alteração.

[Classificação no preview isolado](https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96?secao=classificacao).

### Provas remotas e encerramento

Smoke Node local contra o serviço remoto, script ignorado `.preview-artifacts/pr75-standings-smoke.cjs`, SHA obrigatório e manifesto novo: **PASS/exit0**. Conferidos35assets status200/hash/source, metadado flexible=true,26jogos públicos e ausência de tieNotes/customReason. Endpoints sessão/configuração/rascunho/finalização anônima retornaram401; última requisição não autenticada não gravou dados. Anônimo retorna302 para o domínio Access.

Acesso de teste por token efêmero de30min com política non_identity exclusiva do app PR75; credenciais apenas em memória e entrada TTY raw sem eco, sem arquivos/argumentos/logs. Revogada **primeiro a política, depois o token**, em operações sequenciais. Consulta final: **zero service tokens**, somente política owner-only original, sessão8h, subdomain enabled=true/previews_enabled=false.

Comparação canônica antes/depois dos settings/bindings dos3Workers: MATCH. Deployments do principal **base-do-basquete-next-preview** (139410ce-a8d6-4710-9b94-e1b1222cd3dc) e UIUX (1d839a25-c0f7-4e24-8602-63c8eb67fd20) inalterados. PR75 preservou SESSIONS3552464a1346403ab7132137b7b39e6d, LOGIN_LIMITER751107202611, origem exata, featuretrue e nomes dos dois segredos; Access/políticas iguais ao baseline. Sem rotação de segredos, DDL/DML ou mudança de serviço alheio.

Evidências locais ignoradas: `bracket-release-build.log`, `bracket-release-worker-build.log`, `pr75-bracket-baseline.json`, `pr75-standings-smoke-result.json` em .preview-artifacts; manifesto em .worker-artifacts. A prova não cobre escrita autenticada remota; os confrontos fictícios permanecem exclusivamente nas fixtures locais. Disponibilidade da aba no campeonato real depende de confrontos publicados com duas inscrições resolvidas.

PR75 continua aberta/draft para aceite humano, sem merge. Commits posteriores a4f0e997 são somente documentação; acompanhar sua CI atual sem recompilar/republicar o produto por checkpoint. Automação existente acompanha a CI documental e pausa ao restar somente aceite.
