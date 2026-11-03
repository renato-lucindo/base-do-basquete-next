# Domínio próprio

## Configuração em 03/11/2026

Endereço canônico: `https://basedobasquete.com.br`, conectado ao Worker existente `base-do-basquete-next-preview`. Após confirmar que a tela Access abriu no novo domínio, o responsável pediu sua desativação. **O domínio próprio agora é público, sem Cloudflare Access.** O login interno da administração não foi alterado; os hostnames de preview continuam protegidos.

- Conta Cloudflare: `16b4a5e0a99a031d28051ebadb4811cc`.
- Zona: `373200fc05b1cdea9db389b8c5fa4c65`, plano Free, estado `active`, ativação `2026-11-03T15:15:42.852039Z`.
- Servidores: `shubhi.ns.cloudflare.com` e `yadiel.ns.cloudflare.com`. Google DNS e `1.1.1.1` retornam os novos servidores e endereços A.
- Custom Domain: `cb1ea31278dc30d4fd5ccea408ca4c8c7340f1b3`, hostname raiz associado ao Worker correto, tráfego habilitado e previews de versão OFF.
- Certificado universal: `292c2cc8-1613-4ceb-a37b-e43155887376`, estado `active`, cobrindo raiz e wildcard.
- MX nulo (`0 .`) e TXT SPF `v=spf1 -all` anteriores preservados. Nenhum serviço de e-mail configurado.

## Access e autenticação

O domínio raiz e `www` foram retirados das destinations do app `556be918-42ad-44e5-a85f-c2783f65b2ba` por pedido explícito do responsável. Leitura posterior de todos os apps confirmou que nenhum protege o domínio próprio. O app conserva somente o hostname `base-do-basquete-next-preview.renato-lucindo-jr.workers.dev`, com a política original `30cc3ab4-9331-4df6-8d13-d840c2652210`, decisão allow e e-mail único do responsável. Apps dos previews de PR e protótipo preservados.

A remoção do Access não remove o login interno, as sessões da aplicação ou as guardas administrativas do Worker. O hostname antigo permanece protegido, mas a guarda de origem da aplicação aceita o endereço novo. Sessões do hostname antigo não são transferidas: usar o login interno no domínio novo.

Somente o domínio raiz tem vínculo com o Worker. `www` não tem DNS, rota ou redirecionamento configurado por esta unidade; usar o endereço raiz.

## Serviço publicado

`APP_ORIGIN` alterada para `https://basedobasquete.com.br` por PATCH de settings. Os outros seis bindings foram herdados: assets, limiter, namespace de sessões, URL de backend e os dois segredos. Leitura posterior confirmou todos, o namespace `0411ac931ca54d289d270606c7e87ef7` e o limiter `862073195184`. Valores secretos não foram lidos nem rotacionados. Sem migrations, SQL ou gravação de dados humanos.

Deployment da configuração: `08b39ef7-51bc-4f1f-b33b-69e0f741b2de`, versão 34 `188ff4c2-b3ae-40ec-bb90-e3df7192429c`, 100%. Anterior: deployment `55c19586-7771-49a9-995f-a6fe827e0949`, versão `f477bd9e-4c77-48dc-a977-286a3448917e`. A operação alterou settings, sem enviar bundle ou assets. Fonte do produto continua a anteriormente publicada, anotada como `1e882f3f95d36b5b748c9083045dbb79afc7b306`; não representa a main atual.

## Repositório e validação

Mesma PR #50, branch `codex/dominio-proprio`, base `d84c09eba7f79d6cd7c230788a5333754031925b`. Wrangler e uploader conservam a origem canônica nos próximos deploys. O uploader continua conferindo a proteção do preview separado; não exige Access no domínio público.

- `node --test tests/foundation-transport.test.mjs`: 4 PASS, incluindo origem pública canônica no multipart, preservação dos segredos e recusa de política ampliada no preview.
- Prettier dos arquivos alterados e `git diff --check`: PASS.
- CI documental do SHA `33dbaf3`: [SUCCESS](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41642803422). Não valida mudanças executáveis posteriores. CI intermediária de `f970672` observada no gate; a remoção posterior da exigência de Access no domínio público requer CI do HEAD atual da mesma PR.
- Checkout esparso em `C:/Users/12405304716/.codex/worktrees/dominio-proprio`, por falta de espaço em C:. Gate e browsers consolidados executados pela CI, sem declarar execução local.
- Alterações preexistentes no checkout principal (`CONTRIBUTING.md`, `.agents/skills/web-design-guidelines/`, `skills-lock.json`) preservadas.

A rede corporativa deste computador bloqueia o domínio como `high-risk`: HTTP apresenta a política da empresa, HTTPS não completa handshake. Não se contornou essa restrição. O responsável confirmou a abertura da tela Access em outra rede antes da desativação. Abertura direta após remoção e login interno ainda não têm confirmação humana.

## Continuidade

O responsável autorizou concluir integração, migrations e deploy. PR49 integrada em e310a0c após CI e revisão; PR50 recebe a composição por merge explícito de main. Conferir CI atual e integrada antes de publicar. A retomada após cota ocorreu pela automação retomar-libera-o-do-dom-nio-ap-s-reset; pausar ao concluir. Abertura direta e login humano não foram confirmados nesta rede.

Antes da propagação, zona pending e consultas com NS do Registro.br; activation check solicitado e primeira inclusão no Access recusada (`12130`). Com a zona active, domínio e Access foram configurados. A retirada posterior do Access registra a decisão explícita mais recente e substitui a intenção inicial de proteger o domínio próprio.

Referências: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) e [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).

## Entrada administrativa e página inicial

Pedido seguinte do responsável: a raiz deve abrir a página pública de campeonatos, com a administração em `/admin`. Em 03/11, `/admin` e `/admin/` foram habilitados no domínio por uma regra de URL Rewrite, sem enviar outro bundle:

- Ruleset `35c91c8c751c478c891e71e3549961ee`, fase `http_request_transform`, versão 1.
- Regra `d809069f742447a3961bfc88d7dbbff4`, ref `base_basquete_admin_entry`.
- Restrita ao hostname `basedobasquete.com.br`, paths exatos `/admin` e `/admin/`, métodos GET/HEAD; reescreve internamente para `/foundation.html`, preservando a URL visível e a query.
- Alias também implementado no Worker fonte, para conservar o comportamento sem depender exclusivamente da regra de borda. A raiz permanece temporariamente como estava.
- Build foundation PASS e build Worker dry-run PASS; teste Workerd focal PASS para os dois aliases e query, HTML de login, no-store, POST rejeitado e API privada anônima 401. ESLint dos arquivos alterados PASS. O primeiro build local falhou porque o checkout esparso omitia módulos da especificação; incluídos os módulos versionados necessários, ambos os builds passaram.

A página pública foi integrada pela PR #49 em e310a0c30da753c9ee7f82f32e4349e7825cbeae, depois de CI SUCCESS do head63917c9 e revisão resolvida. Migrations20261103174254 e20261103174303 já aplicadas e reconciliadas, sem alterar SQL. Autorizações e provas em [liberação pública](evidencias/2026-11-03-liberacao-publica.md).

A composição na mesma PR #50 mantém raiz em /publico.html e os dois aliases administrativos em /foundation.html. Build foundation e Worker dry-run PASS; 6 testes focais PASS: assets reais distintos na raiz e admin, no-store, rejeição de POST e API privada anônima401, descoberta pública anônima e transporte de publicação. Nova CI da composição e CI integrada obrigatórias antes de concluir. Código novo ainda não publicado neste checkpoint; atualizar versão/deployment após o deploy autorizado.
