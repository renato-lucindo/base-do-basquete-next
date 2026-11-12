# Refinamento público — PR #79

Pedido do responsável de 12/11/2026: refinar o perfil e componentes públicos compartilhados, cumprindo os oito itens específicos do anexo. Continuar `codex/perfil-atleta-aprovado`, HEAD inicial `a465e9c`; PR aberta com validate SUCCESS. Checkout da unidade limpo; alterações humanas no checkout principal preservadas.

## Implementação e provas

- [ ] Capturar perfil nas quatro abas antes das alterações, com fixtures locais.
- [ ] Compactar campeonato/categoria (ocultar Adulto), incluir FC somente no padrão, manter seleções explícitas e legenda sincronizada; remover títulos redundantes e tornar trajetória permanente.
- [ ] Usar `fact.played` confirmado para listas de atuações, contadores, paginação e opções de filtros. Zero ponto continua sendo participação. Preservar os registros e validação da fonte completa. Recordes sem marca positiva recebem estado vazio na apresentação; cálculo e ordenação permanecem intactos.
- [ ] Corrigir deslocamento causado por `scrollIntoView` ao alternar abas. Reservar apenas o espaço disponível da janela no desktop; conteúdo pode crescer, sem corte ou scroll interno. Mobile usa altura natural.
- [ ] Reutilizar escala, legenda e tokens públicos; superfícies claras, contexto azul e divisórias discretas. Refinar busca e placares com dados públicos existentes.
- [ ] Verificar casos vazios, zero/ausência, nomes longos, teclado/foco, filtros/retorno, 320/390/640/1366/1920 e zoom 200%; inspecionar capturas depois; executar testes focais e gate, atualizar mesma PR e conferir CI do novo SHA.

Sem novas bibliotecas, alterações de API/banco/segurança, merge ou deploy. A escolha de execução é local e sequencial. Evidências e limites em `docs/VALIDACAO-REFINAMENTO-PUBLICO.md`; checkpoint vigente em `docs/PROGRESSO.md`.
