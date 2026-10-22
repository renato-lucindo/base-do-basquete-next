# Base do Basquete — escopo do produto

Decisões consolidadas em 22/10/2026. Público: pessoas que consultam dados do basquete e um responsável que administra a base. Toda a definição necessária está neste pacote.

## 1. Objetivo e fundação

Construir uma aplicação de dados e histórico do basquete, com capacidade opcional de organizar campeonatos. O administrador deve cadastrar equipes e atletas, registrar jogos, importar PDFs, transcrever súmulas, corrigir resultados e publicar informações dentro do contexto da tarefa.

Organizar fases, grupos e chaves não é pré-requisito para cadastrar jogos. A interface resolve estruturas técnicas sem exigir que o usuário visite cadastros auxiliares para concluir operações simples.

- Repositório novo; TypeScript estrito e monólito modular full-stack; publicação em Cloudflare Workers; PostgreSQL, Auth e Storage no projeto Supabase novo e independente.
- Arquitetura interna, framework compatível, componentes e diretórios são escolhas do implementador. Avaliar a solução pelos fluxos, resultados, segurança e manutenção, sem transformar a disposição dos arquivos fornecidos em obrigação.
- O backend é autoritativo para regras, cálculos, autorização, validação, transições, idempotência e gravações. A apresentação no navegador não concede autoridade.
- Interfaces públicas de dados permitem apenas informação publicada e campos públicos. Banco e backend impõem a separação entre dados públicos e privados.
- Os módulos expressamente fornecidos são insumos de domínio. Integrá-los pelos seus contratos e resultados, com liberdade de composição e organização. O conjunto não é um scaffold obrigatório da aplicação.

## 2. Projeto Supabase independente

Criar um novo projeto Supabase com PostgreSQL, Auth e Storage próprios. O banco esportivo e o Storage começam vazios. Não migrar cadastros, resultados, publicações ou PDFs de produção. Não alterar nem apagar o projeto em operação.

Usar migrations próprias desde a primeira versão, geradas e testadas em ambiente de desenvolvimento/teste. Os quatro PDFs de teste acompanham os parsers e não são uma migração do acervo. Importações reais serão feitas pelo administrador após validar o novo fluxo.

Configurar a conta administrativa do responsável no novo ambiente, com login por senha e sem MFA obrigatório na primeira versão. Conferir disponibilidade/custo da conta antes de criar serviços; contratação paga exige decisão do responsável. Segredos existem apenas nos cofres de cada ambiente.

## 3. Acesso e evolução prevista

Primeira versão: uma conta administrativa com login por senha, sessão segura e autorização no servidor e no banco. Sem exigência de MFA, cadastro público, convites, gestão de usuários ou painel de permissões. Não há exceção de autenticação para preview: o mesmo modelo de acesso deve funcionar no ambiente real.

Evolução prevista: cada usuário acessará apenas os campeonatos e funções concedidos, por exemplo consultar, cadastrar, importar, corrigir, editar regulamento e publicar. Não implementar essa gestão agora. A arquitetura inicial deve:

- Separar autenticação de autorização e centralizar a decisão por usuário, ação e recurso.
- Derivar o campeonato, temporada e disputa de cada recurso no servidor.
- Permitir escopo em consultas, buscas, arquivos e operações em lote.
- Evitar que qualquer sessão autenticada signifique acesso administrativo e evitar credencial genérica que contorne toda a autorização.
- Tratar atletas e equipes como identidades esportivas globais, sem dependência estrutural de um único proprietário.
- Não antecipar uma plataforma genérica de papéis, convites ou múltiplos clientes.

## 4. Campeonato, temporada, disputa e regulamento

- Campeonato é a identidade recorrente. Temporada/edição representa o ano. Disputa é o recorte por naipe, categoria e divisão opcional.
- Criar e editar numa única página, com seções, múltiplas categorias/divisões e campos opcionais que podem ser completados depois.
- Jogos, inscrições, resultados, classificação e estatísticas ficam isolados por disputa.
- Permitir registrar jogo diretamente sem gerar tabela ou chave previamente.
- Modelos editáveis: pontos corridos, eliminatória simples, grupos seguidos de mata-mata; configuração por fase e suporte a grupos.
- Confrontos em partida única, ida e volta, melhor de 3, melhor de 5 e melhor de 7.
- Quantidade de classificados por grupo e cruzamentos configuráveis; sugestões e geração automática são opcionais, com edição dos confrontos.
- Pontuação e sequência de critérios de desempate são configuráveis a partir de critérios definidos e testados, incluindo empates entre várias equipes. Não executar fórmulas ou código arbitrário enviado pelo usuário.
- Alteração de regulamento com resultados existentes apresenta prévia de impacto, recalcula derivados afetados e registra histórico, sem reescrever os fatos das partidas.
- As regras de lançamento da súmula são as descritas em docs/CONTRATOS.md; o editor de regulamento não as torna programáveis.

## 5. Equipes, inscrições e atletas

- Criar, localizar e editar equipes e atletas no contexto da tarefa.
- Uma equipe global pode ter várias inscrições na disputa, como “Lobos” e “Lobos B”, com nomes públicos e elencos distintos.
- Um atleta pode ter apenas um vínculo ativo por vez na mesma disputa. Transferência depende do regulamento, encerra o vínculo anterior e mantém os jogos/estatísticas atribuídos à participação em que ocorreram.
- Gerenciar elenco expandindo a equipe na própria lista.
- Nome e sexo privado são obrigatórios para novo atleta. Nascimento, registro federativo e campos públicos adicionais são opcionais.
- Na importação contextual, o sexo de cada novo atleta é preenchido a partir do naipe da disputa de destino e informado na revisão. Lotes mistos usam o naipe de cada destino. Não alterar silenciosamente o sexo de atleta existente; divergências exigem resolução explícita.
- No cadastro sem disputa, solicitar o sexo. Sexo, nascimento completo e registro federativo não aparecem na consulta pública.
- Permitir pessoas distintas com nome idêntico, com confirmação explícita de nova identidade. Usar identificadores e endereços distintos; não acrescentar números ao nome de exibição para fingir distinção.
- Busca e matching apresentam contexto público disponível: apelido, equipe, categoria, temporada e ano de nascimento quando cadastrado como público. Participação passada não deve ser apresentada como equipe atual.
- Quando os dados forem insuficientes, manter a identificação pendente. Similaridade é sugestão, não autorização de fusão de pessoas.

## 6. Entradas e registro de jogos

### Equipes e elencos por texto

Aceitar texto colado contendo lista de equipes ou blocos de equipe e atletas. Exibir prévia editável de nomes, camisas e vínculos. Criar ou associar cadastros no mesmo fluxo; apontar problemas na linha/equipe e manter o restante do trabalho. Não incluir CSV/XLSX nesta versão. Exemplos sintéticos estão em referencias/exemplos/; amostras reais devem validar o percurso antes do aceite final.

### PDFs em lote

- Aceitar exclusivamente os contratos FIBA/Genius Sports e Basketball Site, usando extração e parsers fornecidos; sem OCR, parser genérico ou súmula oficial completa.
- Enviar um ou vários PDFs; selecionar destino padrão e alterar o destino de cada jogo sem reenviar arquivos. O lote pode conter várias disputas.
- Criar ou associar equipes, inscrições, atletas e jogos durante a revisão. Apresentar duplicidade de arquivo e possível jogo repetido antes da confirmação.
- Resolver ambiguidades explicitamente. Erro de um arquivo não impede revisar os demais. Permitir substituição ou nova tentativa e retomada de rascunhos.
- Selecionar jogos prontos e executar **Confirmar e publicar**. Informar sucesso/falha por jogo e manter pendências abertas.
- Atomicidade e idempotência por jogo; não exigir uma transação única para o lote. Falha de um item não desfaz os já concluídos.

### Súmula manual

Transcrição por teclado com pontos, faltas, exclusões, desqualificações, períodos, prorrogações e validações detalhadas no contrato. Selecionar jogo ou criar o confronto no percurso; conferir relacionados, camisas e participação na mesma área de trabalho. Incluir rascunho, recuperação, desfazer/refazer e proteção de versão. Justificativas de fallback ou revisão são coletadas na própria operação. Divergências entre fontes exigem decisão explícita, sem sobreposição silenciosa.

## 7. Publicação, correções e exceções

- Rascunhos podem ser salvos sem publicação. **Confirmar e publicar** conclui a tarefa sem visita posterior a outra tela.
- Publicar apenas as entidades e informações necessárias ao jogo confirmado; outros rascunhos e campos privados não entram incidentalmente no público.
- Resultado publicado é corrigido por **Salvar e republicar**, com prévia de impacto, registro da autoria e versão anterior disponível.
- W.O.: vencedor e penalidade segundo regulamento, placar administrativo quando aplicável; sem estatística individual inventada.
- Adiamento: conservar o jogo e permitir reagendamento. Cancelamento: representar explicitamente sem tratá-lo como resultado final ou 0 a 0.
- Interrupção: registrar situação e permitir conclusão posterior com o trabalho existente.
- Desistência: escolher entre manter resultados anteriores ou desconsiderá-los na classificação, com prévia e histórico.
- Decisão administrativa: registrar motivo e efeitos sobre resultado/classificação sem fabricar fatos estatísticos.
- Cadastros sem histórico/dependências podem ser excluídos. Com histórico, oferecer cancelamento, inativação ou arquivamento. Não oferecer exclusão em cascata como tarefa rotineira.

## 8. Consulta pública

### Estatísticas dos jogadores

Todas as capacidades descritas em docs/CONTRATOS.md: modos, escopos, busca, filtros, ordenação, colunas, líderes, comparação, cobertura, ausência, amostra e estado compartilhável. A súmula e o boxscore possuem capacidades diferentes. Nenhum cálculo pode inventar tentativas, minutos ou cobertura.

### Perfil do jogador

Seções **Resumo, Estatísticas, Conquistas e honrarias, Jogos e Histórico**. Recortes por competição/temporada, carreira, equipe e camisa contextual; totais/médias, jogos e trajetória. Campos públicos opcionais: apelido, ano de nascimento, altura, peso, posição, mão dominante, cidade/estado de origem e biografia. Histórico publicado permanece consultável após transferência/inativação. Não incluir foto, controle de visibilidade por campo ou regra automática por menoridade nesta versão.

### Classificação, jogos e equipes

- Classificação calculada no backend conforme regulamento, grupo, fase, desempates e decisões aplicáveis; explicar critérios usados.
- Listar jogos futuros e resultados com data, hora, local e situação quando conhecidos; exibir horários em America/Sao_Paulo. Resultado ausente não significa 0 a 0.
- Detalhe mostra placar, períodos reais, participantes e estatísticas fornecidas, com links para atletas/equipes.
- Equipes: tabela com busca, ordenação, totais/médias e detalhe com estatísticas, elenco e jogos no contexto. Sem novo explorador avançado de comparação de equipes.
- Sugerir colocações finais e exigir revisão/confirmação antes da exposição pública. Permitir honrarias individuais, como MVP, cestinha e seleção do campeonato, vinculadas a atleta, competição e temporada. Somente premiações confirmadas aparecem.

## 9. Experiência e preferência visual

- Administração inicia com lista de competições e **Recentes**, ordenados pelo último trabalho salvo (criação, edição, importação, súmula); visitar não altera essa ordem.
- Contexto da competição com abas **Informações | Equipes e elencos | Jogos | Regulamento**, acessíveis diretamente e sem ordem obrigatória.
- Ações auxiliares acontecem dentro da tarefa; importação e súmula têm área própria e retorno ao contexto com filtros e rascunhos.
- Tema claro, sóbrio e orientado a dados. Azul principal #075FCA, fundo #FFFFFF e texto #172033. Pilha tipográfica e demais tokens estão em docs/EXPERIENCIA.md.
- Listas, tabelas, divisores e seções compactas. Não usar cards como estrutura principal de navegação, cadastros e listagens. Títulos entre 24 e 32 px, com espaçamento econômico sem comprimir leitura ou alvos.
- Administração otimizada para desktop, teclado e trabalho em lote, com funções acessíveis no celular. Mensagens em português, sem detalhes internos de implementação no fluxo de produto.
- Estados claros de não salvo, salvando, salvo, falha, vazio e pendência. Confirmação para consequências relevantes, sem diálogos para toda ação simples.
- Meta WCAG 2.2 AA, semântica, foco visível, teclado, contraste, zoom e reflow. Sem Sienna visível. O aceite combina testes automáticos e manuais dos processos completos.

## 10. Validação e sequência

Antes da integração completa, apresentar protótipo navegável com dados fictícios e referências visuais para avaliação do responsável. Validar pelo menos: montar campeonato/equipes/elencos, importar PDFs em lote e preencher/corrigir súmula. A escolha de referência visual está pendente; cores, pilha tipográfica e princípios acima estão definidos.

Depois, entregar pacotes verticais conforme docs/VALIDACAO.md, verificando cenários de docs/VALIDACAO.md. Testes focais durante a iteração; gate consolidado com lint, formatação, TypeScript, testes aplicáveis, SQL/RLS, build e segredos quando a unidade estiver estável. CI/preview e evidências devem corresponder ao código publicado. Não repetir gates de código materialmente idêntico por edições somente documentais.

Código, migrations, decisões e evidências essenciais ficam versionados no novo repositório. Segredos ficam nos cofres adequados. Produção sai da origem protegida definida para esse repositório, com versão identificável, rollback e smokes proporcionais ao risco.

## 11. Fora da primeira versão

Gestão de múltiplos usuários/permissões, convites, cadastro público, exigência de MFA, notícias/editorial, OCR, formatos PDF adicionais, fórmulas executáveis no regulamento, novo explorador avançado de equipes, foto de atleta e escolha/compra/configuração de domínio próprio sem instrução específica.


## Vocabulário do produto

| Termo | Significado |
| --- | --- |
| Campeonato | Identidade recorrente do evento, por exemplo Copa Metropolitana |
| Temporada/edição | Ocorrência do campeonato em um ano, com informações compartilhadas |
| Disputa | Recorte da edição por naipe, categoria e divisão opcional; fronteira de inscrições, jogos e classificação |
| Naipe | Feminino ou masculino; contexto esportivo da disputa, base para sexo privado de novo atleta importado |
| Categoria | Recorte esportivo, como Sub-18 ou Adulto |
| Divisão | Nível ou divisão opcional, como Série A e Série B |
| Equipe | Identidade global, que pode participar de várias edições/disputas |
| Inscrição | Participação de uma equipe numa disputa, com nome público e elenco; duas inscrições da mesma equipe são distintas |
| Atleta | Pessoa identificada por ID próprio; nome não é chave única |
| Elenco/vínculo | Associação de atleta à inscrição, com camisa e vigência/status |
| Relacionado | Atleta listado para um jogo; não implica que jogou |
| Participação | Evidência de que o atleta jogou, inclusive sem pontuar ou registrar ações |
| DNP/NJ | Não jogou, quando a fonte informa essa condição |
| Jogo | Partida entre duas inscrições; pode existir sem chave gerada |
| Confronto/série | Disputa competitiva resolvida por um ou vários jogos |
| Fase/grupo | Organização opcional do regulamento; não deduzir de nomes ou datas |
| Boxscore | Documento/registro de estatísticas de uma partida |
| Súmula manual | Transcrição por teclado de pontos e faltas; sem cronômetro ou tentativas erradas por atleta |
| Fonte/domínio | Origem e conjunto de dados que pode sustentar, como placar, parciais ou estatísticas avançadas |
| Cobertura | Jogos/segundos em que uma métrica foi efetivamente informada |
| Rascunho | Trabalho salvo que não foi confirmado/publicado |
| Publicação | Versão consistente destinada à consulta pública, com identidade e histórico |
| Recentes | Trabalhos ordenados pela última gravação bem-sucedida, não pela visita |
| Conquista/honraria | Resultado coletivo ou distinção individual revisada e confirmada |
