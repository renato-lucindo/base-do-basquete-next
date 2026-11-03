# Domínio próprio

## Configuração em 03/11/2026

Endereço canônico: `https://basedobasquete.com.br`. O domínio foi conectado ao Worker existente `base-do-basquete-next-preview`, mantendo o Cloudflare Access restrito ao responsável. Isso não libera o preview ao público nem declara aceite de funcionalidades.

- Conta Cloudflare: `16b4a5e0a99a031d28051ebadb4811cc`.
- Zona: `373200fc05b1cdea9db389b8c5fa4c65`, plano Free, estado `active`, ativação `2026-11-03T15:15:42.852039Z`.
- Servidores: `shubhi.ns.cloudflare.com` e `yadiel.ns.cloudflare.com`. Google DNS e `1.1.1.1` já retornam esses servidores e os endereços A da Cloudflare.
- Custom Domain: `cb1ea31278dc30d4fd5ccea408ca4c8c7340f1b3`; hostname raiz, Worker correto, tráfego habilitado, previews de versão desabilitados.
- Certificado universal: `292c2cc8-1613-4ceb-a37b-e43155887376`, estado `active`, cobrindo raiz e wildcard.
- MX nulo (`0 .`) e TXT SPF `v=spf1 -all` anteriores preservados. Nenhum serviço de e-mail configurado.

## Proteção e aplicação

Access app `556be918-42ad-44e5-a85f-c2783f65b2ba` mantém o hostname antigo como domínio principal e agora inclui o domínio raiz e `www` em destinations. A única política `30cc3ab4-9331-4df6-8d13-d840c2652210` continua com decisão allow e um único e-mail, o do responsável. A proteção foi conferida antes do vínculo ao Worker. Não houve bypass nem criação de outra identidade.

Apenas o domínio raiz está associado ao Worker. A destination de Access para `www` antecipa sua proteção; não há DNS, rota ou redirecionamento de `www` configurado por esta unidade. Use o endereço raiz.

`APP_ORIGIN` foi alterada para `https://basedobasquete.com.br` por PATCH de settings. Os seis demais bindings foram herdados: assets, limiter, namespace de sessões, URL de backend e os dois segredos. Leitura posterior confirmou todos os bindings, o namespace `0411ac931ca54d289d270606c7e87ef7` e o limiter `862073195184`. Valores secretos não foram lidos nem rotacionados. Sem migrations, SQL ou gravação de dados humanos.

Deployment da mudança de configuração: `08b39ef7-51bc-4f1f-b33b-69e0f741b2de`, versão 34 `188ff4c2-b3ae-40ec-bb90-e3df7192429c`, 100% do tráfego. Anterior: deployment `55c19586-7771-49a9-995f-a6fe827e0949`, versão `f477bd9e-4c77-48dc-a977-286a3448917e`. A operação alterou settings; não enviou novo bundle nem assets. A fonte do produto continua a versão publicada anteriormente, anotada como `1e882f3f95d36b5b748c9083045dbb79afc7b306`; não representa a main atual.

O Worker aceita apenas a origem canônica configurada. O hostname antigo continua protegido, mas deixou de ser um endereço válido da aplicação. Sessões do hostname antigo não são transferidas: fazer login no novo endereço.

## Repositório e validação

A mesma PR #50 e branch `codex/dominio-proprio` mantêm esta unidade, base `d84c09eba7f79d6cd7c230788a5333754031925b`. `wrangler.jsonc` registra origem e Custom Domain; o uploader conserva a origem nova e exige proteção exata do hostname raiz antes de publicar. Wildcard de subdomínios e proteção apenas de `/admin` não satisfazem essa guarda.

- `node --test tests/foundation-transport.test.mjs`: 4 PASS, incluindo a origem canônica no multipart, preservação dos segredos e recusa de proteção ausente, wildcard ou só de subcaminho.
- Prettier dos arquivos alterados e `git diff --check`: PASS.
- CI documental anterior do SHA `33dbaf3`: [SUCCESS](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41642803422). Não valida a mudança executável posterior; conferir o gate e browsers na CI do novo SHA da mesma PR.
- Checkout esparso em `C:/Users/12405304716/.codex/worktrees/dominio-proprio`, por falta de espaço em C:. Gate e browsers consolidados serão executados na CI; não declarar execução local dessas suítes.
- Alterações preexistentes no checkout principal (`CONTRIBUTING.md`, `.agents/skills/web-design-guidelines/`, `skills-lock.json`) preservadas.

O teste HTTP a partir da rede corporativa deste computador recebe uma página de bloqueio por política da empresa, categoria `high-risk`; HTTPS não completa o handshake. Isso não comprova falha do Worker nem valida o percurso autenticado. Não se contornou a restrição. A API confirma DNS, certificado, associação, origem e proteção, mas o responsável ainda precisa conferir abertura e login em rede que permita o domínio.

## Próximo passo

Conferir CI atual, revisar e integrar a configuração pela mesma PR. Conferir CI do SHA integrado. O responsável deve abrir `https://basedobasquete.com.br` em rede permitida e validar Access e login interno; registrar o resultado real, sem atribuir aceite humano antecipado. Nenhuma retomada automática agendada.

## Ativação anterior

Antes da propagação, consultas públicas ainda retornavam Registro.br e a zona estava pending. Activation check foi solicitado. A primeira tentativa de adicionar destinations ao Access recebeu código `12130`, `domain does not belong to zone`; a configuração anterior permaneceu intacta. Com a zona active, a atualização foi aceita e reconferida.

Referências: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) e [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
