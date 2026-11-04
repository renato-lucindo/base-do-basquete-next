> Checkpoint preservado antes da nova revisão de composição. A súmula e o perfil descritos abaixo foram reprovados visualmente pelo responsável. A CI de 3fbcefa terminou SUCCESS (run41769727652), conferida em04/11; isso não constitui aceite.

# Progresso atual

Atualizado em 04/11/2026. [Contrato](design/REFORMA-UIUX.md) Â· [ValidaÃ§Ã£o e capturas](design/VALIDACAO-REFORMA-UIUX.md) Â· [Checkpoint anterior](../historico/progresso/2026-11-03-pausa-piloto-uiux.md).

## Unidade ativa â€” piloto UI/UX, PR #51

- Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`. [PR #51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51) Draft. Material desta entrega `c0f2f0cbef5fd0ecec91c3d1dc0a12a624427edd`; recuperar HEAD documental por Git. Remoto/base conferidos antes de publicar; nenhuma branch/PR dependente criada.
- Piloto completo para avaliaÃ§Ã£o: tabelas compactas Ã  esquerda/nÃºmeros Ã  direita, checkboxes de equipes e administraÃ§Ã£o compacta preservados; sÃºmula pÃºblica com confronto/parciais, dois elencos de 12 atletas, comissÃ£o, titulares/capitÃ£o/0/00, totais/LL%, perÃ­odos sincronizados e faltas detalhadas. CabeÃ§alho intermediÃ¡rio rejeitado foi refeito com a liberdade de composiÃ§Ã£o concedida pelo responsÃ¡vel.
- Perfil do jogador: Resumo, EstatÃ­sticas, Conquistas e honrarias, Jogos e HistÃ³rico. Entrada nova sempre pela carreira completa; filtros/aba/modo compartilhÃ¡veis, essenciais e escolha de colunas no celular, evoluÃ§Ã£o com alternativa tabular e retorno com contexto/rolagem. 72 identidades e 31 partidas fictÃ­cias atuais/histÃ³ricas; participaÃ§Ã£o Ã© explÃ­cita, nÃ£o inferida da equipe. Cobertura desconhecida permanece ausente. Nomes iguais sÃ£o distintos tambÃ©m no editor.
- ReferÃªncias e limites no contrato: somente sÃºmula nesta etapa, sem boxscore/comparaÃ§Ã£o/Recordes novos. CatÃ¡logo geral ainda reutiliza cenÃ¡rios fictÃ­cios; nÃ£o comprova cobertura de todos os recortes. ClassificaÃ§Ã£o conserva a ordem fictÃ­cia publicada do piloto, sem implementar critÃ©rios esportivos novos.

## Provas e CI

- `npm run design:verify` PASS, incluindo tipagem e **16 cenÃ¡rios/16 capturas** do piloto, referÃªncias originais, teclado, reflow320/zoomCSS200, escolhas de colunas/retorno e axe em nove telas/cinco abas/menus/diÃ¡logos nas trÃªs resoluÃ§Ãµes. InspeÃ§Ã£o visual e revisÃ£o do autor pelas duas skills registradas; nÃ£o Ã© parecer independente, WCAG integral ou aceite humano.
- `npm run gate` PASS: 689 unitÃ¡rios/141 arquivos, transporte7, banco isolado13, Worker/HTTP29 e PDF/workerd1; formato/lint/tipos/builds/fronteira/segredos PASS. Ajuda final de siglas no piloto recebeu a nova execuÃ§Ã£o completa de design; artefatos de aplicaÃ§Ã£o/banco/Worker inalterados reutilizam a prova do gate. Logs/JSON locais em `docs/design/.preview-artifacts/reforma-uiux/`.
- HTTP local200, bytes servidos idÃªnticos ao HTML material: **334084 bytes**, SHA256 `d27c3a2c50fbbad372e007213d03c41da16b7f1b49f87fedfbac06102e34d67a`.
- CI disponÃ­vel e conferida na retomada: `c798c3b5dbcc07e5eec005d9ae8ed2a6f7882a4b`, [run41752996441](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41752996441) SUCCESS. **Na gravaÃ§Ã£o deste checkpoint**, a nova CI ainda seria disparada pelo push; o resultado vigente fica nos [checks da PR51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51/checks) e na descriÃ§Ã£o atualizada da PR. NÃ£o extrapolar o PASS antigo ao cÃ³digo novo; conferir SHA exato antes de integrar.

## PrÃ³ximo passo e preservaÃ§Ã£o

- Avaliar [jogo concluÃ­do](http://127.0.0.1:4189/#publico/jogo/game-1) e [perfil de carreira](http://127.0.0.1:4189/#publico/jogador/player-1), ou o HTML autocontido em `docs/design/prototipos/reforma-uiux/Piloto UIUX.html`. Ajustes continuam nesta branch/PR. **Aceite visual pendente**; expansÃ£o Ã s rotas reais e integraÃ§Ã£o desta unidade permanecem etapas posteriores.
- Nenhuma rota real/API, migration, deploy ou dado humano alterado; nenhum serviÃ§o publicado nesta unidade. Ãšltimo registro herdado da PR50: versÃ£o `35f5b882-70b1-48f7-8bb3-fda632bd458e`, deployment `09e26c1c-4e0e-46ea-8026-5d5c8a721d59`, 03/11 Ã s19:48:43 SÃ£o Paulo. ServiÃ§o nÃ£o inspecionado nesta unidade, sem smoke remoto novo.
- Checkout principal `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` nÃ£o rastreados. Outros worktrees preservados.
- Retomada manual expressamente autorizada, inclusive excepcionalmente antes do limite anterior; a janela real resetou antes da implementaÃ§Ã£o. Ãšltima consulta antes do gate:26% consumido/74% restante em5h,33% semanal consumido. Sem crÃ©ditos/reset manual. AutomaÃ§Ã£o desta conversa `retomar-piloto-uiux-pr-51` **PAUSED**, confirmada pela ferramenta oficial, para nÃ£o duplicar a retomada manual e enquanto aguarda somente avaliaÃ§Ã£o humana. Regra permanente de checkpoint aos15% restante preservada para futuras execuÃ§Ãµes.
