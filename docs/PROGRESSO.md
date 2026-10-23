# Checkpoint — 23/10/2026, 01:38 America/Araguaina (UTC-03)

## Objetivo e próximo passo exato

Nova Base do Basquete exclusivamente pelo ZIP preservado em `especificacao`, sem consultar/clonar repositório anterior. Protótipos completos refinados com feedback; continuidade autorizada pelo responsável. F1/F2 concluídas. F3 publicada e verificada até a etapa independente da senha humana; F4 ainda pendente. Não afirmar que o login correto do administrador já foi validado.

**Dependência humana:** criar a conta no formulário Supabase deixado aberto no Chrome, projeto `nizmasjddyrhmevvfviz`, e informar somente “conta criada”. Procedimento em [ACESSO-ADMINISTRATIVO.md](ACESSO-ADMINISTRATIVO.md). E-mail `renato.lucindo.jr@gmail.com`, senha mínima 12 caracteres preenchida somente pelo responsável, “Auto confirm user?” marcado. Nenhuma senha inserida, nenhum convite enviado. A política da ferramenta de navegador exige handoff para novas credenciais; formulário preparado e handoff marcado. Captura ignorada `.preview-artifacts/admin-user-handoff.png`.

**Depois da resposta:** consultar cota real primeiro; reconciliar Git/CI/serviços. Pelo vínculo Supabase correto, ler somente identidade/estado da conta confirmada, sem hash de senha; conferir `admin_access` e inserir o UUID verificado se a tabela continuar vazia. Não substituir administrador existente nem reativar revogação silenciosamente. Responsável valida senha correta, recarga e saída no preview abaixo; nenhuma senha/token/estado autenticado em arquivos ou chat. Registrar resultados, concluir F3/F4 e pausar a automação. Próxima unidade: contextos/cadastros conforme o pacote, sem promover fixtures ao banco real. Não repetir gates de artefatos inalterados.

## Git, ambiente e autoria

- Repositório novo público: https://github.com/renato-lucindo/base-do-basquete-next. Workspace `C:/Users/12405304716/Documents/Codex/Base do Basquete-v1`; Windows/PowerShell, Node 24.18.0, npm 11.16.0, Python 3.12.3.
- Branch `feat/fundacao-acesso`, base `702efc9e21e751a40b578ae54b92028227b363b1` de `feat/prototipos-fluxos`. HEAD antes do fechamento documental **`f54ea4ca866a02c069d98baf0e02047794f4c085`**, já no remoto; obter SHA final via Git. Código publicado **`6ecfacf618d30ba6fc0346597da6fb4d539d2eca`**. Alterações posteriores só no helper de smoke/documentação.
- [PR draft #3](https://github.com/renato-lucindo/base-do-basquete-next/pull/3) empilhado sobre [PR draft #2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2), issue #1. Main `161a5b007833b0af6a0788353205bdba99b286b5` preservada, sem merge. Revisão pelo autor; revisão independente pendente.
- Mudanças não commitadas antes deste fechamento: somente documentação do agente; helper já commitado e enviado em `f54ea4c`. ZIP original preservado/ignorado; nenhuma mudança alheia encontrada. Commit/push documental na branch de trabalho; conferir árvore/remoto depois. Nenhum WIP integrado à principal.

## Fundação e verificações

F1: JSON incremental limitado por bytes reais, origem/método/media type/schema/UTF-8, cancelamento de stream excessivo, erros sanitizados, no-store/nosniff. F2: migrations próprias `20261023031907_admin_access` e `20261023031915_explicit_public_grants`, RLS/grants mínimos e tipos gerados do schema remoto. Uma identidade administrativa, sem escrita de cliente/autoatribuição. Decisão 003 registra o efeito global de revogar EXECUTE padrão de PUBLIC para funções futuras.

`npm run test:db`: criação do zero e upgrade preservando administrador em PostgreSQL descartável PGlite 0.5.11. Mesmo contrato SQL executado no Supabase real com rollback: anônimo, autenticado indevido/metadata forjada, administrador, revogação com mesmo JWT, colunas/CRUD e defaults PASS. Advisors `lints: []`. CLI fixado 2.121.0 por npx; Docker/psql/global CLI ausentes no PATH.

F3: Auth/Data API somente no Worker, sem SDK/chave de banco no browser, service-role genérica ou user_metadata para autorização. Cookie opaco assinado `__Host-bdb-session`, Secure/HttpOnly/SameSite Strict; tokens cifrados AES-GCM no Durable Object SQLite, oito horas de duração, fila de renovação/saída, autorização fresca por identidade/RLS, CSRF/origem/host/rate limit. Frontend independente sem cadastros fictícios. Decisão 004 detalha limites.

- Gate consolidado PASS: **79 unitários/10 arquivos**, transporte, dois cenários SQL, três workerd/Miniflare, lint/formatação/tipos/builds/fronteira do cliente/segredos. Dois testes de transporte adicionados depois e verificados focalmente: total atual **cinco**. Configuração/Env/dry-run também aprovados após ajustes. CI executou o gate atualizado e **34 cenários de navegador**, incluindo quatro novos da tela de acesso.
- Workerd/DO reais localmente, Auth e ASSETS substituídos por fixtures. Renovação concorrente, cookie adulterado/expirado, identidade indevida, logout, CSRF, falha de provedor e rate limit cobertos. Adaptador nativo de assets do Miniflare 5 beta retornou 500; fixture local explícita, não prova de transporte remoto. Corrigidos binding global de fetch e foco após commit do React.
- CI do código publicado [39898411474](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39898411474), job `120234092263`, SUCCESS. Helpers em `d7432bb`: [39899003570](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39899003570), job `120235967424`, SUCCESS. F2 [39894744143](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39894744143) e núcleo F3 [39897511068](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39897511068), SUCCESS. Workflow por push de código, ignora docs/README, sem deploy/segredos.
- Smoke remoto PASS: três arquivos conferidos por hash e `X-Bdb-Source` exato; health 200, sessão ausente 401, `/worker.js` 404 após Access. Senha inválida recusada pelo **Auth Supabase real**, sem cookie da aplicação. Tela em 1440×1000 e 390×844, sem erros ou browser storage. Capturas ignoradas `access-desktop.png` e `access-mobile.png` em `.preview-artifacts`, inspecionadas.
- Helper aguardava `networkidle`, impedido por conexões de fundo apesar da tela pronta. Ajustado para `domcontentloaded` + heading; smoke aprovado com esse ajuste. Access define cookies próprios; teste negativo exige ausência do cookie da aplicação. Sem alteração da aplicação por esses ajustes.
- Fechamento focal do helper em `f54ea4c`: ESLint, sintaxe Node, formatação e scan de segredos PASS. CI automática [39901121382](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39901121382), job `120242684580`: integridade e gate **SUCCESS**, em instalação do Chromium às 01:37 UTC-03; cenários de navegador ainda pendentes nessa execução. Não iniciar gate local duplicado. CI anterior dos mesmos arquivos de aplicação aprovada e válida. PR #3 atualizado com escopo/evidências/pendências atuais, mantido draft.
- Senha correta, recarga/renovação e saída do responsável em produção **pendentes**; fixtures e contrato SQL não substituem essa evidência. Nenhuma conta criada automaticamente.

## Cloudflare — fundação publicada

[Fundação protegida](https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/). Conta `16b4a5e0a99a031d28051ebadb4811cc`, Worker novo `base-do-basquete-next-preview`.

- Access antes do Worker/tráfego: app `556be918-42ad-44e5-a85f-c2783f65b2ba`, única política permanente `30cc3ab4-9331-4df6-8d13-d840c2652210`, somente e-mail do responsável. OTP existente `79079fb8-efad-42d1-a8b5-a89a488443d2`, organização `renato-lucindo-jr.cloudflareaccess.com`, sessão 8h. Hostname habilitado; previews de versão desabilitados.
- Código `6ecfacf618d30ba6fc0346597da6fb4d539d2eca`; bundle servidor SHA-256 `105b4da75334471ba9b8c7cf7b0c071224ff9941009bc2a58ddf9a0ccc6c2b30`. Upload inicial versão `1a876bbd-cad8-4e0d-b63f-5c24c42eb422`, 23/10 01:05:48 UTC-03.
- Deployment atual 100% **`9c3ceeef-a094-4f3d-9706-ba38b78493ba`**, versão **`6fbbd0e4-31e2-4cdf-9dfe-82e96fed0984`**, 23/10 **01:06:40 UTC-03** (04:06:40 UTC), origem `secret`, mesmo código/assets. Namespace DO `0411ac931ca54d289d270606c7e87ef7`, classe `SessionStore`, SQLite `v1`. Rate limit independente `862073195184`.
- Cofre: `SUPABASE_PUBLISHABLE_KEY` e `SESSION_ENCRYPTION_KEY`, nomes verificados sem ler valores. Chave AES gerada no conector e nunca devolvida; chave publicável moderna transferida só em memória ao cofre. **Não regenerar chave de cifragem no redeploy**; uploader preserva secrets. Nenhum OAuth/segredo de conexão extraído.
- Transporte reversível de módulos ES estáticos, decisão 002, por limitação já diagnosticada do upload nativo via conector. ASSETS mantido no código; manifesto limita arquivos publicados. Nunca ZIP/especificações/servidor. Helper recusa conta/nome inesperados ou Access ampliado; só 404/10007 exato significa Worker ausente. Payload/manifesto ignorados em `.worker-artifacts`.
- Todos os tokens/políticas temporários revogados, incluindo última dupla `b7289cfd-d64e-49c3-8db5-d700dcc0b2db` / `96cc17a4-34db-406e-9bd7-75053820e30c`; API confirmou exclusões e única política permanente. Credenciais transitórias cifradas para chave privada efêmera em memória, sem arquivo/estado de navegador/log.
- Checagem final anônima: raiz, HTML, health, sessão, JS, CSS e módulo servidor retornam 302 Access, sem cabeçalho da aplicação. E-mail/JWT forjados bloqueados. Um 404 transitório antes da propagação não expôs conteúdo.
- Billing 403 por escopo OAuth ausente, custos/plano Cloudflare não inferidos/alterados. Rollback: desabilitar **somente hostname novo** antes de retirar proteção; preservar banco/protótipo/serviços anteriores. Nenhum deploy/processo de credencial em andamento.

Manifesto remoto conferido:

| Arquivo                           |  Bytes | SHA-256                                                            |
| --------------------------------- | -----: | ------------------------------------------------------------------ |
| `/foundation.html`                |    480 | `9cb0496f7131789c935b6e05ac1b49c3c4c1018a75c0456376f822d0f9f5c6bb` |
| `/assets/foundation-BHjPr-YD.css` |   1790 | `993cbf78ee31fdda688e31fdb49337efc65a21060ab490571ccd28566fe0ad4f` |
| `/assets/foundation-CDaHOYkY.js`  | 223103 | `cf217cb0a661ddbbe3f9705fd7a05ef33dc64a18ccebe4d7989d71cdeceafb88` |

## Supabase — somente projeto novo

Vínculo **`link_6adaa8aab5688191b1e7ae1cddc55a82`**, organização escolhida **base-do-basquete** (`jniqbaccwwhabzokjvfu`), Free. Não usar outro vínculo, organização antiga ou `base-do-basquete-v1`. Projeto **base-do-basquete-next-dev**, ref **nizmasjddyrhmevvfviz**, `sa-east-1`, ACTIVE_HEALTHY, PostgreSQL 17.11.0.003. Custo consultado/comunicado US$ 0/mês, sem contratação paga.

Duas migrations e tabela `public.admin_access` vazia. Consulta real em 23/10 **01:21 UTC-03**: **zero usuários Auth, administradores, buckets e objetos**. Estimativa no painel pode refletir transações de teste revertidas; não usar como contagem real. Sem seeds/cadastros de negócio. Advisors sem avisos após DDL.

Plugin sem configuração de Auth: painel autenticado do projeto novo usado para signup público OFF salvo, anonymous OFF, e-mail ON, senha mínima 12 salva. “Confirm email” permanece ON. Configuração local do CLI não aplicada automaticamente ao remoto. Nenhuma exigência adicional de MFA criada. Formulário manual com auto-confirm preparado, nunca submetido. Evidência ignorada `.preview-artifacts/auth-config.png`.

## Protótipos e evidências preservadas

Protótipos fictícios em https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/, galeria `/docs/evidencias/`. Rascunhos por navegador, sem sincronização/promoção ao banco. Feedback em `AJUSTES-DE-EXPERIENCIA.md`: cores/quartos, ordenação, edição/exclusão, camisa/Enter/ação/Enter e atalhos, capitão-técnico/assistente condicional, opções no final, camisas 0→00 e cinco titulares por equipe na publicação sem pré-seleção. Treinador futuro terá tabela própria ligada à mesma pessoa; ainda não implementada.

- Fonte `169c2debcc6625804ef73367b70b9c6d3284b582`, transporte `397e12ffc6403ae495327ce3cbaeaefcaf811fab`, deployment `20864fda56fb401eaf7d2f50d4b59a6e`. Access app `6f0540c1-e616-49e1-b6d9-2be806b5a9ee`, política `fa001ad7-6d30-4e90-a8a8-c76989608e46`, responsável apenas, sem previews de versão. Preservado.
- JS `index-BtKGOTII.js` SHA-256 `88575c18e7a63635b594e8c58627d470c3388c2328dba42839c0a11758ac3389`; CSS `index-DvcHVPSP.css` `99cb852d9c5ed2b8e768eca9d58ff47d1ff3e16123595f1b5f4cafb6bee36b6a`. Inalterados; 30 cenários de navegador, 13 arquivos remotos/1.353.645 bytes e smoke completos mantêm validade. Oito capturas: duas súmulas atualizadas e seis demais preservadas, inspecionadas.
- ZIP SHA-256 `9175a685541815c07716aa7da6614e8c84d5f44c174279c2d577143abc6a915f`; README/docs lidos na ordem indicada. Integridade PASS 67 arquivos; harness PASS **126 testes/17 arquivos + typecheck**. Insumos imutáveis: não repetir por sessão/documentação.
- Leitor de tela, zoom real 200%, auditoria completa de contraste/teclado e amostras textuais reais dependem de validação específica; não declarar WCAG plena. `PROTOTIPO-E-APROVACAO.md` citado no ZIP ausente; entrega seguiu definição explícita disponível.

## Processos, cota e retomada

Servidor temporário de produção 4174 encerrado por PID/linha de comando verificados. Smokes encerrados e credenciais transitórias revogadas. Vite antigo 5173/sessão 32934 preservado, verificar processo real antes de intervir. Nenhuma migration, gate local, upload ou transferência de credencial em andamento. CI remota acima em andamento; intervenção humana no formulário pendente. Fechamento documental `d71447123b05e56276f58b2e11c67735c9ecc9f3` enviado; árvore limpa/remoto iguais antes desta atualização de estado.

Consulta real **23/10/2026 01:37:54 UTC-03**: cinco horas **71% usado / 29% restante**; semanal **38% usado / 62% restante**. Reset 5h Unix `1792743217` = **23/10/2026 05:13:37 America/Araguaina (08:13:37 UTC)**; semanal `1793293737` = **29/10/2026 14:08:57 America/Araguaina (17:08:57 UTC)**. Franquia compartilhada; não estimar, comprar créditos, mudar plano ou usar resets manuais.

Automação oficial existente `retomar-preview-base-do-basquete`, nome “Retomar fundação Base do Basquete”: ocorrência única de 23/10 00:13:28 executada. Configuração ainda ACTIVE, `COUNT=1`, sem novo despertar solicitado neste fechamento; não criar ciclo de tentativas para senha humana. Fundação pendente: pausar/excluir ao concluir F3/F4. Se cota real atingir <=15% restante: checkpoint seguro, push quando seguro e atualizar **essa mesma automação** para reset efetivo +2 minutos, confirmando sucesso. Ao despertar: cota primeiro, reconciliar tudo e preservar evidências válidas.

Checkpoints anteriores permanecem no Git.
