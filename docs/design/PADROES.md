# Hierarquia das interfaces

Padrão solicitado pelo responsável em 29/10/2026, aplicável às próximas páginas e protótipos da Base do Basquete. As referências desta unidade são a súmula pública e a página de estatísticas r6 fornecida pelo responsável.

## Prioridade da primeira tela

Antes de desenhar, identifique a informação principal e o primeiro dado útil. Nesta unidade são os atletas e seus números. Cabeçalho, contexto e controles devem ajudar a chegar a essa informação.

- Evite repetir o contexto já presente no breadcrumb. Preserve um h1 acessível quando retirar o título visível.
- Não repita o placar em um resumo grande se ele já está na tabela de períodos.
- Na súmula, mantenha fase eliminatória ou número do jogo sem zeros à esquerda, data/hora e local numa faixa compacta acima dos períodos.
- Prefira divisórias e agrupamento por proximidade. Não envolva tudo em cartões ou reserve grandes áreas para títulos.
- Use hierarquia de tamanho, peso e contraste. Informação secundária continua legível; compactar não autoriza diminuir nomes até ficarem ilegíveis.
- Evite explicações permanentes para ações intuitivas. Siglas têm tooltip acessível e legenda ao final; erros, dados ausentes e estados que exigem ação continuam explícitos onde necessário.

## Tabelas e controles

Nomes e identificação são prioritários. A rolagem horizontal fica dentro da tabela, com a identificação fixa. A página não deve transbordar.

Filtros, seletor de colunas e recorte por quarto ficam próximos da tabela. Mantenha estados selecionados claros, teclado, toque, fechamento por Escape e retorno de foco nos detalhes.

Na súmula, a tabela de períodos é compacta e tem o placar final na coluna Total. Faltas coletivas aparecem em pequenos marcadores F com quantidade, próximos dos pontos, com nome acessível. O recorte por quarto altera os números dos atletas e os detalhes de suas faltas, preservando o resultado final da partida.

CAP é texto simples na extremidade direita da identificação. Faltas relevantes usam fonte vermelha e negrita, sem balão. No detalhe, cada código acompanha o número de LL da penalidade, a cor do período e o contorno do tempo correspondente.

## Como verificar

Para estas duas páginas, o teste automatizado usa 1440×900 e 390×844: a primeira linha de atletas aparece até a metade da altura disponível, pelo menos oito linhas completas estão visíveis e não há rolagem horizontal da página. A contagem desktop da súmula inclui as duas tabelas; confira visualmente a densidade de cada equipe.

Este é um critério concreto destas telas, não uma regra para remover etapas necessárias em outros fluxos. Em páginas novas, defina o dado ou a ação principal e registre seu critério de visibilidade antes da implementação. Valide novamente com nomes longos, dados ausentes, filtros e detalhes abertos. Não obtenha densidade ocultando contexto indispensável ou reduzindo os alvos de interação.

Execute `npm run design:verify` e inspecione as capturas produzidas em `docs/design/.preview-artifacts/`. Automação e axe complementam a avaliação visual; não comprovam aceite humano nem uma auditoria completa de acessibilidade.
