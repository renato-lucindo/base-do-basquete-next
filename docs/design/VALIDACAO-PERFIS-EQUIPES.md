# Validação dos perfis de equipes

Unidade `codex/perfis-equipes`, iniciada em `824a3d59da5323202d869a4d93a1038bcd377044`. Requisitos e HTML aceitos em [PERFIS-EQUIPES.md](PERFIS-EQUIPES.md). Evidência local de 22/11/2026; SHA final e CI ficam na PR desta unidade.

## Resultado implementado

- Perfil geral com cinco abas e perfil da inscrição com três. Busca leva ao geral; inscrições mantêm disputa e inscrição. URL conserva aba, ano, filtros, ordenação, fase/grupo e retorno.
- Campanhas, sequência de cinco resultados por inscrição e recentes do ano escolhido, reunindo categorias por data. Situação usa o estado oficial. Campanha sem projeção fica indisponível; agenda não conta como resultado.
- Visão da disputa reutiliza classificação e estatísticas coletivas completas, destacando a inscrição. Jogadores reutiliza tabela completa, colunas, fases, totais/médias, paginação de 30 e camisas 0/00/DNP. Filtro de inscrição é aplicado antes da agregação.
- Conquistas históricas confirmadas à direita no desktop e após o conteúdo no celular. Jogos sem coluna Resultado. Legenda expandida, única e após o conteúdo da aba.
- Somente APIs públicas existentes; prévia e site de disputa única não ampliam escopo. Sem migration, DDL, publicação de dados ou deploy.

## Verificações locais

- `npm run gate`: PASS. 179 arquivos / 848 testes Vitest; 11 testes de plano de CI; 19 de transportes; 16 de banco local. Também lint, formato, tipos, builds público/admin/Worker, rotas em workerd, PDF real, fronteira cliente e segredos aprovados.
- Browsers finais do perfil: 10 PASS, incluindo retorno com foco no elenco mobile e larguras 1366/1920 px. Regressões focais anteriores: equipes 14 PASS e busca/navegação 30 PASS.
- Revisão das suítes antigas: 72 casos passaram, dois falharam por seletor antigo/área de toque e foram corrigidos. Reexecução focal desses dois casos: 4 PASS (desktop/mobile). Fixtures corrigidas para respeitar a disputa, paginação de 100 jogos e consultas de outras páginas; regressões correspondentes: 7 PASS / 1 skip preexistente na matriz explícita de tipografia. Não foram desativados testes nem ampliados timeouts.
- `design:build` e `design:verify`: PASS; referências geradas não integram o diff final.
- Primeiro ensaio geral interrompido por `ENOSPC` durante banco local simultâneo com browsers; espaço liberado ao terminar o banco. Execução geral local seguinte interrompida após encontrar falhas da navegação antiga e problemas das fixtures. Não declarar esses ensaios como regressão completa aprovada.
- CI inicial [45050998992](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45050998992), código `bf214f0`: checks e design passaram; Chromium/WebKit detectaram seletores antigos, alvos pequenos e fixtures incompatíveis. Correções comprovadas focalmente acima. A CI completa da revisão deve passar antes de integrar; resultado atual é conferido na PR #89.

## Revisão da interface

Guia aplicado: [cores e situação](catalogo/guia-completo-autonomo.html#cores), [tipografia](catalogo/guia-completo-autonomo.html#tipografia), [campos](catalogo/guia-completo-autonomo.html#formularios), [navegação](catalogo/guia-completo-autonomo.html#navegacao), [dados](catalogo/guia-completo-autonomo.html#dados), [estados](catalogo/guia-completo-autonomo.html#estados) e [acessibilidade](catalogo/guia-completo-autonomo.html#acessibilidade). Aplicadas também as regras de PADROES/PUBLICO e a escala vigente de +2 px.

Reaproveitados PublicHeader/Footer, SectionTabs/TabPanel, ScrollableTable, classificação, RecentResultsCell, tabelas de jogadores/equipes, ColumnPicker, tooltips e catálogo de métricas. Variação necessária: composição geral/contextual e painel lateral de conquistas do HTML aceito. A coluna de camisa é optativa no componente compartilhado, preservando os outros consumidores.

Inspeção das capturas reais em 1440 px e 390 px: conquistas à direita/abaixo; classificação com três equipes, coletivos com todas as inscrições, inscrição destacada, jogos em duas colunas, jogadores completos com rolagem interna. Tabelas seguem largura pelo conteúdo, alinhadas aos blocos, sem forçar colunas vazias. Corrigidos controle Fase estreito no celular, reflow do título em 320 px com texto a 200% e área de toque dos links de escolha da inscrição (mínimo de 44 px).

Axe com WCAG 2/2.1/2.2 A/AA: zero violações nas abas Visão geral e Jogadores e na escolha de inscrição, desktop/celular. Teclado entre abas, foco visível, skip link, paginação, recarga e preservação do grupo conferidos nos testes. Erro de outra inscrição não exibe tabela; nova tentativa recupera. Catálogo contaminado e publicação recolhida são recusados.

Textos conferidos nas legendas e cabeçalhos: `J` = **Jogos**, `PP%` = **Participação nos Pontos**, `5F` = **Exclusões por cinco faltas**. A legenda reúne apenas colunas presentes, fica expandida depois de tabelas/recentes/paginação e antes do rodapé; não se repete na classificação/coletivos embutidos. Cabeçalhos completos não receberam ajuda adicional. Ausências conservam —, sem zero presumido. Situação tem texto além do acento de cor.

Revisão de UI pelo próprio agente com as [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas em 22/11/2026. Achados corrigidos: nome acessível da medalha (`public-page.tsx`, role de imagem), perda de parâmetros de retorno (URLs locais) e largura do título/controle Fase (`screen.css`). Sem parecer independente: não havia ferramenta de subagente nesta sessão.

## Limites de entrega

Fixtures sintéticas somente em testes e protótipo. Elencos mostra participantes publicados de resultados; elenco oficial completo continua fora do escopo. Composição do histórico faz várias requisições, com concorrência e capacidade limitadas; falha de fonte não vira zero. Não foi aferido desempenho com histórico de mil inscrições.

Não houve avaliação desta implementação em Worker remoto. CONTRIBUTING exige publicar no Worker autorizado e obter novo aceite visual antes de integrar. A autorização de implementação do HTML não substitui esse aceite nem define um alvo de deploy.
