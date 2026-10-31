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

- Nas interfaces e nos protótipos, siga o [índice de UI/UX](docs/design/README.md), os [padrões comuns](docs/design/PADROES.md) e as regras de [Público](docs/design/PUBLICO.md) ou [Administração](docs/design/ADMIN.md). Comece pela informação/ação principal e confira os estados e tamanhos afetados. O índice aponta protótipos, verificações e fluxo das skills.

- Commits pequenos, coerentes e com descrição do efeito. `feat:`, `fix:`, `test:` e `docs:` são convenções úteis, sem exigir uma ferramenta adicional.
- Durante a edição, rode apenas verificações pertinentes. Quando a unidade estabilizar: `npm run gate` e os browsers afetados; CI consolida a composição no SHA da PR.
- Node24+ e lockfile existente: `npm ci --ignore-scripts`. A aplicação real local usa `npm run dev:foundation`; Vite isolado não fornece a API do Worker. Testes de interface usam fixtures próprias, não dados humanos do preview.
- Evidência registra comando, ambiente, SHA, resultado e limites. PASS antigo não valida código novo. Também não repetir suítes de código materialmente idêntico por documentação ou troca de sessão.
- A CI sempre produz o check `validate`. Para alterações só de documentação textual/imagens, faz formato e segredos; código, testes, scripts, workflows ou insumos executáveis exigem o gate e browsers. A alteração de escopo é calculada por diff real, não por título da PR. Arquivos Markdown/imagens em `historico/documentacao/` também são documentais; scripts de skills, workflow e outras alterações executáveis exigem o gate completo.
- Não desativar testes ou aumentar timeouts para encobrir defeitos. Diagnostique focalmente e preserve o histórico das falhas relevantes.

## Revisar e integrar

Toda PR de trabalho destina-se à `main`. O template pede problema/resultado, evidências, migrations/deploy e pendências. Draft sinaliza WIP, não um estacionamento indefinido de funcionalidades já concluídas.

Antes do merge, conferir o diff, CI do SHA atual, pareceres/conversas aplicáveis, autorização de integração e dependências. A proteção da `main` exige CI atualizada e PR; bloqueia force-push e exclusão. No repositório de mantenedor único, não exigimos aprovação fictícia de um segundo usuário: a revisão realizada e seus limites devem ser explícitos. Parecer independente, quando disponível, não deve ser declarado sem ter ocorrido.

Use merge commit para preservar a história já compartilhada e a rastreabilidade das entregas. A branch da PR concluída pode ser removida automaticamente após merge; commits/PR/evidências permanecem acessíveis na `main`. Não apagar fontes únicas, branches de outro agente, WIP ou branches ainda utilizadas por worktrees.

Uma unidade dependente começa da `main` depois de integrar a anterior. Se uma dependência impedir isso, manter o trabalho na unidade existente ou registrar uma exceção técnica curta com origem e destino; não reconstruir uma pilha de dezenas de drafts.

## Banco, serviços e continuidade

Integração Git, aplicação de migration e deploy são ações distintas. Verifique autorização e ambiente para cada uma. Nunca disparar DDL ou deploy porque uma PR foi mesclada; a CI deste repositório não faz essas operações. Preserve dados humanos, políticas Access e segredos.

WIP de reaproveitamento de elencos foi preservado fora da consolidação inicial da `main`; sua situação fica no checkpoint. Para retomá-lo, incorporar a `main` por merge explícito, revisar o diff restante e manter **uma** PRdraft para essa unidade. Não executar migrations locais como parte de atualização de Git.

Em troca de agente, entregar branch/PR/SHA, evidências, mudanças alheias e próximo passo. Em pausa por cota, seguir o procedimento permanente abaixo; não estimar porcentagens, programar duplicatas ou comprar créditos.

## Referências

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- `docs/CONSOLIDACAO-PRS.md`: inventário e destino das PRs históricas.

## Checkpoint, histórico e objetivos futuros

Mantenha `docs/PROGRESSO.md` como resumo atual das unidades ativas, substituindo entradas superadas. Preserve evidências e contexto único em `historico/progresso/`; o histórico não é leitura obrigatória nem autorização. Detalhes permanecem nos relatórios de validação e PRs. Consulte `docs/ROADMAP.md` ao planejar escopo: ideias pós-MVP só entram em execução por decisão explícita do responsável.

### Cota e retomada

Use a ferramenta real para consultar a janela de 5h e o saldo semanal. Ao atingir 15% restante na janela de 5h, não inicie outra unidade ou gate: conclua a operação mínima segura, registre checkpoint e preserve o trabalho na branch da unidade. Não invente horários, compre créditos ou consuma resets manuais.

Quando houver autorização vigente para retomada automática, atualize a mesma automação desta conversa para o reset efetivamente observado mais dois minutos; não crie duplicatas. Confirme o agendamento pela ferramenta oficial e registre o identificador e o horário no checkpoint. Ao retomar, confira cota e estado real; se o reset não ocorreu ou outra janela impedir, use o próximo reset aplicável observado. Pause a automação ao concluir a unidade. Sem autorização de agendamento, registre o próximo passo para retomada humana.
