# FR, T e GD completas em Equipes — plano aprovado

Pedido de implementação em05/11/2026, após planejamento nesta conversa. Uma unidade/PR, base mainfb3f26b, branch codex/equipes-fr-t-gd. Substitui a regra anterior de FR coletiva conferida manualmente.

- Súmula:FR é FC adversária da mesma partida, pela definição vigente da coluna FC. T automática cobre atletas/comissão/sucessões e exclui B2. Boxscore conserva sua FR; métricas individuais não mudam.
- GD é sugerida pelo motor, mas o responsável confirma/completa por equipe, inclusive zero. Novas publicações exigem GD dos dois lados; rascunhos e históricos incompletos continuam legíveis.
- FR/T somente leitura na confirmação. Recuperar GD publicada da mesma versão; invalidar confirmação ao alterar documento/total, guardar comando durante resposta incerta e exigir recarga em conflito.
- Compatibilidade de entrada:FR antiga aceita null ou valor calculado; divergência é rejeitada. Mesmo formato público, sem novos campos de proveniência privada.
- Migration própria, sem editar aplicadas, para cálculo/guarda de publicação e RPC de correção restrita aos totais publicados.
- POST autenticado /api/games/:id/publication/team-statistics recebe requestId/gameId/basePublicationVersion/disqualifications{home,away}/reason. Recalcula FR/T no servidor, valida GD, cria versão/recibo e atualiza as projeções existentes atomicamente. Não salva súmula atual nem altera jogadores,placar,eventos ou documentos anteriores.
- Preparar quadro dos25jogos/50lados com FR/T/mínimoGD e GD a confirmar. Um documento atual diverge da publicação:jogo15,versão pública3,súmula publicada7/atual8. Corrigir somente o documento congelado da versão publicada.
- Aplicação da migration e republicações exigem autorização específica sobre SQL/quadro concretos. Não inferir aprovação de GD sugerida; autorizar código não confirma os50totais.

Validação:TypeScript/SQL equivalentes; FR cruzada/zero/múltiplos adversários/modos/fases/mistos; T/C/B/sucessões/B2; GDmínima/zero/deduplicação; escritor bloqueado; autorização/origem/tamanho/recibo/conflitos; correção preserva fonte atual divergente; formulário/foco/axe/1366/1920/390 e confirmação de zero. Gate completo e CI PR/integrado; sem aumentar limites,retries ou skips. Depois da regularização autorizada, cobertura50/50 e agregados das duas disputas. Deploy apenas UIUX, preservando principal/Access/segredos.
