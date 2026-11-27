# Perfis de equipes — aceite de 22/11/2026

O responsável aceitou o HTML e autorizou implementar em 22/11/2026. A referência autocontida em `prototipos/perfil-equipes-aceito.html` usa fixtures; seus dados não devem entrar na aplicação.

- Geral: Visão geral, Competições, Elencos, Jogos, Estatísticas. Ano atual com participação pública ou último ano disponível. Campanha e cinco resultados por inscrição; cinco recentes do ano escolhido reunindo categorias por data.
- Disputa: Visão geral, Jogadores e Jogos. A visão geral contém a classificação e os coletivos completos da disputa, com a inscrição consultada destacada. Colocação final vem somente de premiação confirmada; fase/grupo vem da projeção vigente.
- Jogadores reutiliza estatísticas completas, colunas, ordenação, totais/médias e fases da página de jogadores da disputa, restrita à inscrição selecionada.
- Jogos exibe placar e contexto sem coluna Resultado. Agenda somente quando já pública. A legenda fica expandida, uma por painel, depois de todo o conteúdo.
- Conquistas à direita no desktop: pódios confirmados históricos. Geral permite categoria/naipe independentes; disputa fixa categoria+naipe, abrangendo outras competições, anos e divisões identificadas. No celular, adaptar ao padrão de jogador.
- Elencos nesta entrega significa participantes publicados de resultados por inscrição. Publicação de elenco oficial continua fora do escopo.
- Resultados já publicados continuam em jogos, campanha e sequência quando ainda não constam da classificação. Estados explícitos da projeção prevalecem para o mesmo jogo; fase e colocação oficial não são deduzidas do catálogo.
- Estatísticas gerais mantêm uma linha por participação, sem somar categorias. Fontes ausentes usam o estado indisponível existente, sem zeros presumidos.
- Preservar design system, escala vigente, privacidade, identidades e duas inscrições da mesma equipe; entradas da busca levam ao geral e inscrições ao contexto. Estado na URL e retorno preservados.

Aceite de protótipo e autorização de implementação não constituem deploy nem aceite do Worker implementado.

## Revisão autorizada em24/11/2026

Aplicar os padrões públicos vigentes de breadcrumb/status, fontes, rodapé, contornos, nomes e seleção. Na aba Jogadores, usar ordem/seletor da página da disputa e preservar a tabela durante ordenação; eliminar títulos visuais que repetem as abas em todo o perfil. Jogadores centralizam pelo conteúdo; classificação e coletivos alinham à esquerda, com contorno até a última coluna. Esta decisão substitui a centralização anterior da classificação. Placar central estável entre nomes de tamanhos diferentes. Estado vazio específico para eliminatórias, sem apagar confrontos definidos. Regressões devem verificar comportamento e tela renderizada, não somente presença de regra nos documentos.

## Refinamento permanente aprovado em 24/11/2026

- **Geral:** um seletor compacto de ano no canto direito da barra das abas, fora de `tablist`; abas com rolagem interna quando necessário. Competições mantém Todos e seu recorte histórico, demais abas usam o ano selecionado. Trocar ano em Elencos limpa a inscrição incompatível.
- **Estatísticas gerais:** contorno na largura da tabela; cabeçalho e conteúdo de Participação centralizados, como padrão específico deste perfil. Métricas conservam alinhamento numérico. Total/Por jogo fica depois dos filtros, imediatamente acima da tabela.
- **Visão geral da disputa:** Fase e Total/Por jogo na mesma linha acima dos coletivos; adaptação organizada quando não couber. Classificação à esquerda, jogadores permanecem centralizados.
- **Jogos:** apresentação compartilhada com o perfil do jogador para data/confronto/placar/contexto, sem pontos individuais. Nomes completos no desktop e siglas cadastradas no celular, com alternativa acessível do nome completo. Cinco recentes por data no recorte, reunindo categorias no geral. Lista completa usa o mesmo confronto.
- **Legendas:** seguir a grade comum em todas as abas, inclusive Elencos, uma vez ao final do conteúdo ativo. Não criar sobrescrita flex local.
- **Filtros:** o piloto lateral de24/11 foi substituído pelo padrão compartilhado de25/11 em PADROES: identificação interna/label acessível oculto, lupa e limpeza condicional. Entrada de dados em formulários continua com rótulo visível.
- **Contexto da disputa:** seguir seleção por nível e status textual de PUBLICO.md. Conferir as cinco abas gerais e as três da disputa, vazio e seletores abertos, além dos consumidores compartilhados.

Refinamento de26/11/2026: o contexto começa pelo ano e o retorno contextual substitui o caminho secundário, sem repetir equipe no breadcrumb. A classificação do perfil mantém seu bloco à esquerda; dentro dela, siglas e valores numéricos centrais, identificação textual à esquerda e nomes destacados, conforme PUBLICO.md. Demais estatísticas conservam alinhamento numérico à direita.
