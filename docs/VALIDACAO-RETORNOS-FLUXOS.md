# Retornos dos fluxos administrativos

Unidade `codex/retornos-fluxos`, base `58f65e5a78f1b29cce2c6e6d26fb451e8ee3e526`. Pedido: procurar falhas de percurso, começando pelo retorno à lista após salvar jogo. Sem alterações de banco ou contratos HTTP.

## Observação e correção

- Cadastro do jogo: o botão de retorno já existia no rodapé e apareceu na captura local1366×768. A afirmação de ausência não foi reproduzida nesse estado. O cabeçalho dizia apenas “Fechar”. O destino agora é explícito e permanece no cabeçalho fixo do diálogo: “Voltar à lista de jogos”. Usa uma única rotina de fechamento, incluindo descarte da intenção e do ACK locais.
- Súmula: faltava retorno direto à lista; voltar aos dados exigia chegar ao fim do conteúdo. RED real em `tests/flow-returns.spec.ts`: botão de lista ausente. Ambos os destinos agora ficam ao lado do título, antes das duas equipes. O retorno à lista usa a guarda do pai, que consulta a guarda da súmula uma vez. Cancelar preserva a edição; confirmar descarta apenas o trabalho não salvo.
- Importador, cadastro contextual de atleta, inscrições auxiliares, arbitragem e decisões: conferidos os caminhos existentes de volta, foco, reautenticação e alterações pendentes por composição com fixtures. Não foi observado outro defeito que justificasse mudar esses produtos nesta unidade.

Capturas novas com dados fictícios, sem sessão humana: `.preview-artifacts/flow-game-saved-1366.png`, `flow-game-saved-1920.png` e `flow-sheet-preparation.png`. São evidências locais, não auditoria autenticada do preview. O corpo do diálogo continua rolável e nenhum formulário foi cortado para caber em altura fixa.

## Verificação focal

- RED inicial:1PASS/1FAIL, botão direto da súmula ausente. O cenário do cadastro já passava, documentando que o retorno existia.
- Três cenários novos finais PASS: retorno visível1366/1920, busca e foco preservados, confirmação de descarte uma vez, preparação salva mantida após voltar/reabrir, somente um POST de súmula.
- Primeira composição52:46PASS/6FAIL. Um teste novo procurava texto de status incorreto, corrigido para o texto real. Cinco testes de súmula tiveram ENOENT ao fechar traces porque outra execução Playwright iniciou sobre o mesmo diretório de saída; erro operacional do agente, não atribuído ao produto. A composição inicial não é integralmente PASS.
- Reexecuções sequenciais:3novosPASS;8regressõesPASS, incluindo os cinco afetados e três percursos de cadastro/importador/inscrição com reautenticação. Assim,55cenários desktop distintos ficaram verdes nas execuções documentadas. Logs: `.preview-artifacts/flow-returns-red.log`, `flow-returns-final.log`, `flow-composition.log`, `flow-regressions.log`.
- `npm run typecheck` PASS. Gate/CI/integração/publicação devem ser registrados com seus resultados reais depois de concluídos.

Mobile não recebeu trabalho novo. Não houve DDL/DML ou alteração de dados humanos. Evidências SQL, harness e runtime anteriores se aplicam apenas aos artefatos inalterados; CI da nova fonte ainda é necessária.
