# Preview isolado da PR75

Entrega em07/11/2026 (America/Sao_Paulo), smoke registrado em08/11/2026 01:35:25UTC. [PR75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75) permanece aberta/draft até aceite do responsável. [Painel](https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev/admin).

## Material e CI

- Branch `codex/campeonato-flexivel`, base903dc9cb2ab17db8fd892bf9eea3593e906ab34a.
- Produto/pacote `b450824bb7912f489ef88ac2cb3b3c0cf5f3b105`. Checkpoint b83aac9 e esta entrega são exclusivamente documentais; pacote não foi recompilado com outra identificação.
- [Run42417041244](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42417041244): scope, checks, browsers1/2, design, webkit-boundaries e validate SUCCESS. Validate concluído em07/11/2026 21:51:39UTC. Runs anteriores cancelados por pushes, não tratados como PASS.
- Pacote novo preparado após a implementação:35assets; worker.js SHA256 `0e5c714cc48c0f715326684e8a92a72487ba9ddbf793c6690b4245dc591c0609`; upload5541.61KiB/gzip1324.40KiB. Dry-run isolado PASS. Não foi usado pacote antigo de UIUX.
- Gate local inicial:775testes/163arquivos,15contratos SQL,35casos Worker,11transportes e runtime PDF; builds/tipos/lint/formato/fronteira/segredos PASS. Correções posteriores confirmadas por27testes focais e pela CI completa acima. Configuração/PDF/finalização/correção:14PASS/2SKIP; associação opcional:4PASS; rascunho incompleto e resultados sem associação:4PASS. Axe da configuração em1366/1920/mobile sem violações. Súmula mobile fora do escopo vigente.
- Revisão do autor; nenhum parecer independente declarado. PR sem comentários/revisões na consulta da entrega.

## Serviço efetivamente publicado

Comando explícito: `npx wrangler deploy --config .worker-artifacts/pr75-release/wrangler.jsonc --tag pr75-b450824 --message 'PR75 isolated preview; CI 42417041244 SUCCESS; material b450824'`. Primeira criação exigiu migration SQLite do DO; somente este Worker foi criado. Segredos adicionados em seguida pelo conector Cloudflare, gerando versões sucessivas.

| Recurso | Estado conferido |
| --- | --- |
| Conta Cloudflare | 16b4a5e0a99a031d28051ebadb4811cc |
| Worker | base-do-basquete-next-pr75 |
| Origem | https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev |
| Versão inicial | 80305b1b-31db-46f2-935b-d07bd0407798 |
| Versão ativa após segredos | 7d370f87-be7b-4028-8c1c-d8fa51ad5aa2,100% |
| Deployment ativo | 3d6eebd6-d79e-4208-af13-67e5ac31e7b6 |
| Feature | FLEXIBLE_COMPETITION=true |
| SESSIONS | SessionStore, namespace3552464a1346403ab7132137b7b39e6d próprio |
| LOGIN_LIMITER | namespace751107202611,10requisições/60s |
| Segredos presentes | SUPABASE_PUBLISHABLE_KEY e SESSION_ENCRYPTION_KEY, sem exposição de valores |
| Endereços | workers.dev habilitado, URLs alternativas de versão desabilitadas, nenhuma rota de domínio principal configurada |
| Access | app e0700da3-fde2-4f2f-b833-81e3c9abcf1b, somente política7de2233d-9114-46f0-bcf6-58ed641fec30, responsável, sessão8h |

A chave de sessão foi gerada dentro do processamento remoto Cloudflare, enviada diretamente ao cofre e não impressa/persistida localmente. Chave publicável obtida pelo conector Supabase. Não foram copiadas sessões ou segredos de outro Worker.

Configurações e deployments de `base-do-basquete-next-preview` e `base-do-basquete-next-uiux` foram lidos antes/depois e comparados integralmente: iguais. Nenhum deploy ou alteração nesses serviços.

## Smoke remoto

O runtime do conector Cloudflare bloqueou fetch externo ao hostname (403 produzido pelo próprio ambiente, não pelo Worker). Por isso o smoke HTTP foi executado pelo Node local contra o serviço remoto, com token Access temporário restrito a este app,15min, apenas em memória e entrada sem eco. Nenhuma credencial de sessão da aplicação usada.

-35assets HTTP200, todos com X-Bdb-Source=b450824bb7912f489ef88ac2cb3b3c0cf5f3b105. Hashes SHA256 correspondem ao manifesto. Em foundation.html, metadado `bb-flexible-competition=true` presente; sua remoção restaura exatamente o hash original do build.
- GET `/api/session`, GET `/api/competition-setups/b5433b13-a8f9-4baa-b4d9-08066ebf3e96`, GET `/api/regulations/b5433b13-a8f9-4baa-b4d9-08066ebf3e96/draft` e POST vazio ao finalizador retornaram401 após passar pelo Access. Nenhuma escrita executada.
- GET `/api/public/standings/b5433b13-a8f9-4baa-b4d9-08066ebf3e96`:200,26jogos, sem tieNotes/customReason.
- Rotina inicial de limpeza concorrente encontrou dependência entre política e token. Limpeza corrigida para exclusão sequencial; todos os tokens temporários desta execução revogados. Consulta final: zero tokens “PR75 smoke temporary”, só política owner-only original.
- Após revogação, GET anônimo `/admin`:302 ao login Access. Acesso autorizado de escrita deve ser validado pelo responsável; não declarado como realizado pelo smoke.

Artefatos locais ignorados: `.worker-artifacts/foundation-manifest.json`, `.worker-artifacts/pr75-release/`, `.preview-artifacts/pr75-remote-smoke-result.json` e script de smoke sem credenciais. Resultado contém apenas fonte, horário, caminhos/status e contagem pública.

## Banco e limites do aceite

Projeto `base-do-basquete-next-dev`, ref nizmasjddyrhmevvfviz, compartilhado; branching recusado pelo plano Free sem criar recurso/cobrança. Migration `20261107213937_flexible_competition_setup.sql` já aplicada, conferida no histórico e imutável. SHA256 dos bytes aplicados: `07986f45e18b89beae884e4ff3a4c2cd4a054b73edac6da405f1571bd367918b`.

Conferência após aplicação:3tabelas privadas com RLS/política deny e sem SELECT direto anon/authenticated;6RPCs administrativos sem EXECUTE anon;2leitores públicos sanitizados, search_path vazio. Zero configurações novas criadas para teste. Leitura pública26jogos/26resultados sem motivos privados. Advisors: avisos existentes de RLS sem política em officials/venues e proteção de senha; aumento esperado de3para5 funções públicas security-definer corresponde aos dois leitores sanitizados/testados. Não alterar configurações alheias para eliminar avisos históricos.

Sem DML fictício remoto, seeds Auth/admin ou publicação de dados reais para teste. Escritas sintéticas verificadas no PostgreSQL local isolado. Mudanças humanas no preview persistem no banco dev compartilhado. Autorização desta entrega não inclui serviço principal/UIUX nem merge antes do aceite. Automação de retomada pausada pela ferramenta oficial ao entregar o preview.
