# Progresso atual

## Partida pública aceita - 10/11/2026

### Worker da PR76 publicado - 10/11/2026

Por solicitação expressa do responsável, publicado Worker isolado `base-do-basquete-next-pr76`, fonte `c5a99a5ef6227c3d3ed1aa64904d08316f2532d0`, versão `cf5a1d67-196b-4509-9593-9732c2469597`. [Abrir partida real](https://base-do-basquete-next-pr76.renato-lucindo-jr.workers.dev/resultado.html#4dd44428-f4d9-41a1-8aa1-aa6d7d019cdf). Access `dbbe35c3-9b65-4cd9-82ec-9fd434175879`, somente conta do responsável; navegador aberto na autenticação Access, ainda sem smoke de interface autenticado. Worker público principal, PR75, rotas e dados existentes preservados; PR76 segue sem merge.

Migration de leitura `public_game_detail` aplicada exclusivamente ao Supabase DEV `nizmasjddyrhmevvfviz`, após conferir histórico e ausência da função. Primeiro acesso como anon devolveu a partida real acima com cinco períodos. Sem seeds/DML. Advisors consultados antes/depois; não declarar ausência de novas categorias sem comparar os relatórios. Configuração isolada, secrets e logs em `.preview-artifacts/pr76-worker/` e `.pr76-worker-*.log`, ignorados pelo Git; não copiar valores para documentos.

CI da fonte publicada: [42817205805](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42817205805), todos os jobs incluindo validate SUCCESS; 764 unitários, 746 Chromium (116 skips preexistentes), 42 WebKit. Dry-run e deploy Wrangler concluídos. Aguardando login do responsável no Access para conferir a interface real. Limite excepcional de cota nesta solicitação: parar em 3% restante, substituindo 15% somente nesta execução.

O registro abaixo descreve a implementação anterior ao deploy; o estado de serviço vigente é o desta seção.

Unidade `codex/partida-publica`, [PR76 para main](https://github.com/renato-lucindo/base-do-basquete-next/pull/76), base `origin/main 903dc9c`, worktree isolado `C:/Users/12405304716/.codex/worktrees/partida-publica-aceita/Base do Basquete-v1`. Escopo em [PLAN-PARTIDA-PUBLICA.md](PLAN-PARTIDA-PUBLICA.md); decisões em [PUBLICO.md](design/PUBLICO.md).

Código `5c7e067b8e49bd4a753444ed3dea3eae5b5fe7ee`: 12 linhas por elenco, DNP com apresentação normal, máximos positivos independentes, parciais sem faltas, legenda compartilhada com 2P/3P separados e cronologia de cinco faltas/GD. Comparador de camisas compartilhado (0, 1...99, 00, ausentes), aplicado no público/admin e na paginação de elencos. Participação desconhecida no quarto permanece —, conforme resposta expressa do responsável.

Migration `20261110114500_public_game_detail.sql`: somente funções de leitura/privilégios; consulta optativa por versão publicada, sem alterar snapshots, dados ou RPC legado. Testes SQL isolados comprovam privacidade, rascunho sem efeito, recortes, GD antes/na quinta e equivalência ao motor. Ainda não aplicada remotamente; nenhum deploy.

Verificação local: gate completo em `a30349f` exit 0 (763 unitários, banco isolado, Worker/PDF e demais checks), 14 casos novos de aceitação em cada browser Chromium/WebKit, quatro larguras e zoom nativo 200% aprovados. Regressão completa encontrou três assertivas antigas; atualizadas e repetidas com sucesso. Revisão automática encontrou permissão da primeira consulta anônima; corrigida em `e635426` com RED → GREEN e repetição de nove focais e 15 de banco isolado. Em `5c7e067`, LL legado preserva tentativas desconhecidas; 12 focais, gate:ui e 14 cenários Chromium repetidos e aprovados. Artefatos restantes inalterados. Provas e limites em [VALIDACAO-PARTIDA-PUBLICA.md](design/VALIDACAO-PARTIDA-PUBLICA.md).

Revisão do autor e automática Codex, sem revisão humana independente. CI de `777c48d`: design e WebKit macOS aprovados, gate/browsers em execução ao escrever este checkpoint. A correção SQL dispara nova CI; consultar o resultado real do SHA final na PR76.

Próximo passo: conferir CI e revisão da PR76. Antes de ativar o novo provider num serviço, aplicar/verificar a migration no ambiente autorizado. Nenhum merge ou deploy feito; aceite visual não equivale a autorização de publicação.

## Preservação e serviços

Checkout principal continua `sync/trabalho-casa`, com alterações humanas em CONTRIBUTING.md, skills locais e skills-lock preservadas. PR75 independente continua draft; não tocar nem empilhar esta unidade nela. PR46 integrada, conferida no GitHub. Nenhuma consulta/escrita em banco real ou alteração dos Workers nesta unidade.

Checkpoint anterior em [histórico](../historico/progresso/2026-11-10-antes-partida-publica.md). Continha pendências superadas pelas PR73/74; conferir estado remoto sem reutilizar autorizações de outras unidades.
