# Base do Basquete — nova implementação

Projeto novo, especificado exclusivamente pelo pacote de 22/10/2026 em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/`. Nenhum repositório ou banco anterior foi consultado.

A primeira entrega é um protótipo navegável com dados fictícios para avaliar os três percursos de `docs/EXPERIENCIA.md` do pacote. Após avaliação e feedback incremental, o responsável autorizou a fundação real; o preview fictício permanece disponível.

## Avaliar de outra máquina

[Abrir o protótipo protegido](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/) e [ver as composições](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/docs/evidencias/). No Cloudflare Access, usar `renato.lucindo.jr@gmail.com` e o código recebido por e-mail. Apenas essa identidade está autorizada. Login humano e aceite dos percursos ainda dependem da avaliação do responsável.

O Access protege esta apresentação fictícia. Os rascunhos são próprios de cada navegador e não sincronizam entre máquinas. Roteiro em `docs/VALIDACAO-PROTOTIPO.md`.

O [preview com persistência real](https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/) tem Worker e build próprios, protegidos pelo Access e pelo login interno por senha. Permite criar/editar campeonato, temporadas e disputas na mesma página, buscar e retomar o trabalho; Recentes muda após salvar, não ao visitar. Versões e comandos idempotentes protegem a gravação. Em 23/10/2026, o responsável confirmou login/recarga/saída e depois cadastro/salvamento/retomada do contexto real. Evidências em [docs/VALIDACAO-CONTEXTO.md](docs/VALIDACAO-CONTEXTO.md) e [docs/ACESSO-ADMINISTRATIVO.md](docs/ACESSO-ADMINISTRATIVO.md). Equipes, pessoas, treinadores e elencos serão entregues nas próximas unidades.

## Executar

Node 24 ou superior. `npm ci --ignore-scripts` e `npm run dev` (http://localhost:5173). O protótipo salva somente neste navegador. Não informe dados reais nem senhas. Não há autenticação interna ou publicação real de resultados nesta etapa.

`npm run dev:foundation` abre a tela independente da fundação; integrações de servidor exigem o Worker configurado, não o servidor Vite isolado. `npm run gate` verifica lint, formatação, tipos, testes de banco/Worker, builds e segredos. `npm run test:e2e` percorre protótipo e tela de acesso em navegador; requer Chromium do Playwright (`npx playwright install chromium`). O harness original tem instalação e comandos independentes, descritos no README do pacote; não altere seus insumos.

## Acompanhar

- `docs/PLANO-PROTOTIPO.md`: unidade e critérios.
- `docs/PROGRESSO.md`: checkpoint e próximo passo.
- `docs/VALIDACAO-PROTOTIPO.md`: roteiro e evidências da apresentação.
- `docs/decisoes/001-prototipo-local.md`: limites e evolução para o monólito full-stack.

Os documentos originais mantêm sua autoridade de especificação. Documentos deste repositório registram execução e decisões, sem substituir contratos do pacote.

## Fundação do banco

Projeto independente de desenvolvimento: `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`), organização `base-do-basquete`, São Paulo. Migrations em `supabase/migrations`; tipos gerados do schema real em `src/server/database.types.ts`. Nenhum cadastro de negócio ou conta administrativa é criado por seed.

`npm run test:db` cria PostgreSQL descartável em memória com PGlite e verifica criação do zero, upgrade e contrato SQL de acesso. O mesmo contrato em `supabase/tests/admin_access.sql` foi verificado no Supabase real com rollback; não executar contra outro projeto por conveniência. O gate inclui esses testes. Migrations novas: consultar `npx --yes supabase@2.121.0 migration new --help` e gerar pelo CLI. Configuração local não altera automaticamente o Auth remoto. Decisão e limites em `docs/decisoes/003-autorizacao-e-migrations.md`.
