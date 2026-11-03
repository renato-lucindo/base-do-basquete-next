# Domínio público e entrada administrativa

Endereço canônico: https://basedobasquete.com.br/. A raiz serve a página pública de competições; https://basedobasquete.com.br/admin e /admin/ servem o login administrativo. A rota anterior /foundation.html permanece compatível. O responsável autorizou integração, migrations e deploy; PR #49 e PR #50 foram integradas por merge commit, com CI e revisão dos respectivos heads aprovadas.

## Serviço

Código integrado: eff36fe0eda76962e6babbc4a9464a98c3dad478. CI integrada [41731938394](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41731938394): **SUCCESS**: 140 arquivos/685 unitários, gate/design e 551 browsers PASS/109 SKIP.

Publicação concluída em 03/11/2026 às 22:48:43 UTC (19:48:43 America/Sao_Paulo). Worker base-do-basquete-next-preview, fonte eff36fe0eda76962e6babbc4a9464a98c3dad478, versão 35f5b882-70b1-48f7-8bb3-fda632bd458e, deployment 09e26c1c-4e0e-46ea-8026-5d5c8a721d59 em **100%**. API confirmou domínio habilitado, origem canônica, namespace de sessões e limiter preservados, segredos presentes por nome/tipo e preview exclusivo do responsável. Nenhuma leitura ou rotação de valores secretos. Domínio próprio sem Access, previews preservados.

A publicação usa os módulos e manifesto do prepare-foundation, com adapter de assets e X-Bdb-Source, enviados pelo Wrangler autenticado. Artefatos foram gerados a partir do checkout limpo do SHA integrado. Mapa de assets permite apenas arquivos públicos do manifesto; módulos privados não são servidos. Provas e versão efetivamente publicada constam na [evidência da entrega](evidencias/2026-11-03-dominio-publicado.md).

## Configuração

- Conta Cloudflare: 16b4a5e0a99a031d28051ebadb4811cc; Worker: base-do-basquete-next-preview.
- Zona 373200fc05b1cdea9db389b8c5fa4c65 ativa. NS shubhi.ns.cloudflare.com e yadiel.ns.cloudflare.com; DNS propagado e certificado ativo na configuração inicial.
- Custom Domain cb1ea31278dc30d4fd5ccea408ca4c8c7340f1b3: hostname raiz, Worker correto, habilitado e previews de versão desativados.
- APP_ORIGIN=https://basedobasquete.com.br. SUPABASE_URL=https://nizmasjddyrhmevvfviz.supabase.co.
- SESSIONS:SessionStore, namespace 0411ac931ca54d289d270606c7e87ef7. LOGIN_LIMITER:namespace 862073195184,10 requisições/60s. ASSETS preservado.
- Segredos SESSION_ENCRYPTION_KEY e SUPABASE_PUBLISHABLE_KEY preservados por nome/tipo, sem leitura ou rotação dos valores.
- MX nulo0. e SPF v=spf1 -all preservados; nenhum serviço de e-mail configurado. www não tem DNS/redirect nesta unidade; usar a raiz.

## Access, login e rotas

Por pedido explícito do responsável, o domínio próprio está fora do Cloudflare Access. Isso mantém o login interno, sessões e guardas das APIs administrativas. Sessões antigas do hostname de preview não são transferidas: entrar pelo login interno no domínio novo.

O app Access 556be918-42ad-44e5-a85f-c2783f65b2ba conserva exclusivamente base-do-basquete-next-preview.renato-lucindo-jr.workers.dev, com política 30cc3ab4-9331-4df6-8d13-d840c2652210, allow somente ao e-mail do responsável. Apps dos previews PR38/46/49 e protótipo preservados. Nenhuma credencial Access é necessária no smoke do domínio público.

Worker fonte separa raiz /publico.html e aliases administrativos /foundation.html. O rewrite de borda anterior foi preservado: ruleset 35c91c8c751c478c891e71e3549961ee, regra d809069f742447a3961bfc88d7dbbff4, restrito ao hostname próprio, GET/HEAD e paths exatos /admin e /admin/. URL visível e query preservadas.

## Provas e limites

CI da PR #49 e main e310a0c: SUCCESS; CI da PR #50 em b18759e: SUCCESS. Ambas com 685 unitários, gate/design e 551 browsers PASS/109 SKIP. Seis testes focais de transporte/HTTP PASS e teste local do pacote em Workerd PASS para raiz/admin, bytes/no-store/source, API privada401, origem incorreta421 e módulo privado404. Smoke atualizado para domínio canônico e entradas separadas; sintaxe/lint PASS.

Migrations 20261103174254 e20261103174303 já aplicadas antes da pausa; SQL imutável. Nenhuma nova operação de banco nesta retomada. [Liberação pública](evidencias/2026-11-03-liberacao-publica.md).

A rede corporativa bloqueia o domínio; não foi contornada. Abertura direta e login humano após a publicação continuam sem confirmação. Testes locais e metadados da Cloudflare não equivalem a essa confirmação.

[Histórico da configuração e estados anteriores](../historico/progresso/2026-11-03-dominio-antes-publicacao.md). Checkpoint/retomada após reset é procedimento permanente em CONTRIBUTING.md; a automação desta conversa foi pausada após a entrega, com confirmação pela ferramenta oficial.
