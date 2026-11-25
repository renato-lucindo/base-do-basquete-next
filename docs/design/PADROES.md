# Padrões comuns de UI/UX

Aplicam-se às áreas pública e administrativa da Base do Basquete Next. Leia também o [design system](DESIGN-SYSTEM.md) e [PUBLICO.md](PUBLICO.md) ou [ADMIN.md](ADMIN.md), conforme a área.

## Prioridade da primeira tela

A escala compartilhada segue a fonte padrão do navegador em qualquer largura, nas áreas pública e administrativa. Use unidades relativas, alturas pelo conteúdo e reflow, preservando zoom adicional e tabelas com rolagem interna.

Títulos que apenas repetem a aba ativa permanecem semânticos, sem reservar altura. Contexto, entidades e tarefas/diálogos continuam visíveis. Foco deve ir para contêineres identificáveis, sem deslocamento para títulos ocultos.

Aplicação obrigatória: na aba **Jogadores**, não mostrar “Jogadores na disputa”; na aba **Jogos**, não mostrar “Jogos da equipe”. A mesma regra vale para variações como “Participações em competições” na aba Competições e “Estatísticas por participação” na aba Estatísticas. Preservar o título semântico com a classe compartilhada sr-only, sem espaço reservado. Um título que distingue seções simultâneas da Visão geral (Classificação, Estatísticas coletivas, Últimos jogos) continua visível. Verificar as abas renderizadas e manter testes de regressão: a existência desta regra no documento não substitui sua aplicação no consumidor.

- Identifique a principal tarefa e o primeiro dado útil antes de projetar. Contexto, filtros e controles devem ajudar a encontrá-lo.
- Tema claro, azul como destaque, linguagem visual sóbria, tabelas, listas, divisores e alinhamento consistente. Consulte tokens e componentes reais; sugestões externas não substituem identidade aprovada.
- Use a largura desktop conforme a tarefa. Dimensione tabelas e colunas pelo conteúdo e aproveite o espaço ao lado para dados e ações relacionados. Reserve a largura inteira para tabelas que precisem dela. Evite cards enormes, cabeçalhos redundantes e repetição do que já está no breadcrumb. Preserve título semanticamente acessível.
- Compactar nunca autoriza texto ilegível, alvos pequenos, omissão de contexto necessário ou etapas escondidas. Prefira hierarquia por proximidade, tamanho, peso e contraste.
- Rótulos em português brasileiro natural; siglas recebem somente o significado curto aprovado, acessível também por teclado e toque.

## Textos de apresentação

Decisão de08/11/2026, válida para páginas novas ou alteradas nas áreas pública e administrativa. A conferência obrigatória fica no [fluxo de revisão](README.md#conferência-obrigatória-de-textos-e-tabelas).

- Textos auxiliares comunicam uma ação necessária, erro, ausência ou estado concreto, somente quando aplicável. Não acrescentar avisos permanentes que expliquem o funcionamento normal da página, repitam informações visíveis ou antecipem situações inexistentes. Por exemplo, não inserir um bloco fixo “Classificação provisória” acompanhado de uma explicação genérica sobre atualização dos resultados.
- Fórmulas, critérios técnicos, origem dos dados e instruções de implementação ficam na documentação técnica, salvo necessidade explicitamente solicitada pelo responsável. Concisão não autoriza ocultar erros, estados vazios ou pendências concretas necessários à compreensão dos dados.
- Tooltips de **cabeçalho** contêm somente o significado da sigla ou abreviação, sem fórmulas, instruções, justificativas ou explicações adicionais: `V` → `Vitórias`, `FR` → `Faltas recebidas`. Cabeçalhos com nomes completos, como **Equipe** e **Últimos jogos**, não recebem tooltip nem botão exclusivamente de ajuda. Ações reais, como ordenação, conservam seus controles e nomes acessíveis.
- Reutilizar uma definição curta aprovada por indicador, compartilhada entre tabela, seletor de colunas, legenda e tooltip. Não acrescentar complementos locais. A equivalência de FR com FC da adversária, por exemplo, permanece na especificação técnica.
- Legendas reutilizam a apresentação existente de Jogadores e Equipes: título **Legenda**, pares de sigla/abreviação e significado, com a mesma estrutura visual e comportamento responsivo. Incluir apenas abreviações das colunas visíveis; nomes completos não precisam ser repetidos. Não criar parágrafos explicativos, fórmulas, instruções técnicas ou um formato próprio para cada página.
- **Grade da legenda — decisão de 24/11/2026:** colunas invisíveis, sem bordas, alinham siglas e significados entre linhas. Cada grupo usa a mesma largura para siglas; descrições longas quebram dentro da coluna de significado. A grade reduz grupos em telas estreitas. Não substituir por itens flex de largura livre ou texto corrido. Reutilizar `.reference-legend` no geral, disputa e Elencos; preservar significados distintos de uma sigla quando ambos estiverem visíveis.
- **Posição da legenda — decisão de 11/11/2026:** uma única legenda estatística no final do conteúdo da página, depois de todas as tabelas, rankings, seções e paginação, antes do rodapé global. Em páginas com abas, fica depois de todo o conteúdo da aba ativa. Não repetir junto de tabelas, inserir entre seções ou criar painéis como “Siglas e cobertura”. Esta regra não se refere ao elemento `legend` que identifica grupos de campos de um formulário.
- **Vocabulário único:** tooltip de cabeçalho, seletor e legenda usam exatamente o mesmo nome curto do catálogo compartilhado da página de Jogadores. Exemplos: `J` → `Jogos`, `PTS` → `Pontos`, `2P` → `Cestas de dois`, `3P` → `Cestas de três`, `LL` → `Lances livres`, `FC` → `Faltas cometidas`. Não anexar “média por jogo”, “total”, regras de participação, condições de cobertura ou explicações de zero/ausência. O modo do recorte pertence ao controle ou título correspondente, não à definição da sigla.
- Regras de cobertura, elegibilidade e cálculo continuam obrigatórias no domínio e na documentação técnica. Não autorizam parágrafos preventivos na interface, tooltips mais extensos ou itens de legenda para `0` e `—`. Um erro ou estado vazio concreto continua sendo comunicado de forma breve quando ocorrer.
- A restrição dos cabeçalhos não elimina tooltips informativos de registros ou ícones. Eles seguem o conteúdo mínimo aprovado para sua finalidade; o formato compacto dos jogos está em [Público — Classificação](PUBLICO.md#classificação--decisão-de-06112026). Preservar teclado, toque e informações acessíveis necessárias, separadas de explicações visuais dispensáveis.

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

O comando npm run design:verify verifica o catálogo aprovado e as **fixtures técnicas específicas** de súmula/estatísticas; seus limites geométricos e provas estão em [VALIDACAO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md). Não generalizar seus números para toda tela. Inspeção visual, ferramentas automatizadas e axe complementam, mas não comprovam aceite humano nem conformidade integral à WCAG.

O [índice](README.md) documenta o uso das skills e como tratar divergências.

## Consultas e métricas — padrão de 25/11/2026

- Filtros/buscas e seletores de consulta públicos e administrativos usam identificação dentro do controle (placeholder/opção inicial clara) e label acessível oculto, sem título externo. Exemplos: Nome do atleta, Todas as equipes, Todas as categorias, Mínimo de jogos. Campo selecionado continua mostrando seu valor. Grupos de modo mantêm nome acessível e opções visíveis. Esta regra substitui o piloto de rótulos laterais dos perfis; não se aplica à entrada de dados de cadastro, edição ou login, que mantém rótulo visível.
- Toda busca tem a lupa decorativa do sistema de ícones, além do nome acessível; o placeholder não substitui esse nome. Foco, teclado, toque e associação de erros permanecem.
- Métricas usam largura compacta: reservar somente o maior conteúdo formatado necessário entre Total e Por jogo, incluindo sinal/percentual quando presentes. Não impor mínimo amplo a todas as métricas, nem acrescentar precisão ou sinal fictício. A coluna não muda de largura ao alternar os modos. Cabeçalhos de siglas ficam centrais com seta em espaço reservado; valores numéricos à direita. Identificações preservam alinhamento específico, inclusive Participação central no perfil geral. Não acrescentar decimais artificiais; AVG mantém duas casas.
- Filtros, modos, ações e título/status acompanham a largura do bloco da tabela. Se a tabela couber, respeitar sua borda direita; se rolar, a largura visível da região. Quebrar controles em linhas quando necessário, sem reduzir fonte/alvo nem transbordar a página. Tabelas pequenas não impõem campos ilegíveis.
- Limpar filtros aparece somente quando busca ou recortes diferirem do estado inicial daquela consulta, inclusive em vazio. Busca em branco, Todas e valores iniciais não são ativos. Modo, ordem e colunas são preferências de apresentação: não fazem a ação aparecer e não são apagados. Limpar restaura filtros e primeira página, preservando disputa/contexto e preferências.
- Últimos resultados em classificação e campanhas compartilham círculo verde com check branco para vitória, vermelho com X branco para derrota e anel no mais recente. Usar o componente e estilos comuns; nunca depender de um ancestral exclusivo da classificação. Preservar conteúdo/teclado/toque dos tooltips.

Campanhas do perfil da equipe ocupam a largura disponível do painel no desktop, sem rolagem horizontal em1366/1920px. Identificação, situação e etapa podem quebrar; números e ícones conservam legibilidade. Em espaço estreito ou zoom, permitir rolagem interna. O nome do modo é **Total**, acompanhado de **Por jogo**, em todos os seletores.
