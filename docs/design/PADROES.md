# Padrões comuns de UI/UX

Aplicam-se às áreas pública e administrativa da Base do Basquete Next. Leia também [PUBLICO.md](PUBLICO.md) ou [ADMIN.md](ADMIN.md); regras específicas dos protótipos de súmula e estatísticas permanecem em [INTEGRACAO.md](INTEGRACAO.md).

## Prioridade da primeira tela

Decisão de06/11/2026: escala compartilhada próxima ao zoom150% com navegador100%, pública e administrativa. Até639CSSpx conservar tamanhos atuais;640+ampliar50% textos e dimensões relacionadas. Usar unidades relativas, alturas pelo conteúdo e reflow, preservando zoom adicional e tabelas com rolagem interna. Substitui medidas compactas anteriores quando conflitarem com a legibilidade ampliada.

Títulos que apenas repetem a aba ativa permanecem semânticos, sem reservar altura. Contexto, entidades e tarefas/diálogos continuam visíveis. Foco deve ir para contêineres identificáveis, sem deslocamento para títulos ocultos.

- Identifique a principal tarefa e o primeiro dado útil antes de projetar. Contexto, filtros e controles devem ajudar a encontrá-lo.
- Tema claro, azul como destaque, linguagem visual sóbria, tabelas, listas, divisores e alinhamento consistente. Consulte tokens e componentes reais; sugestões externas não substituem identidade aprovada.
- Aproveite a largura desktop para reduzir rolagem e espaços vazios. Evite cards enormes, cabeçalhos redundantes e repetição do que já está no breadcrumb. Preserve título semanticamente acessível.
- Compactar nunca autoriza texto ilegível, alvos pequenos, omissão de contexto necessário ou etapas escondidas. Prefira hierarquia por proximidade, tamanho, peso e contraste.
- Rótulos em português brasileiro natural; siglas recebem explicação acessível também por teclado e toque.

## Textos de apresentação

- Legendas e tooltips explicam o significado dos indicadores para o público. Fórmulas, origem dos dados e instruções de implementação ficam na documentação técnica, salvo necessidade explicitamente solicitada pelo responsável. Por exemplo, exibir **FR — Faltas recebidas**; a equivalência com FC da adversária permanece na especificação técnica.
- Reutilizar uma definição aprovada por indicador, compartilhada entre tabela, seletor de colunas, legenda e tooltip. Evitar complementos locais que alterem o nome apresentado em apenas um desses lugares.

## Tabelas e ações

- **Camisas — decisão de 10/11/2026:** ao ordenar camisas ou exibir múltiplas camisas de uma pessoa, usar **0, 1…99, 00**, com camisas não informadas depois. `00` é distinto de `0` e fica depois dos demais números; nunca normalizá-lo para zero. Reutilizar `src/domain/jersey.ts` no público/admin, incluindo elencos, preparação, súmula, associação de PDF, estatísticas e perfis. A paginação de elencos aplica a mesma regra antes do corte. Ordem cronológica de eventos e linhas importadas conservam a sequência de origem.

- Identificação e nomes são prioritários; alinhamento, cabeçalhos, ordenação e filtros previsíveis. A rolagem horizontal, se necessária, deve ser interna à tabela; a página não pode transbordar.
- Filtros, busca, colunas e ações ficam próximos dos dados. Quando houver muitas opções, usar combobox/autocomplete com pesquisa, estado vazio, seleção clara e teclado. Não exibir catálogo inteiro ao abrir por padrão.
- Campos essenciais visíveis; recolher apenas os secundários quando houver benefício concreto. Rótulos persistentes e erros associados ao campo.
- Diálogos/popovers com foco inicial apropriado, Escape quando aplicável e retorno do foco. Não esconder ação essencial apenas no hover; feedback com estados de salvamento, erro e confirmação.
- Preservar contexto de navegação e filtros compartilháveis na URL quando possível, sem expor dados privados. Evitar virtualização e dependências extras sem prova da necessidade.

## Acessibilidade e responsividade

- Meta **WCAG 2.2 AA**: semântica HTML, nomes acessíveis, ordem lógica, teclado, foco visível e não encoberto, contraste real medido, leitura de erros, reflow/zoom e redução de movimento.
- Cor e hover nunca são os únicos meios de comunicar estado. Alvos principais confortáveis (referência de projeto: 44×44 px), sem impor essa dimensão a todas as células de tabela.
- Verificar desktops **1366×768** e **1920×1080**; em trabalho público/responsivo, **390×844**, zoom 200% e reflow em 320 CSS px. Simular nomes longos, erros, estados vazios e menus/diálogos abertos.

## Evidências proporcionais

Defina o que o usuário deve alcançar e como comprovar antes de editar. Mudança textual pede revisão de linguagem; componente pede estados/foco/teclado; fluxo ou navegação pede percurso completo nas resoluções relevantes. Registrar ambiente, comando, SHA e limites.

O comando npm run design:verify verifica os **protótipos específicos** de súmula/estatísticas; seus limites geométricos e provas estão em [VALIDACAO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md). Não generalizar seus números para toda tela. Inspeção visual, ferramentas automatizadas e axe complementam, mas não comprovam aceite humano nem conformidade integral à WCAG.

O [índice](README.md) documenta o uso das skills e como tratar divergências.
