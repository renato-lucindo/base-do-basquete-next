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
- Perfis com resumo curto e abas de Estatísticas/Jogos, mais Elenco para equipe quando disponível. Preservar contratos de fontes, cobertura e identidade; dado ausente continua ausente.

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

O piloto demonstra as interações com dados locais: busca amplia fixtures já carregadas, ordenação antecede o recorte local e salvamentos existem apenas em memória. Não demonstra paginação de busca no servidor, gravação, conflitos de versão ou autorização de publicação. Importação de PDFs e Regulamento exibem explicitamente o limite do piloto, sem simular sucesso dessas operações. As tabelas de equipe/perfil são exemplos visuais, não uma nova implementação de cálculo estatístico. Categorias/temporadas do seletor reutilizam fixtures para avaliar a estrutura; não representam cobertura histórica real. O formulário de Informações reinicia suas fixtures ao sair da aba: seu feedback é demonstração, não recuperação de cadastro persistido.

## Verificação e continuidade

- `node docs/design/prototipos/reforma-uiux/build.cjs` gera o HTML autocontido; `node docs/design/prototipos/reforma-uiux/verify.cjs` tipa e verifica nove cenários com Playwright/axe. Ambos estão nos comandos de design do repositório.
- Cobertura: busca sem acento/caixa, tipos/teclado/erro/resposta antiga, filtros e retorno, escolhas de colunas/redimensionamento, ordenação completa e ausentes, cadastro/cancelamento/foco, campos proporcionais, histórico com edição pendente, 12 atletas/0/00 e retorno mobile.
- Tamanhos: 390×844, 1366×768, 1920×1080, reflow em 320 CSS px e ampliação CSS de 200%. Axe em oito telas e menus/diálogos/autocomplete abertos complementa a inspeção visual; não comprova WCAG integral nem zoom nativo de todos os navegadores.
- Saídas locais: `docs/design/.preview-artifacts/reforma-uiux/verification.json` e oito capturas. Evidências selecionadas e revisão em [VALIDACAO-REFORMA-UIUX.md](VALIDACAO-REFORMA-UIUX.md).
- Consultar cota real ao iniciar, antes de gate e durante execução. Ao atingir 15% restante na janela de 5h, fazer checkpoint e agendar a mesma retomada para reset observado + dois minutos conforme CONTRIBUTING.md. Aceite visual pendente não é pausa por cota e não autoriza automação de aprovação.
