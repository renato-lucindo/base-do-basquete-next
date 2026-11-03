# Liberação pública — PR #49

## Autorização e escopo

Em 03/11/2026, na conversa do domínio próprio, o responsável autorizou concluir a validação e liberar a PR #49, incluindo integração, migrations e deploy, para abrir campeonatos na raiz e administração em `/admin`. A PR #50 mantém a configuração de domínio e as rotas. Integrar #49 antes de atualizar #50; não criar uma pilha.

Revisão da PR #49 em `83ca28c8f0d5b372aa216504fa3226fb8f4f73b5` encontrou um thread pendente sobre repetir buscas após erro. Correção: cada envio tem contador próprio, permitindo repetir o termo sem mudar URL ou texto; abort controller continua descartando respostas antigas. Regressão de browser falha na primeira requisição e confirma sucesso na segunda com a mesma URL e exatamente duas chamadas.

## Validação e correções

- CI [41683662938](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41683662938) do SHA anterior: gate e design PASS; browsers 548 PASS / 109 SKIP / 1 FAIL. Falha: alinhamento lateral de Etapa em celular, diferença de 20px; não ocultada com tolerância ou timeout maior.
- Corrigida reserva do rótulo para duas linhas no mobile, compartilhada com a posição do checkbox. Teste original preservado: 2 PASS, desktop 1366/1920/zoom e mobile 390/320. Captura `game-editor-320.png` inspecionada visualmente.
- Navegação pública inteira após correção da busca: 16 browsers PASS, desktop/mobile, incluindo erros, retorno, teclado, axe, reflow e zoom. Teste isolado novo: 2 PASS.
- Banco descartável: `sheet-team-database.test.ts` e `editor-metadata-database.test.ts`, 3 testes PASS / 2 arquivos.
- Lint e formato dos arquivos alterados PASS; CI consolidada deve ser consultada no novo HEAD da mesma PR.
- Skills UI/UX e web-design-guidelines consultadas; diretrizes atuais recuperadas da fonte. Revisão do autor, sem alegação de revisão independente ou aceite humano novo.

## Migrations aplicadas

Projeto `nizmasjddyrhmevvfviz`, após inventário de tabelas/RLS/funções e testes focais. Aplicadas pelo conector oficial, em ordem, sem seed, escrita Auth/admin, alteração de publicação ou valores de credenciais:

| Nome | Versão real atribuída | SHA256 dos bytes enviados |
| --- | --- | --- |
| sheet_team_statistics | 20261103174254 | b8c12a510fb77220fbaaa86a97ad82a06a88cdb02603a3ff95acf77993f65d68 |
| game_editor_metadata | 20261103174303 | b6a1b3752835ec702f82b689718e3852d2ea7311fef0ead981b1b4f20ea847cf |

Arquivos locais renomeados dos timestamps `20261103153010` e `20261103163618` para as versões reais. Hashes antes/depois idênticos; SQL aplicado agora é imutável. Sem repair, alteração manual de ledger ou reaplicação.

Verificação real: ledger com as duas entradas, função base preservada, colunas `stage_kind` (default round_robin), `round_number`, `knockout_stage`; listagem de rodadas sem EXECUTE para anon e com EXECUTE para authenticated. 22 jogos, 17 jogos publicados e 1 autorização administrativa preservados conforme inventário. Nenhum jogo ou fato humano criado para testar.

Advisor antes/depois sem achado novo: quatro tabelas privadas com RLS sem policy (deny-by-default), wrappers públicos intencionais de classificação/disputas como SECURITY DEFINER e proteção de senha vazada desabilitada. Remediações documentadas: [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [função pública](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [função autenticada](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) e [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Não alterar grants intencionais nem contratar plano como parte desta liberação.

## Preservação e próximos passos

Revisão em worktree detached próprio `C:/Users/12405304716/.codex/worktrees/pr49-liberacao-20261103`, base no HEAD observado da mesma PR. Worktree original da branch, checkout humano e serviços de preview preservados. Temporários em `Y:/Codex-Temp/pr49-liberacao-20261103`; dependências do lockfile existente reutilizadas por junction. Nenhum deploy de código ainda.

Enviar atualização à mesma branch da PR #49 sem force push; resolver o thread após prova da correção, conferir CI/revisão e integrar com merge commit. Depois atualizar #50 por merge explícito de main, preservar `/admin`, conferir raiz pública, CI e implantação autorizada. Registrar SHAs finais, CI integrada e versão publicada no checkpoint da liberação do domínio.

## Revisão automática posterior à CI de 895dd82

A CI 41687862935 aprovou gate/design e 551 browsers (109 SKIP), mas o merge foi bloqueado pela política de conversas obrigatórias: três novos apontamentos ainda estavam abertos. Não foi usado bypass administrativo.

- Rota pública de equipes passa a aceitar dataset/preset/columns, que já eram emitidos pelo serializer. Prova HTTP Workerd com esses parâmetros retorna 200 e conserva colunas; duplicação de dataset continua 400.
- Agregação passa a receber a política de unidade do dataset inteiro, igual à apresentação da tabela. No conjunto misto, PTS permanece total em todas as linhas, inclusive equipes que só participaram de jogos de súmula. Teste com quatro inscrições e fontes distintas valida o total calculado a partir dos fatos.
- Classificação cria links de perfil somente para inscrições com jogos no catálogo de resultados publicados. Participantes sem resultados conservam nome e classificação sem link indisponível. A prova de zero jogos foi atualizada para exigir ausência de links e preservar nomes/agenda.

Validação posterior: 12 unitários de estatísticas PASS, 1 HTTP Workerd PASS, 32 browsers de navegação/classificação/colunas PASS, builds e lint/tipos PASS. Falha exploratória no teste misto: valor esperado inicial 5 não correspondia à fixture sem o lance livre adicional; corrigido para o total real 4, mantendo a comparação de todas as linhas com os fatos de origem. CI do novo SHA é obrigatória; resultado de 895dd82 não é atribuído ao código novo.
