# Progresso atual

Atualizado em 04/11/2026. [Contrato](design/REFORMA-UIUX.md) · [Validação/capturas](design/VALIDACAO-REFORMA-UIUX.md) · [Checkpoint anterior](../historico/progresso/2026-11-04-antes-perfil-continuo.md).

## Unidade ativa — piloto UI/UX, PR #51

- Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`. [PR #51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51) Draft. Material `3f050e5c6451fd6011d8b3b18899b062c2da937f`; recuperar HEAD documental por Git. `origin/main` conferida, sem avanço; mesma unidade/PR.
- O jogo de72aba24 foi reprovado e substituído pela composição da súmula atual: contexto/parciais com total final e elencos, sem placar separado/painéis novos. Piloto importa a folha existente `src/publication/public-view.css`, sem alterar produção; recortes/faltas detalhadas continuam onde as fixtures possuem cobertura.
- Perfil contínuo conforme plano aprovado: nome/dados pessoais rotulados, conquistas laterais desktop/abaixo no celular, resumo temporada mais recente/carreira, três últimos jogos e estatísticas por campeonato. Jogos completos/Histórico/Evolução recolhidos; atalhos substituem abas. Filtros não alteram resumo/conquistas/recentes. URL, painéis, retorno/rolagem, colunas, ausência/cobertura e identidade explícita preservados. **Aceite visual da implementação ainda pendente.**
- Tabelas compactas, checkboxes e administração preservados. 72 identidades/31 jogos fictícios atuais/históricos; catálogo ainda reutiliza cenários. Sem boxscore, comparação, recordes novos ou integração às rotas reais.

## Provas e CI

- `npm run design:verify` final **PASS**, referências originais/tipagem e **17 cenários/20 capturas**, sem erros JavaScript/violações axe selecionadas. Inclui comparação com `PublicGameView` atual renderizado com fixture local (fonte/altura/borda/fundo), resumo/cobertura/três recentes, filtros/painéis/recarga/retorno, teclado/foco,320/390/1366/1920 e zoomCSS200. Conferência adicional de Space/Enter nos painéis e link antigo de conquistas; inspeção visual no navegador. Revisão do autor pelas duas skills; não é parecer independente, WCAG integral ou aceite humano.
- `npm run gate` **PASS**: 689 unitários/141 arquivos, transporte7, banco isolado13, Worker/HTTP29, PDF/workerd1; formato/lint/tipos/builds/fronteira/segredos. Após documentação/cópias finais, formato focal e scanner reaplicados (1086 arquivos, sem achado). Código de aplicação/banco/Worker inalterado.
- Logs em `docs/design/.preview-artifacts/reforma-uiux/`: `design-perfil-continuo.log` SHA256 `74fbfe9ebb9c70f6a620beef426257b9dc297f7748508480dd37c042f749658a`; `gate-perfil-continuo.log` SHA256 `8328ec3370842cc37c2998ed31ef4be55118866b6b1e3b988963a29053eda65e`. Falhas intermediárias de persistência de fechamento e medição da rolagem de saída tratadas/documentadas, sem ampliar timeouts.
- HTTP200, HTML idêntico ao arquivo: **364501 bytes**, SHA256 `782a247dbba5c27c2d6827325a7e4b7f7679698df836c979be5bd762bd7c49ee`. Capturas versionadas atualizadas, inclusive referência do componente real com fixture.
- CI anterior de `a50d3edbade72877f10eb8dc07fc3b191ae1cee6`: [41816297158](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41816297158) **SUCCESS**, conferida nesta execução. Este checkpoint antecede o push novo: **CI nova pendente**, consultar SHA/run nos [checks](https://github.com/renato-lucindo/base-do-basquete-next/pull/51/checks) e descrição da PR. Não extrapolar PASS antigo ao SHA novo.

## Continuidade e preservação

- Avaliar [perfil](http://127.0.0.1:4189/#publico/jogador/player-1) e [jogo](http://127.0.0.1:4189/#publico/jogo/game-1), ou baixar `docs/design/prototipos/reforma-uiux/Piloto UIUX.html`. A aba antiga não existia mais na sessão do navegador; aberta/conferida nova aba do perfil. Próxima ação: incorporar o retorno visual nesta mesma PR, sem expandir às rotas reais antes do aceite; conferir CI do SHA exato antes de integrar Git.
- Nenhuma API/rota real, migration, banco, publicação, merge ou deploy executado. Serviço local4189 continua servindo o piloto; nenhum serviço remoto publicado/inspecionado. Registro herdado de produção preservado no checkpoint arquivado.
- Checkout principal `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Outros worktrees preservados.
- Cota real final:53% consumido/**47% restante em5h**,45% semanal consumido. Sem crédito/reset manual. Automação `retomar-piloto-uiux-pr-51` permanece **PAUSED** (configuração local conferida; confirmação oficial anterior preservada), aguardando avaliação humana. Regra de checkpoint aos15% restante/reset observado+2min mantida; esta entrega não é pausa por cota.
