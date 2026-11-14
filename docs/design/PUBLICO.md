# UI/UX público — decisões do MVP

Decisão de06/11/2026: aplicar escala/cabeçalhos dos padrões comuns. Na disputa, somente o nome publicado da inscrição, pela publicação mais recente antes dos recortes, com desempate estável. Preservar aliases/histórico; não concatenar nome global/inscrição/sigla. Exceção de apresentação aprovada em08/11/2026: o tooltip compacto dos últimos jogos usa a sigla cadastrada quando houver, conforme a seção Classificação; isso não altera a identificação nas tabelas. Fora da disputa, manter o nome principal. PP% e5F compartilham Participação nos Pontos e Exclusões por cinco faltas em todos os controles/explicações. O título visível Equipes é substituído pela identificação semântica sem repetição da aba.

Decisões da conversa de 29/10/2026, atualizadas com os contratos aprovados pelo responsável em 02/11/2026: ordem fixa de navegação e publicação explícita do regulamento completo, inclusive participantes e agenda sem resultados. Orientam a implementação; aceite dessas regras não constitui prova de que o fluxo esteja implementado, implantado ou validado pelo responsável. Consulte [MATRIZ-ESCOPO.md](../MATRIZ-ESCOPO.md) e [PROGRESSO.md](../PROGRESSO.md) para o estado real.

Decisão de07/11/2026: no novo percurso de [campeonato flexível](../decisoes/022-campeonato-flexivel.md), a classificação acompanha configuração aplicada e resultados finalizados, sem publicação adicional. Pendências de associação são explícitas e os jogos continuam disponíveis. Rascunhos e justificativas privadas continuam invisíveis. O contrato anterior permanece nos serviços ainda sem a feature.

## Encontrar e abrir uma disputa

1. A página inicial lista as **competições**, com busca no topo. A busca global cobre competições, disputas, equipes e jogadores; **não** busca jogos no MVP.
2. O catálogo **Campeonatos** agrupa por **Ano → Campeonato → Naipe**. Anos aparecem do mais recente ao mais antigo e categorias/divisões ficam visíveis como links diretos. Inclui disputas confirmadas sem jogos. Divisão ausente não cria rótulo adicional.
3. No desktop, os grupos **Masculino** e **Feminino** ficam lado a lado quando existirem ambos. Com apenas um naipe, não criar coluna vazia. No celular, os grupos ficam um abaixo do outro.
4. O painel junto ao nome do campeonato mostra as disputas da edição atual sem níveis recolhidos.
5. Abrir uma disputa pelo catálogo leva à **Classificação**. Trocar pelo painel mantém a aba atual. O menu contextual contém **Classificação, Jogos, Equipes, Jogadores**, com indicação da disputa e retorno previsível à seleção.

```text
[ Buscar competições, equipes ou jogadores... ]

2026
  Copa ES
    MASCULINO           FEMININO
    Sub-14              Sub-14
    Sub-16              Sub-17
    Adulto · Série Ouro Sub-19
    Adulto · Série Prata
    Adulto · Série Bronze
```

Exemplo ilustrativo; respeitar dados reais de cada edição.

## Identificação dos atletas no público

Nas tabelas e demais páginas públicas, a identificação visível prioriza o apelido cadastrado (após remover espaços nas extremidades); sem apelido, exibe o nome completo. O nome completo deve permanecer disponível ao foco de teclado/leitor de tela e para consulta no perfil. A busca global é exceção: apresenta sempre o nome completo como principal e o apelido como complemento, sem restringir a pesquisa. Dados cadastrais e fatos publicados não são substituídos pelo apelido; este é apenas uma regra de apresentação.

## Páginas da disputa

| Página        | Regra de experiência                                                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classificação | Uma tabela por vez, seletor de grupo quando houver vários e navegação por fase. Se indisponível/não publicada, explicar e manter as demais páginas acessíveis. |
| Jogos         | Lista única centralizada em todas as larguras, com busca e ordenação decrescente por data; placar abre o jogo publicado e nomes abrem os perfis disponíveis.   |
| Equipes       | Listagem/tabela de desempenho e entrada no perfil da equipe.                                                                                                   |
| Jogadores     | Tabela pesquisável de estatísticas individuais e acesso ao perfil do atleta.                                                                                   |

## Jogos — aceite visual de 10/11/2026

- Usar o mesmo formato no celular e no desktop expandido: número oficial e data/horário no topo; equipes e placar centralizados; fase/série abaixo; local ao final. Nomes completos quebram linha.
- Agenda e resultados ficam juntos, com rolagem da página. Datas e horários são decrescentes; datas desconhecidas ficam ao final, horários desconhecidos depois dos conhecidos e empates preservam a ordem de entrada.
- Buscar equipe ou local sem distinguir acentos ou maiúsculas; atualizar contagem e oferecer recuperação no vazio. Zero confirmado não equivale a placar ausente, exibido como “—”. Campos desconhecidos usam “a definir”.
- Fase e posição da série vêm dos dados explícitos. Jogo único mostra somente a fase; série mostra, por exemplo, “Semifinal · Jogo 2”. Número oficial é independente do slot.
- W.O. aparece em texto normal junto da fase: “Quartas de final - W.O.”. Só uma decisão confirmada de W.O. autoriza essa identificação; placares 20 × 0 e decisões administrativas genéricas não a implicam. As etiquetas de revisão, aguardando resultado, decisão administrativa e desconsiderado não aparecem na lista pública.
- Na implementação real, o placar abre o detalhe publicado do jogo; os nomes abrem o perfil da equipe com a inscrição correta. Usar o catálogo público para confirmar os destinos, inclusive perfis disponíveis em partidas futuras. Sem publicação, não inventar uma página. O retorno conserva a disputa e a busca da lista. Esta decisão posterior substitui a ausência de links do protótipo.
- Nomes e placares clicáveis ficam sem sublinhado, inclusive no hover. Refinamento aceito posteriormente: placar confirmado em azul #1557A4, equipes em tom escuro; número/data/horário/fase/local e placar ausente em cinza neutro. Preservar os destinos reais, o foco visível por teclado e o retorno visual de interação. O destaque usa também peso/tamanho, sem depender somente da cor.
- Implementação e validação desta unidade estão em [VALIDACAO-JOGOS-PUBLICOS.md](../VALIDACAO-JOGOS-PUBLICOS.md). Aceite visual e abertura de PR não autorizam merge, deploy ou publicação de dados.

## Estatísticas e publicação

Pedido de 03/11/2026: a classificação usa exatamente **Pos., Equipe, J, V, D, Aprov., PP, PC, SLD**, nessa ordem. Aprov. é V/J × 100 e permanece indefinido antes do primeiro jogo; não é pontuação do campeonato nem critério novo de desempate. O perfil recebe a inscrição explícita. Preservar grupos, fases, decisões e empates do domínio.

Equipes reutiliza métricas, siglas, precisão, controles e tabelas de Jogadores quando a fonte coletiva for suficiente. LL% é adicional na súmula e usa soma de `freeMade`/soma de `freeTaken`; o boxscore conserva uma única coluna de LL%. Tentativas zero e cobertura incompleta são ausência, não 0%. Uma linha por inscrição, com ordenação, busca, fases publicadas, totais/médias, escolha de colunas e estado na URL. Não completar coletivos a partir de somas parciais de atletas, nem somar MIN, +/− ou participação individual em pontos como medida coletiva. Cobertura e fonte permanecem nos contratos técnicos; a apresentação de ausência segue os padrões comuns, sem parágrafos preventivos na interface.

Refinamento de 03/11 para disputas de súmula: **Pos, Equipe, J, PTS, 2P, 3P, FC, FR, LLT, LLC, LL%, T, U, GD**, nessa ordem essencial. Por jogo divide PTS/2P/3P/FC/FR/LLT/LLC/T/U/GD por J; J e o percentual ponderado permanecem. Pos é ranking estatístico da métrica ordenada, com empates compartilhados; não é classificação oficial, e nome/ausência não recebem posição estatística. Colunas manuais persistem na sessão; seleção explícita na URL prevalece. T cobre atletas e comissão/banco, excluindo a penalidade B2; GD requer total completo conferido na publicação. Pela decisão de05/11/2026, FR coletiva de súmula é FC adversária por partida; FR própria do boxscore e métricas individuais são preservadas. Publicações históricas sem cobertura conservam —. Contrato e limites em [ADR 018](../decisoes/018-equipes-de-resultados-confirmados.md#estat%C3%ADsticas-coletivas-de-s%C3%BAmula--pedido-de-03112026).

- **Jogo de súmula:** indicadores existentes no Next; **jogo de boxscore:** indicadores elegíveis do `renato-lucindo/base-do-basquete` anterior, adaptados à arquitetura Next. Nunca juntar métricas incompatíveis nem exibir zero para dado ausente.
- Preservar cobertura, unidade e fonte nos cálculos e contratos técnicos. Na interface, os rótulos e estados concretos seguem os padrões de apresentação; esta regra não autoriza explicações permanentes de funcionamento, cobertura ou participação. Atletas podem ter vínculos com equipes diferentes; nomes sozinhos não identificam pessoa ou participação.
- Reaproveitar a navegação pública bem resolvida do projeto anterior de modo seletivo, sem importar regras de publicação, contratos ou dependências antigas.
- Para as referências de súmula e estatísticas, seguir [INTEGRACAO.md](INTEGRACAO.md) e [VALIDACAO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md).
- A publicação respeita confirmação explícita e fontes públicas do Next. **Não** expor automaticamente inscrições, classificação ou agenda futura por mera existência de rascunho ou regulamento. A política aprovada está na [decisão 013](../decisoes/013-classificacao-publica-confirmada.md): confirmar uma versão completa do regulamento pode publicar seus participantes e jogos futuros sem resultado, após prévia nominal do conjunto. Mudança nas fontes exige nova prévia; alterações privadas posteriores exigem nova confirmação.
- Após confirmar, a disputa deve ser descoberta no catálogo mesmo sem resultados. A agenda indica **a definir** nos campos desconhecidos e mantém placar/vencedor ausentes. A classificação por grupo apresenta inscritos com **J=0**, totais calculáveis zerados e posição indefinida; preservar empates, dados ausentes e percentuais indefinidos. Fases/séries seguem a representação própria do domínio.
- Resultados publicados dos jogos incluídos atualizam a classificação na leitura seguinte, inclusive correções, sem divulgar alterações privadas de regulamento/agenda/efeitos. Publicar participantes não publica automaticamente elencos, perfis ou documentos; estatísticas individuais mantêm suas fontes públicas próprias. Colocações finais e premiações exigem confirmação separada.

## Reforma de UI/UX — decisão de 03/11/2026

O responsável definiu público primeiro no celular, tema claro e azul, tabela de jogadores/r6 e projeto antigo como referências. Busca global sempre visível com autocomplete e normalização de caixa/acentos, tabelas mobile com essenciais e seletor de colunas, e perfis com resumo curto e abas foram aprovados como direção. Equipe aparece uma vez na busca e oferece suas participações públicas. Não criar seções gerais independentes de toda a base.

Retirar da apresentação pública versões, datas técnicas, “Fonte do nome” e instruções internas; preservar rastreabilidade administrativa e avisos indispensáveis para interpretar cobertura/ausência. Isso substitui recomendações anteriores de exibir proveniência técnica nas linhas. Não muda elegibilidade, cálculos ou publicação.

Em 11/11/2026, o responsável aceitou a revisão HTML v9 e autorizou sua implementação na mesma PR #79, com refinamento do Histórico de equipes. A validação/Worker da revisão 4 permanecem históricos e não validam o novo código. Plano e critérios em [PLAN-PERFIL-V9.md](../PLAN-PERFIL-V9.md); execução observada em PROGRESSO.md. Evolução está **fora do escopo**.

A composição aprovada usa quatro abas: **Visão geral, Estatísticas, Carreira e Ver jogos**. Identificação: apelido, nome completo, equipe/camisa, campeonato/categoria e metadados públicos. Visão geral contém Resumo na primeira célula, linhas de ano/Carreira brancas, até cinco Últimos jogos e síntese das quatro marcas. Recordes completos ficam em Carreira. No desktop, identificação/conquistas e resumo/últimos jogos compartilham duas colunas iguais e uma divisória fina central; conquistas ocupam a direita da identificação. No celular, conquistas ficam em Carreira, com Coletivas/Individuais lado a lado inclusive em 320 px. Primeiro lugar usa troféu e os seguintes medalha, somente quando publicados; expansão pelo nome do campeonato. Ícones preservam os formatos da referência FIBA ([licença Remix Icon](https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/License)).

Confrontos dos jogos e recordes são links únicos para a partida, com mandante, placar neutro e visitante; nomes completos a partir de 1050 CSS px e siglas cadastradas no mobile. Na ausência de sigla, usar nome publicado, sem gerar código. Data DD/MM/YYYY e contexto campeonato/categoria sem ano repetido; PTS ocupa coluna própria nos jogos. Toda a linha dos jogos, incluindo data/contexto/PTS, abre a partida. Nos recordes, marca azul e área do confronto abrem a mesma partida; Ver top 5/Recolher é independente, expande somente 2º–5º, sem repetir a principal e com fundo sutil. Equipes fora de confrontos continuam abrindo a equipe, sem sublinhado.

Ver jogos integra o perfil, ordena datas decrescentes com ausentes ao final e pagina 12 atuações por vez. Lista, contagem, paginação e opções dos filtros consideram somente `fact.played` confirmado; zero ponto não exclui uma atuação. Ano, Campeonato, Equipe e Buscar adversário ficam em Filtrar e ajustar, inicialmente fechado. Estatísticas preserva seus próprios filtros, métricas e cálculos, com Total/Por jogo em botões no padrão público de Jogadores. Ambos os painéis têm rascunho: Cancelar/Fechar/Escape não aplicam alterações; Limpar prepara campos; Aplicar confirma e reinicia a paginação correspondente. Aba, filtros, página e expansões dos recordes permanecem no retorno/URL. A trajetória fica permanentemente visível, sem estado de recolhimento. Resumo, conquistas, recordes e últimos jogos não mudam com filtros estatísticos.

Estatísticas usa Ano | Idade | Campeonato | J | métricas, também no celular com rolagem interna. Conforme refinamento solicitado em 12/11/2026, categoria aparece junto ao campeonato, separada por ponto médio; omitir Adulto e manter equipe completa abaixo, sem ano repetido. FC integra o padrão, preservando seleções explícitas, inclusive vazias. Não repetir os títulos internos Por campeonato/Jogos sob as abas. Idade = ano da temporada menos publicBirthYear já publicado; sem esse dado, remover integralmente cabeçalho, células e largura da coluna. No cabeçalho, mostrar idade atual em Brasília, altura e posição quando publicados. O servidor calcula a idade em anos completos a partir da data privada confirmada ou, se houver apenas o ano, pela diferença de anos. O perfil não mostra biografia nem data completa. Trajetória agrupa somente passagens por equipe, mais recente primeiro, sem campeonatos. A linha conecta os centros dos pontos e é coberta pelos próprios pontos; não ultrapassa primeiro/último e inexiste com um único item. Anos e nomes completos ficam separados, com links reais para as equipes.

O refinamento de 12/11/2026 usa fundo cinza-azulado, superfícies principais brancas e azul suave em contexto/cabeçalhos/seleção, com os tokens públicos compartilhados. Legendas de perfil/Jogadores/Equipes usam uma mesma escala. Recordes sem marca positiva recebem estado vazio, preservando ordenação, cálculo e acesso aos jogos. Busca mantém apelido sem o prefixo Apelido:. No desktop (640px ou mais), considerar a altura natural da Visão geral desde a entrada por qualquer aba e reservar o espaço do maior conteúdo visitado, limitado à área de leitura da janela; conteúdo extenso cresce normalmente. Não deslocar a rolagem ao trocar de aba. No celular, altura natural, sem reserva para igualar abas. [Plano e provas](../PLAN-REFINAMENTO-PUBLICO.md).

**Legenda e tooltips no perfil:** aplicar os [padrões comuns](PADROES.md#textos-de-apresentação), com uma única Legenda ao final do conteúdo ativo e os mesmos nomes curtos de Jogadores/Equipes. `J` significa somente `Jogos`. Remover notas permanentes sobre participação, cobertura, fases, zero/ausência e alcance dos filtros. A regra vale também para tooltips, seletores e detalhes recolhidos; esconder o parágrafo em uma expansão não o torna adequado. Cálculos e elegibilidade permanecem inalterados. Causas e conferência da correção documental em [revisão textual do perfil](REVISAO-TEXTUAL-PERFIL.md).

Perfil de equipe mantém Estatísticas, Elenco e Jogos quando disponíveis. O jogo do piloto deve reproduzir a composição da súmula atual, sem o placar adicional reprovado. Contrato e limites em [REFORMA-UIUX.md](REFORMA-UIUX.md); integração do perfil real e preservação da súmula autorizadas pelo responsável em 04/11, na PR #51, já integrada. Após aceitar o piloto, o responsável autorizou executar em sequência o público real, busca no servidor, administração e preparação da liberação. A execução vigente fica em PROGRESSO.md; deploy e banco real exigem autorização própria.

## Integração das páginas públicas

### Partida — aceite de 10/11/2026

O protótipo desta conversa foi aceito para implementação com as decisões abaixo, que substituem orientações anteriores da súmula quando conflitantes:

- Parciais mostram somente pontos; retirar faltas coletivas dessas células.
- Elencos preservam titulares pelo nome em negrito e asterisco; quem não entrou conserva texto/fundo normais, inclusive em PTS, com — nas estatísticas. Completar cada corpo até12linhas com preenchimentos cinza vazios, sem identidade, ações ou participação nos cálculos. Colunas, linhas correspondentes e rodapés equivalentes; nomes extensos continuam legíveis.
- Refinamento posterior: as linhas de jogadores usam a mesma altura compacta de Estatísticas, na escala compartilhada. Remover o espaço vertical fixo excessivo no desktop/celular; nomes longos podem ampliar a linha necessária, sem corte ou sobreposição. Preservar foco e interação dos detalhes de faltas.
- Destacar máximos positivos de PTS/2P/3P/LL por equipe e recorte, com todos os empates. Não aplicar peso à linha inteira, zeros, ausências ou totais.
- Jogo todo/quartos/prorrogações sincronizam dados, totais, máximos e faltas; o placar final permanece visível. A consulta optativa lê somente a versão imutável publicada. PDF/legado sem cobertura não recebe períodos individuais inventados.
- O responsável confirmou manter — quando a participação no quarto não é conhecida. Titular comprova o primeiro quarto; evento individual comprova presença no período. Ausência de evento nunca comprova que o atleta não entrou. Exclusões/desqualificações respeitam a cronologia.
- Retirar 5F/GD do nome. Cinco faltas usam número vermelho/negrito em F; desqualificação usa GD junto do número, inclusive5GD, com identificação por foco, mouse e toque e detalhes na célula.
- Legenda usa definições curtas compartilhadas, com **2P e3P separados**. Não incluir Negrito/Maior valor da equipe no recorte, Parciais/Pontos acima… ou0/Zero confirmado. Cabeçalhos explicam somente o significado da sigla.

Regra global de camisas em [PADROES.md](PADROES.md):00 ao final dos números.

Cabeçalho compartilhado com busca sempre visível, tabelas dimensionadas pelo conteúdo e largura excedente após as colunas. Textos e seus cabeçalhos à esquerda; métricas à direita. Na classificação, o cabeçalho **Últimos jogos** é centralizado, conforme decisão de08/11/2026. No celular, equipe pode acompanhar a identificação do atleta para manter J/PTS acessíveis. A seleção explícita de colunas prevalece sobre a adaptação automática.

Jogos confirmados e agenda publicada usam a mesma tabela compacta por data, pesquisa de equipe/local e páginas de20. Apenas resultado publicado oferece súmula; campos desconhecidos mantêm “a definir” e placar ausente permanece —. Parciais e elencos da súmula vigente não foram redesenhados.

Versões e datas técnicas saem das linhas públicas; cobertura, siglas e distinções de ausência continuam disponíveis. Controles secundários de equipes ficam em “Mais opções”; o retorno conserva a abertura, filtros, página e rolagem. A busca neste primeiro recorte ainda usa a API existente; autocomplete e cobertura global normalizada no servidor pertencem à unidade seguinte.

## Refinamento de Jogadores — decisão de05/11/2026

Esta decisão substitui recomendações anteriores de exibir explicações extensas e painel de cobertura nessa página. Mínimo de jogos é opcional e o campo fica em branco quando o filtro estiver inativo. Jogadores usa30linhas por página, com paginação imediatamente depois da tabela e antes da legenda. Células têm padding horizontal de14px no desktop e10px no celular, mantendo colunas pelo conteúdo, altura compacta, nomes longos e rolagem interna.

Em F/T/U/5F/GD, o negrito identifica o maior valor positivo da consulta filtrada inteira, incluindo empates; zeros e ausências não recebem destaque. Não representa desempenho melhor: a comparação continua considerando menos faltas como melhor valor.

A camisa apresentada é a mais frequente por atleta/inscrição no recorte consultado, contando todas as súmulas publicadas em que foi relacionado, mesmo sem jogar. Apenas empates na frequência máxima exibem mais de uma;0 e00 permanecem distintos. Histórico de perfil/súmula e demais páginas não muda.

A legenda contém somente definições das siglas ou abreviações das colunas visíveis, conforme os padrões comuns. No cabeçalho/tooltip e na legenda de Jogadores, PP% usa **Participação nos Pontos** e5F usa **Exclusões por cinco faltas**, conforme ajuste do responsável em05/11/2026. São nomes curtos de apresentação; substituem a explicação extensa anterior de PP%. Os cálculos e definições compartilhadas com Equipes permanecem iguais. O painel “Cobertura dos dados” é removido; cobertura interna e distinção zero/ausência permanecem.

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

## Eliminatória — protótipo aceito em 08/11/2026

Na Classificação, as opções **Fase Regular** e **Eliminatórias** usam o padrão segmentado de Total/Por jogo. Eliminatórias fica disponível a partir do primeiro confronto com as duas inscrições resolvidas, sem exigir jogo ou resultado. Fase Regular só aparece no seletor quando Eliminatórias também está disponível. A tabela e os grupos continuam acessíveis sem esse seletor, com opções agrupadas por fase quando necessário. Campeonatos apenas eliminatórios abrem o quadro disponível; links antigos por fase conservam o destino correspondente.

Eliminatória mostra todas as etapas num bracket com conexões reais de vencedor/perdedor. Cada confronto tem duas linhas de equipes e colunas **Jogo1…N** (com espaço entre palavra e número na tela), com cabeçalhos dentro da borda do cartão. Fonte dos placares compacta, sem ampliar a altura do cartão para acomodar o cabeçalho; separar claramente confrontos e etapas. MD3 sempre mostra três posições, inclusive terceiro jogo dispensado como `—`; aplicar o equivalente a jogo único, ida-volta, MD5 e MD7. Ida-volta acrescenta Total somente da projeção oficial. Vitória em cada jogo em negrito; nome da classificada recebe destaque discreto apenas com decisão confirmada. Não repetir uma lista de jogos abaixo nem exigir clique para consultar placares.

Usar inscrição publicada, `A definir` para participante desconhecido e `—` para placar ausente, preservando zero. Corrigir a orientação dos placares pela inscrição, inclusive mandos alternados. Não atribuir resultado antigo a adversários recalculados em conflito. Preservar avisos concretos de revisão/empate; nenhum aviso permanente sobre funcionamento normal. Sem tooltips nos cabeçalhos completos. Mesmo quadro no celular, rolagem horizontal interna e controles por teclado/toque; nomes longos não se sobrepõem. Execução e autorização de preview na mesma PR75 estão no plano e checkpoint.

## Classificação — decisão de 06/11/2026

Apresentação atualizada por decisão de08/11/2026. A documentação foi consolidada antes das mudanças de tela. Execução, verificações e preview ficam no [plano da unidade](../PLAN-CAMPEONATO-FLEXIVEL.md#refinamento-de-apresentação--08112026) e no checkpoint; padrão aprovado não constitui evidência de deploy ou aceite humano.

Uma tabela por vez, na ordem **Pos., Equipe, J, V, D, Aprov., PP, PC, SLD, Últimos jogos**. O cabeçalho **Últimos jogos** é centralizado; o limite continua sendo cinco resultados. Reutilizar a apresentação de Equipes: tipografia, cores, espaçamento, largura pelo conteúdo, rolagem interna e cabeçalho/equipe fixos. Manter a escala compartilhada de 150% a partir de 640 CSS px e os tamanhos móveis. A aba identifica Classificação; título e contexto permanecem semanticamente acessíveis. Sem busca, ordenação manual, colunas configuráveis, paginação ou totais/médias. Cálculos, posições e desempates continuam vindo da projeção oficial.

Não inserir o bloco fixo “Classificação provisória” nem o parágrafo genérico “Resultados publicados atualizam esta consulta. Empates e pendências não confirmam colocações finais.”. Erros, ausência de resultados e pendências concretas continuam sendo comunicados quando aplicáveis. Cabeçalhos e legenda seguem os [padrões comuns](PADROES.md#textos-de-apresentação): **Equipe** e **Últimos jogos** não têm tooltip/botão de ajuda; abreviações recebem somente seu significado curto; legenda reutiliza a apresentação de Jogadores e Equipes, sem explicações adicionais.

Fase e grupo ficam na URL e acompanham recarga/voltar. O seletor **Grupo** só aparece com vários grupos, na ordem publicada; seleção ausente/inválida abre o primeiro grupo publicado da fase válida (ou primeira fase quando inválida).

**Últimos jogos** considera somente a lineage contabilizada do grupo e fase exibidos, usando os jogos da resposta pública existente e IDs de inscrição. Incluir `played` e `awarded` confirmados; excluir pendências, cancelamentos/exclusões e conflitos. Ordenar por data, hora e ID estável, priorizar jogos datados sobre os sem data e conservar até cinco, do mais antigo à esquerda ao mais recente à direita. Não inventar datas/placares; sem resultados mostrar —.

Vitória: círculo verde e ✓ branco; derrota: círculo vermelho e × branco. Anel da mesma cor marca o mais recente. Ícones compactos informativos, sem navegação, com tooltip por hover/foco/toque. Cor não é o único sinal.

O texto visual do tooltip contém **somente confronto, placar e data DD/MM**, neste formato: **`LUSB 56 x 66 IVV/Cetaf - 20/09`**. Usar a sigla cadastrada de cada equipe; na ausência, o nome publicado da inscrição, sem inventar abreviações ou concatenar identificações. Preservar a ordem das equipes do jogo e os respectivos placares. Não acrescentar horário, ano, vitória/derrota, “resultado administrativo” ou “mais recente” ao tooltip visual. Sem data, omitir o sufixo: `LUSB 56 x 66 IVV/Cetaf`. Sem placar, usar `—` nos valores ausentes: `LUSB — x — IVV/Cetaf - 20/09`, nunca presumir zero.

Preservar separadamente, na identificação acessível dos ícones, vitória/derrota e os estados necessários, incluindo resultado administrativo e resultado mais recente quando aplicáveis, sem motivos privados. Esses detalhes ficam na identificação acessível, sem entrar no tooltip visual. Evidências e limites na PR da unidade.

## Ajustes de 13/11/2026

A navegação pública mantém o fundo da superfície e preenche somente a opção selecionada. Em Equipes e Classificação, a área de conteúdo fica branca, distinta dos cabeçalhos de tabela. Escopo e modo de Equipes ficam juntos; se a largura exigir quebra, os grupos partem do mesmo alinhamento. Valor de placar na lista permanece sem preenchimento de fundo, e o traço de faltas de quem não entrou fica centralizado na súmula.

O nome do campeonato expande abaixo dele as disputas da mesma edição, com a atual destacada e um link para todos os campeonatos. O catálogo abre Classificação e o painel mantém a aba atual. Escape fecha o painel e devolve o foco ao nome do campeonato. Sites de disputa única continuam sem seletor.

A página de resultados da busca mostra até 20 itens de cada tipo por página, preservando as sugestões compactas do autocomplete. Cada jogador mostra nome completo, apelido quando houver e o nome da última equipe registrada em dados publicados, em uma linha própria. A ordem da última equipe segue data, horário e ID da partida, como no topo do perfil. Sem equipe publicada, omitir a linha.

### Ficha do atleta

Na identificação, a ficha usa até quatro linhas, na ordem: idade e ano entre parênteses, altura em cm e peso em kg, posição, cidade e UF. Exemplo: **17 anos (2009)**, **188cm, 90kg**, **Ala-Pivô / Pivô**, **São Mateus - ES**. Renderizar os valores confirmados disponíveis e ocultar linhas vazias. Data completa, mão dominante, biografia e registro federativo ficam no cadastro privado.
