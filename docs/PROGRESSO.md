# Progresso atual

## Bracket real entregue no preview — 08/11/2026

Unidade **codex/campeonato-flexivel**, worktree `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`, [PR75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75) **aberta/draft**. Material **56488576cc5186020ec837fec3531ba2f79cb39f**; fonte validada/publicada **4f0e99768c7f7d4f363a814ed8a72d202b4f51ef**. Este checkpoint posterior altera somente documentação; seu SHA/run devem ser consultados no Git/CI, sem atribuir a ele a CI da fonte publicada.

Implementados Classificatória/Eliminatória, disponibilidade por primeiro confronto com participantes resolvidos, tabela/grupos e URLs antigas preservados. Bracket com cabeçalhos internos Jogo 1…N, jogo único/ida-volta/MD3/5/7, placares por inscrição/slot e conexões reais de vencedor/perdedor. Sem cálculo, API ou banco novos. [Plano](PLAN-CAMPEONATO-FLEXIVEL.md#classificatória-e-bracket--protótipo-aceito-em-08112026), [provas e limites](evidencias/2026-11-08-bracket-eliminatoria.md).

**CI da fonte publicada:** [42527229564](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42527229564) inteiramente SUCCESS, incluindo validate, checks/gate, design, WebKit e dois lotes Chromium. Logs reais dos lotes:443PASS e325PASS/118skipped, total **768PASS/118skipped**, cobertura integral equivalente dos886casos. Essa é a prova de regressão usada para liberar o preview. A execução local permanece **762PASS/118skipped/6FAIL**, exit1 por ENOENT/ENOSPC de artefatos; não foi reinterpretada como PASS.

Provas locais reutilizadas:12unit focais,38Chromium focais,10WebKit focais;787unit/164arquivos,15SQL,35Worker com TEMP normal,11transportes,4PDFs e verificações estáticas/builds/fronteira/segredos aprovados nas etapas registradas. Gate isolado com TEMP alternativo não teve exit0. Capturas1366/1920/390/320 e zoom200%; axe sem violações nos cenários de bracket. Revisão do autor, sem parecer independente; sem tópicos abertos na última consulta.

## Serviço e proteções

[Preview da Classificação](https://base-do-basquete-next-pr75.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96?secao=classificacao). Worker exclusivo **base-do-basquete-next-pr75**, versão **f8f2ad0c-f6d5-4298-baeb-b420f9e227b4** a100%, deployment **ae0c2a37-bab8-47db-a6c7-3a06534df745**, publicado08/11 às23:21:03UTC. Builds/pacote novos da fonte4f0e997;35assets verificados remotamente por hash e fonte. Hash worker.js0e5c714cc48c0f715326684e8a92a72487ba9ddbf793c6690b4245dc591c0609, backend inalterado.

Smoke remoto PASS: metadado flexible=true,26jogos públicos sem motivos privados,401 nos4endpoints privados, anônimo302 para Access. Token efêmero restrito ao app, somente em memória/TTY sem eco, revogado após a política em sequência; consulta final confirmou **zero tokens**, somente owner-only, sessão8h e URLs alternativas desabilitadas.

Comparação remota antes/depois: configurações dos3Workers idênticas ao baseline; principal **base-do-basquete-next-preview** e UIUX mantiveram também seus deployments. PR75 preservou DO SESSIONS3552464a1346403ab7132137b7b39e6d, rate limit751107202611, origem, dois segredos, featuretrue e Access app e0700da3-fde2-4f2f-b833-81e3c9abcf1b/política7de2233d-9114-46f0-bcf6-58ed641fec30.

Banco dev compartilhado nizmasjddyrhmevvfviz, migration20261107213937 aplicada/imutável; nenhuma operação no banco nesta entrega. Fixtures de bracket somente locais. Não foi feita escrita autenticada remota nem criação de confrontos fictícios: a aba depende da estrutura publicada real.

## Pendência e continuidade

Resta **aceite humano do Worker real**; não mesclar/fechar PR75. Não recompilar/republicar por este checkpoint documental. Acompanhar somente sua CI atual pela mesma automação **retomar-regulamento-fiba**, a cada10min se houver espera; pausar quando SUCCESS e restar só aceite. Silêncio enquanto pendente/inalterada. Nenhum deploy principal/UIUX, migration, rotação de segredos ou DML remoto autorizado por essa checagem.

Checkout principal, CONTRIBUTING humano, skills/skills-lock e branches anteriores preservados; worktree desta unidade estava limpo ao retomar. Cota medida na retomada:0%usado5h,95%semanal; sem créditos/reset manual. Reconsultar se houver nova espera/impedimento; gatilho15%restante5h e reset real+2min.

[Checkpoint anterior ao release](../historico/progresso/2026-11-08-antes-release-bracket.md).
