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
