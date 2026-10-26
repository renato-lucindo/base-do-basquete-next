# 018 — Consulta de equipes conserva inscrição e fontes publicadas

26/10/2026. ESCOPO§8 pede tabela de equipes com busca/ordem/totais/médias e detalhe com estatísticas, elenco e jogos. Esta unidade independente consome somente os resultados já publicados na fonte confirmed-statistics-v1. Política para inscritos sem resultado e agenda futura permanece sem resposta; não antecipar sua exposição nem buscar elenco/cadastro live para preencher lacunas.

Linha de tabela é inscrição na disputa. Mesmo teamId com Lobos/Lobos B conserva dois registrationIds; o detalhe recebe o vínculo explícito. Nome de exibição vem de ocasião pública com proveniência e aliases; participantes e jogos preservam nomes/camisas da ocasião. Uma lista de relacionados publicada não é chamada elenco atual. DNP permanece distinguível de ausência/zero, sem adicionar jogo ou observação individual.

J coletivo conta partidas publicadas por inscrição. PP/PC/saldo usam placar oficial publicado; médias dividem por partidas cobertas, não somam médias dos jogadores. Valores coletivos avançados do PDF conservam a partida e a origem: maior vantagem ou pontos por posse não viram somas artificiais. Não inferir rebotes coletivos pela soma incompleta dos atletas, nem pontos de classificação/vencedores administrativos a partir de regras/decisões privadas.

Reutilizar RPC pública fechada já existente, sem novaDDL/credencial/SDK no browser. Backend valida fonte inteira antes de filtro e produz DTOs mínimos, com paginação20 independente dos totais. Correções G4 já versionam a fonte atomicamente; sem cache ou duplicação de publicação. Limites explícitos do contexto evitam truncar silenciosamente totais.

Ruling operacional: iniciar ET1 puro na branch sequencial codex/equipes-publicas sobre84baf38 enquanto CI40262045133 verifica o perfil23eede4. Não alterar builds/manifesto/payload do perfil preparado84baf38 nem publicar código ET1 por engano. Deploy do perfil, se CI aprovar, usa exclusivamente esse pacote imutável. Se a CI falhar, diagnosticar/corrigir a unidade anterior com rastreio explícito; não atribuir sua prova à nova unidade.
