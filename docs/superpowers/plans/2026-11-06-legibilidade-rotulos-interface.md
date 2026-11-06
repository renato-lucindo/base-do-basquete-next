# Legibilidade ampliada e padronização da interface

Pedido aprovado em06/11/2026. Uma unidade/PR da origin/main a3cd9745956a1d32709e0a4d35a9f3d0d9c3d691, branch codex/legibilidade-rotulos-interface, worktree gerenciado pelo aplicativo.

## Contrato aprovado

- Todas as telas públicas/admin: apresentação próxima ao zoom150% com navegador100%. Até639CSSpx manter tamanhos atuais;640+ampliar50%. Texto13–14px passa a19,5–21px, com dimensões relativas, reflow e zoom adicional. Preservar rolagem interna, cabeçalhos e identificação fixos.
- Na disputa, um nome publicado da inscrição, sem concatenar nome global/sigla. Fora dela, nome principal da tela. Cadastros conservam campos distintos. Aliases/históricos e nomes com barra permanecem. Nome corrente usa publicação mais recente e desempate estável antes dos recortes.
- PP%: Participação nos Pontos.5F: Exclusões por cinco faltas. Mesma definição nos controles, tooltips e legenda.
- Títulos que repetem abas ficam somente semânticos, sem altura reservada. Preservar entidades, tarefas, contexto e títulos de diálogo, com destinos de foco visíveis.
- Sem migration, escrita de dados ou mudança de formato da API. Deploy somente no previewUIUX após CI da PR e integrada; preservar principal/Access/segredos/DO.

## Execução

1. Testes de regressão RED→GREEN para escala, nomes, rótulos e cabeçalhos.
2. Escala compartilhada e dimensões relativas nas oito entradas reais; reflow de tabelas, filtros, menus e diálogos.
3. Projeção dos nomes e revisão de todos os consumidores, títulos e foco.
4. Inspeção1366/1920/390/320,zoom150/200, nomes longos, falhas/vazios, teclado e axe. Gate completo e browsers quando estável.
5. Revisão final, uma PR, CI, integração, CI integrada e previewUIUX, com capturas e checkpoint real.

Ruling: converter declarações dimensionais px→rem, preservando bordas de1px e breakpoints; ampliar via fonte raiz, sem alterar zoom do navegador nem usar transform. Reutilizar node_modules por junction da unidade anterior concluída: lockfile idêntico. Testes antigos com medidas compactas serão ajustados somente quando contradisserem as medidas explicitamente aprovadas; falhas de interação exigem correção.

Provas atuais:6unitários/6browsers novos PASS na primeira composição; regressão focal de domínio160PASS/32arquivos. Regressão visual inicial66PASS/12FAIL, incluindo expectativas antigas de padding e uma falha real ao reduzir colunas, em diagnóstico. Gate/CI/revisão/deploy ainda pendentes. Logs ignorados .readability-*.log. Continuidade em docs/PROGRESSO.md.
