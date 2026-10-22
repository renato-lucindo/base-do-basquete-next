# Experiência de uso e identidade visual

## Fluxos das tarefas

Todos os percursos mantêm contexto, filtros e trabalho pendente. Validações ocorrem junto ao campo/linha afetado; falhas de rede deixam claro o que foi e o que não foi salvo. Cadastros auxiliares usam edição na própria página ou painel/modal com retorno ao ponto inicial e foco restaurado.

## F01 — Começar e retomar

Login por senha → lista de campeonatos/edições e Recentes → abrir a disputa ou tarefa escolhida. Recentes muda apenas após gravação efetiva. A lista permite busca e contexto de ano/naipe/categoria/divisão; não deve mostrar apenas títulos ambíguos.

## F02 — Montar campeonato e disputas

Nova competição → página única com identificação, temporada, naipes, categorias e divisões opcionais → salvar → contexto com abas Informações, Equipes e elencos, Jogos e Regulamento. Campos opcionais podem ser preenchidos depois. Criar outra categoria/disputa usa a mesma página de trabalho; não exige um assistente por tabela técnica. Ao mudar de disputa, informar o contexto explicitamente.

## F03 — Equipes e elencos

Equipes e elencos → colar texto ou adicionar inscrição → prévia na página → localizar/criar equipe e definir nome público → expandir elenco → localizar/criar atleta e camisa → salvar. Duas inscrições da mesma equipe devem continuar diferenciadas. Cadastrar atleta não envia o usuário a outra seção global. Transferir apresenta equipe de origem, destino, vigência e regra aplicável; mantém fatos dos jogos anteriores.

## F04 — Importar equipes por texto

Colar lista de equipes ou blocos equipe/elenco → prévia editável → resolver nomes, camisas e identidades → confirmar itens válidos → resultado por item. Linhas pendentes continuam acessíveis com o texto fornecido. O novo atleta recebe sexo do naipe selecionado e essa regra aparece na revisão. Cadastro existente divergente não é alterado silenciosamente.

## F05 — Importar PDFs

Jogos → Importar PDFs → enviar arquivos e destino padrão → lista de arquivos com progresso, formato e estado → revisão de cada jogo no espaço de trabalho → ajustar destino, data/local, equipes e atletas → resolver/criar vínculos → selecionar prontos → Confirmar e publicar → resultado individual e links dos jogos publicados.

Trocar destino não reenvia PDF nem conserva associações incompatíveis: o sistema revalida candidatos e mantém o conteúdo extraído. Um arquivo inválido é substituível e não bloqueia os demais. Duplicidade não deve ser resolvida por publicar uma cópia silenciosa. Sair e voltar recupera rascunhos e decisões salvas. A falha da publicação de um jogo não apaga os sucessos dos outros.

## F06 — Preencher súmula

Jogos → abrir partida ou criar confronto ali mesmo → Súmula → conferir relacionados/camisas/atleta-treinador → lançar por período, equipe e camisa → revisar placar, faltas, participação e impedimentos → Confirmar e publicar → confirmação e link público na mesma área.

Rascunho e salvamento mostram estado explícito. Atleta sem ações que jogou deve poder ser marcado. Desfazer/refazer não descarta o contexto. Conflito de versão exige recarga explícita para revisar o estado do servidor; reenviar a cópia antiga não deve substituir a versão concorrente. Motivo de fallback/revisão é preenchido antes da confirmação.

## F07 — Corrigir resultado

Abrir jogo → editar a fonte aplicável → alterar e revisar → apresentar efeito sobre placar, estatísticas, classificação e chave quando houver → informar justificativa exigida → Salvar e republicar. Registrar uma nova versão, manter a anterior e não publicar rascunhos de outros jogos.

## F08 — Regulamento e exceções

Regulamento → escolher modelo e ajustar fases/grupos/pontos/desempates/séries → prévia → aplicar. Com resultados, apresentar diferenças antes de gravar. Jogos permite registrar adiamento, cancelamento, interrupção, W.O. e decisão administrativa com efeitos explícitos. Desistência apresenta as duas políticas sobre resultados anteriores antes de confirmar.

## F09 — Consultar dados

Selecionar campeonato/temporada/disputa → classificação, jogos, equipes ou jogadores → refinar filtros → abrir detalhe → voltar conservando consulta. Perfil acessível por identidade estável, inclusive após vínculo inativo. Só informações publicadas aparecem; ausência e cobertura incompleta têm explicação.

## F10 — Confirmar premiações

Resultados da edição/disputa → sugestões de colocação → revisar ordem/empates → confirmar → exposição pública. Para honrarias: selecionar atleta, competição, temporada e distinção → revisar → confirmar. Mudança posterior registra revisão, sem alterar a autoria histórica dos jogos.

## Estados que todo protótipo deve demonstrar

Carregando, vazio, salvo, não salvo, falha com nova tentativa, pendência de identidade, conflito de versão e sucesso parcial de lote. Navegação de retorno e cancelamento devem manter os dados já salvos e avisar quando houver conteúdo não salvo.


## Identidade visual

## Preferências definidas

Tema claro; linguagem sóbria e orientada a dados; azul como destaque principal. Tabelas, listas, divisores e seções compactas formam a estrutura das telas. Cards não são o padrão de navegação/listagem. O objetivo é concluir tarefas com contexto e poucas mudanças de página, não reduzir cliques à custa de clareza ou acessibilidade.

| Token | Valor |
| --- | --- |
| Azul principal | #075FCA |
| Fundo | #FFFFFF |
| Texto principal | #172033 |
| Fundo secundário | #F6F8FB |
| Fundo de destaque | #EEF6FF |
| Linha/divisor | #D9E2EE |
| Fonte | Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif |

A pilha de fontes é explícita. Nenhum arquivo de fonte está incluído; a amostra usa Inter apenas se estiver instalada e recorre à fonte de sistema. Se a implementação distribuir uma fonte, deverá incluir licença e verificar carregamento, fallback e desempenho. Não declarar que a amostra confirma a fonte efetivamente renderizada em outro dispositivo.

## Parâmetros iniciais de composição

Títulos de página: 24–32 px; subtítulos: 18–20 px; corpo e controles: 16 px; metadados/tabelas densas: 14 px com legibilidade e zoom. Usar espaçamentos base de 4/8/12/16/24/32 px. Esses valores de composição são ponto inicial para as referências visuais a avaliar, não layouts de telas já aprovados.

Priorizar hierarquia por alinhamento, tipografia e espaço. Controles agrupados por tarefa; ação principal nomeia o resultado. Botões destrutivos e publicação se distinguem também pelo texto. Rótulos e mensagens em português; detalhes de implementação pertencem a logs e documentação.

## Comportamento

Desktop favorece tabelas, expansão de elenco e teclado. Em celular, reordenar blocos e oferecer rolagem contida apenas onde a tabela exigir, sem rolagem horizontal da página inteira. Evitar ações escondidas que obriguem procurar em menus para cada linha.

Filtros e seleção de contexto devem ficar próximos dos dados. Área de importação e súmula podem ocupar espaço próprio, sempre com identificação do destino e retorno ao contexto. Mostrar não salvo/salvando/salvo/falha sem transformar cada gravação em um diálogo. Confirmar consequências relevantes, não toda pequena edição.

## Acessibilidade

Meta: WCAG 2.2 AA. HTML semântico, navegação por teclado, foco visível e não encoberto, ordem lógica, nome acessível de ícones, rótulos e erros associados aos campos. Cor nunca é o único indicador. Contraste deve ser medido nas combinações efetivas; os divisores claros da paleta não servem automaticamente como contorno suficiente de controle.

Usar texto legível a 200%, reflow em largura de 320 CSS px, áreas de toque confortáveis (referência de projeto: 44×44 px para ações principais) e respeitar redução de movimento. Popovers/modais restauram foco e não prendem teclado indevidamente. Tabelas usam cabeçalhos e relações semânticas. Não incluir Sienna visível.

Referência normativa: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Testes automatizados não substituem avaliação manual dos processos.

## Referência incluída e aprovação pendente

Abrir referencias/identidade-visual.html para consultar amostras dos tokens. Ela não é uma tela final nem um protótipo dos processos. Antes da integração completa, apresentar ao responsável referências compostas das telas-chave e um protótipo navegável conforme PROTOTIPO-E-APROVACAO.md. Registrar quais composições foram aceitas e quais precisam de ajuste.


## Primeira entrega: protótipo navegável

Usar dados fictícios, sem acesso ao banco em operação. Apresentar composições visuais e demonstrar três percursos completos para avaliação do responsável:

1. Criar campeonato/disputa numa página, importar equipes por texto e editar elenco na própria lista.
2. Importar PDFs em lote com destinos diferentes, resolver cadastros no contexto, isolar erro e confirmar/publicar os jogos prontos.
3. Selecionar/criar jogo, conferir relacionados, lançar súmula, confirmar/publicar e corrigir/republicar no mesmo percurso.

Incluir navegação de retorno, teclado, rascunho/retomada, erro de validação, falha de gravação, sucesso parcial e conflito de versão. A composição inicial pode usar uma única disputa e dados representativos; os modelos de organização completos serão implementados nas entregas correspondentes. Mostrar desktop e celular e registrar feedback/aceite na issue/PR.

Os tokens e a pilha tipográfica estão definidos. A amostra HTML é ilustrativa; nenhuma tela final ou protótipo foi declarado aprovado. Após os ajustes aceitos, implementar os percursos em entregas verticais, sem tornar todo o sistema um requisito para a primeira apresentação.

## Exemplos de importação por texto

referencias/exemplos/equipes.txt contém três equipes sem atletas. equipes-e-elencos.txt contém duas equipes e quatro atletas com camisas; 00 continua distinta de 0. pendencias.txt contém camisa repetida, camisa 100 inválida e nome que pode precisar de resolução de identidade. A prévia mantém linhas válidas e deixa os problemas corrigíveis.

Os exemplos são sintéticos. Se adotada a sintaxe “Equipe:”, explicá-la na UI. Aceitar listas ou blocos com prévia editável; não inferir camisas ausentes. Validar amostras reais antes do aceite do importador. Novo atleta recebe sexo privado do naipe do destino, com informação na revisão; identidade existente não é alterada silenciosamente.
