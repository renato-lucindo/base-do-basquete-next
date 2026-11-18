# Lista administrativa de disputas

- [x] Uma disputa por linha, com filtros, busca e ordenação no servidor antes da paginação.
- [x] Adicionar como ação primária. Cadastros em diálogo e menu contextual por disputa. O detalhe abre no registro exato e a volta preserva a lista.
- [x] Validar densidade em 1366×768 e 1920×1080 a 100%, teclado, mobile e retorno.
- [ ] Confirmar a CI e a integração em `main`. Aplicar a consulta no DEV e atualizar o Worker dedicado autorizado.

## Atualização do Worker administrativo

Usar `wrangler.admin.jsonc` com o SHA validado. Essa configuração aponta para `base-do-basquete-admin`, com o banco DEV, sessão própria e login interno. O preview público tem outro destino.

1. Compilar com `npm run build:foundation`.
2. Empacotar com `npx wrangler deploy --config wrangler.admin.jsonc --dry-run`.
3. Publicar com `npx wrangler deploy --config wrangler.admin.jsonc --var BDB_SOURCE:<SHA>` após a validação da fonte e da migration.
4. Confirmar `/admin`, `/api/health`, a recusa da lista sem sessão e o cabeçalho `X-Bdb-Source`. Registrar versão, deployment e CI no checkpoint.
