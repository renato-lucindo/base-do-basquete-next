# Correção das bordas da tabela de Jogadores

Plano explícito do responsável de05/11/2026, branch `codex/tabela-mobile-bordas`, base41452f9. O vídeo mostrou faixas brancas ao insistir no arraste além das bordas. O responsável confirmou que deseja preservar a rolagem interna, altura limitada e colunas fixas. PR/SHA/CI/deployment efetivos ficam no [checkpoint](../PROGRESSO.md).

## Correção e revisão

- CSS `overscroll-behavior:none` nos dois eixos, restrito ao `ScoresheetStatisticsTable` e seus dois contêineres. Não aplicado a html/body, popovers, Equipes ou outros scrollers. Preserva `touch-action:auto`, inércia, zoom e eventos passivos.
- `ScrollableTable` limita offsets usados na sincronização e nas sombras. Não copia valores negativos/acima do máximo, nem reescreve posições equivalentes até0,5CSSpx, pois Chromium pode arredondar posições fracionárias. Mantém a proteção por RAF.
- A largura interna da barra superior considera a largura útil do viewport: com scrollbar vertical, os dois controles precisam alcançar o mesmo deslocamento final. Não altera largura da tabela, altura, espaçamento, dados, API, filtros,30linhas ou paginação.
- Pedido adicional na mesma unidade: cabeçalho “Pos.” fixo verticalmente como os demais; a coluna mantém sua movimentação horizontal anterior. RED mediu468px de deslocamento vertical do cabeçalho; teste geométrico passa a cobrir a mesma posição vertical de todos os cabeçalhos nas quatro bordas.
- Revisão do autor com `ui-ux-pro-max` e `web-design-guidelines`, fonte atual consultada em05/11. Escopo, teclado/foco, gestos e ausência de bloqueadores globais revistos; sem parecer independente ou certificação WCAG.

## Provas locais

RED: dois testes falharam com CSS auto e escritas[-80,0,60,60,256]. GREEN: os mesmos dois cenários passaram após limitar valores/escritas. Ajuste do teste registra os máximos de fonte/destino separadamente; não pressupõe larguras úteis iguais.

Regressão Chromium: **56PASS**, sem skips, nos arquivos de bordas/refinamento/toque/Jogadores/retorno/Equipes. Cobre320/390px,1366/1920px, nomes longos, fonte200%, reflow, teclado/foco/axe, última página incompleta, filtros, colunas e retorno do perfil com duas rolagens. Log local `.preview-artifacts/mobile-boundaries-chromium-stable.log`.

Gestos Chromium: `Input.synthesizeScrollGesture` com fonte touch, arrastes diagonais prolongados nas quatro bordas; offsets permanecem nos limites. Vídeos finais em `.preview-artifacts/final-touch-results/player-statistics-touch-*/video.webm`; capturas no artefato `player-scroll-boundaries` da CI. São gestos em navegador automatizado, **não confirmação física em iPhone/Android**. Capturas estáticas isoladas não comprovam supressão do efeito elástico nativo.

WebKit Windows27.2:3cenários de rolagem nativa por wheel, alinhamento e sincronização passaram. A instalação retorna `CSS.supports('overscroll-behavior','none') === false`; mouse.wheel também não é oferecido no contexto mobile WebKit. Por isso, CI tem job focal **webkit-boundaries em macOS**: duas verificações de CSS/sincronização desktop/mobile e três de rolagem/alinhamento desktop em larguras mobile, sem desativar testes ou simular suporte da plataforma. Resultado real dessa CI deve ser conferido antes do merge.

Falhas exploratórias preservadas nos logs locais: acesso direto a longhands CSS indefinidos no WebKit Windows, casos de wheel não suportados nesse contexto e uma execução paralela inicial que compartilhou test-results/servidores. Corrigida a separação de artefatos e mantidos servidores próprios durante a rodada final. Nenhum timeout aumentado ou skip introduzido.

## Entrega

Gate local exit0:704unitários/146arquivos, transporte11, banco isolado13, Worker/HTTP30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos PASS. Log `.preview-artifacts/mobile-boundaries-gate-final.log`. O pedido adicional de Pos. entrou durante o gate; após o CSS final, formato/tipos foram reconferidos,6browsers Chromium e3WebKit de alinhamento passaram, além de2gestos touch com vídeo atualizado. CI da PR e do SHA integrado ainda deve ser conferida no código final antes de integrar/publicar. Publicar somente no Worker independente **base-do-basquete-next-uiux** após essas verificações, com build fresco do SHA integrado. Preservar domínio principal, Access, sessões, segredos e backend. Nenhuma migration, DML ou publicação de dados. No celular real, conferir os mesmos gestos do vídeo no preview atualizado; registrar essa confirmação separadamente quando disponível.

Capturas finais com fixtures: [320px](evidencias/bordas-mobile/bordas-320.png) e [390px](evidencias/bordas-mobile/bordas-390.png). Mostram alinhamento, não substituem evidência dinâmica.
