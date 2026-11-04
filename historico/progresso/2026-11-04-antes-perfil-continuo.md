> Estado anterior ao perfil contínuo e à recuperação da composição atual da súmula. O responsável reprovou o jogo descrito abaixo; a CI de a50d3ed terminou SUCCESS (run41816297158), sem constituir aceite visual.

# Progresso atual

Atualizado em 04/11/2026. [Contrato](design/REFORMA-UIUX.md) · [Validação e capturas](design/VALIDACAO-REFORMA-UIUX.md) · [Entrega anterior reprovada](../historico/progresso/2026-11-04-piloto-sumula-perfil-reprovados.md).

## Unidade ativa — piloto UI/UX, PR #51

- Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`. [PR #51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51) Draft. Material desta revisão `72aba2400ebeccc07558123197b84e1c11fff318`; recuperar HEAD documental por Git. Remoto/base conferidos, sem branch/PR nova ou pilha dependente.
- O responsável reprovou **as duas telas anteriores**, pediu cuidado especial com o jogo e reiterou liberdade de composição. A nova revisão não tem aceite visual. Jogo em 900 px: confronto central horizontal no desktop, uma linha por equipe/placar no celular; metadados acima, parciais abaixo e elencos próximos. Sem abas redundantes ou card externo envolvendo a página. Mantidos 12 atletas/equipe, titulares/capitão/0/00, LL%, comissão, períodos sincronizados, faltas e ausência versus zero.
- Perfil em 1000 px: identificação/biografia e números de carreira reunidos, cinco abas e jogos recentes antes de participações. Data em duas linhas e confronto controlado mantêm PTS visível em 320/390. Carreira completa na entrada, filtros/URL/colunas/retorno, evolução e alternativa tabular preservados. Tabelas compactas, checkboxes e administração permanecem.
- Somente piloto com 72 identidades e 31 jogos fictícios atuais/históricos. Participação explícita, cobertura ausente preservada. Sem boxscore, comparação ou recordes novos. Catálogo geral ainda reutiliza cenários; classificação conserva ordem fictícia, sem novos critérios esportivos.

## Provas e CI

- `npm run design:verify` final **PASS**: referências originais, tipagem, **17 cenários/18 capturas**, sem erros JavaScript/violações axe selecionadas. Nomes longos, PTS mobile sem rolagem, seis atletas completos/equipe na primeira tela desktop, filtros/retorno, teclado/foco, 320/390/1366/1920 e zoom CSS200. Inspeção do autor também no navegador aberto pelo responsável; não é parecer independente, WCAG integral ou aceite.
- `npm run gate` **PASS**: 689 unitários/141 arquivos, transporte7, banco isolado13, Worker/HTTP29, PDF/workerd1; formato/lint/tipos/builds/fronteira/segredos. Após o ajuste final mobile, reaplicado design completo e formato dos arquivos alterados; aplicação/banco/Worker inalterados. Logs locais: `gate-revisao-composicao.log` (SHA256 `abbaf41888fdef52642e77ec644632f1b70b465a0295b539a5419bd2da17c9ff`) e `design-final-revisao.log` (`b1c959b6705d03847327d9782c72af307bc73a6220250024d4606af9388020d3`) em `docs/design/.preview-artifacts/reforma-uiux/`. Falha intermediária de sincronização de foco do teste de autocomplete registrada na validação, sem ampliar timeout.
- HTTP local200, bytes idênticos ao HTML: **339743 bytes**, SHA256 `6ee69d129ab6e6df86ad6235577b0550645f24e82e45708a55bcb3f1818525c1`. Capturas versionadas atualizadas, inclusive estresse sintético de nomes longos.
- CI anterior `3fbcefa`: [run41769727652](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41769727652) **SUCCESS**, conferida nesta execução. **Este checkpoint antecede o push da revisão nova**: resultado novo pendente, consultar SHA/run nos [checks da PR51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51/checks) e na descrição atualizada. Não extrapolar o PASS anterior ao material novo.

## Próximo passo e preservação

- Avaliar [jogo](http://127.0.0.1:4189/#publico/jogo/game-1) e [perfil](http://127.0.0.1:4189/#publico/jogador/player-1). A aba existente do jogo foi recarregada para mostrar a revisão; HTML autocontido em `docs/design/prototipos/reforma-uiux/Piloto UIUX.html`. Próxima ação: incorporar o retorno visual na mesma branch/PR. Integração às rotas reais permanece posterior ao aceite; conferir CI do SHA exato antes de integrar Git.
- Nenhuma rota real/API, migration, deploy ou dado humano alterado; nenhum serviço publicado nesta unidade. Último registro herdado da PR50: versão `35f5b882-70b1-48f7-8bb3-fda632bd458e`, deployment `09e26c1c-4e0e-46ea-8026-5d5c8a721d59`, 03/11 às19:48:43 São Paulo. Serviço não inspecionado nesta revisão.
- Checkout principal `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Outros worktrees preservados.
- Última cota real:20% consumido/**80% restante em5h**,40% semanal consumido. Sem créditos/reset manual. Automação desta conversa `retomar-piloto-uiux-pr-51` continua **PAUSED** (estado local conferido; pausa oficial registrada na execução anterior), enquanto aguarda avaliação humana. Regra de checkpoint aos15% restante e retomada no reset observado+2min preservada; esta entrega não é pausa por cota.
