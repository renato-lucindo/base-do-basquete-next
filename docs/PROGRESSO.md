# Progresso atual

Atualizado em 03/11/2026, checkpoint por cota. [Plano vigente](design/REFORMA-UIUX.md) · [Validação](design/VALIDACAO-REFORMA-UIUX.md) · [Resumo anterior](../historico/progresso/2026-11-03-piloto-uiux-primeira-entrega.md).

## Unidade ativa — piloto UI/UX, PR #51

- Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch `codex/reforma-uiux-piloto`, base `eff36fe0eda76962e6babbc4a9464a98c3dad478`. [PR #51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51) Draft, mesma unidade. Último material `42dcfe35f9db87ee37de28b0a7d8642f5b13944a`; HEAD documental deve ser recuperado por Git.
- Implementados: tabelas com largura por conteúdo, identificação limitada e números à direita; checkboxes r6 de equipes com Todas/Nenhuma/contador, busca+mínimo e retorno; correção de seletor de colunas em 320 px; cabeçalho do jogo centralizado, metadados acima e placar proporcional. HTML gerado; servidor existente `http://127.0.0.1:4189/` lê esse arquivo a cada requisição.
- **Última orientação do responsável:** não gostou do resultado do cabeçalho no celular (print desta conversa) e deu liberdade para ajustar segundo padrões e referências. A composição atual não tem aceite. Rever nomes quebrados, proporções, hierarquia e espaços ao construir a súmula completa; medidas 18/22 e 16/20 deixam de ser rígidas. Não apresentar o cabeçalho atual como solução final.
- Prova deste material: build/tipagem/verificador focal PASS, **11 cenários e dez capturas**; geometria 1366/1920, filtros/retorno, cabeçalho 320/390/1366/1920, demais percursos/teclado/reflow/axe. Isso comprova comportamento, não aceite visual. HTML 292785 bytes, SHA256 `08ecc6bf9ba960ff6b11666df06a29ff757d49ba62b42231b6a3e68eb433c142`. Revisão do autor pelas skills registrada. **Gate consolidado novo não executado**, respeitando a cota.
- CI anterior documental `332e86e10bbffe60d42574f97d72e33e143f8ec0`: [41747909707](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41747909707) SUCCESS, conferida nesta pausa. CI original `298e1917...`: [41745327850](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41745327850) SUCCESS, 689 unitários/551 browsers PASS/109 SKIP. Não extrapolar essas provas para o incremento novo; consultar CI do HEAD após push/na retomada.

## Pendências e próximo passo

1. Completar `GameDetail` no app do piloto, **reprojetando o cabeçalho rejeitado**, com parciais/prorrogações, elencos/comissão, titulares/capitão/0/00, faltas e recorte sincronizado conforme `docs/design/prototipos/sumula` e INTEGRACAO.md. Somente súmula; boxscore posterior.
2. Completar perfil adaptado do V4: Resumo, Estatísticas, Conquistas e honrarias, Jogos e Histórico; entrada sempre na carreira completa, filtros internos, totais/médias/evolução elegível e retorno com contexto/posição. Referência: `C:/Users/12405304716/Documents/Codex/2026-08-25/new-chat/outputs/perfil-jogador-v4.html`. Perfil atual ainda é placeholder; Jogos filtra pela equipe, não pela participação do atleta: corrigir.
3. Fixtures explícitas e coerentes de identidade/vínculo/participação, placar/parciais e estatísticas. Hoje categorias/temporadas reutilizam dados. Não inferir jogos do atleta só pela equipe, nem misturar métricas incompatíveis ou transformar ausência em zero. Sem comparação/Recordes novos.
4. Seguir ui-ux-pro-max e web-design-guidelines atualizada; testar e inspecionar as páginas completas em desktop/celular/320/zoom, teclado e axe. Atualizar capturas/docs e, quando estável e com cota, gate consolidado e CI vigente. Manter Draft para avaliação visual; não iniciar unidade dependente.

## Serviço e trabalho alheio

- Nenhum serviço, API real, banco ou dado humano alterado; sem merge/deploy/DDL nesta etapa. Produção herdada da PR50: versão `35f5b882-70b1-48f7-8bb3-fda632bd458e`, deployment `09e26c1c-4e0e-46ea-8026-5d5c8a721d59`, 03/11 às19:48:43 São Paulo. Serviço não inspecionado nesta unidade; não é smoke novo.
- Checkout principal `sync/trabalho-casa` conferido e preservado: `CONTRIBUTING.md` modificado; `.agents/skills/web-design-guidelines/` e `skills-lock.json` não rastreados. Outros worktrees preservados.

## Pausa e retomada automática

- Cota oficial **85% consumido / 15% restante** na janela5h; semanal28% consumido. Reset observado **04/11/2026 03:09:49 UTC**, equivalente a **00:09:49 America/Sao_Paulo**. Sem créditos ou reset manual.
- Ferramenta oficial criou e confirmou por view a automação heartbeat **`retomar-piloto-uiux-pr-51`**, ACTIVE, nesta conversa `01a1a3b6-741f-77c1-9a65-3a86e517be14`, execução única em **04/11/2026 00:11:49 America/Sao_Paulo** (03:11:49 UTC), reset+2min. Nenhuma automação alheia alterada.
- Retomar conferindo cota/Git/PR/CI e seguir o item1. Se outra janela impedir, reagendar pelo reset real aplicável+2min. Pausar automação ao concluir ou aguardar somente aceite. Esta pausa não significa implementação completa.
