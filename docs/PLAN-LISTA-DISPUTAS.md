# Lista administrativa de disputas

- A ordem inicial é Última edição, com a atividade de cada disputa registrada separadamente. Histórico sem data atribuível à disputa aparece como traço.
- Uma disputa por linha, com busca incremental, campeonatos por seleção múltipla e ordenação por categoria etária antes da paginação.
- Adicionar abre um diálogo que associa a disputa ao ano informado do campeonato. Campeonato ou ano novo são criados no mesmo salvamento. Disputas do mesmo naipe e categoria precisam de divisões distintas na mesma temporada.
- A linha abre Jogos no contexto escolhido. Visibilidade é alterada em dois cliques na linha. Editar abre os dados e as ações de situação, incluindo cancelar com motivo. Voltar conserva os filtros.
- Publicar a revisão no Worker administrativo para avaliação. Manter a PR aberta até o aceite visual do responsável.

## Atualização do Worker administrativo

Usar `wrangler.admin.jsonc` com o SHA validado. Essa configuração aponta para `base-do-basquete-admin`, com o banco DEV, sessão própria e login interno. O preview público tem outro destino.

1. Compilar com `npm run build:foundation`.
2. Empacotar com `npx wrangler deploy --config wrangler.admin.jsonc --dry-run`.
3. Publicar com `npx wrangler deploy --config wrangler.admin.jsonc --var BDB_SOURCE:<SHA>` depois de verificar a fonte, a migration e os testes do recorte. Enviar o link ao responsável para avaliação visual antes do merge.
4. Confirmar `/admin`, `/api/health`, a recusa da lista sem sessão e o cabeçalho `X-Bdb-Source`. Registrar versão, deployment e CI no checkpoint.
