# Lista administrativa de disputas

- A ordem inicial é Última edição, com a atividade de cada disputa registrada separadamente. Histórico sem data atribuível à disputa aparece como traço.
- Uma disputa por linha, com busca incremental, campeonatos por seleção múltipla e ordenação por categoria etária antes da paginação.
- Adicionar abre um diálogo que associa a disputa ao ano informado do campeonato. Campeonato ou ano novo são criados no mesmo salvamento. Disputas do mesmo naipe e categoria precisam de divisões distintas na mesma temporada.
- A linha abre Jogos no contexto escolhido. Visibilidade é alterada em dois cliques na linha. Editar abre os dados e as ações de situação, incluindo cancelar com motivo. Voltar conserva os filtros.
- Publicar a revisão no Worker administrativo para avaliação. Manter a PR aberta até o aceite visual do responsável.

## Organizador do campeonato

- O cadastro exige um organizador. Busque por nome ou sigla ou cadastre no próprio diálogo com nome, sigla opcional e tipo. A lista mostra a sigla ou o nome ao lado do campeonato.
- O vínculo vale para todas as temporadas e disputas. Em **Editar dados da disputa**, preencha um vínculo pendente ou altere o organizador antes da primeira publicação. O histórico mantém a troca bloqueada mesmo após ocultar ou cancelar a disputa.
- Um campeonato novo marcado como teste recebe **Admin** e aceita apenas disputas de teste. Uma disputa de teste em campeonato real herda seu organizador.
- A carga inicial vincula **FECABA** somente à **Copa ES** e ao **Circuito Capixaba de Basquete**. Confira os IDs no banco de destino antes da aplicação. Os demais registros antigos sem vínculo mostram **Não definido**.

## Atualização do Worker administrativo

Usar `wrangler.admin.jsonc` com o SHA validado. Essa configuração aponta para `base-do-basquete-admin`, com o banco DEV, sessão própria e login interno. O preview público tem outro destino.

1. Compilar com `npm run build:foundation`.
2. Empacotar com `npx wrangler deploy --config wrangler.admin.jsonc --dry-run`.
3. Publicar com `npx wrangler deploy --config wrangler.admin.jsonc --var BDB_SOURCE:<SHA>` depois de verificar a fonte, a migration e os testes do recorte. Enviar o link ao responsável para avaliação visual antes do merge.
4. Confirmar `/admin`, `/api/health`, a recusa da lista sem sessão e o cabeçalho `X-Bdb-Source`. Registrar versão, deployment e CI no checkpoint.
