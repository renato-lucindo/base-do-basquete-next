# Perfis de equipes — aceite de 22/11/2026

O responsável aceitou o HTML e autorizou implementar em 22/11/2026. A referência autocontida em `prototipos/perfil-equipes-aceito.html` usa fixtures; seus dados não devem entrar na aplicação.

- Geral: Visão geral, Competições, Elencos, Jogos, Estatísticas. Ano atual com participação pública ou último ano disponível. Campanha e cinco resultados por inscrição; cinco recentes do ano escolhido reunindo categorias por data.
- Disputa: Visão geral, Jogadores e Jogos. A visão geral contém a classificação e os coletivos completos da disputa, com a inscrição consultada destacada. Colocação final vem somente de premiação confirmada; fase/grupo vem da projeção vigente.
- Jogadores reutiliza estatísticas completas, colunas, ordenação, totais/médias e fases da página de jogadores da disputa, restrita à inscrição selecionada.
- Jogos exibe placar e contexto sem coluna Resultado. Agenda somente quando já pública. A legenda fica expandida, uma por painel, depois de todo o conteúdo.
- Conquistas à direita no desktop: pódios confirmados históricos. Geral permite categoria/naipe independentes; disputa fixa categoria+naipe, abrangendo outras competições, anos e divisões identificadas. No celular, adaptar ao padrão de jogador.
- Elencos nesta entrega significa participantes publicados de resultados por inscrição. Publicação de elenco oficial continua fora do escopo.
- Estatísticas gerais mantêm uma linha por participação, sem somar categorias. Fontes ausentes usam o estado indisponível existente, sem zeros presumidos.
- Preservar design system, escala vigente, privacidade, identidades e duas inscrições da mesma equipe; entradas da busca levam ao geral e inscrições ao contexto. Estado na URL e retorno preservados.

Aceite de protótipo e autorização de implementação não constituem deploy nem aceite do Worker implementado.
