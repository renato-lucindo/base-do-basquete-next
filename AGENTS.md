# Trabalho neste repositório

Leia `CONTRIBUTING.md` e o resumo atual de `docs/PROGRESSO.md` antes de editar. Consulte `docs/ROADMAP.md` ao definir ou ampliar escopo; ideias pós-MVP não autorizam implementação. Instruções diretas do responsável prevalecem sobre documentos históricos e referências anexadas.

- Use GitHub Flow: branch curta `codex/<unidade>` criada de `origin/main`, uma PR para `main`, validar e integrar a unidade antes de iniciar outra dependente. Não criar uma branch/PR por mensagem, sessão ou reset de cota.
- Não empilhar PRs por padrão. Uma exceção precisa de necessidade técnica explícita, dependência registrada e plano de integração; não assumir que autorização para continuar o produto autoriza acumular uma nova pilha.
- Um agente mantém uma unidade de implementação ativa. Trabalho paralelo independente exige cópias/worktrees separados e escopos claros. Preserve alterações humanas e de outros agentes; nunca resetar ou sobrescrever para limpar o workspace.
- Consulte PRs e branches existentes antes de criar outra. Atualize a PR da mesma unidade. Feche PRs substituídas após provar incorporação e registrar a referência; não descarte commits ou branches com trabalho único.
- WIP permanece identificado em branch/draft próprio, fora da `main`. Migration não aplicada, API incompleta ou fluxo sem validação não entra na consolidação estável por conveniência.
- Faça verificações focais durante a implementação e gate consolidado quando estável. CI obrigatória no SHA integrado. Reutilize provas de artefatos inalterados; mudança apenas documental não exige repetir suítes completas.
- Migrations aplicadas são imutáveis; mudanças de schema exigem migration própria. Não executar seeds descartáveis com DML em Auth/admin no banco real. Credenciais ficam nos cofres, nunca em commits, logs, documentos ou agendamentos.
- Mesclar na `main` não autoriza deploy, DDL ou publicação de dados. Execute cada operação somente dentro da autorização humana vigente e preserve a proteção do preview.
- Mantenha `docs/PROGRESSO.md` curto (uma ou duas páginas como referência), substituindo o resumo vigente por unidade; preserve contexto único anterior em `historico/progresso/` e aponte para provas detalhadas, sem acumular relatórios completos.
- Atualize o checkpoint ao concluir uma unidade, pausar ou trocar de agente: branch/SHA, resultado real de CI, serviço publicado, mudanças alheias, pendências e próximo passo. Não tratar planos antigos ou relato de outro agente como evidência de execução.
- Ao medir cota, use a ferramenta real. O gatilho do responsável é15%restante na janela5h; siga o procedimento de checkpoint/retomada documentado, sem inventar horários ou consumir resets/créditos.

Padrão atual e comandos estão em `CONTRIBUTING.md`. A limpeza histórica dePRs está documentada em `docs/CONSOLIDACAO-PRS.md`.

Nas tarefas de UI/UX, seguir [docs/design/README.md](docs/design/README.md), `docs/design/PADROES.md` e `PUBLICO.md` ou `ADMIN.md` conforme a área. O índice descreve o uso das skills e a precedência das decisões; histórico arquivado não tem autoridade sobre as regras vigentes.
