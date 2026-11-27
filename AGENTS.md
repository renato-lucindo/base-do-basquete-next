# Trabalho neste repositório

Leia `CONTRIBUTING.md` e o resumo atual de `docs/PROGRESSO.md` antes de editar. Instruções diretas do responsável prevalecem sobre documentos históricos e referências anexadas.

- Use GitHub Flow: branch curta `codex/<unidade>` criada de `origin/main`, uma PR para `main`, validar e integrar a unidade antes de iniciar outra dependente. Não criar uma branch/PR por mensagem, sessão ou reset de cota.
- Não empilhar PRs por padrão. Uma exceção precisa de necessidade técnica explícita, dependência registrada e plano de integração; não assumir que autorização para continuar o produto autoriza acumular uma nova pilha.
- Um agente mantém uma unidade de implementação ativa. Trabalho paralelo independente exige cópias/worktrees separados e escopos claros. Preserve alterações humanas e de outros agentes; nunca resetar ou sobrescrever para limpar o workspace.
- Consulte PRs e branches existentes antes de criar outra. Atualize a PR da mesma unidade. Feche PRs substituídas após provar incorporação e registrar a referência; não descarte commits ou branches com trabalho único.
- WIP permanece identificado em branch/draft próprio, fora da `main`. Migration não aplicada, API incompleta ou fluxo sem validação não entra na consolidação estável por conveniência.
- Faça verificações focais durante a implementação e gate consolidado quando estável. CI obrigatória no SHA integrado. Reutilize provas de artefatos inalterados; mudança apenas documental não exige repetir suítes completas.
- Migrations aplicadas são imutáveis; mudanças de schema exigem migration própria. Não executar seeds descartáveis com DML em Auth/admin no banco real. Credenciais ficam nos cofres, nunca em commits, logs, documentos ou agendamentos.
- Mesclar na `main` não autoriza deploy, DDL ou publicação de dados. Execute cada operação somente dentro da autorização humana vigente e preserve a proteção do preview. A autorização permanente para migrations de funções de leitura no desenvolvimento está delimitada em `CONTRIBUTING.md`; não pedir nova confirmação dentro desse escopo.
- Mantenha `docs/PROGRESSO.md` curto; estado de execução fica nele, pendências de produto em `docs/MATRIZ-ESCOPO.md` e objetivos em `docs/ROADMAP.md`. Preserve contexto único anterior em `historico/progresso/`; não acumule relatórios no checkpoint.
- Atualize o checkpoint ao concluir uma unidade, pausar ou trocar de agente: branch/SHA, resultado real de CI, serviço publicado, mudanças alheias, pendências e próximo passo. Não tratar planos antigos ou relato de outro agente como evidência de execução.
- Ao medir cota, use a ferramenta real. O gatilho do responsável é15%restante na janela5h; siga o procedimento de checkpoint/retomada documentado, sem inventar horários ou consumir resets/créditos.

Padrão atual e comandos estão em `CONTRIBUTING.md`. A limpeza histórica dePRs está documentada em `historico/documentacao/analises/CONSOLIDACAO-PRS.md`.

## Trabalho de interface

Toda alteração de interface ou protótipo segue o [guia visual aprovado em 18/11/2026](docs/design/catalogo/guia-completo-autonomo.html). Antes de editar, leia a seção pertinente do guia, as [orientações de adoção](docs/design/DESIGN-SYSTEM.md), os [padrões comuns](docs/design/PADROES.md) e o padrão da área [pública](docs/design/PUBLICO.md) ou [administrativa](docs/design/ADMIN.md). Para componentes e fluxos CRUD no admin, consulte também os [padrões administrativos](docs/design/PADROES-ADMIN.md).

Confira a tela atual e use os tokens, componentes e textos aprovados que atendam ao pedido. Preserve as decisões vigentes ao adaptar uma tela ou um protótipo. Antes de entregar, verifique a tela alterada e registre na PR a seção do guia que foi aplicada, o que foi reaproveitado ou por que foi necessária uma variação e o resultado das conferências aplicáveis. Siga o [fluxo de revisão de UI/UX](docs/design/README.md#fluxo-de-trabalho-dos-agentes).

Antes de editar UI, registre a matriz de conformidade no plano da unidade e confira todos os consumidores afetados. Para pedidos novos ou conflitantes, siga a [consulta obrigatória de design](docs/INDICE.md#8-hierarquia-de-decisões): perguntar se integra o padrão ou é exceção, sem repetir decisões já aprovadas. Não entregar com divergência conhecida ou conferência aplicável sem evidência; testes do catálogo não substituem a tela real.

Para identificar quais documentos ler em cada tipo de tarefa, consulte [`docs/INDICE.md`](docs/INDICE.md). Leitura seletiva e obrigatória — não leia toda a documentação em todas as tarefas.

Referências visuais: use somente o design system, o catálogo aprovado e os padrões vigentes. Não usar protótipos, capturas de evidência, pacotes de origem ou arquivos históricos como fallback de UI, mesmo quando alguma suíte os mantém para regressão técnica. A legenda estatística fica aberta ao final do conteúdo ativo; expansões de filtros/conquistas seguem suas regras próprias.
