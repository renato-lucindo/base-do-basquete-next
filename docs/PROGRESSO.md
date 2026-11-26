# Progresso atual

Atualizado em26/11/2026. [Histórico anterior](../historico/progresso/2026-11-26-antes-refinamento-navegacao.md).

## PR #89 — navegação e classificação pública

Mesma branch `codex/perfis-equipes`, HEAD de partida `517c14039d5d1e496db7f26289292de08ce53d98`, base `0af33e3`.
[Plano/matriz](PLAN-NAVEGACAO-CLASSIFICACAO.md) e [evidência](design/VALIDACAO-NAVEGACAO-CLASSIFICACAO.md).
Implementados caminho iniciado pelo ano, retorno contextual único, busca mobile compacta,
composição tabela → critérios → legenda, números centrais somente na classificação e rodapé em fluxo normal.
Perfis mantêm classificação à esquerda e Últimos jogos permanece inalterado.

18unitários focais PASS;22browsers iniciais nas nove larguras e10retentativas focais PASS.
Inspeção de108combinações de páginas reais Chromium/WebKit, com dados públicos GET.
Gate completo PASS:865unitários,19transportes,16banco,35Worker,1PDF e builds/checks. Browsers novos finais26Chromium +26WebKit PASS; catálogo Chromium PASS. CI do novo HEAD/publicação ainda pendentes; não declarar aceite humano.
WebKit revelou blur prematuro ao selecionar entidade no Autocomplete; corrigido,4focais PASS.
Falhas locais por ENOSPC/interferência entre diretórios de rastros estão registradas no plano.

## Serviços e preservação

Admin/preview ainda na fonte `5bdb298`; publicação do novo código aguarda validação.
Estado anterior foi conferido pela API Cloudflare e está em `servicos-antes.json` nas evidências.
Somente esses dois Workers têm atualização autorizada nesta unidade.

**admin-publicacao preservado:** fonte `pr91-53e177d-on-039d78a`, versão
`7c5830cf-6770-4cc6-84a2-7c47b1cdeb5f`, deployment `0550af8b-8e47-45ef-9d7d-5714a14e1ba9`.
Não publicar, reverter ou reconfigurar esse Worker. Sessões e demais vínculos permanecem.
Sem banco, migrations, regras esportivas, escrita de dados ou merge autorizado nesta entrega.

Checkout humano `sync/trabalho-casa`, CONTRIBUTING/skills locais, PR #91 e outros worktrees preservados.
A escolha anterior Todos/Fase regular em Jogadores não integra este pedido; não presumida.

Próximo passo: concluir gate/browsers, commit/push na mesma PR, verificar CI do HEAD,
publicar admin/preview, conferir versões/assets/privados e atualizar evidências/checkpoint.
Merge depende do aceite explícito do responsável; sem aceite humano ou revisão independente declarados.
