# Contratos de domínio e integração

As regras a seguir definem o produto, independentemente de nomes físicos de tabelas, rotas e framework. Os caminhos dos módulos resolvem dentro deste pacote.


## Estatísticas dos jogadores

### Capacidades

Consulta pública por contexto e publicação: busca de atleta/equipe, filtro por várias equipes, filtros numéricos, ordenação, seleção/presets de colunas, líderes, paginação, comparação de até dois atletas e estado compartilhável em URL. Relacionado sem participação não conta como jogo disputado. Fatos de cada participação devem permanecer no contexto de origem, inclusive após transferência.

Súmula oferece dados simples realmente registrados: jogos/participação, pontos, cestas convertidas, faltas e desqualificações. Boxscore oferece métricas adicionais de acordo com a fonte. Fonte com dados incompletos não autoriza apresentar cobertura total.

### Métricas e fórmulas

| Métrica | Cálculo / condição |
| --- | --- |
| PTS | Pontos oficiais cobertos; na fonte com tentativas: 2×cestas de 2 + 3×cestas de 3 + LL convertidos |
| REB | RO + RD |
| AC/AT | Cestas de 2 + cestas de 3 / tentativas de 2 + tentativas de 3 |
| AP, 3P%, LL% | 100×soma de convertidos/soma de tentativas; indisponível com denominador zero; não média dos percentuais dos jogos |
| EF | PTS avançados + REB + AST + BR + TO − erros de quadra − erros de LL − ER; indisponível se faltar componente |
| Por jogo | Total da métrica dividido pelos jogos que cobrem aquela métrica |
| Por 30 minutos | Total coberto×1800/segundos cobertos, com amostra mínima |

Boxscore: J, MIN, PTS, REB, RO/RD, AST, ER, TO, BR, FC, FR, AC/AT, 3PC/3PT, LLC/LLT, EF, +/−, AP, 3P% e LL%. TO significa tocos; ER significa erros de posse. Retornar números com arredondamento de uma casa decimal conforme o domínio.

Exemplo: 5/10 e 1/2 → 6/12 = 50%; 15 pontos em dois jogos cobertos → 7,5; 12 pontos em 1.200 segundos → 18 por 30. Se a fonte não informou tentativas, AP permanece indisponível mesmo havendo pontos.

### Modos e cobertura do boxscore

Modos: per-game (padrão), total e per-30. Escopos: regular (padrão), playoffs e all. Fase round_robin entra em regular/all; knockout em playoffs/all; não classificada apenas em all. Não inferir fase pelo nome/data/número do jogo.

Denominadores: pontos oficiais → scoring_games_covered; métricas avançadas → advanced_games_covered; faltas cometidas → foul_games_covered; recebidas → fouls_received_games_covered. Não trocar por um único total de jogos.

Per-30 usa segundos e mínimo congelado na publicação/linha (padrão 600 segundos). Pontos por 30 usam advanced_points, sem pontos de fallback manual sem minutos cobertos. J e percentuais não escalam. +/− usa acumulado em total e média por jogo nos outros modos. MIN fica oculta/indisponível para seleção, filtro e ordenação em per-30; sua preferência é restaurada ao mudar de modo.

Célula available contém número; unavailable/null aparece como “—”; insufficient-sample/null aparece como “-” com explicação. Amostra insuficiente mantém atleta visível, mas exclui a métrica de filtros/líderes. Não substituir ausência por zero nem mostrar valor fabricado na comparação.

### Controles e validação

Backend aceita operadores >=, >, <=, < e =; até cinco filtros; busca até 80 caracteres; até 32 equipes; dois IDs positivos, únicos e seguros para comparação. Parâmetros inválidos são normalizados ou descartados conforme os parsers incluídos, sem executar expressões do usuário.

Ausência de seleção de equipe significa sem restrição; seleção explícita vazia significa nenhuma equipe. Ordenar ausentes por último. Líderes são calculados no conjunto filtrado antes da paginação, com empates e direção de melhor valor. Página boxscore tem 20 linhas. Carregar comparados fora da página atual e apresentar participação contextual sem reduzir várias inscrições à primeira linha encontrada.

Estado em URL: modo, escopo, busca, equipes, filtros, colunas, ordem, página e comparação. Troca de modo/escopo reinicia página e mantém controles compatíveis; MIN em per-30 troca ordenação para pontos e não participa dos filtros. Nome/camisa devem refletir o contexto, com “var.” se variar.



## Perfil público do jogador

Uma página por identidade de pessoa, com URL estável e contexto selecionável. Homônimos têm IDs e endereços distintos; o nome de exibição continua correto. O acesso ao histórico publicado não depende de um vínculo atualmente ativo.

### Conteúdo

1. Resumo: nome, campos públicos disponíveis, contexto, números da edição e carreira.
2. Estatísticas: recortes por competição/temporada e capacidades da fonte, totais/médias e modos aplicáveis.
3. Conquistas e honrarias: resultados e prêmios revisados/confirmados.
4. Jogos: partidas e participações publicadas com equipe/camisa da ocasião.
5. Histórico: trajetória derivada dos vínculos e participações, sem uma segunda lista manual de equipes.

Navegação acessível entre seções, links profundos e voltar/avançar. Atleta sem jogos usa estado vazio, sem zeros que pareçam resultados reais. DNP, dado ausente e participação sem ações são situações distintas.

### Dados

Nome é obrigatório. Opcionais públicos: apelido, ano de nascimento, altura, peso, posição, mão dominante, cidade/estado de origem e biografia. Equipe e camisa são contextuais. Campo opcional ausente não impede publicação do perfil.

Sexo, data completa de nascimento e registro federativo são privados. Ano público é campo distinto; não enviar nascimento completo ao browser para calcular idade. Foto e regras adicionais de visibilidade individual não fazem parte desta versão.



## Boxscore FIBA / Genius Sports

### Identificação e entrada

Formato FIBA_GENIUS_SPORTS, parser fiba-genius-v2. Extrair texto com coordenadas por página para PositionedTextItem[][]. Upload: PDF com MIME application/pdf, extensão .pdf, assinatura %PDF-, até 10 MiB e de uma a quatro páginas. Manter bytes e SHA-256 para rastreabilidade/duplicidade.

Fixtures obrigatórias em modulos/source/docs/plan/referencias/modelos-boxscore/:

- Box Score FIBA IVV vs CAC 06 maio.pdf
- Box Score FIBA ALC vs AVA 09 maio.pdf
- Box Score FIBA SAL vs SAN 09 maio.pdf

Os três documentos são variações do mesmo contrato. Reconhecer nomes quebrados em linhas, camisa 00, NJ, sinais negativos, vírgula decimal e células numéricas fundidas conforme os testes. Não usar OCR nem ampliar para layout genérico.

### Saída e validação

ParsedBoxscore, tipos e validadores em modulos/source/app/modules/boxscore/. Saída: formato/versão, competição, número do jogo, data/hora locais, duração informada, local, duas equipes e avisos. Equipe: nome, sigla, placar, parciais reais e atletas; blocos coletivos/gerais conforme ParsedBoxscoreTeamStatistics e ParsedBoxscoreGameStatistics.

Atleta: camisa, nome, titular/capitão, NJ/participação, segundos, arremessos convertidos/tentados, rebotes, assistências, erros, roubos, tocos, faltas cometidas/recebidas, plus/minus, eficiência e pontos.

Reconciliar somas dos pontos e períodos com placar; camisas únicas; convertidas/tentadas, rebotes e fórmula dos pontos coerentes. A versão fiba-genius-v2 exige blocos coletivos das duas equipes e bloco geral; ausência gera BDB_PDF_TEAM_STATISTICS_MISSING. Campos fora do tipo estruturado não se tornam requisito por aparecerem visualmente no PDF.

durationSeconds é a duração informada no documento e não automaticamente minutos regulamentares em quadra. O parser não exporta série de placar acumulado a cada cinco minutos. Converter scheduledLocal para instante no backend usando o fuso do contexto (apresentação America/Sao_Paulo), sem inventar offset no texto extraído.

Revisar associações antes de gravar. Matching não funde pessoas. Extrator/parsers não autorizam operações nem publicam jogos. Os três PDFs e suas reconciliações devem passar ao integrar o módulo.


## Boxscore Basketball Site

Formato BASKETBALL_SITE, parser basketball-site-v1. Fixture obrigatória: modulos/source/docs/plan/referencias/modelos-boxscore/Boxscore-site.pdf. A tabela de equipe continua na segunda página. Os outros três PDFs da pasta testam o extrator compartilhado no formato FIBA.

Entrada tem os limites PDF do contrato FIBA. A saída compartilha ParsedBoxscore, com equipes, placar final, data/hora locais, ginásio, camisa, nome abreviado, minutos e estatísticas individuais efetivamente disponíveis.

Sem competição, número do jogo, duração, parciais reais, plus/minus, faltas recebidas ou blocos coletivos/gerais: usar null/ausência. Derivar cestas de dois pela diferença entre arremessos de quadra e de três e validar consistência.

starter=false, captain=false e didNotPlay=false no payload do parser não equivalem a marcadores negativos informados pela fonte. A apresentação não pode afirmar reserva/capitão/DNP a partir dessa ausência. Não deduzir DNP de minuto zero.

Pré-seleção de nome abreviado exige um candidato único no contexto de equipe normalizada, camisa, inicial e sequência de sobrenomes compatíveis; último sobrenome truncado segue matching.ts. Ambiguidade ou ausência de candidato exige revisão. Similaridade isolada não autoriza vínculo definitivo.

Na persistência, um bucket game_total representa total da partida, nunca quarto real. Não dar autoridade period_scores, team_advanced ou game_advanced a esse formato sem outra fonte que forneça esses dados. A disponibilidade de plus/minus deve permanecer distinta de zero.

Verificar as quatro fixtures, continuação entre páginas, correspondência única/ambígua, equipe divergente e ausência de domínios não fornecidos. Cadastro de novo atleta segue o naipe do destino; o módulo não altera sexo de pessoa existente.


## Identidade, nomes e sugestões

Nome não é identificador único. Atleta e equipe possuem IDs estáveis; participação usa inscrição e vínculo do contexto. Homônimos devem ter perfis/URLs distintos e associação explícita na revisão. Nenhuma normalização ou similaridade autoriza fundir pessoas.

### Algoritmo incluído

normalizePersonName em modulos/source/app/modules/boxscore/matching.ts aplica NFD, remove marcas diacríticas, converte para minúsculas pt-BR, substitui caracteres fora de a–z/0–9 por espaço e compacta espaços. nameSimilarity usa 1 − distância de Levenshtein/comprimento máximo; duas strings vazias têm similaridade 1 no helper, o que não dispensa validação de nome na entrada.

suggestPlayerMatch recebe nome, camisa e candidatos com playerId, rosterEntryId, registrationId, playerName, jerseyNumber e teamName. Correspondência normalizada exata única pode ser proposta; com equipe de origem fornecida, equipe e camisa também precisam coincidir. Correspondência abreviada usa inicial e sobrenomes, ignorando partículas, com truncamento final conforme o código. Sugestões similares a partir de 0,78 aparecem ordenadas; não são escolha definitiva.

O backend fornece candidatos apenas do contexto autorizado. Revalidar vínculo, camisa e identidade na gravação; UI não transmite uma autorização de criação/vinculação só por enviar o ID escolhido.

### Equipes/inscrições

team-registration-resolution.ts procura primeiro nome público da inscrição normalizado, depois nome global da equipe, depois sigla. uniqueRegistrationCandidate retorna resultado apenas com uma correspondência. Lobos e Lobos B são inscrições diferentes mesmo quando compartilham equipe global.

### Sexo e homônimos

Novo atleta importado recebe male/female conforme o naipe de destino validado pelo servidor, com informação visível na revisão. Pessoa existente não tem sexo alterado implicitamente. Criação global requer escolha. Dado privado não entra na busca pública.

Confirmar “outra pessoa com o mesmo nome” cria identidade independente, inclusive sob concorrência; não renomear pessoa nem aceitar ID duplicado como solução. O backend e o banco devem permitir a criação explícita de homônimos sem fundir identidades.

### Exemplos de aceite

“  João  da Silva ” e “JOAO DA SILVA” normalizam para “joao da silva”. Duas pessoas com esse resultado continuam distintas. “J. Silva”, camisa 7, equipe correta só pode ser pré-selecionado quando os demais predicados do algoritmo deixarem exatamente um candidato. Empate permanece pendente.


## Súmula manual por teclado

Contrato de transcrição pós-jogo, sem relógio/minuto da ocorrência. O identificador rulesVersion do documento é FIBA_2024; o contrato descreve as regras do motor incluído, não uma certificação de conformidade integral com regulamento oficial.

### Documento e participação

Sheet contém rulesVersion, periods (4 a 12), roster, coachPlayer por lado e events (até 2.000). RosterSlot contém rosterEntryId, registrationId, side (home/away), jersey e played. Cada equipe tem de 1 a 12 relacionados; camisas 0, 00 ou 1–99, sem repetição por equipe. Atleta-treinador deve estar relacionado.

Entry contém id UUID, lado, período, alvo e código. Períodos Q1–Q4, depois OT1–OT8. Estar relacionado não significa ter jogado; ação de atleta marca participação no editor. Permitir marcar quem jogou sem ações. Validar entrada no backend mesmo se passou pela UI.

### Pontos e faltas

1: LL convertido; 2: cesta de dois; 3: cesta de três. Não registrar arremessos errados ou LL errado por atleta.

| Alvo | Códigos |
| --- | --- |
| Atleta | P/P1/P2/P3/Pc, T1/Tc, U/U1/U2/U3/Uc, D/D1/D2/D3/Dc |
| Banco B | B1/B2/Bc |
| Técnico C | C1/Cc e D/D1/D2/D3/Dc |

Sufixo numérico concede LL ao adversário; c significa compensada sem LL e mantém a falta contabilizada. P/U/D sem sufixo concedem zero LL. Não converter P em P2 por bônus coletivo automaticamente. B2 é penalidade por desqualificação no banco, sem incrementar técnicas B do treinador.

Cinco faltas excluem o atleta; duas T, duas U ou uma T+U produzem GD; D produz desqualificação direta. Rejeitar pontos/faltas atribuídos à camisa após exclusão/GD/D. Técnico recebe GD por duas C ou três B/C; D é direta.

Atleta-treinador: D como atleta propaga D ao técnico; GD do atleta propaga GD. Uma T/U de atleta combinada com uma C ou pelo menos duas B produz GD do técnico; GD/D do técnico propaga ao atleta. As condições e ordem executáveis estão em domain.ts e testes incluídos.

### Fechamento e recuperação

Quatro períodos iniciais, até oito prorrogações. Confirmar exige empate acumulado antes de cada OT e placar final sem empate. LL cobrados são inferidos das penalidades adversárias; convertidos são ações de 1 ponto. Confirmar rejeita convertidos acima dos cobrados inferidos.

Até 2.000 ações; desfazer conserva até 50 mudanças; oferecer refazer, rascunho, recuperação e controle de versão. Conflito com outra aba não deve reciclar automaticamente o token da cópia antiga. Recarga explícita permite revisar a versão do servidor antes de nova gravação.

Fonte primária PDF e fallback manual exigem decisão explícita; justificativa de fallback entre 10 e 500 caracteres. Revisão confirmada exige motivo. Na persistência da súmula, relacionados/camisas confirmados são imutáveis, mas participação pode ser corrigida. Cumprir essa regra na integração; ampliação exige decisão expressa e testes.

### Transporte e persistência

SaveRequest: requestId UUID, baseVersion inteiro não negativo, document validado, confirm booleano e reason até 500 caracteres. SaveResult: version, confirmed e requestId. SaveFailure transporta status e mensagem. server.ts define essas interfaces, sem acesso a banco ou endpoint pronto.

O serviço deve oferecer Confirmar e publicar e Salvar e republicar na própria tarefa, com consistência pública e replay idempotente. Uma chamada de salvamento da súmula sozinha não prova que a publicação ocorreu. Verificar A10–A15 no produto integrado.


## Importação e publicação

### Texto de equipes/elencos

Entrada: texto colado, contexto autorizado, intenção de listar equipes ou importar blocos de equipe com atletas. Saída de prévia: itens com nome/linha de origem, camisa opcional, candidato/ação proposta e pendências. O usuário pode corrigir, criar/vincular e confirmar sem sair da tarefa. O formato não fica limitado a um separador oculto: informar o formato aceito e permitir ajustar a prévia.

referencias/exemplos contém três arquivos sintéticos; resultados esperados são descritos em docs/EXPERIENCIA.md. Antes de concluir a funcionalidade, verificar amostras reais com o responsável; exemplos sintéticos não provam compatibilidade com qualquer lista. Não aceitar CSV/XLSX nesta versão. Não inferir sexo pelo nome: usar naipe do destino para novo atleta.

### PDF e revisão

Entrada: arquivos validados, destino padrão e opções por arquivo/jogo. Extração gera ParsedBoxscore e validação; revisão associa entidades por IDs do contexto e registra escolhas de criação. Revalidar no servidor identidades, destino, naipe, duplicidade, versões e capacidade da fonte.

Mudança de destino invalida associações incompatíveis e propõe nova resolução sem perder bytes/conteúdo extraído. Guardar decisões e estados para retomada. Falha por arquivo não cancela revisão dos demais.

### Atomicidade e publicação

Confirmar e publicar recebe um ou vários itens selecionados e oferece resultado individual. Cada jogo é a fronteira de integridade: fatos, identidades necessárias, relações, autoridade da fonte e versão pública devem ficar coerentes. O lote não é uma única transação. Se a arquitetura usar passos assíncronos, tornar estado/retry claros e impedir exposição parcial; não declarar sucesso até a confirmação da publicação.

Idempotência usa requestId/chave durável e fingerprint da intenção. Repetir pedido idêntico repete resultado, sem duplicar fatos; reutilizar chave com conteúdo diferente deve ser rejeitado. Duplicidade por hash de arquivo e jogo possível deve ser resolvida antes da gravação, considerando o contexto.

Salvar rascunho não publica. Confirmar e publicar inclui apenas o jogo selecionado e cadastros necessários, sem expor outros rascunhos. Salvar e republicar exige revisão/motivo quando aplicável e mantém versão anterior e efeitos consistentes sobre estatísticas/classificação/chave.

### Concorrência e falha

O backend valida tokens esperados contra o estado bloqueado/lido na transação. Pedido antigo permanece antigo após conflito até recarga explícita. Não aceitar um token atual obtido automaticamente para o documento desatualizado. Erro preserva entrada/rascunho e explica o próximo passo; detalhes SQL ficam em evidência técnica segura.

Testar timeout antes/depois do commit, clique repetido, recarga do browser, uma publicação com falha entre duas com sucesso, duas abas e troca do contexto informado pelo cliente.


## Operações de aplicação necessárias

Este contrato define intenções e garantias mínimas. O implementador escolhe nomes de endpoints, organização de serviços e DTOs concretos, registrando-os no novo repositório. Não é necessário reproduzir nomes de RPC como caminhos da UI.

| Intenção | Entrada mínima | Resultado/garantia |
| --- | --- | --- |
| Salvar campeonato/edição/disputas | Campos de identificação, recortes e versão esperada | Identidades/contextos criados ou atualizados numa operação de tarefa; validação contextual |
| Revisar texto | Texto, disputa e modo | Prévia editável com linhas, candidatos e pendências; nenhuma publicação implícita |
| Confirmar equipes/elencos | Itens revisados, identidades, requestId/versão | Vínculos consistentes; sexo de novo atleta derivado no servidor; retorno por item |
| Revisar PDFs | Arquivos, destinos e decisões | Extração/validação por item, duplicidade e associações no contexto |
| Confirmar/publicar jogo | ID do rascunho ou documento, resoluções, versão e chave idempotente | Estado integral e publicação coerente ou falha explícita; resultado individual |
| Salvar súmula | SaveRequest e jogo autorizado | SaveResult; versão/idempotência conforme contrato |
| Corrigir/republicar | Alterações, versão esperada e motivo aplicável | Prévia de impacto, nova versão, histórico mantido |
| Alterar regulamento/exceção | Configuração/decisão, versão e motivo | Prévia de impacto e aplicação consistente, sem apagar fatos |
| Transferir atleta | Pessoa, origem/destino e vigência | Um vínculo ativo na disputa; histórico atribuído à participação correta |
| Consultar público | Contexto, filtros e identidade/publicação | Projeção apenas de dados publicados e campos públicos, com cobertura |
| Acessar arquivo | Identidade do objeto e finalidade | Autorização de recurso e entrega temporária quando aplicável |

Toda escrita valida ator/contexto no servidor, entrada, limites, autorização, concorrência e integridade. A decisão de acesso considera ação/recurso e admite evolução futura por campeonato/função. Erros de validação devem ser associáveis a campo/item; erro de conflito deve permitir recarga explícita. Falha interna não inclui SQL ou credenciais na mensagem de produto.




## Catálogo dos módulos fornecidos

Caminhos relativos a modulos/source/. As regras matemáticas e do parser podem ser usadas diretamente; interfaces de apresentação/persistência precisam da composição do produto.

| Módulo | Insumo principal | Fronteira |
| --- | --- | --- |
| app/modules/boxscore/ | Parsers FIBA/Site, extrator, matching e resolução de inscrições | Extrator só no servidor; sugestões não autorizam gravação |
| app/modules/statistics/ | Fórmulas, modos, filtros, controles, perfil e consultas de referência | DTOs/queries dependentes de schema devem ser adaptados ao banco novo |
| app/modules/keyboard-scoresheet/ | Motor esportivo e SaveRequest/SaveResult | Não fornece editor, endpoint ou autorização |
| app/modules/ingestion/ | Comparação de fontes | Não grava nem publica |
| app/components/ | Exploradores e perfil selecionados, com testes | Referência funcional e semântica; composição segue a experiência avaliada |
| app/types/database.generated.ts | Tipos usados pelo harness dos módulos | Fixture de compatibilidade; não é schema a instalar ou mapa obrigatório do produto |
| app/modules/competition/ | Tipos/contexto necessários ao harness | public-data.server.d.ts contém somente PublicAchievement |

Antes de usar em runtime, extrair os tipos de leitura necessários para contratos de domínio, implementar queries/adaptadores do banco novo e impedir imports de infraestrutura em código de domínio/browser. Não reconstruir tabelas apenas para satisfazer um loader de referência.

## Ajustes de integração obrigatórios

- Perfil deve incluir peso/origem e Conquistas e honrarias; o DTO/componente fornecido não entrega todos esses campos sozinho.
- Vínculo inativo não oculta histórico publicado; queries não podem depender apenas de roster ativo.
- Comparação deve tratar várias participações do atleta; não escolher a primeira inscrição silenciosamente.
- Valores false de titular/capitão/DNP no parser Site não provam marcadores negativos informados pela fonte.
- Não há importador de equipes por texto nem UI administrativa completa nos módulos: implementar os percursos especificados.
- Os componentes e consultas do harness não são uma arquitetura de aplicação pronta. A arquitetura do produto é a descrita em ARQUITETURA.md.

## Casos estatísticos portáveis

referencias/estatisticas/casos.json apresenta entradas sintéticas, resultados esperados e verificações de cobertura/participação. Esses casos não dependem de tabelas físicas. Complementar a suíte com casos SQL/RLS da implementação nova, snapshots de publicação, identidade e concorrência. Testes e fixtures dos módulos permanecem junto ao código.
