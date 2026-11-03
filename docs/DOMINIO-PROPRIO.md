# Domínio próprio

## Estado em 03/11/2026

Objetivo autorizado: conectar `https://basedobasquete.com.br` ao projeto preservando o Cloudflare Access restrito ao responsável. O pedido não libera o preview ao público nem altera o aceite de funcionalidades.

- Conta Cloudflare: `16b4a5e0a99a031d28051ebadb4811cc`.
- Zona: `373200fc05b1cdea9db389b8c5fa4c65`, plano Free, estado observado `pending`.
- Servidores atribuídos: `shubhi.ns.cloudflare.com` e `yadiel.ns.cloudflare.com`.
- O responsável informou a troca no registrador. Consultas NS pelo resolvedor local, Google DNS e `1.1.1.1` ainda retornaram `a.auto.dns.br` e `b.auto.dns.br`.
- `PUT /zones/{zone_id}/activation_check` aceito: solicita verificação, não comprova ativação.
- Zona nova conserva o MX nulo (`0 .`) e o TXT SPF `v=spf1 -all` observados no DNS anterior. Nenhum serviço de e-mail configurado por esta unidade.

## Serviço preservado

Worker alvo: `base-do-basquete-next-preview`. Deployment observado `55c19586-7771-49a9-995f-a6fe827e0949`, versão `f477bd9e-4c77-48dc-a977-286a3448917e`, 100% do tráfego. Anotação referencia fonte `1e882f3f95d36b5b748c9083045dbb79afc7b306`; não representa a main atual.

Access app `556be918-42ad-44e5-a85f-c2783f65b2ba` conserva o hostname `base-do-basquete-next-preview.renato-lucindo-jr.workers.dev` e a única política `30cc3ab4-9331-4df6-8d13-d840c2652210`, restrita ao responsável. Tentativa de adicionar raiz e `www` às destinations retornou HTTP 400, código `12130`, `domain does not belong to zone`. Leitura posterior confirmou destinations e política anteriores intactas.

Sem associação do Custom Domain, mudança de `APP_ORIGIN`, deploy de código, migration ou escrita no banco. Credenciais não foram lidas nem alteradas.

## Continuidade

Branch `codex/dominio-proprio`, base `d84c09eba7f79d6cd7c230788a5333754031925b`, worktree `C:/Users/12405304716/.codex/worktrees/dominio-proprio`. Checkout esparso porque o checkout completo encontrou falta de espaço em C:. Alterações preexistentes no checkout principal (`CONTRIBUTING.md`, `.agents/skills/web-design-guidelines/`, `skills-lock.json`) preservadas.

Próximo passo: consultar a zona até observar `active`. Depois, configurar e conferir Access antes de associar o domínio ao Worker. Ajustar `APP_ORIGIN` e o transporte de upload para não restaurarem o endereço antigo; validar o novo endereço e registrar a versão servida. Suporte a `www` deve redirecionar ao endereço canônico e ser verificado separadamente. Não substituir o código publicado por outra PR como parte da troca de endereço.

Checkpoint apenas documental; consultar formato e CI no SHA desta mesma branch/PR. Enquanto a zona estiver pendente, não informar o endereço como disponível. Nenhuma retomada automática agendada.

Referências: [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) e [Cloudflare Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/).
