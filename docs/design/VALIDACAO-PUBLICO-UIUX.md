# Validação — páginas públicas reais compactas

Unidade `codex/publico-uiux`, baseada na main9cb3660 após integrar PR51. Relatório de04/11/2026; SHA e CI definitivos em [PROGRESSO.md](../PROGRESSO.md). Implementação nas rotas reais com fixtures interceptadas no navegador; não se trata de banco publicado nem de aceite visual de produção.

## Comportamento e contratos preservados

Cabeçalho compartilhado, pesquisa global visível, navegação e tabelas compactas; agenda única em tabela por data com busca/paginação. Colunas crescem pelo conteúdo, mantendo largura excedente depois delas em1366/1920. Texto e número conservam alinhamentos distintos e14px nas células. No celular, identificação secundária agrupada mantém essenciais acessíveis; opções manuais continuam na URL/sessão.

Retiradas fontes de nomes, versões e datas técnicas de linhas públicas; cobertura/ausência e interpretação das métricas permanecem. Equipes preservam identidade por inscrição, ranking independente da classificação oficial e totais/precisão. Zero, DNP e ausência continuam distintos. A súmula conserva PublicGameView/public-view.css e suas parciais, participantes, comissão e detalhes; perfil contínuo não foi substituído pelo piloto.

Filtros de equipes existentes continuam com checkboxes, Todas/Nenhuma, composição com busca/mínimo de jogos e estado vazio real. Retorno de perfil/equipe preserva filtros, painéis, posição da página e rolagem interna. A faixa da barra horizontal reserva espaço durante a medição para evitar salto de12px.

## Verificações

- TypeScript/eslint focais PASS.
- Browsers públicos:157 PASS e7 skips mobile já existentes em statistics-simple;12 arquivos,164 cenários desktop/mobile. Conferência final adicional dos alinhamentos:4 PASS. Gate consolidado em execução.
- Casos novos: header de outra rota, tabelas1366/1920,25 jogos paginados com ausências, filtro vazio/recarregar e retorno exato das duas rolagens. Fixtures não atribuem atuação por mera associação à equipe.
- Casos existentes reutilizados/executados para contratos, seleção vazia, ordenação, foco/teclado, dados incompatíveis, fonte insuficiente e links de volta. Reflow320,390, ampliação de texto200%/zoom e axe contemplados nos browsers públicos.

## Revisão de design

Aplicadas ui-ux-pro-max (consulta local de tabelas/responsividade) e web-design-guidelines com fonte atualizada em04/11: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Referências orientam interação; tema e decisões locais prevalecem.

Achados corrigidos: largura mínima global/colunas distribuídas em statistics/reference.css e team-statistics/public-tables.tsx; alinhamento do nome da equipe; informação técnica nas linhas; densidade mobile sem reduzir fonte; retorno deslocado pela medição da barra. Revisão do próprio autor, sem parecer independente. Testes axe não comprovam conformidade integral WCAG nem aceite humano.

## Limites e próxima unidade

Nenhuma alteração de API, banco, DDL, deploy ou publicação de dados. O formulário global mantém a API anterior nesta unidade; a etapa seguinte implementa autocomplete e busca normalizada no servidor sobre toda a base pública antes de limitar/paginar. Não afirmar que o catálogo cliente cobre toda a base. Limites de desempenho/carregamento da carreira da PR51 continuam documentados. Administração ainda será tratada em unidade própria após a busca.

## Capturas

Fixtures locais identificadas nos testes; não são dados humanos. Algumas fixtures isoladas não fornecem catálogo e mostram contexto indisponível, preservando o estado real.

- [Jogadores1366](evidencias/publico-uiux/jogadores-1366.png), [equipes1920](evidencias/publico-uiux/equipes-1920.png): largura excedente depois das colunas.
- [Jogadores390](evidencias/publico-uiux/jogadores-390.png): nome longo, equipe agrupada e oito linhas visíveis.
- [Jogos390](evidencias/publico-uiux/jogos-390.png): agenda sem placares inventados.
