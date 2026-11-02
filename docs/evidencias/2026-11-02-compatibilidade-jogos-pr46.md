# Compatibilidade da leitura de Jogos no preview da PR #46

Em 02/11/2026, o responsável autorizou corrigir também a administração de Jogos na própria PR #46, após a captura do erro de indisponibilidade. A fonte inicial desta correção é `8b43f803e5efa59153ed718225ceba3deda2ac5b`; o SHA final, CI e deployment ficam registrados na [PR #46](https://github.com/renato-lucindo/base-do-basquete-next/pull/46).

## Causa e correção

A definição vigente de `public.get_game`, consultada somente com SELECT de metadados, inclui `startAt` e `endAt`. `public.list_games` agrega essa função. Os logs de `list_games` consultados retornam 200; o contrato estrito da PR #46 recusava as duas propriedades novas e convertia a leitura em `access_unavailable`/503. Não foram lidos valores de autenticação nem dados privados para reproduzir o problema.

O contrato de snapshot agora reconhece esses dois metadados opcionais e anuláveis, com validação de formato/calendário. A lista e o editor usam esse mesmo contrato. Propriedades desconhecidas continuam proibidas; identidades, contexto e datas da agenda conservam suas verificações.

Os metadados ficam fora de `gameFields`: não foram adicionados campos à interface nem alterados os comandos de gravação. A migração já existente na branch #38 preserva os horários armazenados quando o comando antigo os omite; ela foi apenas inspecionada, nunca executada nesta unidade.

## Evidências focais

- Antes da correção: os dois cenários novos de provider (horários nulos e preenchidos) falharam com o mesmo 503; o formato anterior passou.
- Depois: 23 testes focais de contratos/providers de jogo e arbitragem passaram. Também são recusados datas impossíveis, hora inválida, tipo numérico, sufixo de fuso inesperado e propriedades alheias.
- Regressão de navegador desktop/mobile: lista carregada com os novos horários; abertura do editor; edição/gravação em fixture descartável; comando emitido sem `startAt`/`endAt`. Nenhuma gravação humana ou chamada de escrita ao Supabase.
- Bateria focal de Jogos, arbitragem e páginas públicas: **39 PASS / 15 SKIP**, sem falhas. Inclui a regressão nova nos dois projetos. Os skips pertencem aos cenários já condicionados por viewport, sem desativação de testes nesta correção.
- A primeira execução do novo teste de UI falhou por procurar o botão inexistente “Editar jogo”. O seletor foi corrigido para o botão real “Abrir jogo”; a repetição passou sem alterar timeouts da configuração.
- Gate consolidado local: PASS, exit 0. Incluiu lint/formato/tipos, **599 unitários/121 arquivos**, seis transportes, 13 cenários PostgreSQL descartáveis, builds, 25 testes Worker, quatro PDFs no workerd, fronteira cliente/servidor e scanner de segredos. A CI do SHA final e a publicação seguinte devem ser conferidas no registro da PR.

## Ambiente e limites

Worktree exclusivo: `C:/Users/12405304716/.codex/worktrees/pr46-preview-20261101`, inicialmente detached no HEAD remoto da PR. O worktree antigo de `codex/implementacao-publica` tem modificação preexistente em `docs/PROGRESSO.md`, preservada; o checkout original e seus arquivos não rastreados também permanecem intactos.

Somente o Worker `base-do-basquete-next-pr46` pode receber a correção. Preservar sua chave/namespace de sessões, Access e configuração do preview compartilhado. Não realizar merge, DDL/DML, seeds, migrations ou publicação de produção. Nesta retomada não há necessidade de nova migration Cloudflare.

A integração de controle do navegador do responsável falhou ao inicializar. A prova autenticada administrativa remota precisa de recarga pelo responsável ou de uma sessão de navegador acessível pelas ferramentas; não extrair/copiar sua sessão para completar o teste. Fixtures locais não equivalem a essa prova.
