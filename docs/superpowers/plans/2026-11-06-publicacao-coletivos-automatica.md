# Publicação com totais coletivos automáticos

> Implementação nesta conversa, na unidade codex/publicacao-coletivos-automatica, a partir de main ce882f8. Pedido direto do responsável em06/11 substitui a confirmação manual de GD introduzida pela PR64.

**Objetivo:** publicar uma súmula válida sem preencher ou confirmar faltas calculadas pelo sistema.

**Desenho:** FR/T mantêm o cálculo atual. GD da publicação normal usa as desqualificações identificadas pelo motor, sem converter B2 em pessoas inventadas; totais GD já publicados para a mesma versão documental são preservados. O painel normal mostra FR/T/GD somente para leitura. Correção administrativa de publicação congelada conserva total editável e motivo, removendo os checks redundantes; continua a validar mínimo, versões, guardas e recibo.

**Contrato:** os checks humanos nunca fizeram parte do comando enviado ao servidor. Enviar automaticamente os totais numéricos pelo contrato existente satisfaz a guarda SQL aplicada. Não é necessária migration nem alteração de API, banco remoto ou históricos. Manter rejeição de totais ausentes/inválidos, FR divergente e GD abaixo das ocorrências identificadas. Não publicar o jogo humano como teste.

**Limite dos dados:** GD automática representa pessoas desqualificadas identificadas nas ações registradas. B2 isolado não informa quantas pessoas foram desqualificadas; a correção administrativa continua disponível para complementar os totais já publicados. Não apresentar isso como detecção de ocorrências ausentes da súmula.

## Execução e prova

1. RED: teste de navegador publica zero sem inputs/checksGD; unitários validam prontidão automática com zero e contagens do motor.
2. Alterar collective-review.tsx e sheet-panel.tsx; retirar estado de confirmação humana sem mexer nas guardas de versão, edição, resultado incerto ou fonte. Ajustar inicialização do painel histórico para o contrato interno sem flags.
3. Atualizar testes antes dependentes dos checks: publicação normal automática; GD já publicada recuperada; edição/desfazer exige recarregar versão; históricos continuam editáveis com mínimo/zero/motivo/guardas/repetição.
4. Testar engine de atletas/comissão/sucessões/B2/capitão-treinador; rodar browsers de súmula completos, axe/capturas1366/1920/390, revisão das diretrizes e gate consolidado estável.
5. Atualizar ADR018, validação/checkpoint e umaPR; conferir CI do HEAD, revisão e CI integrada. Publicação de código somente no previewUIUX sob autorização vigente; preservar principal,Access,segredos e jogo aberto. Nenhuma regularização histórica adicional.
