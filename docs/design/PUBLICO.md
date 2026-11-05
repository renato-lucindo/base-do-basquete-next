# UI/UX público — decisões do MVP

Decisões da conversa de 29/10/2026, atualizadas com os contratos aprovados pelo responsável em 02/11/2026: ordem fixa de navegação e publicação explícita do regulamento completo, inclusive participantes e agenda sem resultados. Orientam a implementação; aceite dessas regras não constitui prova de que o fluxo esteja implementado, implantado ou validado pelo responsável. Consulte [MATRIZ-ESCOPO.md](../MATRIZ-ESCOPO.md) e [PROGRESSO.md](../PROGRESSO.md) para o estado real.

## Encontrar e abrir uma disputa

1. A página inicial lista as **competições**, com busca no topo. A busca global cobre competições, disputas, equipes e jogadores; **não** busca jogos no MVP.
2. O percurso é **Competição → Ano → Naipe → Categoria → Divisão**, com ordem fixa para todas as edições e naipes. A decisão de 02/11/2026 substitui a previsão de configuração por edição; não adicionar campo ou controle de ordenação. Divisão ausente não cria nível vazio; não inventar níveis ausentes no domínio.
3. No desktop, árvores de navegação **Masculino** e **Feminino** ficam **lado a lado** quando existirem ambos. Com apenas um naipe, não criar coluna vazia. No celular, a árvore se adapta verticalmente.
4. A seleção rápida combina **árvore expansível** e **busca pesquisável**; sem obrigar uma série de páginas intermediárias.
5. Abrir uma disputa leva diretamente à **Classificação**. O menu contextual contém **Classificação, Jogos, Equipes, Jogadores**, com indicação da disputa e retorno previsível à seleção.

```text
[ Buscar competições, equipes ou jogadores... ]

▼ Copa ES
  ▼ 2026
    MASCULINO           FEMININO
    Sub-14              Sub-14
    Sub-16              Sub-17
    Adulto              Sub-19
      Série Ouro
      Série Prata
      Série Bronze
```

Exemplo ilustrativo; respeitar dados reais de cada edição.

## Páginas da disputa

| Página        | Regra de experiência                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Classificação | Tabelas por grupo e abas de fase quando aplicável. Se indisponível/não publicada, explicar e manter as demais páginas acessíveis. |
| Jogos         | Lista **única e compacta, ordenada por data**; rodadas não são obrigatórias. Acesso ao detalhe com contexto preservado.           |
| Equipes       | Listagem/tabela de desempenho e entrada no perfil da equipe.                                                                      |
| Jogadores     | Tabela pesquisável de estatísticas individuais e acesso ao perfil do atleta.                                                      |

## Estatísticas e publicação

Pedido de 03/11/2026: a classificação usa exatamente **Pos., Equipe, J, V, D, Aprov., PP, PC, SLD**, nessa ordem. Aprov. é V/J × 100 e permanece indefinido antes do primeiro jogo; não é pontuação do campeonato nem critério novo de desempate. O perfil recebe a inscrição explícita. Preservar grupos, fases, decisões e empates do domínio.

Equipes reutiliza métricas, siglas, precisão, controles e tabelas de Jogadores quando a fonte coletiva for suficiente. LL% é adicional na súmula e usa soma de `freeMade`/soma de `freeTaken`; o boxscore conserva uma única coluna de LL%. Tentativas zero e cobertura incompleta são ausência, não 0%. Uma linha por inscrição, com ordenação, busca, fases publicadas, totais/médias, escolha de colunas e estado na URL. Não completar coletivos a partir de somas parciais de atletas, nem somar MIN, +/− ou participação individual em pontos como medida coletiva. Fonte e cobertura devem explicar valores indisponíveis.

Refinamento de 03/11 para disputas de súmula: **Pos, Equipe, J, PTS, 2P, 3P, FC, FR, LLT, LLC, LL%, T, U, GD**, nessa ordem essencial. Por jogo divide PTS/2P/3P/FC/FR/LLT/LLC/T/U/GD por J; J e o percentual ponderado permanecem. Pos é ranking estatístico da métrica ordenada, com empates compartilhados; não é classificação oficial, e nome/ausência não recebem posição estatística. Colunas manuais persistem na sessão; seleção explícita na URL prevalece. T cobre atletas e comissão/banco, excluindo a penalidade B2; GD e FR requerem os totais coletivos conferidos na publicação. Publicações históricas sem cobertura conservam —. Contrato e limites em [ADR 018](../decisoes/018-equipes-de-resultados-confirmados.md#estat%C3%ADsticas-coletivas-de-s%C3%BAmula--pedido-de-03112026).

- **Jogo de súmula:** indicadores existentes no Next; **jogo de boxscore:** indicadores elegíveis do `renato-lucindo/base-do-basquete` anterior, adaptados à arquitetura Next. Nunca juntar métricas incompatíveis nem exibir zero para dado ausente.
- Expor cobertura, unidade e fonte dos indicadores quando necessário. Atletas podem ter vínculos com equipes diferentes; nomes sozinhos não identificam pessoa ou participação.
- Reaproveitar a navegação pública bem resolvida do projeto anterior de modo seletivo, sem importar regras de publicação, contratos ou dependências antigas.
- Para as referências de súmula e estatísticas, seguir [INTEGRACAO.md](INTEGRACAO.md) e [VALIDACAO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md).
- A publicação respeita confirmação explícita e fontes públicas do Next. **Não** expor automaticamente inscrições, classificação ou agenda futura por mera existência de rascunho ou regulamento. A política aprovada está na [decisão 013](../decisoes/013-classificacao-publica-confirmada.md): confirmar uma versão completa do regulamento pode publicar seus participantes e jogos futuros sem resultado, após prévia nominal do conjunto. Mudança nas fontes exige nova prévia; alterações privadas posteriores exigem nova confirmação.
- Após confirmar, a disputa deve ser descoberta no catálogo mesmo sem resultados. A agenda indica **a definir** nos campos desconhecidos e mantém placar/vencedor ausentes. A classificação por grupo apresenta inscritos com **J=0**, totais calculáveis zerados e posição indefinida; preservar empates, dados ausentes e percentuais indefinidos. Fases/séries seguem a representação própria do domínio.
- Resultados publicados dos jogos incluídos atualizam a classificação na leitura seguinte, inclusive correções, sem divulgar alterações privadas de regulamento/agenda/efeitos. Publicar participantes não publica automaticamente elencos, perfis ou documentos; estatísticas individuais mantêm suas fontes públicas próprias. Colocações finais e premiações exigem confirmação separada.

## Reforma de UI/UX — decisão de 03/11/2026

O responsável definiu público primeiro no celular, tema claro e azul, tabela de jogadores/r6 e projeto antigo como referências. Busca global sempre visível com autocomplete e normalização de caixa/acentos, tabelas mobile com essenciais e seletor de colunas, e perfis com resumo curto e abas foram aprovados como direção. Equipe aparece uma vez na busca e oferece suas participações públicas. Não criar seções gerais independentes de toda a base.

Retirar da apresentação pública versões, datas técnicas, “Fonte do nome” e instruções internas; preservar rastreabilidade administrativa e avisos indispensáveis para interpretar cobertura/ausência. Isso substitui recomendações anteriores de exibir proveniência técnica nas linhas. Não muda elegibilidade, cálculos ou publicação.

Atualização de 04/11/2026: o perfil de jogador passa a uma **página contínua**: identificação/dados pessoais, conquistas na lateral desktop/abaixo no celular, resumo da temporada mais recente e carreira, três últimos jogos e estatísticas por campeonato. Jogos completos, Histórico e Evolução ficam recolhidos ao final, com atalhos internos em vez das cinco abas. A entrada permanece pela carreira completa; filtros da tabela não alteram resumo, conquistas ou recentes, e o retorno conserva filtros/painéis/rolagem. Perfil de equipe mantém Estatísticas, Elenco e Jogos quando disponíveis. O jogo do piloto deve reproduzir a composição da súmula atual, sem o placar adicional reprovado. Contrato e limites em [REFORMA-UIUX.md](REFORMA-UIUX.md); integração do perfil real e preservação da súmula autorizadas pelo responsável em 04/11, na PR #51, já integrada. Após aceitar o piloto, o responsável autorizou executar em sequência o público real, busca no servidor, administração e preparação da liberação. A execução vigente fica em PROGRESSO.md; deploy e banco real exigem autorização própria.

## Integração das páginas públicas

Cabeçalho compartilhado com busca sempre visível, tabelas dimensionadas pelo conteúdo e largura excedente após as colunas. Textos e seus cabeçalhos à esquerda; métricas à direita. No celular, equipe pode acompanhar a identificação do atleta para manter J/PTS acessíveis. A seleção explícita de colunas prevalece sobre a adaptação automática.

Jogos confirmados e agenda publicada usam a mesma tabela compacta por data, pesquisa de equipe/local e páginas de20. Apenas resultado publicado oferece súmula; campos desconhecidos mantêm “a definir” e placar ausente permanece —. Parciais e elencos da súmula vigente não foram redesenhados.

Versões e datas técnicas saem das linhas públicas; cobertura, siglas e distinções de ausência continuam disponíveis. Controles secundários de equipes ficam em “Mais opções”; o retorno conserva a abertura, filtros, página e rolagem. A busca neste primeiro recorte ainda usa a API existente; autocomplete e cobertura global normalizada no servidor pertencem à unidade seguinte.

## Refinamento de Jogadores — decisão de05/11/2026

Esta decisão substitui recomendações anteriores de exibir explicações extensas e painel de cobertura nessa página. Jogadores usa30linhas por página, com paginação imediatamente depois da tabela e antes da legenda. Células têm padding horizontal de14px no desktop e10px no celular, mantendo colunas pelo conteúdo, altura compacta, nomes longos e rolagem interna.

Em F/T/U/5F/GD, o negrito identifica o maior valor positivo da consulta filtrada inteira, incluindo empates; zeros e ausências não recebem destaque. Não representa desempenho melhor: a comparação continua considerando menos faltas como melhor valor.

A camisa apresentada é a mais frequente por atleta/inscrição no recorte consultado, contando todas as súmulas publicadas em que foi relacionado, mesmo sem jogar. Apenas empates na frequência máxima exibem mais de uma;0 e00 permanecem distintos. Histórico de perfil/súmula e demais páginas não muda.

A legenda contém somente definições das colunas visíveis. PP% (Participação nos Pontos): percentual dos pontos da equipe marcados pelo atleta. O cálculo permanece igual. O painel “Cobertura dos dados” é removido; cobertura interna e distinção zero/ausência permanecem.

Disputas exclusivamente de súmula não exibem “Mais filtros e opções”. Busca, equipes por checkboxes, mínimo de jogos, colunas, Totais/Por jogo e paginação funcionam independentemente desse formulário. A presença de boxscore é calculada na fonte pública inteira da disputa antes dos filtros/paginação. Clientes antigos conservam20linhas e o formato anterior; a página atual solicita `pageSize=30` e recebe `hasBoxscore`. Sem migrations ou alterações nos cálculos. [Provas e limites](VALIDACAO-JOGADORES-REFINAMENTO.md).

Correção de bordas de05/11/2026: manter a rolagem interna nos dois eixos, altura limitada e identificação/cabeçalho fixos, incluindo “Pos.” na fixação vertical. Ao atingir uma das quatro bordas, bloquear o efeito elástico somente na tabela de Jogadores e sua barra superior, sem alterar gestos/zoom nem a página externa. A sincronização usa deslocamentos válidos de cada contêiner e não reescreve posições equivalentes; a barra superior deve alcançar a mesma última coluna quando houver scrollbar vertical. [Validação e limites por navegador](VALIDACAO-BORDAS-MOBILE.md).

Desktop de súmula — decisão de05/11/2026: na página de Jogadores, quando `hasBoxscore === false` e a largura supera1050px, centralizar o conjunto controles da tabela/tabela/paginação/legenda, com largura definida pelas colunas visíveis e limitada ao espaço disponível. A barra vertical fica junto à última coluna; não distribuir sobra entre colunas. Filtros principais e cabeçalho mantêm sua composição. Controles quebram linha sem ditar a largura da tabela. Em1050px ou menos e em disputas com boxscore, manter o layout anterior. Preservar padding14/10px, altura limitada, ambas as rolagens, cabeçalhos/atleta fixos e contenção das bordas. Esta regra substitui a sobra interna à direita nesse recorte, sem alterar outras tabelas. [Validação e limites](VALIDACAO-DESKTOP-SUMULA.md).
