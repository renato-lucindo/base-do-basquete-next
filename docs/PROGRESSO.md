# Progresso atual

Atualizado em04/11/2026. [Plano UI/UX](design/REFORMA-UIUX.md) · [Busca: provas e limites](design/VALIDACAO-BUSCA-PUBLICA.md) · [Checkpoint anterior](../historico/progresso/2026-11-04-pr53-integrada.md).

## Autorização e sequência

Piloto aceito e instrução expressa **“Realize todas essas etapas na sequência”**: perfil/piloto → público real → busca servidor → administração → validação/preparação de liberação. Continuar sem nova confirmação da implementação. Uma unidade/PR por vez, integrar antes da dependente. Preservar súmula vigente e dados humanos. Merge não autoriza deploy, DDL adicional ou publicação de dados.

## Estado Git e CI

Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch **`codex/admin-uiux`** criada diretamente de origin/main9b06df88a6d34c12e480d435a03e1be617d69d85 após CI integrada aprovada e consulta de PRs abertas vazia. Checkpoint/histórico locais da espera preservados e incorporados nesta unidade; código administrativo validado localmente, commit material e draft a registrar após este checkpoint. Recuperar HEAD por Git.

- PR51 integrada9cb3660; CI HEAD41840654483/main41848486075 SUCCESS. Perfil contínuo real; súmula atual preservada.
- PR52 integrada834693f07069c025af62013247db57f21ebaf5c5; CI HEAD41863784899/main41867956743 SUCCESS. Cabeçalho/tabelas/agenda/filtros/retorno públicos.
- **[PR53 integrada](https://github.com/renato-lucindo/base-do-basquete-next/pull/53)** por merge **9b06df88a6d34c12e480d435a03e1be617d69d85**, confirmado remoto. CI **41876017236/check126735692512 SUCCESS** no HEAD69ed27f. Avisos apenas runtime actions/ubuntu-latest. Diff conferido, reviews/threads vazias; revisão do autor, sem parecer independente. Árvore do merge identica ao HEAD. CI push do merge **41882067210/job126756801609 SUCCESS**, conferida em04/11 18:20UTC; gate/design:verify/e2e e finalização aprovados. Busca consolidada no Git, sem deploy.

## Banco e provas da busca

RPC/endpoint/DTO/autocomplete/resultados implementados; normalização/ranking antes de limites, equipes deduplicadas, hierarquia de campeonatos, teclado/cancelamento/erros e retorno. API antiga mantida por compatibilidade, UI usa discovery novo. ADR020 e relatorio detalham fonte explicitamente publicada, paginação e limites.

Migration **20261104171445_public_global_search.sql** JA APLICADA exclusivamente em base-do-basquete-next-dev/nizmasjddyrhmevvfviz após autorizacao explicita **“Aplicar no desenvolvimento”**. MCP success/historico remoto confirmados; timestamp local reconciliado sem alterar SQL LF SHA256a444b816b374eeea0f78a9b2df7f13598cbe753701420216db21a0496b851b19. Três funções/grants conferidos; anon READ ONLY, helper negado e entradas PT400 PASS; advisors apenas dois novos achados intencionais SECURITY DEFINER público, baseline restante igual. **Nao reaplicar.** Sem DML, seeds, deploy, Access ou publicação de dados.

Gate local PASS697unitarios/144arquivos, transporte7,banco13,Workerd30,PDF1, lint/formato/tipos/build/segredos; SQL/provider4PASS; browsers106PASS+32+44+10 focais/capturas. Reutilizar provas de artefatos inalterados. Preview task-owned5180 com fixtures/session65608, busca→perfil PASS; não representa deploy ou smoke de dados reais.

## Unidade ativa — administração

Implementação concluída localmente conforme plano UI/UX e preparação independente local. Nova migration **20261104182151_admin_game_ordering.sql** criada via CLI3.0.0 (local, NÃO aplicada): RPC própria list_games_ordered SECURITY INVOKER/RLS, campos/direção fechados, número natural sem estouro40 caracteres, ausentes ao fim, ID estável e paginação após ordenação; RPC antiga preservada. Cadeia rota/DO/provider/tipos e cabeçalhos button/aria-sort ligados. Testes SQL/provider14PASS focais (RED anterior confirmado); execução simultânea com browsers causou timeout do preparo SQL, movido para beforeAll sem aumentar timeout. Revalidar em gate estável.

Categoria com largura proporcional; tabelas admin por conteúdo. Equipes/elencos30/70 com região selecionada/estado vazio/retorno mobile, guardas/diálogos/salvamento preservados. Novo browser RED reproduziu três problemas; revisão focal em andamento, corrigindo asserção antiga que exigia lista visível quando o elenco ocupa o celular. Gate local PASS699unitários/145arquivos, transporte7,banco13,Workerd30,PDF1, lint/formato/tipos/build/segredos. Revisão final de layout/guardas/retorno12PASS e fluxos de transferências/desistências/exclusões55PASS/5skips prévios; nenhum skip novo. Revisão web-design-guidelines/capturas executadas; relatório em [VALIDACAO-ADMIN-UIUX.md](design/VALIDACAO-ADMIN-UIUX.md). Regressão adicional44PASS/14skips prévios; próxima ação: draft/CI e autorização específica da migration preparada, sem integrar dependência de função ausente. DDL real adicional somente após SQL/testes/diff concretos e autorização específica; sem aplicar agora. Depois integrar unidade validada e preparação final de liberação.

Checkout humano sync/trabalho-casa com CONTRIBUTING modificado e skills não rastreadas, demais worktrees e previews4189/5177 herdados preservados. Nenhum servico remoto alterado além das três funções especificamente autorizadas.

Última cota real44% restante5h/91% semanal, reset1793830788. Espera externa de CI, não cota. Mesma automação `retomar-piloto-uiux-pr-51` deve continuar ACTIVE ate TODA sequência concluir ou pedido explicito para parar. Sem mudanca acionavel, reagendar10min após horario realmente observado; aos15% restante5h, operação mínima segura/checkpoint/reset observado+2min, sem créditos/resets manuais.
