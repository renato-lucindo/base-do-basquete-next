# Aplicação controlada das migrations da PR #38

Preparação em 29/10/2026 na branch `codex/reaproveitar-elenco-banco`. Este plano não representa aplicação remota nem autorização para DDL, deploy ou publicação de dados. O SHA final e a CI ficam na PR #38 e no checkpoint.

## Estado observado

Projeto configurado: `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`). Consulta MCP de migrations em 29/10 confirmou **49 aplicadas**, incluindo `20261028163429_game_officiating`, e ausência das três abaixo. Consulta somente de catálogo confirmou ausência de `compute_sheet_facts_v1`, `compute_sheet_facts_v2`, RPCs de reaproveitamento e tabela de recibos. Nenhuma alteração remota foi executada.

| Ordem | Migration pendente                        | Efeito                                                 |
| ----- | ----------------------------------------- | ------------------------------------------------------ |
| 1     | `20261027143904_roster_reuse_context.sql` | Consulta privada de origens/candidatos e fingerprint   |
| 2     | `20261027145431_roster_reuse_write.sql`   | Escrita transacional com recibos e linhagem imutável   |
| 3     | `20261029143000_sheet_staff_v2.sql`       | Preserva motor v1, acrescenta v2 e atualiza salvamento |

As duas primeiras têm timestamp anterior à última migration remota. Aplicar explicitamente nessa ordem; não deduzir pendências apenas pelo maior timestamp. Conferir novamente a diferença completa local/remota antes da operação e interromper se aparecer outra migration ou divergência nas 49 existentes. Migrations já aplicadas permanecem imutáveis.

## Evidência de ensaio e revisão

`src/games/pr38-upgrade-database.test.ts` monta as 49 migrations da base, publica uma súmula v1 sintética e aplica as três pendentes. Compara documento, fatos, projeção pública e histórico antes/depois. Reverte o DDL por savepoint, verifica ausência dos novos objetos e restauração do nome original do motor; reaplica e salva rascunho v2 pela RPC pública. Sem capitão, a confirmação continua recusada. Verifica grants efetivos das RPCs e isolamento dos motores internos. O cenário usa apenas PostgreSQL descartável PGlite; não comprova Supabase Auth, transporte HTTP ou concorrência multiconexão.

Revisão do próprio autor: funções privilegiadas têm `search_path=''`, autorização fresca em `admin_access` e grants explícitos; wrappers públicos são `security invoker`. Recibos/linhagem ficam privados com RLS, negação restritiva, revogação de grants e triggers de imutabilidade. Writer mantém guardas de transferência, locks de atletas antes da raiz, checagem de fingerprint/versões e replay do comando original. Testes existentes cobrem anonimato, outro usuário, revogação, falha parcial, replay e preservação de origem/destino. Não houve revisão independente; esta revisão não substitui validação remota.

Advisor remoto de segurança em 29/10: um WARN preexistente `auth_leaked_password_protection` e quatro INFO `rls_enabled_no_policy` nas tabelas privadas de locais/arbitragem. As três migrations pendentes ainda não entram nessa análise. Referências: [senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Nenhuma configuração foi alterada.

## Execução após autorização específica de ambiente e DDL

1. Fixar SHA com CI aprovada, ambiente alvo e responsável pela janela. Preferir ambiente isolado autorizado; confirmar capacidade de recuperação/backup antes de alterar ambiente com dados humanos. Registrar baseline de migrations, grants, advisors e projeções existentes sem exportar dados pessoais.
2. Executar primeiro o ensaio descartável e os testes focais. Os arquivos `supabase/tests/*.sql` e a fixture de plataforma **não podem ser usados como seed no remoto**: alguns removem/substituem o singleton de `admin_access` e inserem Auth sintético.
3. Aplicar cada arquivo completo pela ferramenta de migrations, na ordem da tabela, conferindo o registro e o resultado após cada operação. Não renumerar migrations, não reparar histórico para simular execução e não executar DML em Auth/admin. Interromper no primeiro erro.
4. Verificar catálogo: motores v1/v2 privados presentes; as três RPCs executáveis apenas por `authenticated`; tabelas de recibos/linhagem privadas com RLS e triggers. Executar advisors novamente e comparar com o baseline, investigando qualquer achado novo. Reconfirmar preservação dos documentos/publicações anteriores.
5. Só depois iniciar o teste autenticado descrito abaixo. Não disponibilizar a interface antes de backend e validação estarem completos. Deploy e proteção do preview têm autorização separada.

## Prova autenticada necessária

Em ambiente isolado autorizado, usar administrador existente e dados sintéticos identificados. Não criar, habilitar, remover ou substituir usuários/Auth/admin para acomodar testes. Se não houver sessão adequada, registrar o impedimento.

- Via RPC/HTTP real: descobrir origem/destino, consultar fingerprint, copiar seleção explícita com camisas `0`/`00`, repetir exatamente o comando e conferir o mesmo recibo/IDs sem duplicação. Conferir origem e vínculos preexistentes inalterados.
- Alterar contexto sintético e enviar intenção obsoleta: exigir conflito sem inserção parcial. Conferir recusas sem sessão e com sessão existente sem autorização, se disponível; não revogar o administrador humano para testar.
- Salvar e reler rascunho v2 com cesta antes de definir comissão. Falta sem técnico continua recusada. Preparar comissão elegível e conferir D do assistente/B2 vinculado, LL únicos, sucessão e persistência. Publicação de dados exige autorização própria.
- SQL encapsulado em transação termina em `ROLLBACK`. Testes HTTP comitam entre requisições: só executá-los em ambiente isolado com ciclo de descarte autorizado, pois recibos imutáveis não admitem limpeza por DELETE.

## Falha e recuperação

Falha dentro de uma migration transacional deve reverter seu DDL; verificar catálogo/histórico antes de repetir. Uma migration anterior já concluída permanece registrada e não deve ser reaplicada.

Após commit remoto, não editar arquivos aplicados, não apagar recibos e não tentar rollback destrutivo automático. Interromper disponibilização; conservar o serviço anterior e preparar correção por nova migration. Se já existirem documentos v2, avaliar leitura pelo serviço anterior antes de qualquer reversão de aplicação. Recuperação por backup demanda decisão explícita sobre perda de dados.

## Condição para integração

Manter PR #38 Draft enquanto as migrations não forem aplicadas e a operação autenticada não for validada no ambiente autorizado, conforme AGENTS.md. Conferir CI do SHA final e registrar revisão realizada, seus limites e aceite do responsável. Integração Git não autoriza deploy nem publicação.
