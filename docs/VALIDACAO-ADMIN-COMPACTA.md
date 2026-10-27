# Administração compacta — evidências

## V1 catálogo e transporte

- RED PostgreSQL: dois casos zero/upgrade falharam pela ausência de `list_game_venues`. Segundo RED demonstrou que uma chave só com marca combinante estreitava indevidamente a validação legada do jogo; corrigido sem mudar o contrato do jogo.
- GREEN local: `npx vitest run src/games/venues-database.test.ts src/games/preparation-database.test.ts src/text-import/matching-database.test.ts`: seis casos aprovados. Log `.preview-artifacts/venues-composition.log`, SHA256 `9fbf1fd07b609dcb6ced3746f4aa8a037f59b91161e1a4657291d8dcb400bab1`.
- Regressão de contratos existentes: `node --test tests/database.test.mjs`: 13/13 aprovados. Log `.preview-artifacts/venues-existing-contracts.log`, SHA256 `afe7dc4dd8ecb50d38bf9ae1bfa954c504f6d94a725337b31551ef170c11347e`.
- Migração aplicada uma vez no Supabase novo, ledger real `20261027001504_game_venues`; arquivo CLI inicialmente `20261027001239`, reconciliado por rename sem mudar bytes. SHA256 `6ef0c9260ec6ce7d324371ff85df05582d0cd74299b67c34e9e1e64099ae0f3d`. 48 migrations no total; imutáveis.
- `supabase/tests/game_venues.sql` executado no Supabase real com BEGIN/ROLLBACK: aprovado. Sem DML em Auth/admin; somente fixtures próprias, nenhuma alteração humana persistida. Coleta de locais existentes não reescreve jogos. RLS privada sem grants/policies é intencionalmente deny-all para acesso direto; advisor INFO `rls_enabled_no_policy` reflete essa defesa. Mantém apenas WARN conhecido de senha vazada, sem contratação.
- Tipos gerados pelo projeto novo: única adição pública `list_game_venues`. Contrato/adapter: RED por método ausente, GREEN sete testes de provider/contrato. Log `.preview-artifacts/venues-provider-green.log`, SHA256 `4ec5a5288bb03d7ada79977d2ff5388db8de1e3b49269e5095a004e2a88110c2`.
- Transporte novo em workerd/DO: um cenário focal aprovado com sessão, RPC fixa, query/offset, duplicação de parâmetros, método, limites e revogação antes do outbound. Log `.preview-artifacts/venues-workerd.log`, SHA256 `e1de507d5f2e0e5878472f867e44564adb6204755f19c7ff26caecce2bc2e23c`. Build Worker e lint focal aprovados.

## V1 interface WIP

- `tests/venues.spec.ts` teve RED real pela ausência de combobox. Componente implementado; primeira tentativa posterior falhou por duas referências sem `props.` no pai, vistas também no typecheck. Correção mínima aplicada antes da pausa.
- **Browser ainda não aprovado**: não repetir a alegação GREEN pelo nome do log. `.preview-artifacts/venues-browser-green.log` contém a execução falha, SHA256 `04c63fda0c91fadde4722900ad221879d86019d397757f6a1af4ebB7e8255b66`.
- Typecheck final após correção passou: `.preview-artifacts/venues-types-final.log`, SHA256 `444b5eb3a90b8b15034d5ba6b71b76d63b543df07421a232be1d8d02ed3021c0`.
- Próximo: reexecutar somente o browser focal, corrigir eventual comportamento, ampliar páginas/erros/retomada/fechamento e composição com Jogos antes do gate vertical.
- Nenhum gate consolidado/CI nova/deploy desta unidade. Preview ainda na fonte `3eca459`. Adicionar atleta e redesenho ainda não iniciados. Sem revisão independente/aceite humano novo.
