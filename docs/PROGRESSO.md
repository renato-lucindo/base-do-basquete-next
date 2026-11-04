# Progresso atual

Atualizado em 04/11/2026. [Contrato](design/REFORMA-UIUX.md) · [Validação e capturas](design/VALIDACAO-REFORMA-UIUX.md) · [Checkpoint anterior](../historico/progresso/2026-11-03-pausa-piloto-uiux.md).

## Unidade ativa — piloto UI/UX, PR #51

- Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`. [PR #51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51) Draft. Material desta entrega `c0f2f0cbef5fd0ecec91c3d1dc0a12a624427edd`; recuperar HEAD documental por Git. Remoto/base conferidos antes de publicar; nenhuma branch/PR dependente criada.
- Piloto completo para avaliação: tabelas compactas à esquerda/números à direita, checkboxes de equipes e administração compacta preservados; súmula pública com confronto/parciais, dois elencos de 12 atletas, comissão, titulares/capitão/0/00, totais/LL%, períodos sincronizados e faltas detalhadas. Cabeçalho intermediário rejeitado foi refeito com a liberdade de composição concedida pelo responsável.
- Perfil do jogador: Resumo, Estatísticas, Conquistas e honrarias, Jogos e Histórico. Entrada nova sempre pela carreira completa; filtros/aba/modo compartilháveis, essenciais e escolha de colunas no celular, evolução com alternativa tabular e retorno com contexto/rolagem. 72 identidades e 31 partidas fictícias atuais/históricas; participação é explícita, não inferida da equipe. Cobertura desconhecida permanece ausente. Nomes iguais são distintos também no editor.
- Referências e limites no contrato: somente súmula nesta etapa, sem boxscore/comparação/Recordes novos. Catálogo geral ainda reutiliza cenários fictícios; não comprova cobertura de todos os recortes. Classificação conserva a ordem fictícia publicada do piloto, sem implementar critérios esportivos novos.

## Provas e CI

- `npm run design:verify` PASS, incluindo tipagem e **16 cenários/16 capturas** do piloto, referências originais, teclado, reflow320/zoomCSS200, escolhas de colunas/retorno e axe em nove telas/cinco abas/menus/diálogos nas três resoluções. Inspeção visual e revisão do autor pelas duas skills registradas; não é parecer independente, WCAG integral ou aceite humano.
- `npm run gate` PASS: 689 unitários/141 arquivos, transporte7, banco isolado13, Worker/HTTP29 e PDF/workerd1; formato/lint/tipos/builds/fronteira/segredos PASS. Ajuda final de siglas no piloto recebeu a nova execução completa de design; artefatos de aplicação/banco/Worker inalterados reutilizam a prova do gate. Logs/JSON locais em `docs/design/.preview-artifacts/reforma-uiux/`.
- HTTP local200, bytes servidos idênticos ao HTML material: **334084 bytes**, SHA256 `d27c3a2c50fbbad372e007213d03c41da16b7f1b49f87fedfbac06102e34d67a`.
- CI disponível e conferida na retomada: `c798c3b5dbcc07e5eec005d9ae8ed2a6f7882a4b`, [run41752996441](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41752996441) SUCCESS. **Na gravação deste checkpoint**, a nova CI ainda seria disparada pelo push; o resultado vigente fica nos [checks da PR51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51/checks) e na descrição atualizada da PR. Não extrapolar o PASS antigo ao código novo; conferir SHA exato antes de integrar.

## Próximo passo e preservação

- Avaliar [jogo concluído](http://127.0.0.1:4189/#publico/jogo/game-1) e [perfil de carreira](http://127.0.0.1:4189/#publico/jogador/player-1), ou o HTML autocontido em `docs/design/prototipos/reforma-uiux/Piloto UIUX.html`. Ajustes continuam nesta branch/PR. **Aceite visual pendente**; expansão às rotas reais e integração desta unidade permanecem etapas posteriores.
- Nenhuma rota real/API, migration, deploy ou dado humano alterado; nenhum serviço publicado nesta unidade. Último registro herdado da PR50: versão `35f5b882-70b1-48f7-8bb3-fda632bd458e`, deployment `09e26c1c-4e0e-46ea-8026-5d5c8a721d59`, 03/11 às19:48:43 São Paulo. Serviço não inspecionado nesta unidade, sem smoke remoto novo.
- Checkout principal `sync/trabalho-casa` preservado: `CONTRIBUTING.md` modificado, `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Outros worktrees preservados.
- Retomada manual expressamente autorizada, inclusive excepcionalmente antes do limite anterior; a janela real resetou antes da implementação. Última consulta antes do gate:26% consumido/74% restante em5h,33% semanal consumido. Sem créditos/reset manual. Automação desta conversa `retomar-piloto-uiux-pr-51` **PAUSED**, confirmada pela ferramenta oficial, para não duplicar a retomada manual e enquanto aguarda somente avaliação humana. Regra permanente de checkpoint aos15% restante preservada para futuras execuções.
