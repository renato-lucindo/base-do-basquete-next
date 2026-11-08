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
- WebKit focal:10cenários desktop/mobile PASS, configuração local ignorada reaproveitando os mesmos testes. Gate seguinte encontrou5suites sem testes por ENOENT em arquivos do cache SSR temporário;27testes dessas5suites passaram no rerun focal, sem código alterado. Gate com TEMP/TMP próprios e regressão Chromium completa: em execução no checkpoint inicial desta evidência. Substituir por resultados reais antes de declarar PASS. Logs ignorados: `.preview-artifacts/bracket-gate-final.log`, `bracket-browsers.log`, `bracket-webkit.log`.

Os cenários de quartas usam fixtures locais, sem seed, Auth/admin, DML remoto ou publicação de dados fictícios no banco compartilhado. Contratos públicos/Worker/banco/migrations inalterados. Não inferir cobertura de escrita autenticada remota dessas provas.

## CI e preview

Enviar na mesma PR75 após validação local; conferir o HEAD/run real. Ao aguardar CI, atualizar a automação existente, sem duplicata. O release autorizado continua restrito a `base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev`, com novos builds/pacote do SHA cujo validate passou. Preservar Access, bindings, sessões, segredos, rate limit e banco compartilhado. Sem merge/fechamento, deploy principal/UIUX, migration ou DML remoto.

Nesta redação, o serviço publicado continua sendo a fonte b3908fb, versão b6161cb7-a16f-4f6c-978e-4d3f3d608f06. Ainda não houve upload/deploy do bracket; registrar provas remotas e novo SHA/versão apenas após execução efetiva.
