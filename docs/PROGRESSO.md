# Progresso atual

Atualizado em 03/11/2026, após retomada automática, publicação e integração das PRs #49/#50. [Escopo](MATRIZ-ESCOPO.md) · [Roadmap](ROADMAP.md). [Checkpoint da pausa](../historico/progresso/2026-11-03-pausa-liberacao-dominio.md) e [configuração anterior](../historico/progresso/2026-11-03-dominio-antes-publicacao.md) preservam histórico único.

## Domínio público e administração

Objetivo autorizado: campeonatos em https://basedobasquete.com.br/ e administração em /admin. O responsável autorizou integração, migrations e deploy. Produto integrado em eff36fe0eda76962e6babbc4a9464a98c3dad478; worktree exclusivo C:/Users/12405304716/.codex/worktrees/dominio-proprio, detached nesse SHA para preparar publicação, mantendo a branch da mesma unidade codex/dominio-proprio. Checkpoint documental posterior deve permanecer identificado nessa branch, sem nova implementação ou PR por retomada.

- PR #49: head 63917c9 CI SUCCESS e quatro conversas resolvidas; merge e310a0c em 22:10:12 UTC. CI integrada [41728403239](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41728403239) SUCCESS.
- PR #50: merge explícito de main; conflitos de checkpoint e rota resolvidos com raiz/publico.html e aliases/admin para/foundation.html. Revisão do smoke corrigida: domínio novo, raiz pública e login/admin, sem credencial Access. Head b18759e CI [41728987340](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41728987340) SUCCESS e conversa resolvida; merge eff36fe em 22:34:09 UTC, sem bypass. Árvore integrada idêntica à do head validado.
- CIs acima: 685 unitários/140 arquivos, gate/design e 551 browsers PASS/109 SKIP. CI integrada final [41731938394](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41731938394): **SUCCESS**: 140 arquivos/685 unitários, gate/design e 551 browsers PASS/109 SKIP. Seis testes focais PASS; pacote de publicação em Workerd PASS. [Evidência da entrega](evidencias/2026-11-03-dominio-publicado.md).

## Serviço e banco

Publicação concluída em 03/11/2026 às 22:48:43 UTC (19:48:43 America/Sao_Paulo). Worker base-do-basquete-next-preview, fonte eff36fe0eda76962e6babbc4a9464a98c3dad478, versão 35f5b882-70b1-48f7-8bb3-fda632bd458e, deployment 09e26c1c-4e0e-46ea-8026-5d5c8a721d59 em **100%**. API confirmou domínio habilitado, origem canônica, namespace de sessões e limiter preservados, segredos presentes por nome/tipo e preview exclusivo do responsável. Nenhuma leitura ou rotação de valores secretos. Domínio próprio sem Access, previews preservados. [Configuração](DOMINIO-PROPRIO.md). Rede corporativa bloqueia a confirmação HTTP remota; abertura e login humanos após publicação permanecem sem confirmação.

Migrations já aplicadas no projeto nizmasjddyrhmevvfviz:20261103174254_sheet_team_statistics e20261103174303_game_editor_metadata. Não reaplicar, alterar SQL/ledger ou executar seeds. Nenhuma nova operação de banco na retomada. Provas, hashes e baseline de advisor em [liberação pública](evidencias/2026-11-03-liberacao-publica.md).

## Continuidade e cota

Retomada real em 03/11 às 19:09:37 America/Sao_Paulo, reset observado+2min. Cota confirmada ao retomar: 1% consumido na janela de 5h/15% semanal. Automação retomar-libera-o-do-dom-nio-ap-s-reset: **PAUSED**, confirmado pela ferramenta oficial após a entrega. Procedimento permanente em CONTRIBUTING.md; ao atingir 15% restante, checkpoint e reagendamento pelo reset real, sem nova unidade/gate, créditos ou reset manual.

Entrega técnica concluída: produto integrado e publicado, CI integrada aprovada e heartbeat pausado. Próxima verificação humana: abrir a raiz e entrar por /admin em uma rede que permita o domínio. O teste desta máquina retornou timeout HTTPS e bloqueio corporativo HTTP503, sem contornar a política. Checkpoint documental posterior preservado na mesma branch; sem novo código, PR ou deploy por documentação.

Mudanças alheias preservadas no checkout principal sync/trabalho-casa: CONTRIBUTING.md, .agents/skills/web-design-guidelines/ e skills-lock.json. Demais worktrees e trabalho original da PR #49 preservados. Temporários/provas de logs em Y:/Codex-Temp/pr49-liberacao-20261103. Não sobrescrever ou limpar trabalhos de outros agentes.
