# Refinamento público — PR #79

Pedido do responsável de 12/11/2026: refinar o perfil e componentes públicos compartilhados, cumprindo os oito itens específicos do anexo. Continuar `codex/perfil-atleta-aprovado`, HEAD inicial `a465e9c`; PR aberta com validate SUCCESS. Checkout da unidade limpo; alterações humanas no checkout principal preservadas.

## Implementação e provas

- [x] Capturar perfil nas quatro abas antes das alterações, com fixtures locais.
- [x] Compactar campeonato/categoria (ocultar Adulto), incluir FC somente no padrão, manter seleções explícitas e legenda sincronizada; remover títulos redundantes e tornar trajetória permanente.
- [x] Usar `fact.played` confirmado para listas de atuações, contadores, paginação e opções de filtros. Zero ponto continua sendo participação. Preservar os registros e validação da fonte completa. Recordes sem marca positiva recebem estado vazio na apresentação; cálculo e ordenação permanecem intactos.
- [x] Corrigir deslocamento causado por `scrollIntoView` ao alternar abas. Reservar apenas o espaço disponível da janela no desktop; conteúdo pode crescer, sem corte ou scroll interno. Mobile usa altura natural.
- [x] Reutilizar escala, legenda e tokens públicos; superfícies claras, contexto azul e divisórias discretas. Refinar busca e placares com dados públicos existentes.
- [x] Verificar casos vazios, zero/ausência, nomes longos, teclado/foco, filtros/retorno, 320/390/640/1366/1920 e zoom 200%; inspecionar capturas depois; executar testes focais e gate, atualizar a mesma PR. Resultado local final:168 PASS/8 SKIP e gate:ui PASS.
- [x] Conferir CI completa da composição de produto `4cbbe68` (run43230100404 SUCCESS) e retirar Draft pela ferramenta GitHub. Atualização posterior somente documental tem seus checks acompanhados pela mesma automação, sem merge/deploy.

Sem novas bibliotecas, alterações de API/banco/permissões da aplicação ou merge. Em12/11, o responsável autorizou publicar outro Worker para este preview, sem Cloudflare Access e preservando o Worker da PR79; somente esse destino foi publicado, conforme o relatório. A escolha de execução é local e sequencial. Evidências e limites em `docs/VALIDACAO-REFINAMENTO-PUBLICO.md`; checkpoint vigente em `docs/PROGRESSO.md`.
