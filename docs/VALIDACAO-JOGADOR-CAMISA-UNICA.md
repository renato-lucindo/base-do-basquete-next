# Jogador e camisa no mesmo diálogo

Unidade `codex/jogador-camisa-unica`, base main `4bc93c68c758db4caaa2a77045efb39277a2bc7e`. Pedido: remover a etapa que, depois de salvar a pessoa, solicitava apenas a camisa.

O cadastro de novo atleta agora prepara também o comando de vínculo, exibindo a camisa no primeiro formulário, no mesmo campo contextual já usado para editar pessoa. Salvar valida ambos os comandos, salva/consulta a pessoa, confirma o vínculo e fecha o diálogo. Camisa continua opcional, preservando `0` e `00`. A edição de vínculo ativo continua usando a mesma tela; vínculos encerrados não ganham edição retroativa.

Os dois writes mantêm os contratos anteriores e são operações separadas com recibos; não se alega transação SQL única. Se a pessoa for salva e o vínculo falhar, o formulário informa o sucesso parcial e preserva a intenção. Repetir não reenvia o POST de pessoa já confirmado nem o de vínculo com ACK conhecido. Recarregar um cadastro novo ainda sem vínculo não procura um UUID de vínculo inexistente; recupera a pessoa e permite corrigir a camisa sem recadastrá-la. Cadastro de comissão e seleção de pessoa já existente preservam seus fluxos atuais. Nenhuma migration, banco real ou contrato HTTP alterado.

## Evidências focais

- RED real: campo Camisa ausente no primeiro formulário; `player-one-dialog-red.log`.
- GREEN de criação/edição no mesmo diálogo, distinção0/00 e ausência da segunda etapa; `player-one-dialog-green.log`.
- Composição inicial18:17PASS/1FAIL, teste de homônimo lia o estado antes de terminar o novo salvamento completo. Foi corrigido para aguardar o diálogo fechar. Reexecução focal4PASS/2SKIP (inclui homônimo desktop/mobile, falha de vínculo/ACK e duplicata); `player-one-dialog-recovery.log`.
- Composição final desktop **18PASS**, incluindo recuperação após falha de POST e GET do vínculo, camisa repetida no cadastro novo, edição existente, homônimos, comissão, reautenticação, envio incerto, guardas, paginação e layouts1366/1920; `player-one-dialog-final.log`.

Gate e CI serão registrados pelos resultados reais na PR única desta unidade para main e no checkpoint. Não atribuir CI da PR43 a este código. Reutilizar evidências de artefatos inalterados; não repetir gate por sessão/documentação. Mobile não recebeu implementação ou trabalho visual novo.
