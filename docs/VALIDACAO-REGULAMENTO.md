# Regulamento e classificação — evidências

## R1 — núcleo puro de pontos corridos

Branch codex/regulamento-classificacao sobre820eb96/G4. Código próprio conforme ZIP e decisão012; sem motor competitivo pronto nos módulos. Pontuação inteira obrigatória, catálogo fechado de critérios ordenados, mini-classificação dos empatados remanescentes, trilha de aplicação e linhagem por jogo/versão/origem oficial dos pontos. Não interpreta fórmulas nem escolhe classificado por nome/ID. Classificação sempre provisória; grupos sem partidas não recebem posição.

10 testes focais PASS: duas inscrições da mesma equipe, pontuação configurada, ordem dos critérios, empate triplo, subgrupo restante após critério anterior, empate não resolvido, fase vazia, grupo ainda sem inscrições/com uma inscrição, valores negativos explícitos, validação de esquema/contexto/duplicatas/versões e projeçãoPDF com pontos oficiais99 versus avançados98. Inicialmente módulo ausente; caso de grupo parcialmente configurado reproduziu limite indevido mínimo2 e passou após permitir fase vazia sem fabricar qualificado. Fonte/draft contaminado recusados. IdentidadesUUID normalizadas, sem usar nome para equivalência.

Gate consolidado local **PASS200unitários/48arquivos,5transportes,13cenáriosPG,13workerd e1prova4PDFs**, tipos/lint/format/builds/fronteira/segredos. Log ignorado .preview-artifacts/r1-standings-gate.log SHA256f866ca25345504026cf895b6fe7f425fc8fdd23a336052748711bb585861e9f9. README atualizado documentalmente depois, formatação focal aprovada. Não houve API/DDL/UI/deploy novo nesta unidade.

Comparação de artefatos: todos os7arquivos clientes idênticos ao manifesto do preview0166b14; WorkerJS continuaSHA2560ff2e4a93d679b1b88267626ad1562a87525043e3832f1b5a19c5c2f1ca2000e. Evidências G4/158browsersCI e smokes permanecem válidas para esses artefatos imutáveis. Não repetir browsers/smokes remotos por essa biblioteca ainda não conectada à aplicação.

Medição sintética local do cálculo,100inscrições/1000fatos publicados,5aquecimentos/20amostras: Nodev24.18.0 Windowsx64, p50=4,948ms,p95=9,366ms,máximo9,904ms, meta declarada250ms. Artefato ignorado .preview-artifacts/standings-benchmark.json SHA25668960e5073ebf94b90ed5143a3300629c13533ab6e85dda3041b2a90c5977f17. Mede validação/cálculo puro com fixtures; não mede banco, rede, Worker/DO real, concorrência ou carga de produção e não certifica escala.

R2/R3/R4 pendentes: organização/fases/séries/ocorrências, persistência e impacto autoritativo, API/UI, transferências/retornos/premiações, CI/preview e avaliação. Etapa5 incompleta. A avaliação humana/pilotoStorageHTTP real da etapa4 continua pendente; preview protegido segue0166b14. Nenhuma revisão independente, corridaPG multi-conexão ou auditoriaWCAG completa comprovada.

## R2a — resolução pura de séries

Confronto com duas inscrições, slots explícitos e jogos publicados: partidaúnica, ida-volta e melhor3/5/7. Identidades A/B do confronto independem do mando de cada partida; placares são reorientados por ID. Melhor-de-N conta vitórias e recusa partida adicional após decisão. Ida-volta soma os dois placares oficiais; empate agregado mantém pendência de decisão, sem gol/cesta fora ou jogo extra presumidos. Slot anterior sem resultado impede conclusão automática; zero partidas não fabrica placar0–0. Esta unidade não define campeão, não processa W.O. como partida jogada e não reescreve fontes.

8casos novos e18focais da composição PASS: todos os formatos, mando alternado/ordem de entrada, liderança incompleta/gap de slot, agregado empatado, jogo extra, duplicatas/contexto/ocorrência indevida e entrada imutável/linhagem. Gate local **PASS208unit/49arquivos,5transportes,13PG,13workerd,prova4PDFs** e demais checks. Log .preview-artifacts/r2-series-gate.log SHA256002a27bb3a8d7699212919e3b71259b00be4ae38ef130f53420835df97d2d0df. Nenhum API/DDL/UI/deploy novo. R2 (fases/grupos/atribuições/ocorrências) continua parcial.

CI R1 **40105853327/job120907267019 SUCCESS** em30ce516; não atribuir essa CI aos arquivosR2a posteriores. Nova CI do materialR2 será conferida antes de integração. Preview G4 e evidências de seus artefatos permanecem imutáveis.

## R2b — atribuições explícitas de grupos (núcleo)

Fase identificada porUUID e disputa, grupos/inscrições/partidas atribuídos explicitamente. Aplica as regras da fase e o cálculo de pontos corridos a cada grupo; jogo direto não atribuído não entra por nome/data/adversários. Não repete inscrição em grupos da mesma fase nem partida/versão. Resultado publicado ausente fica em unpublishedGameIds e não vira0–0; existência/parentesco da agenda serão revalidados por FK/escritor real na etapaR3. Não calcula cruzamentos nem classificado automaticamente.

5casos novos e23focais da composição R1/R2a/R2b PASS: isolamento porgrupo/ordemdeterminística, jogo direto nãoatribuído, resultado pendente, partida com adversário fora dogrupo, duplicatas/crossdisputa e fórmula indevida. Typecheck/lint/formato focais PASS. Gate208 anterior cobre R1/R2a e arquivos inalterados; **não é gate consolidado do R2b posterior**. Consolidar com a composição de cruzamentos quando estável. Sem API/DDL/UI/deploy nesta unidade, sem dados/serviços humanos alterados.

CI R2a reconciliada: **40106722533/job120909830223 SUCCESS** em eecae52506d9b4e655e986f676a358796ee4f032,208unit/49arquivos e158browsersLinux conferidos. O R2b a6c385f posterior permanece com23focais/types/lint/format; não atribuir gate/CI anterior aos arquivos novos. Cota85%usados5h ao checkpoint24/10 12:32UTC-03; próximoR2c descrito no plano/PROGRESSO, sem novo gate até retomar composição estável.

## R2c — prévia de cruzamentos e impacto

10casos novos,33focais da composição R1/R2a/R2b/R2c PASS, tipos/lint/formato PASS. RED inicial módulo ausente. Empate1–2 bloqueia ambas posições, grupo com publicação pendente ou sem jogos não avança, referências/ciclos/contextos/versões/atribuições inválidos são recusados. Grupo→semifinais→final/perdedores resolve sem depender da ordem do catálogo; série incompleta/com lacuna/empate não fornece classificado. Mesmo inscrito nos dois lados vira conflito. Correção de classificado preserva fatos/adversários publicados e bloqueia dependentes. Linhagem e versão do regulamento acompanham a prévia, sem autoridade de confirmação nem gravações em serviço.

Gate local executado:223unit/51arquivos,5transportes,13PG,builds/types/lint/format PASS; workerd12/13 comECONNRESET no teste de rejeição de PDF grande. **A primeira execução não é PASS integral.** Log .preview-artifacts/r2-crossings-gate.log SHA256bd01b5b55e31f43834aec87d3749f6b79331880c4bf6abad7553dd472df77a08. O cenário passou isolado e em13/13, mas instrumentação/reprodução10vezes encontrou4falhas exatamente na rejeição antecipada deContent-Length10485761. Log .preview-artifacts/r2-upload-repeat-diagnostic.log SHA2564654b97662ee6f633b96fc9b2cf2ea6d0a4ef81d21884e05ee4aad575e94cfe8. Hipótese de contornar porgetWorker().fetch refutada:10/10falharam, sem incorporar esse contorno.

Comportamento compatível com [workerd#7634](https://github.com/cloudflare/workerd/issues/7634): resposta antes de consumir corpo atravessando servicebinding pode perder-se por resetTCP. Produção conserva rejeição antecipada e limite10MiB, sem drenar upload indevido. Testes passam a separar header excessivo sem ler/cancelar corpo (unitário) e envio real semContent-Length excedendo10MiB dentro da operação autorizada(workerd), mantendo status413 e ausência de Storage/extração. Não adicionamos retry,skip nem aceitação de erro no teste.10/10focais streamingPASS, log .preview-artifacts/r2-upload-stream-diagnostic.log SHA25681bcdb371d291f043a577771be289205975b1757f7c46d1c2de81ee5768286ff; grupo final13/13PASS, upload4unitáriosPASS. Isso não certifica rejeiçãoHTTP real na borda pública para todo cliente, nem piloto de Storage autenticado.

Prova4PDFs workerd rodada após interrupção do gate PASS (.preview-artifacts/r2-crossings-pdf-runtime.log SHA256c3f9f220f971a6a580dfb45416556d795a0ba0a199022a9088e33ecc48a86283), fronteira/segredos PASS. Não repetimos trechos já válidos do gate; CI consolidada será conferida sobre commit material. Produção/7assets/Worker continuam sem mudanças, sem deploy novo e sem repetir smokes/browser do previewG4.

CI consolidada **40123498354/job120959898862 SUCCESS** sobre **b7adaac128c791f79325489e9fa0c4d8f7139082**; inclui R2b/R2c e o teste de limite por fronteira corrigido. Não atribuir essa CI ao R2d posterior.

Logs CI conferidos:224unit/51arquivos,5transportes,13PG,13workerd,prova4PDFs e158browsersLinux PASS. WorkerJS aindaSHA0ff2e4a93d679b1b88267626ad1562a87525043e3832f1b5a19c5c2f1ca2000e; preview não alterado.

## R2d — ocorrências e desistências (prévia pura)

11novos/44focais composição R1/R2a/b/c/d PASS, tipos/lint/formato PASS. RED inicial módulo ausente. Regras WO explícitas/pontos e penalidade/score opcional orientado, decisão administrativa award ou exclude, adiamento/interrupção pendentes e cancelamento distinto de0–0. Versões de agenda/publicação, vencedores/contextos/repetições/motivo/contratos fechados guardados. Duas políticas de desistência preservam fontes; resultados prévios são IDs explícitos, futuros não viramWO, resultado publicado fora da relação revisada exige conferência. Duas desistências em ordem invertida produzem o mesmo efeito. Entrada/publicação permanecem intactas e nenhum fato individual é produzido.

R2d ainda não alimenta classificação/séries; próximoR2e no plano2026-10-24-ocorrencias.md. Evidência focal não é gate/CI consolidado desse novo módulo. Sem API/UI/DDL/deploy e sem encerramento da etapa5.

## R2e1 — classificação e séries por efeitos

11novos/55focais de composição atéR2e1 PASS, tipos/lint/formato PASS. Contrato OutcomeGame valida contexto/fato ou award separados. Classificação distingue playedGames/awardedGames/scoreGamesCovered, aplica pontuação/vitórias administrativas e não cria placar quando ausente; pontos/saldo ficamnull quando cobertura incompleta. Critério que requer placar desconhecido bloqueia aquele empate sem pular para critério seguinte. Confronto direto recalcula o subgrupo com os efeitos explícitos.

Série partidaúnica/melhor3/5/7 usa vencedores administrativos sem tratá-los como jogos com estatística individual. Ida-volta exige ambos placares competitivos ou decisão revista: score ausente mantém score_or_decision, sem soma falsa0. Mando, slots/lacunas, jogo após decisão e linhagem publicação/ocorrência guardados. R2e2composição com grupos/cruzamentos ainda em implementação, sem gate/CI novo desta subunidade. CI224/51 e158browsers do b7adaac não é evidência dos novos arquivos.

## R2e2 — composição de grupos, séries e ocorrências

8novos/63focais do módulo PASS, tipos/lint/formato PASS. RED inicial módulo ausente e RED adicional de avanço indevido quando dois awards sugeriam vencedor mas havia resultado publicado fora da relação de desistência revisada. Guardaunresolved_results agora bloqueia essa série e seus dependentes; não elimina silenciosamente o resultado conflitante.

Composição cobre grupo→semifinais normal/WO→final, WO no grupo com placarnull, adiamento/interrupção/cancelamento, desistência em ambas políticas, mudança de classificado incompatível com jogo existente, ida-volta sem cobertura de placar e IDs/contextos/slots/ciclos. Extração do grafo compartilhado mantém os10casos R2c anteriores. Fontes/versões/origens preservadas, entrada imutável; nenhuma agenda/adversário/fato público reescrito. Gate/CI da composição estável ainda a executar/conferir; sem API/DDL/UI/deploy novo.

Gate R2d/e executado: lint/format/types PASS, unitários253/254 com timeout5s no provider que extraiPDF real na fixture,54/55arquivosPASS. **Essa primeira execução não é PASS integral.** Log .preview-artifacts/r2-occurrences-gate.log SHA256bd56435137b6f525324400c3b249013ac321d5c1947c05495e3be15ef844c873. Provider isolado7/7 em865ms;55workers iniciados no conjunto/12CPUs disponíveis. Hipótese de contenção na inicialização CPU/WASM levou a testar somente o limite de paralelismo:4workers →254/254/55arquivosPASS em16,58s. Log .preview-artifacts/r2-occurrences-unit-bounded.log SHA25619c54e58a8b4a1c3d2d56618e9538abd166b8877af6ed67619b3c56cd4ca203d. Config agora limita4workers, sem aumentar timeout/skip/retry de cenário.

Fechamento em etapas reutiliza unitários/focais válidos: tipos/lint/formato focais após a configuraçãoPASS;5transportes,13PG,ambosbuilds,13workerd,prova4PDFs,fronteira/segredosPASS na sequência restante(exit0). Não repetimos de novo254unitários nem marcamos o primeiro gate integralPASS. NovaCI consolidada verificará o commit material. Todos7assets iguais ao manifesto0166b14 eWorkerJS0ff2e4a93d679b1b88267626ad1562a87525043e3832f1b5a19c5c2f1ca2000e: semsmoke/browser/deploy novo para artefatos inalterados. Aviso já conhecido de importdinâmico staff sem chunk separado permanece sem mudança de artefato.
