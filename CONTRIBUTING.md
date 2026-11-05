# Fluxo de desenvolvimento

Adotamos [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow): uma `main` utilizável, branches curtas e PRs pequenas de volta à principal. A `main` reúne código validado; não significa liberação de produção ou aceite humano de todos os percursos.

## Começar e limitar o trabalho

1. Leia `AGENTS.md`, checkpoint e escopo da unidade. Confira status, branch, remoto, PRs existentes e mudanças alheias antes de editar.
2. Parta de `origin/main` atualizada e crie `codex/<assunto-curto>`. Use outra cópia/worktree se houver trabalho paralelo; não troque a branch de outro agente.
3. Uma unidade tem problema, resultado observável e verificações proporcionais. Atualize a mesma branch/PR até concluí-la; reset de cota ou nova conversa não cria outra unidade.
4. Use uma PR ativa por unidade e uma unidade de implementação por agente. Trabalho paralelo só para escopos independentes e coordenados. Não abrir uma sequência de PRs dependentes para cada marco.

Exemplo em checkout limpo, preservando trabalhos anteriores:

```powershell
git fetch origin
git status --short
git switch -c codex/assunto-curto origin/main
```

Se existir WIP ou alteração alheia, reconciliar antes. Não usar `reset --hard`, `clean`, push forçado ou rebase de história compartilhada para resolver divergência. Prefira merge explícito de `origin/main` numa branch pública quando precisar atualizá-la.

## Implementar e verificar

- Nas interfaces e nos protótipos, siga o [índice de UI/UX](docs/design/README.md), os [padrões comuns](docs/design/PADROES.md), as regras de [Público](docs/design/PUBLICO.md) ou [Administração](docs/design/ADMIN.md) e os [padrões específicos do admin](docs/design/PADROES-ADMIN.md). Comece pela informação/ação principal e confira os estados e tamanhos afetados. Para saber quais documentos ler em cada tipo de tarefa, consulte [docs/INDICE.md](docs/INDICE.md).

- Commits pequenos, coerentes e com descrição do efeito. `feat:`, `fix:`, `test:` e `docs:` são convenções úteis, sem exigir uma ferramenta adicional.
- Durante a edição, rode apenas verificações pertinentes. Quando a unidade estabilizar, siga a [política de CI proporcional](docs/CI.md): apresentação conhecida usa `npm run gate:ui` e browsers dos consumidores; domínio, contratos, banco, infraestrutura e caminhos não mapeados usam `npm run gate` e regressão completa. A CI da `main` consolida toda mudança executável no SHA integrado.
- Node24+ e lockfile existente: `npm ci --ignore-scripts`. A aplicação real local usa `npm run dev:foundation`; Vite isolado não fornece a API do Worker. Testes de interface usam fixtures próprias, não dados humanos do preview.
- Evidência registra comando, ambiente, SHA, resultado e limites. PASS antigo não valida código novo. Também não repetir suítes de código materialmente idêntico por documentação ou troca de sessão.
- A CI sempre produz o check obrigatório `validate`, que agrega os jobs previstos e falha se um deles falhar, cancelar ou não executar. O escopo vem do diff real e de uma lista conservadora de arquivos de apresentação, não do título, tamanho ou declaração de que a mudança é simples. Documentação e capturas, inclusive checkpoints, fazem formato e segredos; arquivos de apresentação desconhecidos, scripts/workflows e testes sem apresentação correspondente ou fora de suas suítes exigem o gate completo. Consulte [CI.md](docs/CI.md) para matriz, comandos e limites.
- Não desativar testes ou aumentar timeouts para encobrir defeitos. Diagnostique focalmente e preserve o histórico das falhas relevantes.

## Revisar e integrar

Toda PR de trabalho destina-se à `main`. O template pede problema/resultado, evidências, migrations/deploy e pendências. Draft sinaliza WIP, não um estacionamento indefinido de funcionalidades já concluídas.

Antes do merge, conferir o diff, CI do SHA atual, pareceres/conversas aplicáveis, autorização de integração e dependências. A proteção da `main` exige CI atualizada e PR; bloqueia force-push e exclusão. No repositório de mantenedor único, não exigimos aprovação fictícia de um segundo usuário: a revisão realizada e seus limites devem ser explícitos. Parecer independente, quando disponível, não deve ser declarado sem ter ocorrido.

Use merge commit para preservar a história já compartilhada e a rastreabilidade das entregas. A branch da PR concluída pode ser removida automaticamente após merge; commits/PR/evidências permanecem acessíveis na `main`. Não apagar fontes únicas, branches de outro agente, WIP ou branches ainda utilizadas por worktrees.

Uma unidade dependente começa da `main` depois de integrar a anterior. Se uma dependência impedir isso, manter o trabalho na unidade existente ou registrar uma exceção técnica curta com origem e destino; não reconstruir uma pilha de dezenas de drafts.

## Banco, serviços e continuidade

Integração Git, aplicação de migration e deploy são ações distintas. Verifique autorização e ambiente para cada uma. Nunca disparar DDL ou deploy porque uma PR foi mesclada; a CI deste repositório não faz essas operações. Preserve dados humanos, políticas Access e segredos.

### Autorização permanente de migrations de leitura no desenvolvimento

Em04/11/2026, o responsável autorizou a migration administrativa e determinou: **“Autorizo. Deixe essa autorização como padrão nos docs”**. Fica autorizada, sem nova confirmação a cada migration, a aplicação de migrations revisadas e testadas que criem funções de consulta e seus privilégios mínimos exclusivamente no **base-do-basquete-next-dev (`nizmasjddyrhmevvfviz`)**. Devem preservar RLS, os contratos existentes e a proteção dos dados, sem escrita nos dados da aplicação.

Antes de aplicar, conferir o alvo, o SQL concreto, os testes, o hash e o histórico remoto; depois verificar funções, privilégios, RLS e advisors e registrar o resultado. Migrations aplicadas continuam imutáveis. A autorização vem desta decisão do responsável, nunca do merge ou do agendamento.

Esta autorização não cobre outros projetos ou produção, alterações de tabelas ou dados, seeds, operações destrutivas, mudanças em Auth/Access, redução de segurança, deploy ou publicação de dados. Operações fora desse escopo exigem autorização correspondente sobre uma proposta concreta.

WIP de reaproveitamento de elencos foi preservado fora da consolidação inicial da `main`; sua situação fica no checkpoint. Para retomá-lo, incorporar a `main` por merge explícito, revisar o diff restante e manter **uma** PRdraft para essa unidade. Não executar migrations locais como parte de atualização de Git.

Em troca de agente, entregar branch/PR/SHA, evidências, mudanças alheias e próximo passo. Em pausa por cota, seguir o procedimento permanente abaixo; não estimar porcentagens, programar duplicatas ou comprar créditos.

## Referências

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- `historico/documentacao/analises/CONSOLIDACAO-PRS.md`: inventário e destino das PRs históricas.

## Checkpoint, histórico e objetivos futuros

Mantenha `docs/PROGRESSO.md` como resumo atual das unidades ativas, substituindo entradas superadas. Preserve evidências e contexto único em `historico/progresso/`; o histórico não é leitura obrigatória nem autorização. Detalhes permanecem nos relatórios de validação e PRs. Consulte `docs/ROADMAP.md` ao planejar escopo: ideias pós-MVP só entram em execução por decisão explícita do responsável.

### Cota e retomada

Use a ferramenta real para consultar a janela de 5h e o saldo semanal. Ao atingir 15% restante na janela de 5h, não inicie outra unidade ou gate: conclua a operação mínima segura, registre checkpoint e preserve o trabalho na branch da unidade. Não invente horários, compre créditos ou consuma resets manuais.

Toda pausa motivada por cota exige agendar a retomada automática do trabalho já autorizado para o reset efetivamente observado mais dois minutos. Esta regra constitui autorização permanente para esse agendamento, sem nova confirmação, salvo instrução explícita do responsável para não retomar. Atualize a mesma automação desta conversa; não crie duplicatas. Confirme o agendamento pela ferramenta oficial antes de encerrar e registre o identificador e o horário no checkpoint. Se a ferramenta estiver indisponível ou o agendamento falhar, registre o impedimento e informe que a retomada não ficou programada; não declare o agendamento como concluído.

Ao retomar, confira a cota e o estado real da branch, PR e CI e continue a mesma unidade dentro das autorizações vigentes. Se o reset não ocorreu ou outra janela impedir o trabalho, reagende para o próximo reset aplicável observado. A retomada não autoriza ampliar escopo, fazer merge, deploy ou operações de banco sem a autorização específica correspondente. Pause a automação ao concluir a unidade ou quando o responsável cancelar o trabalho.
