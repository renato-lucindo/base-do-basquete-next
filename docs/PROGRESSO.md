# Progresso atual

## Partida pública aceita - 10/11/2026

Unidade `codex/partida-publica`, [PR76 para main](https://github.com/renato-lucindo/base-do-basquete-next/pull/76), base `origin/main 903dc9c`, worktree isolado `C:/Users/12405304716/.codex/worktrees/partida-publica-aceita/Base do Basquete-v1`. Escopo em [PLAN-PARTIDA-PUBLICA.md](PLAN-PARTIDA-PUBLICA.md); decisões em [PUBLICO.md](design/PUBLICO.md).

Código `e63542644c3a8b887f14e3679b86f3709fe4384e`: 12 linhas por elenco, DNP com apresentação normal, máximos positivos independentes, parciais sem faltas, legenda compartilhada com 2P/3P separados e cronologia de cinco faltas/GD. Comparador de camisas compartilhado (0, 1...99, 00, ausentes), aplicado no público/admin e na paginação de elencos. Participação desconhecida no quarto permanece —, conforme resposta expressa do responsável.

Migration `20261110114500_public_game_detail.sql`: somente funções de leitura/privilégios; consulta optativa por versão publicada, sem alterar snapshots, dados ou RPC legado. Testes SQL isolados comprovam privacidade, rascunho sem efeito, recortes, GD antes/na quinta e equivalência ao motor. Ainda não aplicada remotamente; nenhum deploy.

Verificação local: gate completo em `a30349f` exit 0 (763 unitários, banco isolado, Worker/PDF e demais checks), 14 casos novos de aceitação em cada browser Chromium/WebKit, quatro larguras e zoom nativo 200% aprovados. Regressão completa encontrou três assertivas antigas; atualizadas e repetidas com sucesso. Revisão automática encontrou permissão da primeira consulta anônima; corrigida em `e635426` com RED → GREEN e repetição de nove focais e 15 de banco isolado. Artefatos restantes inalterados. Provas e limites em [VALIDACAO-PARTIDA-PUBLICA.md](design/VALIDACAO-PARTIDA-PUBLICA.md).

Revisão do autor e automática Codex, sem revisão humana independente. CI de `777c48d`: design e WebKit macOS aprovados, gate/browsers em execução ao escrever este checkpoint. A correção SQL dispara nova CI; consultar o resultado real do SHA final na PR76.

Próximo passo: conferir CI e revisão da PR76. Antes de ativar o novo provider num serviço, aplicar/verificar a migration no ambiente autorizado. Nenhum merge ou deploy feito; aceite visual não equivale a autorização de publicação.

## Preservação e serviços

Checkout principal continua `sync/trabalho-casa`, com alterações humanas em CONTRIBUTING.md, skills locais e skills-lock preservadas. PR75 independente continua draft; não tocar nem empilhar esta unidade nela. PR46 integrada, conferida no GitHub. Nenhuma consulta/escrita em banco real ou alteração dos Workers nesta unidade.

Checkpoint anterior em [histórico](../historico/progresso/2026-11-10-antes-partida-publica.md). Continha pendências superadas pelas PR73/74; conferir estado remoto sem reutilizar autorizações de outras unidades.
