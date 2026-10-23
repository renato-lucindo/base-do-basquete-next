# Checkpoint — 23/10/2026, 08:54 America/Sao_Paulo (UTC-03)

## Objetivo, unidade e próximo passo

Nova Base do Basquete exclusivamente pelo ZIP preservado em `especificacao`, sem consultar/clonar repositório anterior. Fundação F1–F4 e **C1 da etapa 3 concluídas**, com CI, preview protegido e validação humana. Responsável confirmou primeiro “Entrada, recarga e saída funcionaram” e depois **“Cadastro, salvamento e retomada funcionaram”** no novo contexto persistido. Não equivale a aceite de produção nem revisão independente.

C1 entrega campeonato recorrente, temporadas anuais, disputas por naipe/categoria/divisão, página única de edição, busca/Recentes e retomada. Gravação atômica/versionada/idempotente no banco, sem escrita direta de cliente. Falha incerta repete o mesmo comando; conflito conserva edição até recarga explícita. Edição fica em memória durante reautenticação e é limpa na saída confirmada. Não há SDK/chave/JWT de banco no browser.

**Próximo passo exato:** C2 — equipes globais e inscrições distintas na disputa, com lista expansível de elenco preparada para C3. Ler ESCOPO §§3/5/6 e CONTRATOS §§Identidade/equipes/inscrições, além do plano `docs/superpowers/plans/2026-10-23-contexto-cadastros.md`; detalhar C2 antes da DDL, em branch própria empilhada sobre C1. Validar que uma equipe global pode ter duas inscrições com nomes públicos diferentes na mesma disputa, sem misturar contexto e sem exigir transferências/regulamento avançado. Preservar dados reais criados pelo responsável em C1. Pessoas, treinadores ligados à mesma pessoa, elencos/texto/homônimos seguem C3/C4. Cota primeiro; reconciliar Git/CI/serviços antes de alterar. Não repetir bootstrap, gates ou harness de artefatos inalterados.

## Git, ambiente e autoria

- Repositório novo público: https://github.com/renato-lucindo/base-do-basquete-next. Workspace `C:/Users/12405304716/Documents/Codex/Base do Basquete-v1`; Windows/PowerShell, Node 24.18.0, npm 11.16.0, Python 3.12.3.
- Branch atual **`feat/contexto-campeonatos`**, base **`f03f2aa324052d71aeb8addd6de74136880944e3`** da fundação. Banco `e725e82`, sessão/API `78d2fd8`, aplicação publicada **`9c64ab948781c284c63182168b02bcd3c9a30454`**, helper de smoke **`c88ca2b`**, já no remoto. Obter HEAD final via Git; alterações posteriores à aplicação são apenas helper/documentação.
- [PR draft #4](https://github.com/renato-lucindo/base-do-basquete-next/pull/4) sobre `feat/fundacao-acesso`/[PR draft #3](https://github.com/renato-lucindo/base-do-basquete-next/pull/3), que está sobre protótipos/[PR draft #2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2). Todos anexados à conversa. Main `161a5b007833b0af6a0788353205bdba99b286b5` preservada, nenhum merge. Revisão pelo autor; independente pendente, sem ferramenta de subagente de código disponível nesta sessão.
- Árvore limpa no início de C1; código/migrations/documentação são do agente. ZIP original do responsável preservado/ignorado, nenhuma alteração alheia encontrada. Documentação final incluída no commit deste checkpoint; confirmar árvore limpa e HEAD remoto no próximo início. Dados criados pelo responsável no banco **não são fixtures** e não devem ser apagados por testes.

## Evidências C1

- Plano: `docs/superpowers/plans/2026-10-23-contexto-cadastros.md`; decisão 005; roteiro/versão/limites em `docs/VALIDACAO-CONTEXTO.md`.
- Gate local PASS: **86 unitários/12 arquivos**, cinco de transporte, dois cenários PostgreSQL do zero/upgrade com contratos completos, quatro workerd/DO, lint/formatação/tipos/builds/fronteira/segredos. Vermelhos iniciais observados para contrato, banco, sessão/adapter, HTTP e UI.
- [CI do código publicado 39947912211](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39947912211), job **`120395001555`**, completed/SUCCESS, inclui gate, integridade e **40 cenários de navegador Linux**. Source `9c64ab9`. Helper posterior `c88ca2b`: verificações focais e smoke remoto real PASS; [CI automática 39948754042](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39948754042) também completed/SUCCESS, conferida em 08:54. Sem gate local duplicado.
- Seis cenários novos Playwright PASS desktop/celular: edições/disputas, duplicidade, retomada, reflow 320, envio incerto/idempotência, conflito, confirmação de saída e reautenticação preservando edição. Quatro cenários anteriores de acesso também PASS. Capturas com fixtures em `.preview-artifacts/contexto-desktop.png` e `contexto-mobile.png`, inspecionadas; não são dados remotos.
- Contrato SQL compartilhado PASS em PGlite 0.5.11 e Supabase real com rollback: RLS/grants, outro autenticado, revogação, idempotência, versão, pais trocados, omissão de filhos salvos, rollback parcial e Recentes sem efeito de visita. Tipos gerados do schema. Não mede escala nem corrida real multi-conexão; limites na decisão 005. Contratos posteriores devem isolar fixtures e preservar os dados já existentes.
- Smoke remoto PASS: três arquivos por hash/source, health 200; sessão e duas rotas de competição sem cookie 401 após Access; módulo servidor 404; senha inválida recusada pelo Auth real sem cookie da aplicação. Dois viewports, sem erros/browser storage. Não usou senha do responsável.
- **Evidência humana C1:** responsável confirmou cadastro/salvamento/retomada no preview do source `9c64ab9`; prova real Worker → sessão → RPC/Data API → PostgreSQL. Consulta posterior somente por contagens em 23/10 08:48: **um campeonato, uma edição, duas disputas, um recibo; um usuário Auth e um administrador**, preservados. Sem nomes privados em documentos ou fixtures promovidas ao remoto.

## Cloudflare — preview atual

[Preview persistido protegido](https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/). Conta **`16b4a5e0a99a031d28051ebadb4811cc`**, Worker **`base-do-basquete-next-preview`**.

- Fonte **`9c64ab948781c284c63182168b02bcd3c9a30454`**, servidor SHA-256 **`d1ca064449df918930d86a19f179b2e9f404df59d449ce297280dc0ca9ae3bee`**. Deployment 100% **`dd4c204b-3312-40f6-82a7-40046dd5cce5`**, versão **`b4bff8b2-4997-4dab-bf65-2dcdc6b4c22d`**, publicado **23/10 08:42:28 UTC-03 (11:42:28 UTC)**.
- Access app **`556be918-42ad-44e5-a85f-c2783f65b2ba`**, única política permanente **`30cc3ab4-9331-4df6-8d13-d840c2652210`**, allow somente responsável `renato.lucindo.jr@gmail.com`. OTP existente `79079fb8-efad-42d1-a8b5-a89a488443d2`, organização `renato-lucindo-jr.cloudflareaccess.com`, sessão 8h. Aplicado antes do tráfego e reconfirmado. Hostname habilitado; previews de versão **desabilitados** após atualização.
- Namespace SessionStore SQLite **`0411ac931ca54d289d270606c7e87ef7`**, migração `v1`, e limiter **`862073195184`** preservados. Cofre conserva `SUPABASE_PUBLISHABLE_KEY` e `SESSION_ENCRYPTION_KEY`; somente nomes/tipos verificados, valores não lidos/rotacionados. **Nunca regenerar chave AES num redeploy normal.** JWT/refresh token ficam cifrados no DO, cookie opaco HttpOnly/Secure/SameSite Strict.
- Transporte reversível de módulos estáticos da decisão 002, por limitação já diagnosticada do upload nativo no conector. ASSETS mantido no código; manifesto serve apenas build do cliente. Não publica módulos servidor/ZIP/especificações. Payload/manifesto ignorados em `.worker-artifacts`. Uploader confirma conta/nome/Access e preserva secrets.
- Primeiro smoke teve stdin fechado; token/policy `60a5b924-0e93-46e1-adbe-ee5fe80ccb6c` / `458dd42d-bf63-47ea-8b4a-52d7376d2b6d` revogados, processo próprio antigo encerrado por PID/linha verificados. Repetição com PTY PASS; token/policy `aac9960b-ed68-444f-b9d6-3fd6fb8a8c14` / `67598e14-fc3c-4eed-b418-537097cf79ec` também **revogados com sucesso**. Credenciais cifradas para chave privada efêmera em memória; nenhum segredo/cookie/estado autenticado persistido.
- Depois da revogação: raiz, duas rotas de competição, JS, CSS e módulo servidor retornam **302 Access sem cabeçalho/conteúdo da aplicação** para anônimo; identidade/JWT forjados bloqueados. Única política permanente reconfirmada.
- Billing 403 por escopo OAuth ausente; custo Cloudflare não inferido/plano não alterado. Rollback de código deve preservar Access/cofre/namespace e dados; em incidente, desabilitar somente hostname deste Worker antes de retirar proteção. Artefato anterior da fundação `6ecfacf` e versão `6fbbd0e4-31e2-4cdf-9dfe-82e96fed0984` registrados no histórico, sem desfazer migrations/dados por rotina.

Manifesto remoto conferido:

| Arquivo                           |  Bytes | SHA-256                                                            |
| --------------------------------- | -----: | ------------------------------------------------------------------ |
| `/foundation.html`                |    480 | `144491e1abfb1570161d3eed399e0ca7371ca68cf9d8b8fce07be2a67b01826b` |
| `/assets/foundation-C4mJbuEJ.css` |   4322 | `458db1f815ae8137a15b58b6f27edec2aa41823aa7e56b876132775cf2a2ca2c` |
| `/assets/foundation-DdCLZkXn.js`  | 319906 | `ecf8e734d0f8273a680b165bf8881b27e0f37964e354511049ee7f178c7ae584` |

## Supabase — somente projeto novo

Vínculo **`link_6adaa8aab5688191b1e7ae1cddc55a82`**; organização escolhida **base-do-basquete** (`jniqbaccwwhabzokjvfu`), Free; projeto **base-do-basquete-next-dev**, ref **`nizmasjddyrhmevvfviz`**, `sa-east-1`, PostgreSQL 17.11.0.003. Custo consultado/comunicado US$ 0/mês; sem contratação. Não usar outro vínculo/organização antiga ou alterar `base-do-basquete-v1`.

Migrations: `20261023031907_admin_access`, `20261023031915_explicit_public_grants`, **`20261023112423_competition_context`**, **`20261023112534_competition_receipt_deny`**. Arquivos criados pelo CLI 2.121.0 e reconciliados com versões reais do plugin. DB agora contém dados do responsável informados acima; não repetir bootstrap, apagar administrador nem tratar esses dados como descartáveis. Storage não alterado; última contagem em 01:21 era zero buckets/objetos.

RLS/SELECT explícito para administrador fresco; sem escrita direta de cliente/service-role. Uma escrita privada SECURITY DEFINER delimitada, com auth.uid/verificação administrativa antes de acesso, search_path vazio, tabelas qualificadas e sem SQL dinâmico; wrapper público invoker e grants exatos. Recibos privados têm policy restritiva false. Não antecipar plataforma de papéis/múltiplos clientes.

Auth: signup público OFF, anonymous OFF, e-mail ON, mínimo 12, confirmação de e-mail ON, sem MFA obrigatório introduzido. Conta foi criada pelo responsável, nenhum hash/senha lido. Advisor atual **somente WARN `auth_leaked_password_protection`**; [proteção de senha vazada exige Pro](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), plano Free preservado. Não declarar advisors sem avisos. Detalhes nas decisões 003–005.

## Evidências preservadas e limites

Fundação F1–F4 documentada no plano de 22/10, decisões 003/004 e ACESSO-ADMINISTRATIVO.md. CI final `39901121382` SUCCESS; login/recarga/saída confirmados pelo responsável antes de C1. Bootstrap e Auth já resolvidos, não recriar contas/projeto.

Protótipo fictício separado em https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/, galeria `/docs/evidencias/`. Fonte `169c2debcc6625804ef73367b70b9c6d3284b582`, transporte `397e12ffc6403ae495327ce3cbaeaefcaf811fab`, deployment `20864fda56fb401eaf7d2f50d4b59a6e`. Access app `6f0540c1-e616-49e1-b6d9-2be806b5a9ee`, política `fa001ad7-6d30-4e90-a8a8-c76989608e46`, somente responsável. Preservado, sem promoção de dados locais ao banco.

JS do protótipo `index-BtKGOTII.js` SHA-256 `88575c18e7a63635b594e8c58627d470c3388c2328dba42839c0a11758ac3389`, CSS `index-DvcHVPSP.css` `99cb852d9c5ed2b8e768eca9d58ff47d1ff3e16123595f1b5f4cafb6bee36b6a`: idênticos após build C1. Trinta cenários, 13 arquivos remotos/1.353.645 bytes, capturas e smoke anteriores mantêm validade. Feedback completo em AJUSTES-DE-EXPERIENCIA.md, inclusive teclado/súmula, capitão-técnico/assistente e cinco titulares. Cadastro real de treinador ainda pertence à C3, ligado à mesma identidade de pessoa.

ZIP SHA-256 `9175a685541815c07716aa7da6614e8c84d5f44c174279c2d577143abc6a915f`, docs lidos na ordem indicada, integridade PASS 67 arquivos e harness PASS **126 testes/17 arquivos + typecheck**, insumos imutáveis. Não repetir por sessão/documentação. Leitor de tela, zoom real 200%, auditoria completa de contraste/teclado/escala e amostras textuais reais continuam validações específicas; não declarar WCAG plena. Documento citado `PROTOTIPO-E-APROVACAO.md` ausente no ZIP, entrega inicial seguiu definição explícita.

## Processos, cota e retomada

Nenhuma migration, gate local, upload ou transferência de credencial em andamento; processos de smoke próprios encerrados e temporários revogados. Vite antigo 5173/sessão 32934 preservado, verificar processo real antes de intervir. CI do helper `c88ca2b` concluída com sucesso. Código/assets publicados não mudaram por esse helper.

Consulta real **23/10/2026 08:54:03 UTC-03**: cinco horas **42% usado / 58% restante**, semanal **45% usado / 55% restante**. Reset 5h Unix `1792771741` = **23/10/2026 13:09:01 America/Sao_Paulo (16:09:01 UTC)**; semanal `1793293737` = **29/10/2026 14:08:57 America/Sao_Paulo (17:08:57 UTC)**. Franquia compartilhada; não estimar/comprar créditos/mudar plano/usar reset manual.

Automação oficial `retomar-preview-base-do-basquete` permanece **PAUSED** após fundação, sem duplicata/despertar novo. Não é pausa do projeto; usar a mesma automação se o gatilho real <=15% restante voltar: operação mínima consistente, checkpoint/push seguro e reset efetivo +2 minutos, confirmar criação. Ao despertar, cota primeiro, depois Git/CI/serviços e próximo passo; preservar evidências válidas. Histórico completo de checkpoints no Git.
