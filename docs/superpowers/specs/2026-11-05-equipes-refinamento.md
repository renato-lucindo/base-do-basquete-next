# Refinar a página de Equipes conforme a versão aprovada de Jogadores

Implemente esta unidade em uma única PR, reunindo interface, textos, filtros, cálculos e testes antes da validação final. As alterações de Jogadores das PRs57–59 já foram concluídas; confira a `main` atual antes de começar e preserve essa página aprovada.

Leia as instruções vigentes do repositório e o planejamento histórico de Equipes. O histórico serve como contexto: contagens antigas de jogos e diagnósticos precisam ser conferidos novamente.

## 1. Interface e comportamento

- Usar o título **Equipes**.
- Abrir em **Por jogo**, **Todos**, ordenada por **PTS decrescente**. Links com escolhas explícitas e retornos do perfil preservam a consulta, sem impor novamente esses padrões.
- Mostrar somente o **nome público publicado da inscrição**, sem o nome completo da equipe abaixo. Usar peso normal, cor de texto e aparência discreta; manter o nome como link semântico para o perfil, com foco visível e interação acessível.
- Remover “Cobertura das fases”, “Equipes com resultados confirmados”, o parágrafo sobre ranking estatístico e o bloco “Siglas, fontes e cobertura”. Preservar a semântica acessível da tabela.
- Adicionar busca sem distinção de caixa/acentos e seleção de inscrições por checkboxes, com contador e **Todas/Nenhuma**, seguindo o padrão de Jogadores. Inscrições da mesma equipe permanecem distintas; **Nenhuma** produz tabela vazia.
- Combinar busca, seleção, modo e escopo sem perder escolhas. As opções de equipes vêm da fonte pública completa e não desaparecem quando a busca ou o escopo esvaziam a tabela.
- Usar controles segmentados para **Totais/Por jogo** e **Todos/Fase regular/Eliminatórias**, com estados selecionados acessíveis.
- Exibir todas as inscrições filtradas, sem paginação visível nem botões Anterior/Próxima na listagem. Não alterar a paginação do perfil.

Nas disputas exclusivamente de súmula, remover **Dados, Mais opções e Colunas**, fixando esta ordem:

**Pos., Equipe, J, PTS, PB, PB%, 2P, 3P, FC, FR, LLT, LLC, LL%, T, U e GD.**

Nas disputas com boxscore, preservar os controles pertinentes e permitir selecionar PB/PB%, sem duplicar a métrica de pontos do banco.

Substituir os textos explicativos por uma **Legenda** sempre visível, com definições curtas apenas das siglas exibidas. Cabeçalhos, tooltips e legenda devem usar nomes consistentes. Para as novas métricas:

- **PB — Pontos do banco**
- **PB% — Participação dos pontos do banco**

## 2. Layout, rolagem e destaque

Herdar os comportamentos aprovados de Jogadores nas disputas exclusivamente de súmula:

- Acima de1050px, centralizar controles da tabela, tabela e legenda em um bloco cuja largura seja definida pelas colunas, limitada ao espaço disponível. Cabeçalho da página e filtros principais mantêm sua composição.
- Eliminar a faixa vazia interna após a última coluna: a scrollbar vertical deve ficar imediatamente após GD. Não distribuir a sobra entre as colunas.
- Manter padding horizontal de14px no desktop e10px no celular, altura compacta, nomes com quebra controlada e altura máxima de rolagem de70vh.
- Preservar rolagem horizontal interna, barra superior somente quando necessária, sincronização com deslocamentos válidos e contenção do efeito elástico nas quatro bordas.
- Fixar o cabeçalho verticalmente, incluindo Pos., e a identificação da equipe durante a rolagem horizontal. Preservar inércia, gestos diagonais, zoom por pinça e rolagem externa.
- Não alterar globalmente o componente compartilhado nem o layout das disputas com boxscore por consequência desses ajustes.

Nas colunas numéricas, destacar em negrito o **maior valor positivo do conjunto filtrado inteiro**, preservando empates. Não destacar zeros nem ausências. Isso inclui as colunas de faltas, mas não altera sua interpretação como desempenho: maior quantidade de faltas não passa a significar resultado melhor.

## 3. Regras estatísticas e pontos do banco

A listagem de Equipes terá regra uniforme para todas as fontes:

- **Totais:** mostrar as contagens acumuladas.
- **Por jogo:** dividir as contagens por **J**, inclusive PTS, PB, FC, FR, T, U e GD.
- **J** permanece quantidade de partidas.
- Percentuais, incluindo LL% e PB%, usam a razão entre totais correspondentes; não calcular média simples dos percentuais por partida.
- Ordenação, empates e máximos usam precisão completa; arredondar somente na apresentação.
- O ranking é estatístico por inscrição, calculado após os filtros. Empates compartilham posições1,1,3; valores ausentes e ordenação por nome não recebem posição estatística.
- Essa uniformização vale para a listagem atualizada. Preservar o comportamento dos clientes legados e do perfil da equipe.

**Pontos do banco:**

- Determinar titulares e reservas **por partida**, usando exclusivamente a fonte publicada válida. Não usar o elenco atual nem inferir titulares por minutos, ordem dos nomes ou pontuação.
- Em súmula, calcular PB somando os pontos individuais dos atletas que não começaram entre os cinco titulares confirmados. Contar todos os pontos que marcaram naquela partida depois de entrar em quadra.
- Marcação ausente de titular não confirma condição de reserva. Identificação ou pontuação incompleta não produz um total conhecido.
- Em boxscore, respeitar a autoridade e a precedência das fontes publicadas existentes. Não duplicar a mesma partida nem somar uma medida coletiva novamente aos valores dos atletas.
- **PB total = soma dos pontos do banco.**
- **PB por jogo = soma dos pontos do banco ÷ J.**
- **PB% = soma dos pontos do banco ÷ soma dos pontos da equipe ×100.**
- Numerador e denominador devem representar as mesmas partidas do recorte. PB% permanece igual ao alternar o modo.
- Busca e seleção apenas escolhem inscrições; não recalculam suas métricas. O escopo de fases redefine as partidas consideradas.
- Manter as colunas visíveis com **—** quando a cobertura não for integral. Não apresentar subtotal como total nem dividir um subtotal pelo J de um conjunto maior.
- Zero comprovado aparece como **0**. Sem jogos, médias e percentuais ficam **—**; com denominador zero, PB% fica **—**.

Não alterar cálculos de Jogadores, súmula ou perfil para implementar essas regras da listagem.

## 4. Contratos, cobertura e revisão histórica

- Manter a rota pública existente. A página atualizada solicita `pageSize=all`; clientes antigos continuam recebendo20linhas, formato e comportamento anteriores.
- Disponibilizar PB/PB%, cobertura interna, opções de inscrições e presença de boxscore no contrato atualizado, sem acrescentar campos incompatíveis às respostas legadas.
- Determinar a presença de boxscore sobre a fonte pública completa, antes de busca, seleção, escopo e paginação.
- Respeitar o limite existente de1000inscrições, sem truncamento silencioso. Aplicar busca, seleção e ordenação sobre a coleção inteira.
- Identificar a seleção por `registrationId`. Representar Todas/Nenhuma de forma compacta e aceitar parâmetros repetidos de inscrição no contrato atualizado.
- Corrigir o truncamento atual do estado de retorno. Preservar consulta e rolagem ao voltar do perfil.
- Para seleções excepcionalmente grandes que excedam os limites seguros do link, preservar o estado no navegador por referência local. Informar discretamente que aquela seleção não está integralmente representada no link; não perder ou cortar IDs silenciosamente. Não criar infraestrutura remota apenas para esse caso.
- Manter o foco nos controles durante filtragem, aplicar debounce à busca e cancelar/ignorar respostas antigas.
- Preservar cobertura interna e a distinção entre zero e informação indisponível, sem reintroduzir painéis técnicos.

**FR, T e GD:**

O diagnóstico anterior de13jogos é histórico. Refazer a consulta somente de leitura e identificar as publicações atualmente afetadas, preservando os documentos publicados originais.

- Conferir o caminho cálculo → confirmação → publicação → consulta, conforme a ADR018 vigente.
- **T:** conferir ocorrências técnicas de atletas, comissão e banco, incluindo sucessões de treinador; B2 não é uma nova técnica.
- **FR:** usar o total coletivo conferido na fonte, sem inferi-lo automaticamente das faltas adversárias.
- **GD:** usar o total completo conferido, sem somar novamente atletas/comissão nem duplicar capitão-treinador; respeitar o mínimo identificado pelo motor.
- Preparar um quadro por jogo/equipe com T reconstituída, mínimo identificado de GD, valores publicados e pendências de FR/GD.
- Conferir também a disponibilidade dos dados necessários para PB/PB%.

Essa preparação **não autoriza alterar ou republicar dados**. Não usar documentos privados ou rascunhos para preencher silenciosamente a consulta pública. Métricas históricas sem cobertura continuam como **—** até conferência e republicação explicitamente autorizadas.

Planejar a implementação sem migrations. Se surgir necessidade comprovada de mudar persistência ou publicação, apresentar a dependência concreta antes de ampliar o escopo.

## 5. Validação e entrega

- Testar abertura padrão, consultas explícitas, modos, escopos, busca normalizada, seleção combinada/vazia, inscrições distintas e retorno do perfil.
- Testar mais de20inscrições, listagem completa, limites de capacidade, respostas legadas e seleção extensa sem truncamento.
- Testar PB/PB% com alternância titular/reserva entre partidas, pontos após entrada, banco zerado, titulares desconhecidos, cobertura parcial e denominador zero.
- Comprovar a ponderação:10PB/50PTS e30PB/100PTS resultam em40PB,20PB por jogo e26,7%.
- Testar fontes mistas sem duplicação; máximos, empates, zeros e ausências; FR explícita, técnicas, sucessões, B2 e GD sem dupla contagem.
- Inspecionar1366/1920px,390/320px, transição1050/1051px, zoom/texto200%, nomes longos, estados vazios, teclado, foco e axe. Conferir Chromium/WebKit, sticky, barras sincronizadas e bordas; distinguir emulação de confirmação em celular físico.
- Aplicar `ui-ux-pro-max` e revisão atualizada de `web-design-guidelines`. Atualizar decisões vigentes, capturas e relatório.
- Fazer verificações focais durante o trabalho e um gate consolidado quando estável, conforme `docs/CI.md`. Esta unidade envolve contratos e cálculos, portanto não deve ser classificada como alteração somente visual. Reutilizar provas de artefatos inalterados.
- Integrar uma única PR com CI aprovada também no SHA integrado. Depois, publicar exclusivamente no Worker independente **base-do-basquete-next-uiux** e conferir fonte, comportamento e configuração preservada.
- Preservar o domínio principal, Access, segredos, banco e dados humanos. Não executar republicação histórica, deploy principal ou nova operação de banco por inferência.
