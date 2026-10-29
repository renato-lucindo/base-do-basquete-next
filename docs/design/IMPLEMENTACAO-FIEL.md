# Correção de fidelidade dos protótipos — PR #46

Pedido vigente: usar os mesmos componentes, estilos e comportamento dos ZIPs aprovados, adaptados às rotas e projeções públicas reais. As 41 fontes dos protótipos versionadas foram comparadas byte a byte com paginas-publicas-aprovadas.zip, sem divergências. O ZIP r6 é a origem dos componentes de estatísticas; a revisão compacta do pacote aprovado é a referência de apresentação.

- [x] Reutilizar TeamFilter, ColumnPicker, TooltipProvider, ScrollableTable e ResourceState, adaptar a tabela para StatisticsPage sem recalcular médias ou ranking no cliente.
- [x] Preservar layout, tipografia, cabeçalho, filtros, tabela e legenda; colocar opções adicionais do site após a consulta principal.
- [x] Traduzir a estrutura da súmula aprovada para React com seus estilos, elencos, totais de LL, comissão e diálogo; indicar lacunas reais de eventos/períodos sem dados fictícios no produto.
- [x] Comparar estilos/medidas com os HTMLs aprovados, validar teclado/toque, estados e contratos em 1440×900/390×844 e 320px/200%; verificar gate local. O check `validate` do SHA final é registrado na PR #46.
- [x] Atualizar checkpoint e a mesma PR #46, mantida aberta para revisão humana. Preview local isolado com fixtures; sem merge, deploy ou banco.

Arquivos: src/public-ui (estrutura compartilhada), src/statistics/reference (componentes aprovados), src/statistics/public-page.tsx e estilos, src/publication/public-page.tsx e estilos, tests/public-prototype-fidelity.spec.ts e testes afetados.

## Origem e adaptações para o produto

TeamFilter, ColumnPicker, TooltipProvider, ScrollableTable e ResourceState vêm das fontes React aprovadas, com atribuição no início de cada arquivo em src/statistics/reference. A tabela conserva a estrutura do ScoresheetStatisticsTable e recebe valores, cobertura, posições e líderes já calculados pelo contrato público. Não reimplementa o ranking no navegador. O CSS aprovado foi isolado por apresentação; medidas de fonte equivalentes em rem permitem ampliação de texto sem alterar o aspecto padrão. Os protótipos originais permanecem inalterados.

O cabeçalho compartilhado, o breadcrumb e os links usam a navegação efetiva. O acesso às estatísticas dentro do campeonato abre a apresentação aprovada; o modo simples legado continua disponível em links explícitos. Os recursos adicionais (fase, por 30 minutos, filtros numéricos, comparação e compartilhamento) ficam após a tabela/legenda. A comparação é ativada explicitamente, sem checkboxes extras na identificação padrão.

Busca usa a consulta real com debounce, sem perder foco. As opções de colunas e equipes preservam teclado, Escape e retorno de foco; colunas manuais persistem na sessão e as colunas padrão respondem à largura até a primeira escolha. Ajustes de foco resolvem a ação Todas/Nenhuma que se torna desabilitada após o resultado; tooltip de teclado permanece disponível durante o deslocamento automático da tabela.

A súmula usa o mesmo arranjo e CSS do HTML aprovado, incluindo colunas fixas, totais de LL, capitão sem balão, comissão técnica e diálogo nativo. O componente também mantém seu estilo quando aberto no histórico administrativo. Recortes individuais por período aparecem indisponíveis, porque não existem na projeção; eventos/horários/LL de penalidades não são inventados. Ausência, zero e não participação seguem o contrato público. As capturas com Pinheiros e Paulistano usam somente fixtures locais adaptadas do protótipo, não publicações humanas.

## Capturas da implementação

- [Súmula desktop](evidencias/implementacao-resultado-desktop.png) e [mobile](evidencias/implementacao-resultado-mobile.png).
- [Estatísticas desktop](evidencias/implementacao-estatisticas-desktop.png) e [mobile](evidencias/implementacao-estatisticas-mobile.png).

Medições focais nas rotas reais com nomes longos: primeira linha da súmula em 339px/364px (desktop/mobile); estatísticas em 242,5px/394px, com 17/10 linhas completas na primeira tela. Comparação de fontes, cores e largura com os HTMLs aprovados, 1440×900 e 390×844, passou. Também passaram as interações, axe e ampliação de texto em 320px/200% na bateria focal (59 PASS/7 SKIP); o gate isolado também passou (591 Vitest/121 arquivos, 6 transportes, 13 PostgreSQL, builds, 25 testes Worker, quatro PDFs e scanner de segredos). A execução completa Playwright local terminou com 465 PASS/105 SKIP e dois testes que ainda procuravam a mensagem antiga de ausência por quarto; os seletores foram atualizados e todos os oito testes dessa rota passaram na repetição focal. Os outros 465 resultados são reutilizáveis porque não houve mudança de comportamento após essa bateria. A CI do SHA da PR executa novamente a composição completa; seu resultado real fica no check validate e na descrição da PR.
