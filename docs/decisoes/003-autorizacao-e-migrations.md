# 003 — autorização inicial e verificação de migrations

Estado: adotada em 23/10/2026, fundação F2.

O pacote exige uma conta administrativa por senha e nega acesso a outra conta autenticada. `public.admin_access` mantém uma única identidade Auth habilitável, sem cadastro público nem escrita pelos papéis de API. Somente a própria identidade habilitada pode consultar `user_id`/`enabled`; colunas operacionais ficam privadas. O backend consulta essa autorização com o JWT do usuário, sem service-role para acesso aos dados. Bootstrap e revogação são operações administrativas explícitas; a futura gestão de papéis não faz parte desta etapa.

RLS é ativada na mesma migration da tabela. Grants são mínimos e novas tabelas/sequências não recebem acesso automático. Novas funções criadas por `postgres` precisam de EXECUTE explícito: o default global PUBLIC do PostgreSQL não pode ser removido só por schema. Essa alteração global afeta apenas funções futuras desse proprietário; futuras migrations de qualquer schema devem conceder o que precisarem. Não foram alteradas funções existentes de Auth/Storage.

Sem Docker/psql no host, PGlite 0.5.11 executa PostgreSQL descartável em memória, exclusivamente nos testes. Uma fixture local reproduz os papéis e `auth.uid()` observado no projeto novo; não simula a integração Auth. O contrato SQL compartilhado é também executado contra Auth/papéis reais do novo Supabase, em transação revertida. Testes locais cobrem criação do zero e upgrade conservando autorização existente; o remoto cobre RLS/grants/revogação reais. Login por senha e Data API HTTP ainda exigem sua própria integração na F3.

Arquivos foram criados com `supabase migration new` no CLI fixado 2.121.0. A ferramenta oficial aplicou as migrations e atribuiu versões reais `20261023031907` e `20261023031915`; nomes locais foram reconciliados com esse histórico, sem mudar o SQL aplicado. Não houve link de CLI nem extração de credenciais do conector.
