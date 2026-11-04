# Progresso atual

Atualizado em04/11/2026. [Plano UI/UX](design/REFORMA-UIUX.md) · [Administração: provas e limites](design/VALIDACAO-ADMIN-UIUX.md) · [Busca](design/VALIDACAO-BUSCA-PUBLICA.md) · [Checkpoint anterior](../historico/progresso/2026-11-04-pr53-integrada.md).

## Autorização e sequência

Piloto aceito; **“Realize todas essas etapas na sequência”**, reiterado **“realize então”**. Perfil/piloto → público real → busca servidor → administração → validação/preparação de liberação. Uma unidade/PR por vez, integrar antes da dependente; sem nova confirmação da implementação já autorizada. Preservar súmula vigente e dados humanos, sem importar fixtures. Deploy e publicação de dados permanecem operações distintas.

Em04/11, o responsável respondeu **“Autorizo. Deixe essa autorização como padrão nos docs”** à aplicação da migration administrativa. Autorização permanente para migrations de funções de leitura e privilégios mínimos exclusivamente no desenvolvimento delimitada em [CONTRIBUTING.md](../CONTRIBUTING.md), referenciada em AGENTS.md. Não pedir novamente dentro desse escopo; não autoriza outros bancos, DML, Auth/Access, mudanças de tabelas, redução de segurança ou deploy.

## Git e CI

Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch **codex/admin-uiux**, base main**9b06df88a6d34c12e480d435a03e1be617d69d85**. [PR54](https://github.com/renato-lucindo/base-do-basquete-next/pull/54); material validado **61562ab4a8c505d3be52ed0d2814b25b73f36df3**. HEAD remoto/local **f297234bbc672b27d2e21893d4b11e2daea00651**, push confirmado após correção dos testes; produto e SQL inalterados. PR54 pronta para revisão, não draft; body atualizado. CI **41892441684/check126793741286 FAILURE** no HEADdc8ba569, gate/design PASS; browsers601PASS/109skips prévios e2 falhas de asserções (geometria com nomes longos no Linux e foco esperado no título em vez do botão de origem). Corrigidos somente os dois testes, sem produto/SQL/timeouts/skips novos. Focal após correção21PASS/3skips mobile prévios; lint focal PASS, relatório atualizado. CI **41896764472/check126808243394 SUCCESS** no HEADf297234, confirmada em04/11 19:46UTC, incluindo e2e e finalização. **Não integrar ainda:** P2 da revisão automática foi reproduzido e corrigido localmente; gate consolidado da correção PASS, nova CI ainda necessária. Revisão do autor + revisão automática, sem parecer humano independente. Código local agora altera somente o retorno em src/teams/screen.tsx; regressão e relatório/captura também atualizados. SQL inalterado. Concluir gate e enviar correção concreta à mesma PR, sem commit vazio ou push apenas para reiniciar CI.

- PR51 integrada9cb3660, CI HEAD41840654483/main41848486075 SUCCESS; perfil contínuo e súmula preservados.
- PR52 integrada834693f07069c025af62013247db57f21ebaf5c5, CI HEAD41863784899/main41867956743 SUCCESS; público real.
- PR53 integrada**9b06df88a6d34c12e480d435a03e1be617d69d85**, CI HEAD41876017236 e main41882067210/job126756801609 SUCCESS; busca real consolidada, sem deploy.

## Administração e banco

Jogos: ordenação autoritativa antes da paginação, cabeçalhos button/aria-sort, Nº primeiro, campos fechados, número natural até40 caracteres, ausentes no fim e ID estável; busca/ordem/página/rolagem/foco preservados ao fechar editor. Erro limpa linhas antigas e oferece retry. Informações: campos proporcionais. Equipes/elencos30/70 e retorno mobile, preservando registrationId, guardas, ACK e reautenticação.

Migration **20261104185633_admin_game_ordering.sql JÁ APLICADA** exclusivamente no **base-do-basquete-next-dev/nizmasjddyrhmevvfviz**, após aprovação explícita. MCP success e histórico remoto confirmados. Timestamp local182151 reconciliado para185633, SQL UTF8/LF inalterado SHA256**79b3a8e7420147abbe609526d766bd8e04d1aec0673892611d19619f18967402**. **Não reaplicar.** Função STABLE SECURITY INVOKER/search_path vazio, EXECUTE somente authenticated e postgres, RPC antiga intacta. READ ONLY: anon negado, não-admin sem linhas e entradas PT400 PASS; advisors sem novos achados frente ao baseline. Sem DML, seeds, deploy, Access ou publicação.

Busca: migration **20261104171445_public_global_search.sql JÁ APLICADA** no mesmo desenvolvimento, SQL LF SHA256**a444b816b374eeea0f78a9b2df7f13598cbe753701420216db21a0496b851b19**. **Não reaplicar.** Contrato ADR020, provas/limites no relatório da busca.

Gate local PASS**699unitários/145arquivos**, transporte7, banco13, Workerd30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos. SQL/provider14PASS, Workerd focal1PASS; browsers finais layout/guardas/retorno12PASS, transferências/desistências/exclusões55PASS/5skips prévios e regressão adicional44PASS/14skips prévios. Nenhum skip novo. Capturas320/390/1366/1920, texto200%, axe e revisão visual no relatório. Reutilizar provas de artefatos inalterados; renomeação sem mudança SQL/documentação não exige novo gate local. Isso não comprova sessão administrativa remota nem desempenho em volume real.

## Continuidade

P2 da revisão automática `chatgpt-codex-connector`, thread **PRRT_kwDOVT8vGc6zwQPY**, foi reproduzido em browser mobile: filtrar Lobos B → abrir → renomear Tigres → salvar → Voltar às equipes desaparece. RED confirmado em `.preview-artifacts/admin-return-red.log`.

Correção local em `src/teams/screen.tsx:776`: botão depende de expanded, independente da linha filtrada; mantém mayLeave/guardas e restaura a busca quando a origem não existe. Filtro/página/posição preservados. Regressão equipes/layout/guardas27PASS/1skip prévio; caso final teclado/axe desktop+mobile2PASS, sem skips. Captura inspecionada, relatório atualizado. Gate **PASS**, encerrado com código0:699unitários/145arquivos, transporte7, banco13, Workerd30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos. Log `.preview-artifacts/admin-return-gate.log`. CI da correção ainda pendente. Não resolver thread antes de enviar código validado.

Próximo passo: commit/push da correção validada na PR54, resolver thread após comprovação, conferir nova CI/diff/reviews e merge com expected_head_sha. Recuperar HEAD por Git após este checkpoint; material de produto anterior61562ab mais esta correção de retorno, sem mudança SQL. CI verde do f297234 não valida o código local novo. Conferir CI do SHA integrado antes da unidade final de validação/preparação, sem deploy automático. Inventário já feito em `.preview-artifacts/uiux-release-preflight.md`; scripts lidos, sem repetir mapeamentos.

Checkout humano sync/trabalho-casa com CONTRIBUTING modificado e skills não rastreadas, outros worktrees e previews4189/5177 herdados preservados. Preview task-owned5180fixtures/session65608, sem banco humano.

Reset ocorreu: última cota real **93% restante5h/85% semanal**, próximo reset observado **1793848933**. Aos15% restante: mínimo seguro/checkpoint e mesma automação `retomar-piloto-uiux-pr-51` para reset observado+2min, sem créditos/resets manuais. Retomada atual22:22UTC em andamento; atualizar o agendamento ao aguardar CI ou encerrar etapa. Manter ACTIVE até TODA sequência concluir ou pedido explícito de parar. Autorizações de migrations de leitura já registradas; não perguntar novamente dentro do escopo.
