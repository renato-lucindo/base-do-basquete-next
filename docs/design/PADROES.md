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

Decisão de08/11/2026, válida para páginas novas ou alteradas nas áreas pública e administrativa. A conferência obrigatória fica no [fluxo de revisão](README.md#conferência-obrigatória-de-textos-e-tabelas).

- Textos auxiliares comunicam uma ação necessária, erro, ausência ou estado concreto, somente quando aplicável. Não acrescentar avisos permanentes que expliquem o funcionamento normal da página, repitam informações visíveis ou antecipem situações inexistentes. Por exemplo, não inserir um bloco fixo “Classificação provisória” acompanhado de uma explicação genérica sobre atualização dos resultados.
- Fórmulas, critérios técnicos, origem dos dados e instruções de implementação ficam na documentação técnica, salvo necessidade explicitamente solicitada pelo responsável. Concisão não autoriza ocultar erros, estados vazios ou pendências concretas necessários à compreensão dos dados.
- Tooltips de **cabeçalho** contêm somente o significado da sigla ou abreviação, sem fórmulas, instruções, justificativas ou explicações adicionais: `V` → `Vitórias`, `FR` → `Faltas recebidas`. Cabeçalhos com nomes completos, como **Equipe** e **Últimos jogos**, não recebem tooltip nem botão exclusivamente de ajuda. Ações reais, como ordenação, conservam seus controles e nomes acessíveis.
- Reutilizar uma definição curta aprovada por indicador, compartilhada entre tabela, seletor de colunas, legenda e tooltip. Não acrescentar complementos locais. A equivalência de FR com FC da adversária, por exemplo, permanece na especificação técnica.
- Legendas reutilizam a apresentação existente de Jogadores e Equipes: título **Legenda**, pares de sigla/abreviação e significado, com a mesma estrutura visual e comportamento responsivo. Incluir apenas abreviações das colunas visíveis; nomes completos não precisam ser repetidos. Não criar parágrafos explicativos, fórmulas, instruções técnicas ou um formato próprio para cada página.
- A restrição dos cabeçalhos não elimina tooltips informativos de registros ou ícones. Eles seguem o conteúdo mínimo aprovado para sua finalidade; o formato compacto dos jogos está em [Público — Classificação](PUBLICO.md#classificação--decisão-de-06112026). Preservar teclado, toque e informações acessíveis necessárias, separadas de explicações visuais dispensáveis.

## Tabelas e ações

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
