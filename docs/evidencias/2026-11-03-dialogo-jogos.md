# Cadastro administrativo de jogos — PR #49

Protótipo aprovado nesta conversa, implementado na mesma branch `codex/navegacao-publica`. Código `7e5b1fc93ab6814a6799676661b53632ca9e0cf5`; base deste incremento `ad15231ec3d9cdb54964785023f3b76338582f7f`.

## Resultado

- Mandante e Visitante com busca independente, paginação, limpeza e teclado; Escape conserva a seleção. A busca separada foi substituída; cadastro contextual e retorno preservados.
- Agenda com data, início, fim, local e número, reutilizando persistência e virada do dia existentes. Jogos encerrados conservam agenda protegida e correção de horários reais.
- Rodada numérica opcional com sugestões da disputa. Eliminatória desmarcada por padrão; Etapa opcional abre à direita, inclusive em 320 CSS px, com sugestões e nomes livres.
- Arbitragem recolhível e ações fora da rolagem. Salvar e adicionar outro mantém somente data/local/rodada. Recuperação conserva comando e intenção após envio incerto ou ACK seguido de leitura falha.
- Novos dados administrativos: não cria grupos/séries, nem altera regulamento, projeções ou estatísticas públicas.

## Persistência

Migration nova `20261103163618_game_editor_metadata.sql`, criada com Supabase CLI e testada apenas em PGlite descartável. Acrescenta `stage_kind`, `round_number`, `knockout_stage` e RPC autenticada de rodadas com security invoker. RLS/permissões existentes preservadas. Jogos antigos recebem regular por decisão explícita do responsável; envios antigos preservam os campos omitidos e os recibos existentes.

Sem aplicação remota, DML humano, deploy ou merge. A migration anterior de estatísticas coletivas também permanece pendente.

## Validação

Windows, Node 24.18.0, Chromium headless, fixtures sintéticas, código inicial `7e5b1fc`, correção do teste histórico `f798dee` e ajuste final de teclado `ef11da0af12c3626d68f1378e55d71c0ba4a774c`.

- Banco: **2 PASS**, instalação nova e atualização, compatibilidade, idempotência, limites, etapas inválidas, isolamento por disputa e permissões.
- Playwright final, nove arquivos de jogos/arbitragem/locais/PDFs/retornos/admin/súmula legada, dois workers: **99 PASS / 31 SKIP** dos recortes existentes. Inclui 1366×768, 1920×1080, 390/320 px, zoom equivalente em 683×384, axe, foco, erros e recuperação sem duplicação.
- Etapas do gate aprovadas por composição após a correção histórica: lint/formato/tipos, **684 unitários/140 arquivos**, **6 transportes**, **13/13 testes de banco**, builds, **28 Workerd**, **1 runtime PDF**, fronteiras e segredos. A primeira execução parou na expectativa de upgrade; o teste passou a exigir os novos defaults e preservar a comparação de todos os campos anteriores. Não foi declarada aprovação daquela execução interrompida.
- Refinamento de teclado: a opção ativa da lista acompanha a rolagem, sem sair da área visível. **24 browsers focais PASS**, incluindo os dois tamanhos de projeto, tipos/lint/build conferidos novamente. Provas de componentes inalterados reutilizadas; CI executará o gate integral no HEAD enviado. Logs ignorados em `.preview-artifacts/game-editor-*`.
- Pausa pelo limiar de cota de 15% seguida de retomada manual autorizada após reset do responsável; nenhuma compra de crédito ou reset pelo agente. Agendamento desta conversa será pausado ao concluir.
- Falhas exploratórias de expectativas antigas, alinhamento, legenda oculta e ícone de limpar foram corrigidas. Uma rodada posterior sofreu `ENOSPC` no C:; regressão final passou usando TEMP/TMP e resultados em `Y:/Codex-Temp/pr49-jogos-20261103`. Nenhum arquivo alheio foi removido.
- Revisão local com `ui-ux-pro-max` e fonte atual de `web-design-guidelines`, sem alegação de revisão independente, piloto remoto ou conformidade WCAG integral.

![Desktop](dialogo-jogos/desktop-1366.png)

![Mobile](dialogo-jogos/mobile-390.png)

Mesma [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49), mantida draft; [CI do HEAD](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks). Migrations e deploy exigem autorização específica.
