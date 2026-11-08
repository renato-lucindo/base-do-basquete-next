# Classificação — apresentação de08/11/2026

Mesma unidade `codex/campeonato-flexivel`, PR75 aberta/draft. Etapa documental1714f39/checkpoint46a8274 entregue antes de alterar a tela; CI42512523431 SUCCESS conferida antes da etapa2. Esta evidência acompanha o código de apresentação posterior, sem alterar cálculos, contratos públicos, banco ou regras de publicação.

## Resultado e revisão obrigatória

- [x] Textos: retirados os avisos genéricos fixos da classificação pública e projeção administrativa; permanecem erros, vazios e pendências concretas.
- [x] Cabeçalhos: Equipe e Últimos jogos são texto, sem tooltip/botão de ajuda. Pos./J/V/D/Aprov./PP/PC/SLD compartilham significados curtos com a legenda.
- [x] Tooltip dos jogos: sigla cadastrada ou nome publicado da inscrição, confronto na ordem original, placar e DD/MM. Caso de aceite `LUSB 56 x 66 IVV/Cetaf - 20/09` conferido. Ausência de data omite sufixo, placar ausente mantém— e zero confirmado permanece0. Vitória/derrota, mais recente e resultado administrativo permanecem somente na identificação acessível completa.
- [x] Legenda: título e lista de definição com classes e estilos existentes de Jogadores/Equipes; oito abreviações visíveis, sem parágrafo técnico. Largura acompanha o bloco da tabela.
- [x] Alinhamento/interação: Últimos jogos centralizado; até cinco resultados, ordem e anel recente preservados. Cabeçalho/equipe fixos, rolagem interna, foco/Escape, hover e toque conferidos. Capturas1366/1920/390/320CSSpx, nomes longos, zero/ausência e reflow preservados; teste existente cobre zoom200%. Axe sem violações nos cenários de tooltip e legenda desktop/mobile.

Revisão do autor com [Web Interface Guidelines atuais](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas nesta execução; sem parecer independente declarado. Nos quatro arquivos de UI alterados, a revisão conferiu semântica, identificação acessível separada do tooltip, foco/interações existentes e responsividade. Nenhum achado adicional bloqueante no diff. Não representa WCAG integral ou aceite humano.

## Verificações

RED: dois cenários novos falharam antes da correção, reproduzindo o aviso genérico visível e tooltip extenso com nomes completos/ano. GREEN: `npx playwright test tests/public-standings.spec.ts tests/public-standings-recent.spec.ts --workers 2 --reporter line` → **28PASS**, desktop/mobile, incluindo correção/exclusão, decisão administrativa sem placar, troca de fase/grupo, ausência de sigla/data e resultado sem associação.

`npm run gate` → **PASS**, exit0:775testes/163arquivos,15contratos SQL,35casos Worker,11transportes, runtime dos quatro PDFs no workerd, builds/tipos/lint/formato/fronteira/segredos. Não foram ampliados timeouts nem excluídos testes. CI e serviço efetivamente publicado serão registrados no checkpoint após seus resultados reais.

Logs locais ignorados: `.preview-artifacts/standings-copy-red.log`, `standings-copy-green.log` e `standings-copy-gate.log`. Capturas `standings-recent-after-{1366,1920,390,320}-{desktop,mobile}.png`;1366desktop e390mobile inspecionadas visualmente.

## Liberação

Somente o Worker isolado `base-do-basquete-next-pr75` pode receber esta revisão após validate SUCCESS. Regerar builds/pacote/proveniência do SHA conferido; preservar Access owner-only, segredo, sessões e rate limit existentes. Não reaplicar migrations, executar DML de teste remoto ou alterar principal/UIUX. PR permanece aberta para validação humana. Ao aguardar CI, programar a mesma automação de checagem conforme decisão de08/11 e pausá-la após a entrega ou quando depender apenas do aceite humano.

## Preview atualizado

Material de produto51ec8ee e checkpoint b3908fbef221032de5b7c804056d0fbc82c7d17d. [CI42515060673](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42515060673) inteiramente SUCCESS no HEAD b3908fb: checks, dois shards Chromium, WebKit, design, scope e validate; validate concluído em08/11/2026 19:38:46UTC. Sem revisões/comentários na consulta anterior ao release.

Builds novamente gerados após a CI: `npm run build:foundation`, `npm run build:worker` (dry-run), `node scripts/prepare-foundation.mjs` e helper local de extração com SHA explícito. Fonte b3908fb,35assets, workerHash `0e5c714cc48c0f715326684e8a92a72487ba9ddbf793c6690b4245dc591c0609`, pacote5541.71KiB/gzip1324.41KiB. Payload original não foi publicado.

`wrangler versions upload` com config exclusiva `.worker-artifacts/pr75-release/wrangler.jsonc`, tag pr75-b3908fb, produziu **b6161cb7-a16f-4f6c-978e-4d3f3d608f06**. Recursos da versão lidos antes do deploy: ambos os segredos existentes, DO/rate limit/origem/flag preservados e has_preview=false. `wrangler versions deploy b6161cb7-a16f-4f6c-978e-4d3f3d608f06@100%` na mesma config publicou a versão em08/11/2026 19:47:39UTC; deployment **8d28edc0-7c7f-4f9b-a11d-c4e4497bea8c**. Nenhum segredo gerado/rotacionado, migration ou DML remoto executado.

[Classificação para validar](https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96?secao=classificacao), protegida pelo Access. Smoke às19:48:21UTC:35assets HTTP200, X-Bdb-Source=b3908fb e hashes SHA256 correspondentes ao manifesto; foundation.html recompõe exatamente o hash do build ao retirar somente o metadado true da feature. Quatro endpoints privados401 após passar pelo Access, leitor público200/26jogos sem tieNotes/customReason. Entrada do token em memória/sem eco; política temporária e token revogados em sequência. Resultado local ignorado `.preview-artifacts/pr75-standings-smoke-result.json`.

Comparação remota com baseline: configurações/deployments de principal e UIUX iguais; bindings do preview iguais, incluindo SESSIONS3552464a1346403ab7132137b7b39e6d, rate limit751107202611 e nomes dos dois segredos; Access owner-only e sessão8h iguais, URLs alternativas desabilitadas. Zero tokens temporários restantes e GET anônimo/admin302 ao Access após revogação. Escrita autenticada remota continua pendente do responsável, em banco dev compartilhado. PR75 aberta/draft, sem merge. Commits seguintes desta entrega são documentais e não alteram a fonte publicada.
