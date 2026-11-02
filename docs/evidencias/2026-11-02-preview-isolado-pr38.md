# Publicação isolada da PR #38

Executada em 02/11/2026, com autorização vigente do responsável para a migration incremental no dev e para o preview isolado. Sem merge ou produção.

- URL: https://base-do-basquete-next-pr38.renato-lucindo-jr.workers.dev/
- Origem: `codex/reaproveitar-elenco-banco`, SHA `bcfaabaaeeef6714473a3ec704a5f996d9201d51`, PR #38 Draft. Worktree de release destacado e limpo: `C:/Users/12405304716/.codex/worktrees/pr38-preview-20261102`.
- CI desse SHA: [41440728522](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41440728522), SUCCESS; 630 unitários e 479 browsers PASS / 109 SKIP. Gate local e regressões detalhados na [evidência da correção](2026-11-02-edicao-jogos-legados-pr38.md). Na publicação, `npm ci --ignore-scripts`, build foundation e dry-run Wrangler passaram; nenhuma alteração funcional.
- Cloudflare: Worker `base-do-basquete-next-pr38`, deployment `0217b1fc-b00f-4e68-9716-92ae908651d4`, versão 4 `a285a09b-94ad-4457-9b9f-7ea38f3cf854`, 100% confirmado pela API. Tag `pr38-bcfaaba`; mensagem inclui SHA completo e CI. ETag do script `4f387705d0785e643122c53974601f44dbd80ca3c54381771cfa20097781bae7`.
- Access criado antes de habilitar o endereço: aplicação `80aab6aa-5571-4fbd-8d11-9de1a1b76ef4`, política `d104b68e-2ccf-4e06-bd42-52da6ec47052`, somente proprietário já autorizado, mesmo IdP, duração 8h, cookie HttpOnly e sem bypass de preflight. Workers.dev ativo; URLs de versões desativadas. Requisição anônima retorna 302 para Access; navegador com SSO chega ao login administrativo.
- Sessões independentes: namespace SessionStore `3f41b710f4e349dfb9a3de474c0d5d3a`; LOGIN_LIMITER `862073195238`, 10/60. Chave nova gerada em memória e enviada diretamente ao cofre; publishable key obtida do projeto e enviada ao cofre sem arquivo. Nenhum segredo ou sessão dos Workers existentes foi copiado.

## Banco dev

Projeto `nizmasjddyrhmevvfviz`, conferido antes da operação. Aplicada exclusivamente a SQL de `20261102112205_legacy_sheet_editing.sql`, sem backfill/seeds/DML de negócio. O conector atribuiu a versão **`20261102154118`**, nome `legacy_sheet_editing`: agora 56 migrations. Trigger `sheet_jersey_authorship` habilitado; funções internas conservam search_path vazio, sem EXECUTE para anon; somente save_game mantém a execução autenticada já existente.

O ledger contém um statement com MD5 `b26d4096aa91fd54679f8a5696598220`, idêntico ao texto do arquivo enviado (trim). O arquivo original permanece imutável. **Antes de um próximo db push, reconciliar o histórico local/remoto pelo procedimento de migration repair; não reaplicar a SQL pelo timestamp original.** Não foi feita alteração manual do ledger ou renomeação de migration aplicada.

Contagens e checksums agregados, antes/depois, idênticos em 12 relações: games, game_sheets, game_sheet_entries, roster_entries, published_games, published_statistics, published_player_games, game_publication_versions, game_publication_entries, game_sheet_commands, game_officials e game_official_assignments. Não foram lidas/exportadas linhas humanas para fixtures nem feitos salvamentos de teste no dev.

Advisors de segurança sem mudança: quatro INFO de RLS sem policies nas tabelas privadas fechadas e um WARN preexistente de [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Nenhuma política foi enfraquecida.

## Preservação e limite de avaliação

Comparação JSON pela API antes/depois confirmou settings, deployments e subdomain idênticos nos dois Workers anteriores, e as aplicações Access anteriores intactas:

- Compartilhado `base-do-basquete-next-preview`: deployment `55c19586-7771-49a9-995f-a6fe827e0949`, versão `f477bd9e-4c77-48dc-a977-286a3448917e`.
- PR #46: deployment `a6e71220-bb03-468c-aafe-bf542712bc0b`, versão `aaabe60d-6f67-4c93-804d-8ea66fdcd968`, origem `a74584a32189f9ce42bdde5a3cd27eee0be4f8bd`. PR/branch não modificadas. Ambos usam o mesmo banco dev autorizado, que recebeu a migration compatível acima.

O responsável concluiu login interno no novo preview. Conferidos no navegador: lista de Jogos Sub-15; editor de jogo encerrado com início/fim e arbitragem editáveis; súmula antiga confirmada com 85 ações e placar 72×29, TO disponível e aviso de tempos não informados; preparação com campos de camisa habilitados; resultado público e estatísticas carregados. Sem alteração de campos ou salvamento remoto. Checksums das 12 relações permaneceram idênticos também após a navegação. Captura local: `.preview-artifacts/pr38-published-game-editor.png` no worktree da release. [Registro na PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/38#issuecomment-6581427021). Desktop/mobile, salvar/recarregar, conflito/reenvio e autoria foram validados com fixtures/banco descartável e na CI; isso não equivale a salvar dados humanos no preview.

Para avaliar após login: Jogos → editar jogo legado → arbitragem e início/fim reais; na súmula, acrescentar TO e trocar camisa de atleta com ações; conferir autoria/totais. Se fizer uma correção deliberada, salvar/recarregar; fonte confirmada exige motivo, e o público só muda por republicação explícita. Este preview contém a PR #38, sem incorporar a interface pública da PR #46.

