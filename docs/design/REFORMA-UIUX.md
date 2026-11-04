# Reforma de UI/UX

Decisões expressas do responsável em 03/11/2026, após entrevista nesta conversa. Este documento define a direção; execução, SHA e CI ficam em [PROGRESSO.md](../PROGRESSO.md). O [piloto navegável](prototipos/reforma-uiux/Piloto%20UIUX.html) usa exclusivamente fixtures e não comprova integração com dados reais.

## Direção e prioridade

- Público projetado primeiro para celular; administração para desktop, com adaptação funcional para celular.
- Tema claro, azul `#075fca`, Inter com fallback de sistema, interface sóbria e compacta. Referências: tabela de jogadores/protótipo r6 e soluções úteis do projeto anterior. O print escuro orienta a busca, não as cores.
- Campos proporcionais ao conteúdo. Referência inicial: texto de 14 px nas tabelas; controles desktop de 32–36 px; inputs mobile de 16 px e alvos principais de 44 px. Não reduzir legibilidade para ganhar linhas.
- Retirar da interface pública versões, datas técnicas, fontes de nomes e instruções internas. Manter rastreabilidade administrativa, significado das siglas e explicações indispensáveis sobre dados ausentes/cobertura.

## Público

- Início por campeonatos; percurso fixo Campeonato → Ano → Naipe → Categoria → Divisão. Disputa abre Classificação e oferece Jogos, Equipes e Jogadores. Não criar níveis vazios.
- Busca global sempre visível no topo, inclusive no celular; filtros locais permanecem junto aos dados. Global cobre Jogadores, Equipes e Campeonatos/disputas, sem jogos e sem cadastros privados.
- Autocomplete com Todos/Jogadores/Equipes/Campeonatos, agrupamento por tipo, mínimo de dois caracteres, debounce de 300 ms, cancelamento de requisição e proteção contra respostas antigas. Caixa, acentos e codificações Unicode equivalentes não mudam a correspondência. Normalizar no servidor antes de limitar/paginar; não remediar somente no navegador.
- Priorizar nome exato, início e depois trecho; considerar nome/apelido/sigla públicos. Identidades diferentes não são fundidas pelo nome. Primeiras cinco sugestões por grupo e acesso às restantes; teclado, toque, carregamento, vazio e recuperação de erro.
- Jogador abre o perfil. Equipe aparece uma vez por identidade e abre seleção de participações públicas, identificadas por campeonato/ano/naipe/categoria/divisão. Campeonato abre seleção hierárquica; disputa explicitamente identificada abre Classificação.
- Tabelas estatísticas mobile começam com identificação e métricas essenciais. Seletor de colunas e rolagem interna oferecem as demais; escolhas manuais persistem na sessão, inclusive após redimensionar.
- Perfil de jogador em página contínua conforme decisão de 04/11 abaixo; perfil de equipe mantém suas abas de Estatísticas/Elenco/Jogos. Preservar fontes, cobertura e identidade; dado ausente continua ausente.

## Administração

- Preservar Informações, Equipes e elencos, Jogos e Regulamento. Reorganizar tarefas dentro das abas, com ações frequentes visíveis e ações secundárias agrupadas. Busca global somente pública.
- Informações: temporadas/disputas em linhas compactas, campos curtos para Naipe/Categoria/Ano, Divisão proporcional. Campos essenciais permanecem visíveis.
- Jogos: tabela semântica com Nº, Confronto, Data, Horário, Local, Situação. Uma coluna por vez, crescente/decrescente, seta somente na coluna ativa e estado acessível. Ordem inicial por data. Ordenação autoritativa da coleção completa antes da paginação, natural para números, cronológica para datas/horários, ausentes ao final nas duas direções, desempate estável por ID. Preservar filtros/ordem/página no retorno; busca ou ordem nova reinicia a página.
- Equipes/elenco: dois painéis aproximadamente 30/70 no desktop, seleção destacada e estado inicial “Selecione uma equipe para ver o elenco”. Em largura insuficiente, mostrar elenco com retorno que restaura busca/posição. Confirmar descarte ao sair com edição pendente; preservar diálogos e contratos de salvamento.
- Padronizar também cadastros, importações, publicação, erros e feedback. Não alterar regras esportivas, publicação, privacidade ou atalhos da súmula por conveniência visual.

## Unidades e limites de integração

1. **Piloto e componentes compartilhados:** protótipo autocontido e navegável, inspeção mobile/desktop e aceite humano antes da expansão. Não modifica rotas do produto, banco ou serviços.
2. **Público real e busca:** integrar o padrão validado, criar consulta própria de sugestões e de participações públicas; conservar compatibilidade durante a transição. Preparar normalização/consultas em migrations novas e testes isolados. Busca não se limita ao catálogo carregado no cliente.
3. **Administração real:** integrar o padrão validado, incluindo ordenação no contrato de listagem e consultas autoritativas, campos proporcionais e equipes/elenco em dois painéis.

Uma branch/PR por unidade, integrada antes de iniciar outra dependente. Migrations aplicadas são imutáveis. Aplicar DDL real, fazer deploy e publicar dados exige autorização própria. Não acrescentar recursos esportivos novos nesta reforma.

O piloto demonstra as interações com dados locais: busca amplia fixtures já carregadas, ordenação antecede o recorte local e salvamentos existem apenas em memória. Não demonstra paginação de busca no servidor, gravação, conflitos de versão ou autorização de publicação. Importação de PDFs e Regulamento exibem explicitamente o limite do piloto, sem simular sucesso dessas operações. Estatísticas e perfis do piloto são derivados de participações fictícias explícitas; isso não comprova os cálculos ou as projeções da aplicação real. Categorias/temporadas do seletor reutilizam fixtures para avaliar a estrutura; não representam cobertura histórica real. O formulário de Informações reinicia suas fixtures ao sair da aba: seu feedback é demonstração, não recuperação de cadastro persistido.

## Verificação e continuidade

### Decisão vigente — perfil contínuo e recuperação da súmula (04/11)

O responsável reprovou o jogo de `72aba24` por considerá-lo inferior à página atual e definiu a referência do perfil por meio do print do Basketball Reference. Escolhas confirmadas: reproduzir a composição atual do jogo; perfil em página contínua; resumo com temporada mais recente e carreira; detalhes adicionais recolhidos. Esta decisão substitui as cinco abas e os cabeçalhos de jogo experimentados anteriormente, sem aprovar visualmente a nova implementação.

- **Jogo:** contexto compacto, tabela de parciais com total final, recorte e elencos abaixo; sem placar adicional ou painéis da proposta reprovada. Reutilizar os estilos da súmula vigente. No piloto, conservar recortes e faltas detalhadas onde as fixtures têm cobertura; isso não amplia os dados publicados da aplicação real.
- **Identificação:** nome 28 px desktop/24 px celular, apelido e dados pessoais com rótulos legíveis de 14 px. Somente campos públicos disponíveis: posição, nascimento, altura, peso, mão dominante e origem. Não inventar fotografia, idade ou dia/mês de nascimento a partir do ano.
- **Conquistas:** títulos coletivos e honrarias individuais à direita da identificação no desktop (aproximadamente um terço); abaixo dela no celular. Título, campeonato, ano, categoria e equipe. Ausência com mensagem discreta, sem grande coluna reservada.
- **Resumo estatístico:** logo abaixo da identificação/conquistas, duas linhas — temporada mais recente com participação publicada e carreira. J conta participações confirmadas; PTS/2P/3P/LL/F são médias por jogo. Ausência ou cobertura incompleta permanece —. Não agregar fontes incompatíveis.
- **Três últimos jogos:** somente partidas explicitamente vinculadas à atuação do atleta, em ordem decrescente de data, até três linhas. Data, confronto, placar e PTS; abrir súmula. “Ver todos os jogos” abre a lista completa ao final.
- **Estatísticas por campeonato:** uma linha por participação, preservando ano/campeonato/categoria/equipe/camisa; filtros de ano, campeonato e equipes com checkboxes, opção de médias/totais e seletor de colunas. Celular começa com identificação agrupada/J/PTS; opções adicionais recuperáveis. Inscrição sem cobertura conserva —.
- **Detalhes:** depois da tabela, Jogos completos, Histórico e Evolução em painéis recolhidos; as cinco abas são substituídas por atalhos internos. Sem esconder os blocos principais. Abertura e fechamento ficam na URL, conservados após recarregar/retornar. Links antigos de `secao` apontam para seção ou painel correspondente, sem substituir o hash da rota.
- **Contexto:** perfil novo começa pela carreira completa, inclusive vindo de campeonato; recortes explícitos continuam compartilháveis. Filtros da tabela não alteram identificação, conquistas, resumo ou três recentes. Preservar filtros, painéis e rolagem no retorno do jogo.
- **Continuidade:** o piloto foi seguido pela autorização expressa “Ok, pode implementar na PR”, em 04/11. Implementar o último plano de perfil/jogo na mesma PR #51 Draft; preservar a súmula real e integrar o perfil. A autorização substitui o limite anterior de fixtures somente para esse recorte. Demais páginas da reforma continuam no piloto. Sem mudança de API pública, banco, deploy, boxscore, comparação ou recordes novos.

### Provas e checkpoint

Build e verificação do piloto integram `npm run design:build`/`npm run design:verify`; o verificador cobre 17 cenários e gera 20 capturas, inclusive comparação da súmula com o componente atual renderizado com fixture local. Conferir 320/390/1366/1920, zoom CSS200, nomes longos, ausência, ordenação/filtros/checkboxes, retorno, painéis, teclado/foco e axe. Provas vigentes em [VALIDACAO-REFORMA-UIUX.md](VALIDACAO-REFORMA-UIUX.md), SHA/CI em [PROGRESSO.md](../PROGRESSO.md); testes não constituem aceite humano.

Cota real no início e antes do gate; aos15% restantes na janela de5h, checkpoint e mesma retomada para reset observado+2min conforme CONTRIBUTING.md. Avaliação visual pendente não autoriza aprovação automática nem expansão.

## Integração autorizada — perfil público real (04/11)

`/atleta.html#<personId>` usa a composição contínua, os componentes compartilhados de tabela e somente dados da API pública existente. A disputa de origem contextualiza a navegação; não limita a carreira. Filtros próprios, colunas, ordenação, paginação e painéis permanecem no hash, sem mudar o contrato da API. O retorno de uma súmula de outra disputa aceita o perfil público identificado e conserva seu recorte/rolagem; URLs externas continuam rejeitadas.

A consulta existente pagina jogos/histórico em20. A tela lê as páginas necessárias com concorrência máxima3 e limite existente de10000 registros, verifica identidade, consulta, assinatura da publicação, unicidade e totais por inscrição antes de mostrar agregados. Falha ou mudança detectável entre páginas pede atualização, sem mostrar carreira parcial. Não é um snapshot transacional: o contrato atual não oferece token de revisão da carreira. Históricos extensos exigem várias consultas; não houve prova de desempenho no limite máximo nem mudança de API para otimizar esse caso.

Resumo e campeonatos reutilizam a agregação pura de fatos confirmados; as cinco métricas essenciais permanecem indisponíveis quando falta cobertura em qualquer atuação. J conta entradas em quadra. Recentes são até3 atuações por data do jogo, sem usar a data de republicação; datas ausentes não são inventadas. Placar consulta somente resultados das linhas visíveis e exige jogo/disputa/versão/data de publicação correspondentes à participação. Resultado indisponível ou corrigido permanece —; a súmula abre a versão atual. Colocações coletivas não se tornam medalhas individuais, e honraria sem equipe identificada na fonte não recebe equipe inferida.

A súmula real conserva `PublicGameView` e `public-view.css`, inclusive campos indisponíveis/recortes desativados quando não publicados. Não importar as fixtures mais ricas do piloto para completar dados reais. O HTML autocontido continua sendo referência com dados fictícios; o perfil real exige o serviço público. O preview em5177 executa as rotas reais com fixtures locais identificadas, sem sessão/banco. O cache do Vite é próprio, separado dos testes, e inscrições das disputas fictícias têm IDs distintos.

## Aceite e execução sequencial autorizados (04/11)

Após aceitar o piloto, o responsável autorizou executar todas as etapas em sequência. PR51 integrada primeiro; depois páginas públicas reais, busca/autocomplete de toda a base pública no servidor, administração real e validação/preparação de liberação. A restrição anterior de expansão apenas ao perfil/jogo foi superada por esta instrução. Uma unidade por vez, sem PRs dependentes empilhadas. Manter a súmula vigente e identidade visual aceita; não retomar propostas reprovadas. Estado real, autorizações de serviços e próximo passo em PROGRESSO.md.
