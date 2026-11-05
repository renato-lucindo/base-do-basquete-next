# Progresso atual

Unidade ativa: **bordas da tabela mobile de Jogadores**, plano explícito do responsável de05/11/2026. Branch **codex/tabela-mobile-bordas**, base/HEAD anterior ao checkpoint **41452f9a2e450df97e51aa272c5f5187c4c24162**, criada diretamente de origin/main após consulta de PRs abertas vazia. Uma unidade/PR por vez. Nenhuma PR desta unidade criada ainda.

## Estado e próximo passo

Investigação concluída com vídeo do responsável e DOM do preview: `.statistics-table-wrap` e `.scrollable-table-top` usam overscroll auto nos dois eixos. A sincronização copia scrollLeft bruto, inclusive valores elásticos negativos/acima do máximo e escritas repetidas. O responsável esclareceu: **manter a rolagem atual/altura limitada/sticky; corrigir somente o deslocamento elástico nas quatro bordas**, sem redesenhar a tabela.

Dois testes novos em `tests/player-statistics-refinement.spec.ts` executados RED,2falhas esperadas, sem alteração de produto. Log local `.preview-artifacts/mobile-boundaries-red.log`: CSS espera none mas recebe auto; sincronização escreve[-80,0,60,60,256] em vez de apenas valores válidos e alterados. Teste simula offsets WebKit sobre getter do DOM e observa escritas reais do sincronizador.

**Próxima ação:** implementar CSS restrito ao atributo `data-source-component="ScoresheetStatisticsTable"` para `overscroll-behavior:none` nos dois contêineres; em `src/statistics/reference/scrollable-table.tsx`, limitar leitura/sombras/escritas a0..máximo de cada contêiner, sem escrever se valor já correto, preservando eventos passivos/RAF. Atenção antes do GREEN: fonte e destino podem ter máximos diferentes devido à barra vertical (no RED fonte176px; destino pode ser159px); ajustar o teste para registrar o máximo do destino e exigir a menor posição válida para ambos, não presumir máximos iguais. Ampliar reversão das barras e posições intermediárias. Não bloquear touchmove global, não remover inércia/zoom nem alterar rolagem fora da tabela.

Depois: GREEN focal, gestos nas quatro bordas/diagonal/arraste prolongado,320/390px/zoom/teclado/foco/axe, última página/nomes longos/colunas/retorno do perfil; Chromium e WebKit. Distinguir emulação de validação física em celular: não afirmar confirmação nativa do vídeo por captura estática. Regressão desktop/consumidor Equipes compartilhado sem redesign. Gate consolidado quando estável, uma PR, CI no merge, pacote fresco e deploy **somente** no Worker independente autorizado. Revisão ui-ux-pro-max e web-design-guidelines vigente.

## Serviço preservado

PR57 concluída, CI da PR42029539741 e merge42033583222 SUCCESS no41452f9. Preview [base-do-basquete-next-uiux](https://base-do-basquete-next-uiux.renato-lucindo-jr.workers.dev) ainda deployment **d6218ce9-6c00-41dc-9954-e3934908b1cd**, versão **7fd61d4e-400f-4e45-a86f-16d291c29dc3**, fonte41452f9. Nenhum novo deploy nesta unidade. Conta16b4a5e0a99a031d28051ebadb4811cc, config local ignorada `.preview-artifacts/uiux-preview/wrangler.json`, origem própria, namespace2ac0ffe60c2d490cb7f457c444f24859 e segredos existentes preservar. NUNCA chamar uploader canônico. Principal permanece deployment00dffb6b-1d5c-4433-9214-768013ed6277/versão139410ce-a8d6-4710-9b94-e1b1222cd3dc; não modificar domínio principal/Access/banco/Auth/dados.

## Continuidade

[Encerramento detalhado57](../historico/progresso/2026-11-05-jogadores-preview-encerrado.md), [integração57](../historico/progresso/2026-11-05-pr57-integrada.md) e [Equipes somente planejada](../historico/progresso/2026-11-05-equipes-planejamento.md) preservados. Não implementar Equipes nem republicar13jogos por inferência. Migrations já aplicadas não reaplicar. Checkout humano sync/trabalho-casa/CONTRIBUTING modificado/skills pessoais, demais worktrees e previews4189/5177/5180 preservados.

Pausa por **15% restante5h /57% semanal** medidos realmente em05/11 14:25:16UTC. Reset observado1793897436; retomar pela mesma automação retomar-piloto-uiux-pr-51 em **05/11 17:32:36UTC /14:32:36America/Sao_Paulo** (reset+2min). Confirmar agendamento oficial; sem créditos/reset manual. Recuperar HEAD pelo Git, não presumir SHA do WIP documental. Autorização de implementar/integrar/publicar apenas no preview já concedida pelo plano; não pedir novamente.
