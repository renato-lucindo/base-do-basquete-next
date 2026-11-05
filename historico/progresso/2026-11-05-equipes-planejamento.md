# Equipes — planejamento de05/11/2026, sem implementação

Responsável pediu planejar Equipes enquanto PR57 era validada. Respostas confirmadas: abertura em **Por jogo**, PTSdesc; manter regra coletiva (contagens, inclusivePTS, divididas porJ; J permanece e LL% ponderado); **preparar revisão dos13jogos** históricos, com republicação em etapa explícita. Plano final proposto na conversa, sem pedido posterior para implementar Equipes até este registro.

Interface proposta: títuloEquipes; somente nome público da inscrição; busca sem caixa/acentos e checkboxesTodas/Nenhuma porregistrationId; modo e escopo segmentados; remover textos/painéis técnicos. Súmula:13colunas fixas Pos/Equipe/J/PTS/2P/3P/FC/FR/LLT/LLC/LL%/T/U/GD, sem Dados/Mais opções/Colunas nem paginação visível, legenda simples, lista completa pelo opt-inpageSize=all preservando clientes20. Boxscore conserva controles pertinentes. Filtros/rolagem/retorno preservados; perfil fora da reforma visual. Nova unidade somente após57concluída, sem empilhar PRs.

Diagnóstico somente leitura via MCP no desenvolvimento nizmasjddyrhmevvfviz, link6adaa8aab5688191b1e7ae1cddc55a82: disputa b5433b13-a8f9-4baa-b4d9-08066ebf3e96 tem13jogos e6inscrições; todas as26ocasiões carecem de facts.teams[side].teamStatistics. Migration20261103174254_sheet_team_statistics aplicada. Documentos congelados privados das13versões publicadas têm events/staff/participants. Não lemos rascunhos para substituir publicação; nenhum DML/DDL/republicação.

Regras vigentes ADR018: T de ocorrências T/C/B técnicas de atletas/comissão/banco incluindo sucessões, B2 não é nova técnica; FR total coletivo conferido, sem inferir FCadversária; GD total completo conferido, sem somar de novo atletas/staff nem duplicar capitão-treinador, maior/igual ao mínimo identificado. T pode ser reconstituída das fontes congeladas; FR/GD exigem conferência. Preparar quadro porjogo/lado com T/mínimoGD e pendências, sem inventar0 e sem publicar automaticamente. Campos sem cobertura seguem— até revisão/republicação autorizada.

Não inferir autorização de implementar/publicar este plano a partir da mensagem seguinte 'CI foi concluido', que retomou57.
