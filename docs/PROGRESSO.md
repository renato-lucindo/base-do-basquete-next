# Checkpoint — 23/10/2026, 08:26 America/Sao_Paulo (UTC-03)

## Objetivo e próximo passo exato

Nova Base do Basquete exclusivamente pelo ZIP preservado em `especificacao`, sem consultar/clonar repositório anterior. Protótipos completos refinados com feedback; continuidade autorizada pelo responsável. **Fundação F1–F4 concluída**, com CI, banco/RLS, transporte protegido e percurso real de acesso. Responsável confirmou **“Entrada, recarga e saída funcionaram”** em resposta ao roteiro de validação. Evidência humana do preview publicado, sem captura de senha/token/estado autenticado. Revisão independente do PR ainda pendente; não equivale a aceite de produção.

**Conta criada e habilitada:** responsável informou “conta criada”. No projeto correto, identidade exata `renato.lucindo.jr@gmail.com` confirmada, não anônima, não excluída/não banida; um usuário Auth e nenhum administrador antes do vínculo. Bootstrap operacional em transação com bloqueio da tabela, validação da identidade e recusa de administrador preexistente. Confirmado **um único administrador, habilitado e correspondente ao responsável**. Nenhuma senha/hash de senha consultado ou armazenado; nenhuma credencial nova gerada. Procedimento em [ACESSO-ADMINISTRATIVO.md](ACESSO-ADMINISTRATIVO.md).

**Unidade atual C1 — etapa 3 autorizada por “proximo bloco”:** plano em `docs/superpowers/plans/2026-10-23-contexto-cadastros.md`. C1.1 concluída: contrato compartilhado normaliza nomes e recusa IDs/anos/disputas repetidos; PostgreSQL recebe agregado atômico, versão e comando idempotente. Migrations remotas `20261023112423_competition_context` e `20261023112534_competition_receipt_deny` aplicadas no projeto novo, histórico local reconciliado. Tabelas de campeonato/edição/disputa e recibos privados permanecem vazios após contrato SQL real com rollback. Conta única preservada. Tipos gerados; RLS/grants e autorização do escritor privado delimitado em decisão 005. Advisor: somente aviso Auth de proteção contra senhas vazadas, funcionalidade Pro; plano Free não alterado.

**Próximo passo exato:** C1.2, adaptador servidor `src/competition/provider.ts`, operação autorizada na fila de `PersistentSession` e RPCs específicos do SessionStore, sem exportar JWT. Rotas HTTP da mesma origem e tela de campeonato/temporadas/disputas em C1.3. Verificar contrato/sessão/HTTP focalmente e depois gate estável/CI/preview protegido. Critério: criar/retomar contexto real com versão e idempotência, sem mistura de pais. Equipes/pessoas/treinadores/elencos por texto seguem em unidades posteriores. Não antecipar transferências/regulamento avançado nem promover fixtures. Ao retomar: cota primeiro e Git/CI/serviços reconciliados; bootstrap não deve ser repetido.

## Git, ambiente e autoria

- Repositório novo público: https://github.com/renato-lucindo/base-do-basquete-next. Workspace `C:/Users/12405304716/Documents/Codex/Base do Basquete-v1`; Windows/PowerShell, Node 24.18.0, npm 11.16.0, Python 3.12.3.
- Branch atual **`feat/contexto-campeonatos`**, criada da fundação **`f03f2aa324052d71aeb8addd6de74136880944e3`**, sem alterações alheias. Fundação permanece em `feat/fundacao-acesso`, base `702efc9`. Obter HEAD final via Git. Código ainda publicado **`6ecfacf618d30ba6fc0346597da6fb4d539d2eca`**; C1 não foi publicada. Nenhum cofre/Access/Worker alterado nesta unidade de banco.
- [PR draft #3](https://github.com/renato-lucindo/base-do-basquete-next/pull/3) empilhado sobre [PR draft #2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2), issue #1. Main `161a5b007833b0af6a0788353205bdba99b286b5` preservada, sem merge. Revisão pelo autor; revisão independente pendente.
- Árvore limpa ao iniciar C1. Mudanças desta unidade são do agente: plano/decisão, contrato/testes, duas migrations, contrato SQL e tipos gerados. ZIP original preservado/ignorado; nenhuma mudança alheia encontrada. Commit em branch de trabalho; conferir árvore/remoto ao fechar unidade. Nenhum WIP integrado à principal.

## Evidência C1.1

Três testes de contrato PASS após vermelho inicial. `npm run test:db` PASS do zero e upgrade com contrato novo e anterior; SQL compartilhado real PASS com rollback, inclusive idempotência, conflito, pais, omissão e ausência de escrita direta. Tipos/ESLint focais/segredos PASS. Após policy restritiva explícita, leitura de recibos pelo authenticated negada no banco real; único advisor restante é Auth/Pro. Não alegar corrida real multi-conexão a partir do PGlite serializado; limites na decisão 005. Gate consolidado de C1 será executado ao estabilizar transporte/tela, sem repetir harness/protótipo imutáveis.

## Fundação e verificações

F1: JSON incremental limitado por bytes reais, origem/método/media type/schema/UTF-8, cancelamento de stream excessivo, erros sanitizados, no-store/nosniff. F2: migrations próprias `20261023031907_admin_access` e `20261023031915_explicit_public_grants`, RLS/grants mínimos e tipos gerados do schema remoto. Uma identidade administrativa, sem escrita de cliente/autoatribuição. Decisão 003 registra o efeito global de revogar EXECUTE padrão de PUBLIC para funções futuras.

`npm run test:db`: criação do zero e upgrade preservando administrador em PostgreSQL descartável PGlite 0.5.11. Mesmo contrato SQL executado no Supabase real com rollback: anônimo, autenticado indevido/metadata forjada, administrador, revogação com mesmo JWT, colunas/CRUD e defaults PASS. Advisors `lints: []`. CLI fixado 2.121.0 por npx; Docker/psql/global CLI ausentes no PATH.

F3: Auth/Data API somente no Worker, sem SDK/chave de banco no browser, service-role genérica ou user_metadata para autorização. Cookie opaco assinado `__Host-bdb-session`, Secure/HttpOnly/SameSite Strict; tokens cifrados AES-GCM no Durable Object SQLite, oito horas de duração, fila de renovação/saída, autorização fresca por identidade/RLS, CSRF/origem/host/rate limit. Frontend independente sem cadastros fictícios. Decisão 004 detalha limites.

- Gate consolidado PASS: **79 unitários/10 arquivos**, transporte, dois cenários SQL, três workerd/Miniflare, lint/formatação/tipos/builds/fronteira do cliente/segredos. Dois testes de transporte adicionados depois e verificados focalmente: total atual **cinco**. Configuração/Env/dry-run também aprovados após ajustes. CI executou o gate atualizado e **34 cenários de navegador**, incluindo quatro novos da tela de acesso.
- Workerd/DO reais localmente, Auth e ASSETS substituídos por fixtures. Renovação concorrente, cookie adulterado/expirado, identidade indevida, logout, CSRF, falha de provedor e rate limit cobertos. Adaptador nativo de assets do Miniflare 5 beta retornou 500; fixture local explícita, não prova de transporte remoto. Corrigidos binding global de fetch e foco após commit do React.
- CI do código publicado [39898411474](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39898411474), job `120234092263`, SUCCESS. Helpers em `d7432bb`: [39899003570](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39899003570), job `120235967424`, SUCCESS. F2 [39894744143](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39894744143) e núcleo F3 [39897511068](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39897511068), SUCCESS. Workflow por push de código, ignora docs/README, sem deploy/segredos.
- Smoke remoto PASS: três arquivos conferidos por hash e `X-Bdb-Source` exato; health 200, sessão ausente 401, `/worker.js` 404 após Access. Senha inválida recusada pelo **Auth Supabase real**, sem cookie da aplicação. Tela em 1440×1000 e 390×844, sem erros ou browser storage. Capturas ignoradas `access-desktop.png` e `access-mobile.png` em `.preview-artifacts`, inspecionadas.
- Helper aguardava `networkidle`, impedido por conexões de fundo apesar da tela pronta. Ajustado para `domcontentloaded` + heading; smoke aprovado com esse ajuste. Access define cookies próprios; teste negativo exige ausência do cookie da aplicação. Sem alteração da aplicação por esses ajustes.
- Fechamento focal do helper em `f54ea4c`: ESLint, sintaxe Node, formatação e scan de segredos PASS. CI final [39901121382](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39901121382), job `120242684580`: **completed / SUCCESS**, reconciliada às 08:09 UTC-03, incluindo gate e navegador. Não iniciar gate duplicado. PR #3 mantido draft, escopo/evidências/pendências registrados.
- Após bootstrap, verificação focal no Supabase real sob papel `authenticated`: responsável lê a própria autorização habilitada, outra identidade não vê linha alguma; PASS em transação revertida. A linha administrativa permanece única e habilitada. Não repetir contrato SQL completo por alteração apenas operacional/documental.
- Entrada com senha correta, permanência após recarga e saída no preview real **confirmadas pelo responsável em 23/10**, resposta “Entrada, recarga e saída funcionaram”. Deployment `9c3ceeef-a094-4f3d-9706-ba38b78493ba`, código `6ecfacf`. Evidência humana, não automação com credenciais. Não estender essa confirmação à renovação prolongada ou cenários de falha não testados por ele; estes mantêm as evidências específicas anteriores. Nenhuma conta criada automaticamente.

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

Duas migrations, **um usuário Auth e um administrador habilitado** após criação humana/bootstrap em 23/10 **08:09 UTC-03**. Antes da operação, `admin_access` estava vazia e somente a identidade esperada era elegível. Nenhum dado Auth editado pelo agente. Storage permanece sem alteração; última contagem real em 01:21: zero buckets/objetos. Sem seeds/cadastros de negócio. Advisors sem avisos após DDL; nenhuma DDL nova nesta unidade.

Plugin sem configuração de Auth: painel autenticado do projeto novo usado para signup público OFF salvo, anonymous OFF, e-mail ON, senha mínima 12 salva. “Confirm email” permanece ON. Configuração local do CLI não aplicada automaticamente ao remoto. Nenhuma exigência adicional de MFA criada. Formulário manual com auto-confirm preparado, nunca submetido. Evidência ignorada `.preview-artifacts/auth-config.png`.

## Protótipos e evidências preservadas

Protótipos fictícios em https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/, galeria `/docs/evidencias/`. Rascunhos por navegador, sem sincronização/promoção ao banco. Feedback em `AJUSTES-DE-EXPERIENCIA.md`: cores/quartos, ordenação, edição/exclusão, camisa/Enter/ação/Enter e atalhos, capitão-técnico/assistente condicional, opções no final, camisas 0→00 e cinco titulares por equipe na publicação sem pré-seleção. Treinador futuro terá tabela própria ligada à mesma pessoa; ainda não implementada.

- Fonte `169c2debcc6625804ef73367b70b9c6d3284b582`, transporte `397e12ffc6403ae495327ce3cbaeaefcaf811fab`, deployment `20864fda56fb401eaf7d2f50d4b59a6e`. Access app `6f0540c1-e616-49e1-b6d9-2be806b5a9ee`, política `fa001ad7-6d30-4e90-a8a8-c76989608e46`, responsável apenas, sem previews de versão. Preservado.
- JS `index-BtKGOTII.js` SHA-256 `88575c18e7a63635b594e8c58627d470c3388c2328dba42839c0a11758ac3389`; CSS `index-DvcHVPSP.css` `99cb852d9c5ed2b8e768eca9d58ff47d1ff3e16123595f1b5f4cafb6bee36b6a`. Inalterados; 30 cenários de navegador, 13 arquivos remotos/1.353.645 bytes e smoke completos mantêm validade. Oito capturas: duas súmulas atualizadas e seis demais preservadas, inspecionadas.
- ZIP SHA-256 `9175a685541815c07716aa7da6614e8c84d5f44c174279c2d577143abc6a915f`; README/docs lidos na ordem indicada. Integridade PASS 67 arquivos; harness PASS **126 testes/17 arquivos + typecheck**. Insumos imutáveis: não repetir por sessão/documentação.
- Leitor de tela, zoom real 200%, auditoria completa de contraste/teclado e amostras textuais reais dependem de validação específica; não declarar WCAG plena. `PROTOTIPO-E-APROVACAO.md` citado no ZIP ausente; entrega seguiu definição explícita disponível.

## Processos, cota e retomada

Servidor temporário de produção 4174 encerrado anteriormente por PID/linha de comando verificados. Smokes encerrados e credenciais transitórias revogadas. Vite antigo 5173/sessão 32934 preservado, verificar processo real antes de intervir. Nenhuma migration, gate, upload, CI ou transferência de credencial em andamento nesta unidade. Validação humana concluída. Nenhum redeploy necessário: código/assets/cofre inalterados.

Consulta real **23/10/2026 08:26 UTC-03**: cinco horas **17% usado / 83% restante**; semanal **41% usado / 59% restante**. Reset 5h Unix `1792771741` = **23/10/2026 13:09:01 America/Sao_Paulo (16:09:01 UTC)**; semanal `1793293737` = **29/10/2026 14:08:57 America/Sao_Paulo (17:08:57 UTC)**. Franquia compartilhada; não estimar, comprar créditos, mudar plano ou usar resets manuais.

Automação oficial `retomar-preview-base-do-basquete`, nome “Retomar fundação Base do Basquete”: **PAUSED**, atualização bem-sucedida pela ferramenta oficial e status conferido após conclusão da fundação. Nenhuma duplicata ou despertar novo criado. Na próxima unidade, se cota real atingir <=15% restante: checkpoint seguro, push quando seguro e atualizar **essa mesma automação** para reset efetivo +2 minutos, confirmando sucesso. Ao despertar: cota primeiro, reconciliar tudo e preservar evidências válidas.

Checkpoints anteriores permanecem no Git.
