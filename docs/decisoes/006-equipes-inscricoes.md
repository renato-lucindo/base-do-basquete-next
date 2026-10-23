# 006 — identidade global e inscrição contextual

Equipe global e inscrição têm UUIDs e versões independentes. Nomes não são únicos e não autorizam fusão. Uma equipe pode ter várias inscrições na mesma disputa; nome público pertence à inscrição. Alterar nome/sigla global não reescreve os nomes públicos. Não há mudança de pais para inscrição já salva.

Escolha de implementação: criar equipe explicitamente na mesma área antes de inscrevê-la. A equipe já salva continua selecionável se a inscrição falhar. Isso evita regravar atributos globais implicitamente ao editar cada inscrição e não exige transação distribuída entre tarefas independentes. Dois escritores privados específicos seguem a fronteira de C1: autorização fresca primeiro, search_path vazio, nomes qualificados, grants exatos, sem SQL dinâmico nem credencial de serviço. RLS permite SELECT administrativo; clientes não escrevem tabelas.

Recibos privados distinguem operação, ator e payload, com policy restritiva false. Comando e recurso têm locks transacionais; versão vencida é PT409 e repetição exata devolve recibo. Pais/FKs são revalidados. Escritas bem-sucedidas atualizam Recentes dos campeonatos afetados, sem incrementar versão de informações C1; visitas/repetições não alteram Recentes. Locks dos campeonatos usam o namespace de C1, em ordem estável. Não declarar prova de corrida real multi-conexão a partir de testes serializados.

Contratos C2 passam no PostgreSQL descartável do zero e upgrade com dados C1, e no projeto novo Supabase real com fixtures isoladas e rollback. Confirmadas contagens reais C1 1/1/2 e equipes/inscrições/recibos C2 0/0/0 após rollback. Auth/admin 1/1 preservados. Advisor só WARN anterior de senha vazada/Pro, sem contratação. Funções de leitura invoker e [grants/RLS explícitos](https://supabase.com/docs/guides/api/securing-your-api) seguem documentação atual.

Elencos, pessoas/treinadores, importação textual, exclusão e transferências ficam nas respectivas unidades. Expansão da inscrição atualmente oferece edição da inscrição/equipe global; não fabrica atletas nem controles de cadastro ainda indisponíveis.
