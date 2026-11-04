# Progresso atual

Atualizado em04/11/2026. [Plano](design/REFORMA-UIUX.md) · [Validação pública](design/VALIDACAO-PUBLICO-UIUX.md) · [Início desta unidade](../historico/progresso/2026-11-04-inicio-publico-uiux.md).

## Autorização e sequência

Piloto aceito. O responsável instruiu **“Realize todas essas etapas na sequencia”**: PR51 → páginas públicas reais → busca global/autocomplete no servidor → administração real → validação final e preparação da liberação. Implementar e integrar uma unidade antes da dependente, sem nova confirmação da sequência autorizada. Preservar a súmula vigente, dados humanos e proteção do preview. Deploy, DDL real e publicação de dados continuam operações distintas, não realizadas.

## Integração anterior

[PR51](https://github.com/renato-lucindo/base-do-basquete-next/pull/51) integrada por `9cb3660fc19b74e322fb730643548901b07470a5`. CI do HEAD9888f57 [41840654483](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41840654483) e do merge na main [41848486075](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41848486075): **SUCCESS**, conferidas. Perfil contínuo real integrado; jogo atual preservado. Limites do carregamento da carreira permanecem documentados.

## Unidade ativa — público real

- Worktree `C:/Users/12405304716/.codex/worktrees/reforma-uiux`, branch **`codex/publico-uiux`**, base9cb3660, material `91b5fe1fd9b066e622910f3d80b6261e6d14de00`. [PR52](https://github.com/renato-lucindo/base-do-basquete-next/pull/52) pronta para revisão, base main; HEAD **`106765936de496b916c45773aac047e36f9001d7`**. CI [41863784899](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41863784899), check validate126692991081, **SUCCESS** no HEAD1067659, conferido nesta retomada. Integrada pelo merge834693f07069c025af62013247db57f21ebaf5c5. Revisão do autor; reviews/threads vazias.
- Implementados: cabeçalho com busca compartilhada nas rotas reais, navegação compacta, tabelas agrupadas à esquerda e fontes de14px, identificação da equipe junto ao atleta no celular, retirada de versões/datas técnicas públicas preservando cobertura. Agenda e catálogo de jogos usam tabela compartilhada, busca e paginação20, mantendo ausência de placar e confirmação. Checkboxes existentes de equipes/colunas preservados; retorno restaura página e rolagem interna. Perfil de equipe recebe controles secundários recolhíveis e tabelas compactas.
- Browsers públicos157 PASS/7 skips prévios +4 PASS de alinhamento final; TypeScript/eslint focais PASS. Resultados e limitações no relatório vinculado. Falhas encontradas e corrigidas: densidade mobile, barra superior provocando deslocamento de12px no retorno e alinhamento do cabeçalho Equipe. Gate consolidado PASS (693 unitários, transporte7, banco13, Worker/HTTP29, PDF1, tipos/build/segredos). CI desta unidade ainda pendente; não integrar antes de SUCCESS no HEAD exato. Sem alteração de API, SQL, schema, publicação ou estilos internos da súmula.
- Próximo passo: acompanhar CI da PR52 no HEAD atual, conferir diff/reviews/threads, concluir revisão do autor e integrar por merge commit quando SUCCESS. Depois criar a unidade da busca sobre main integrada: autocomplete real normalizado no servidor, antes de limitar/paginar, sem usar somente o catálogo cliente. Carregar skill Supabase antes de trabalhar nessa área. Em seguida administração e preparação da liberação.

## Continuidade e preservação

Checkout humano `sync/trabalho-casa` com CONTRIBUTING.md modificado e skill web-design-guidelines/skills-lock.json não rastreados preservado; demais worktrees intocados. Nenhum serviço remoto alterado. Previews locais4189(piloto) e5177(rotas reais com fixtures identificadas) herdados.

Retomada anterior após reset executada. Última cota real:57% restante/5h e43% semanal, reset1793823611; esta espera não é por cota. A CI remota segue na fila, impedindo integrar e iniciar a dependente conforme CONTRIBUTING.md. A mesma automação `retomar-piloto-uiux-pr-51` foi atualizada pela ferramenta oficial, confirmada ACTIVE para **04/11/2026 13:29:34America/Sao_Paulo (16:29:34UTC)**, dez minutos após a consulta observada. Primeiro verificar CI do HEAD1067659; se apenas fila, reagendar a mesma retomada após dez minutos e evitar notificações sem mudança. Se SUCCESS, confirmar HEAD/diff/reviews, merge commit e conferir CI do merge, depois busca/admin/final. Não há bloqueio humano ou pedido de confirmação.

Este checkpoint é a única edição local não commitada após1067659: não fazer push documental para reiniciar uma CI já aguardando runner. Preservar e reconciliar o checkpoint na próxima unidade após o merge; código e provas estão commitados/pushados. Aos15% restantes/5h, medir reset real e reagendar reset+2min conforme CONTRIBUTING.md; sem créditos/resets manuais. A sequência completa permanece ativa e autorizada.
