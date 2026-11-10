# UI/UX público — decisões do MVP

Decisão de06/11/2026: aplicar escala/cabeçalhos dos padrões comuns. Na disputa, somente o nome publicado da inscrição, pela publicação mais recente antes dos recortes, com desempate estável. Preservar aliases/histórico; não concatenar nome global/inscrição/sigla. Fora da disputa, manter o nome principal. PP% e5F compartilham Participação nos Pontos e Exclusões por cinco faltas em todos os controles/explicações. O título visível Equipes é substituído pela identificação semântica sem repetição da aba.

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

## Identificação dos atletas no público

Nas tabelas e demais páginas públicas, a identificação visível prioriza o apelido cadastrado (após remover espaços nas extremidades); sem apelido, exibe o nome completo. O nome completo deve permanecer disponível ao foco de teclado/leitor de tela e para consulta no perfil. A busca global é exceção: apresenta sempre o nome completo como principal e o apelido como complemento, sem restringir a pesquisa. Dados cadastrais e fatos publicados não são substituídos pelo apelido; este é apenas uma regra de apresentação.

## Páginas da disputa

| Página        | Regra de experiência                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classificação | Uma tabela por vez, seletor de grupo quando houver vários e navegação por fase. Se indisponível/não publicada, explicar e manter as demais páginas acessíveis. |
| Jogos         | Lista **única e compacta, ordenada por data**; rodadas não são obrigatórias. Acesso ao detalhe com contexto preservado.                                        |
| Equipes       | Listagem/tabela de desempenho e entrada no perfil da equipe.                                                                                                   |
| Jogadores     | Tabela pesquisável de estatísticas individuais e acesso ao perfil do atleta.                                                                                   |

## Estatísticas e publicação

Pedido de 03/11/2026: a classificação usa exatamente **Pos., Equipe, J, V, D, Aprov., PP, PC, SLD**, nessa ordem. Aprov. é V/J × 100 e permanece indefinido antes do primeiro jogo; não é pontuação do campeonato nem critério novo de desempate. O perfil recebe a inscrição explícita. Preservar grupos, fases, decisões e empates do domínio.

Equipes reutiliza métricas, siglas, precisão, controles e tabelas de Jogadores quando a fonte coletiva for suficiente. LL% é adicional na súmula e usa soma de `freeMade`/soma de `freeTaken`; o boxscore conserva uma única coluna de LL%. Tentativas zero e cobertura incompleta são ausência, não 0%. Uma linha por inscrição, com ordenação, busca, fases publicadas, totais/médias, escolha de colunas e estado na URL. Não completar coletivos a partir de somas parciais de atletas, nem somar MIN, +/− ou participação individual em pontos como medida coletiva. Fonte e cobertura devem explicar valores indisponíveis.

Refinamento de 03/11 para disputas de súmula: **Pos, Equipe, J, PTS, 2P, 3P, FC, FR, LLT, LLC, LL%, T, U, GD**, nessa ordem essencial. Por jogo divide PTS/2P/3P/FC/FR/LLT/LLC/T/U/GD por J; J e o percentual ponderado permanecem. Pos é ranking estatístico da métrica ordenada, com empates compartilhados; não é classificação oficial, e nome/ausência não recebem posição estatística. Colunas manuais persistem na sessão; seleção explícita na URL prevalece. T cobre atletas e comissão/banco, excluindo a penalidade B2; GD requer total completo conferido na publicação. Pela decisão de05/11/2026, FR coletiva de súmula é FC adversária por partida; FR própria do boxscore e métricas individuais são preservadas. Publicações históricas sem cobertura conservam —. Contrato e limites em [ADR 018](../decisoes/018-equipes-de-resultados-confirmados.md#estat%C3%ADsticas-coletivas-de-s%C3%BAmula--pedido-de-03112026).

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

### Partida — aceite de 10/11/2026

O protótipo desta conversa foi aceito para implementação com as decisões abaixo, que substituem orientações anteriores da súmula quando conflitantes:

- Parciais mostram somente pontos; retirar faltas coletivas dessas células.
- Elencos preservam titulares pelo nome em negrito e asterisco; quem não entrou conserva texto/fundo normais, inclusive em PTS, com — nas estatísticas. Completar cada corpo até12linhas com preenchimentos cinza vazios, sem identidade, ações ou participação nos cálculos. Colunas, linhas correspondentes e rodapés equivalentes; nomes extensos continuam legíveis.
- Destacar máximos positivos de PTS/2P/3P/LL por equipe e recorte, com todos os empates. Não aplicar peso à linha inteira, zeros, ausências ou totais.
- Jogo todo/quartos/prorrogações sincronizam dados, totais, máximos e faltas; o placar final permanece visível. A consulta optativa lê somente a versão imutável publicada. PDF/legado sem cobertura não recebe períodos individuais inventados.
- O responsável confirmou manter — quando a participação no quarto não é conhecida. Titular comprova o primeiro quarto; evento individual comprova presença no período. Ausência de evento nunca comprova que o atleta não entrou. Exclusões/desqualificações respeitam a cronologia.
- Retirar 5F/GD do nome. Cinco faltas usam número vermelho/negrito em F; desqualificação usa GD junto do número, inclusive5GD, com identificação por foco, mouse e toque e detalhes na célula.
- Legenda usa definições curtas compartilhadas, com **2P e3P separados**. Não incluir Negrito/Maior valor da equipe no recorte, Parciais/Pontos acima… ou0/Zero confirmado. Cabeçalhos explicam somente o significado da sigla.

Regra global de camisas em [PADROES.md](PADROES.md):00 ao final dos números.

Cabeçalho compartilhado com busca sempre visível, tabelas dimensionadas pelo conteúdo e largura excedente após as colunas. Textos e seus cabeçalhos à esquerda; métricas à direita. No celular, equipe pode acompanhar a identificação do atleta para manter J/PTS acessíveis. A seleção explícita de colunas prevalece sobre a adaptação automática.

Jogos confirmados e agenda publicada usam a mesma tabela compacta por data, pesquisa de equipe/local e páginas de20. Apenas resultado publicado oferece súmula; campos desconhecidos mantêm “a definir” e placar ausente permanece —. Parciais e elencos da súmula vigente não foram redesenhados.

Versões e datas técnicas saem das linhas públicas; cobertura, siglas e distinções de ausência continuam disponíveis. Controles secundários de equipes ficam em “Mais opções”; o retorno conserva a abertura, filtros, página e rolagem. A busca neste primeiro recorte ainda usa a API existente; autocomplete e cobertura global normalizada no servidor pertencem à unidade seguinte.

## Refinamento de Jogadores — decisão de05/11/2026

Esta decisão substitui recomendações anteriores de exibir explicações extensas e painel de cobertura nessa página. Jogadores usa30linhas por página, com paginação imediatamente depois da tabela e antes da legenda. Células têm padding horizontal de14px no desktop e10px no celular, mantendo colunas pelo conteúdo, altura compacta, nomes longos e rolagem interna.

Em F/T/U/5F/GD, o negrito identifica o maior valor positivo da consulta filtrada inteira, incluindo empates; zeros e ausências não recebem destaque. Não representa desempenho melhor: a comparação continua considerando menos faltas como melhor valor.

A camisa apresentada é a mais frequente por atleta/inscrição no recorte consultado, contando todas as súmulas publicadas em que foi relacionado, mesmo sem jogar. Apenas empates na frequência máxima exibem mais de uma;0 e00 permanecem distintos. Histórico de perfil/súmula e demais páginas não muda.

A legenda contém somente definições das colunas visíveis. No cabeçalho/tooltip e na legenda de Jogadores, PP% usa **Participação nos Pontos** e5F usa **Exclusões por cinco faltas**, conforme ajuste do responsável em05/11/2026. São nomes curtos de apresentação; substituem a explicação extensa anterior de PP%. Os cálculos e definições compartilhadas com Equipes permanecem iguais. O painel “Cobertura dos dados” é removido; cobertura interna e distinção zero/ausência permanecem.

Nas disputas exclusivamente de súmula, Jogadores oferece13opções de coluna: Equipe e as12métricas de súmula. Essa capacidade da fonte limita também a seleção recebida da URL/sessão e as colunas renderizadas; o padrão mobile de todas as métricas não acrescenta estatísticas de boxscore. Seleções válidas, inclusive nenhuma coluna, permanecem. Disputas com boxscore conservam as opções completas.

Disputas exclusivamente de súmula não exibem “Mais filtros e opções”. Busca, equipes por checkboxes, mínimo de jogos, colunas, Totais/Por jogo e paginação funcionam independentemente desse formulário. A presença de boxscore é calculada na fonte pública inteira da disputa antes dos filtros/paginação. Clientes antigos conservam20linhas e o formato anterior; a página atual solicita `pageSize=30` e recebe `hasBoxscore`. Sem migrations ou alterações nos cálculos. [Provas e limites](VALIDACAO-JOGADORES-REFINAMENTO.md).

Correção de bordas de05/11/2026: manter a rolagem interna nos dois eixos, altura limitada e identificação/cabeçalho fixos, incluindo “Pos.” na fixação vertical. Ao atingir uma das quatro bordas, bloquear o efeito elástico somente na tabela de Jogadores e sua barra superior, sem alterar gestos/zoom nem a página externa. A sincronização usa deslocamentos válidos de cada contêiner e não reescreve posições equivalentes; a barra superior deve alcançar a mesma última coluna quando houver scrollbar vertical. [Validação e limites por navegador](VALIDACAO-BORDAS-MOBILE.md).

Desktop de súmula — decisão de05/11/2026: na página de Jogadores, quando `hasBoxscore === false` e a largura supera1050px, centralizar o conjunto controles da tabela/tabela/paginação/legenda, com largura definida pelas colunas visíveis e limitada ao espaço disponível. A barra vertical fica junto à última coluna; não distribuir sobra entre colunas. Filtros principais e cabeçalho mantêm sua composição. Controles quebram linha sem ditar a largura da tabela. Em1050px ou menos e em disputas com boxscore, manter o layout anterior. Preservar padding14/10px, altura limitada, ambas as rolagens, cabeçalhos/atleta fixos e contenção das bordas. Esta regra substitui a sobra interna à direita nesse recorte, sem alterar outras tabelas. [Validação e limites](VALIDACAO-DESKTOP-SUMULA.md).

## Refinamento de Equipes — decisão de05/11/2026

Substitui as composições anteriores desta listagem. Título **Equipes**, abertura em Por jogo/Todos/PTS decrescente; escolhas explícitas e retorno do perfil prevalecem. Uma linha por inscrição, somente nome público publicado, link discreto de peso normal com foco visível. Busca normalizada e seleção por checkboxes com contador/Todas/Nenhuma se combinam com modo/escopo. As opções e presença de boxscore vêm da fonte pública completa, antes dos filtros. Nenhuma seleção mostra tabela vazia.

Em súmula, ordem fixa **Pos., Equipe, J, PTS, PB, PB%, 2P, 3P, FC, FR, LLT, LLC, LL%, T, U, GD**, sem Dados/Mais opções/Colunas. Boxscore mantém controles e permite PB/PB% uma única vez. A legenda permanece visível e contém apenas definições das siglas mostradas; removem-se explicações e painéis técnicos extensos. Cobertura interna e zero versus ausência permanecem.

Contrato optativo pageSize=all fornece todas as inscrições filtradas (limite1000 explícito), sem paginação da listagem. O legado20 e o perfil mantêm seus cálculos/contratos/paginação. No contrato novo, todas as contagens por jogo dividem por J, inclusive PTS/PB/FC/FR/T/U/GD; percentuais são ponderados por totais. Ordenação/empates/máximos usam precisão completa, apresentação arredondada. Máximos positivos recebem negrito incluindo empates, sem reclassificar maior quantidade de faltas como melhor desempenho.

PB — Pontos do banco; PB% — Participação dos pontos do banco. Titulares/reservas são da partida publicada, nunca do elenco atual ou inferidos. PB total soma pontos dos reservas durante a partida inteira; PB por jogo divide por J; PB% divide PB pelos pontos da equipe nas mesmas partidas. Cobertura parcial conserva —; zero confirmado é0, percentual com denominador zero é—. Fonte coletiva PDF válida tem precedência sem duplicar atletas/partidas.

A listagem de súmula herda o bloco intrínseco centralizado acima1050px, sem sobra após GD, padding14/10px, max-height70vh, rolagem interna nos dois eixos, sticky vertical inclusive Pos. e identificação horizontal. Preservar gestos nativos/zoom/página externa e barras sincronizadas; nenhuma alteração global em Jogadores ou boxscore. Seleções excepcionalmente grandes usam referência local no navegador, com aviso discreto e nenhum corte de IDs. [Provas e limites](VALIDACAO-EQUIPES-REFINAMENTO.md).

## Classificação — decisão de 06/11/2026

Uma tabela por vez, na ordem **Pos., Equipe, J, V, D, Aprov., PP, PC, SLD, Últimos 5**. Reutilizar a apresentação de Equipes: tipografia, cores, espaçamento, largura pelo conteúdo, rolagem interna e cabeçalho/equipe fixos. Manter a escala compartilhada de 150% a partir de 640 CSS px e os tamanhos móveis. A aba identifica Classificação; título e contexto permanecem semanticamente acessíveis. Sem busca, ordenação manual, colunas configuráveis, paginação ou totais/médias. Cálculos, posições e desempates continuam vindo da projeção oficial.

Fase e grupo ficam na URL e acompanham recarga/voltar. O seletor **Grupo** só aparece com vários grupos, na ordem publicada; seleção ausente/inválida abre o primeiro grupo publicado da fase válida (ou primeira fase quando inválida).

**Últimos 5** considera somente a lineage contabilizada do grupo e fase exibidos, usando os jogos da resposta pública existente e IDs de inscrição. Incluir `played` e `awarded` confirmados; excluir pendências, cancelamentos/exclusões e conflitos. Ordenar por data, hora e ID estável, priorizar jogos datados sobre os sem data e conservar até cinco, do mais antigo à esquerda ao mais recente à direita. Não inventar datas/placares; sem resultados mostrar —.

Vitória: círculo verde e ✓ branco; derrota: círculo vermelho e × branco. Anel da mesma cor marca o mais recente. Ícones compactos informativos, sem navegação, com descrição e tooltip por hover/foco/toque: resultado, adversário, data/hora quando existentes e placar disponível. Indicar resultado administrativo sem motivos privados. Cor não é o único sinal. Evidências e limites na PR da unidade.
