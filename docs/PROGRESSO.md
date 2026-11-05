# Progresso atual

Unidade ativa: **tabela de Jogadores compacta e centralizada no desktop de súmula**, plano aprovado em05/11/2026. Branch **codex/jogadores-desktop-centro**, base origin/main85ae37e521367150c498989d8ccdfe5019eb2c30; recuperar HEAD por Git. Nenhuma PR aberta na consulta inicial. Gate local final PASS; abrir uma PR pronta para revisão desta unidade, mantendo o mesmo HEAD até resultado real da CI. PR58 concluída/integrada e CI HEAD/main SUCCESS; [encerramento anterior](../historico/progresso/2026-11-05-pr58-integrada.md).

## Implementação e validação

Aplicação somente a hasBoxscore estritamente false acima1050px: controles/tabela/paginação/legenda centralizados e com largura pelo conteúdo. CSS intrínseco, sem JS novo, API, cálculos ou banco. Mobile, boxscore e filtros principais preservados. [Relatório e limites](design/VALIDACAO-DESKTOP-SUMULA.md). RED368px de sobra interna → GREEN geométrico1366/1920. Chromium62PASS sem skips; rodada de retornos/Equipes26PASS e4asserções antigas de sobra corrigidas, depois4PASS. CSS final:5Chromium+5WebKit PASS. Gate final exit0:704unitários/146arquivos, transporte11,banco13,WorkerHTTP30,PDF1,lint/formato/tipos/build/fronteira/segredos PASS. Logs .preview-artifacts/desktop-center-gate-final.log e desktop-center-*.log. CI WebKit macOS inclui testes novos. Não repetir suítes de artefatos idênticos por documentação.

## Serviços e sequência autorizada

Preview independente ainda deployment6b929376-9a49-4d12-af6b-7ad8118d6eae/versãoa15ebe3b-e20f-4a79-8f46-8e305f78d2c7/fonte85ae37e. Somente atualizar esse Worker após PR e CI integrada aprovadas, usando build fresco limpo e config ignorada .preview-artifacts/uiux-preview/wrangler.json. Conta16b4a5e0a99a031d28051ebadb4811cc, namespace2ac0ffe60c2d490cb7f457c444f24859/segredos/bindings existentes preservar. Nunca chamar uploader canônico. Principal base-do-basquete-next-preview/basedobasquete.com.br permanece deployment00dffb6b-1d5c-4433-9214-768013ed6277/versão139410ce-a8d6-4710-9b94-e1b1222cd3dc; sem mudanças de Access/DB/Auth/dados/segredos.

Depois de FINALIZAR centralização e publicar preview: responsável autorizou ajustar tooltip/legenda de PP% para **Participação nos Pontos**, e5F para **Exclusões por cinco faltas**. Não antecipar a etapa nem ampliar para outras métricas. Equipes somente planejada, sem implementação/republicação13jogos autorizada.

## Continuidade

Automação retomar-piloto-uiux-pr-51 estava PAUSADA após58; reativar a mesma quando houver espera de CI/cota desta unidade, com checkpoint suficiente para continuar também o ajuste textual já autorizado depois. Gatilho15%restante5h/reset observado+2min, sem créditos/reset manual. Última cota31%restante5h/26%semanal, reset1793907030; medir antes do gate. Preservar checkout humano sync/trabalho-casa/CONTRIBUTING modificado/skills pessoais, demais worktrees/previews4189/5177/5180. Servidores task-owned5173/5174 em execução; outputs de testes separados. Checkpoint/histórico pós58 reconciliados nesta unidade, sem descartar alterações humanas.
