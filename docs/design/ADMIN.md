# UI/UX administrativo — percursos e aceite do MVP

Leia os [padrões comuns](PADROES.md), os [componentes e comportamentos administrativos](PADROES-ADMIN.md) e o [escopo vigente](../MATRIZ-ESCOPO.md). Este arquivo define as jornadas e o aceite; formulários, tabelas, combobox, diálogos, densidade e feedback têm fonte única em PADROES-ADMIN.

## Percursos

Formato e classificação: formulário e resumo em uma tela, com FIBA e formato comum preenchidos; salvar em uma ação. Grupos, vagas extras, séries por fase e escolhas manuais são opcionais; regras e estrutura livre ficam recolhidas. Finalizar/corrigir jogo ou concluir importação atualiza resultados e classificação, com comentário opcional. Desempate da tabela exige justificativa privada. Rascunhos incompletos permanecem privados e pendências de organização não bloqueiam jogos. [ADR022](../decisoes/022-campeonato-flexivel.md) substitui o percurso de publicação separada no novo Worker; rollout/aceite real ficam em PROGRESSO.

Antes de escolher componentes, explicite **entrada → edição → validação → confirmação/feedback → retorno**, incluindo cancelamento, falha de salvamento, reautenticação e conflito de versão.

| Tarefa                        | Jornada e resultado esperado                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campeonato, edição e disputa  | Partir do contexto selecionado, criar/editar os dados permitidos e retornar à lista ou ao agregado com a seleção preservada.                                         |
| Equipe e inscrição            | Distinguir identidade global do destino contextual antes de confirmar. Falha ao inscrever não exige recriar a equipe já salva.                                       |
| Atleta e elenco               | Criar/selecionar a identidade e informar a camisa no mesmo percurso; conservar o resultado de etapas já confirmadas quando pessoa e vínculo falharem parcialmente.   |
| Importação                    | Colar uma equipe/elenco, interpretar, revisar campos e identidades, confirmar os itens prontos e apresentar resultado por linha. Corrigir/repetir apenas pendências. |
| Jogo e súmula                 | Abrir o jogo correto, preparar relacionados, registrar/corrigir ações e voltar à lista ou ao jogo sem perder contexto nem intenção de salvamento.                    |
| Excluir, corrigir ou publicar | Explicitar consequência e destino antes da confirmação. Dependências ou versão obsoleta impedem a operação; falha não pode ser apresentada como sucesso.             |

Contratos de identidade, dados privados, 0/00, atomicidade/recibos e publicação permanecem nos ADRs e no domínio; o percurso não os redefine.

## Aceite proporcional

Decisão de 03/11/2026: reorganizar tarefas preservando as abas atuais, padronizar todas as telas para desktop e incluir o painel equipes/elenco 30/70. Jogos terá ordenação de uma coluna por vez sobre todos os registros; Informações terá campos proporcionais. Busca global permanece somente pública. O responsável escolheu validar um piloto navegável antes da expansão às rotas reais. Detalhes e limites em [REFORMA-UIUX.md](REFORMA-UIUX.md).

No desktop, conferir **1366×768** e **1920×1080** com nomes longos, listas representativas (12 atletas quando houver elenco), dropdowns e diálogos abertos. Verificar o percurso completo, cancelamento, teclado, zoom, foco, vazios, erro, recuperação e retorno. Validar mobile se a alteração o afetar.

Registrar SHA, ambiente, comando, resultado e limites. Revisão do autor, axe ou fixtures não substituem revisão independente, aceite humano ou prova autenticada remota. Nenhuma sugestão estética amplia o MVP. Evidências anteriores ficam no [índice histórico](../../historico/documentacao/README.md) e são consultadas somente quando pertinentes.

A escala compartilhada de 06/11/2026 também vale para acesso, formulários, menus e diálogos administrativos: 150% a partir de 640 CSS px, tamanho anterior até 639 px. Títulos que repetem a aba ficam somente semânticos, com foco em uma área visível. No contexto da disputa, listas e seletores mostram a inscrição; a distinção de nome global permanece nos formulários em que é necessária.

No cadastro de atleta, a data completa de nascimento preenche e bloqueia o campo de ano. Ao remover a data, o ano volta a aceitar edição manual. Em **Elenco → Perfil público**, a proposta mostra o ano que será publicado. A data completa fica privada.

Ao salvar novo atleta ou alterar dados da ficha, **Publicar os dados do perfil?** mostra a prévia e oferece **Só salvar**, **Salvar e publicar** e **Voltar à edição**, com foco inicial em **Só salvar**. Só salvar conserva a versão publicada. Salvar e publicar confirma a ficha depois do cadastro e vínculo. A revisão de ficha publicada exige motivo. Camisa, dados privados e importação seguem seus fluxos de cadastro.
