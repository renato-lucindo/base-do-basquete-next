# Progresso atual

Atualizado em 03/11/2026, após retomada automática. [Checkpoint da pausa](../historico/progresso/2026-11-03-pausa-liberacao-dominio.md) preserva autorização, cota, agendamento e estados anteriores. [Escopo](MATRIZ-ESCOPO.md) · [Roadmap](ROADMAP.md).

## Liberação do domínio e separação das entradas

O responsável autorizou integração, migrations e deploy para campeonatos em https://basedobasquete.com.br/ e administração em /admin. A retomada ocorreu após reset: ferramenta real confirmou 1% consumido na janela de 5h e 15% semanal. Procedimento permanente em CONTRIBUTING.md: checkpoint e heartbeat reset + dois minutos ao pausar por cota. Automação desta conversa: retomar-libera-o-do-dom-nio-ap-s-reset; pausar ao concluir.

- PR #49 integrada por merge commit em e310a0c30da753c9ee7f82f32e4349e7825cbeae, 03/11 às 22:10:12 UTC, sem bypass. CI do head63917c9 SUCCESS, run41691195491; quatro conversas de revisão conferidas resolvidas. Conferir CI integrada antes de concluir. Provas detalhadas: [liberação pública](evidencias/2026-11-03-liberacao-publica.md), [cadastro de jogos](evidencias/2026-11-03-dialogo-jogos.md).
- Mesma PR #50, branch codex/dominio-proprio, worktree C:/Users/12405304716/.codex/worktrees/dominio-proprio. Merge explícito de origin/main após integrar49. Conflitos somente em checkpoint e roteamento: raiz serve /publico.html; /admin e /admin/ servem /foundation.html. Teste HTTP com assets reais verifica separação e guarda administrativa. CI anterior de fb9fcbf SUCCESS, run41694489736; código da composição exige nova CI.
- Histórico do cadastro, alinhamento mobile e revisão da PR49 preservado nas evidências e arquivos históricos incorporados. Sem nova unidade ou nova PR na retomada.

## Banco e serviço

Migrations já aplicadas no Supabase nizmasjddyrhmevvfviz: 20261103174254_sheet_team_statistics e 20261103174303_game_editor_metadata; SQL imutável. Não reaplicar, alterar ledger ou executar seeds. Provas, hashes, estrutura/grants e baseline de advisor na evidência da liberação; nenhuma nova operação de banco na retomada.

Worker base-do-basquete-next-preview ainda na versão188ff4c2-b3ae-40ec-bb90-e3df7192429c, deployment08b39ef7-51bc-4f1f-b33b-69e0f741b2de em100%. Novo bundle ainda não publicado. Origem https://basedobasquete.com.br; domínio próprio sem Access por decisão explícita, previews protegidos. Rewrite /admin já configurado na borda e preservado. [Configuração do domínio](DOMINIO-PROPRIO.md). Rede corporativa bloqueia teste remoto; confirmação humana posterior ao deploy continua pendente.

## Continuidade

Validar composição, conferir CI atual/revisão e integrar a PR50; conferir CI do SHA integrado e publicar código validado, registrando versão/deployment e bindings preservados. Atualizar este checkpoint com resultados reais e pausar heartbeat ao concluir. Reutilizar provas de artefatos inalterados.

Preservadas mudanças alheias do checkout principal sync/trabalho-casa (CONTRIBUTING.md, .agents/skills/web-design-guidelines/, skills-lock.json) e demais worktrees. Não sobrescrever trabalho do outro agente da PR49. Temporários em Y:/Codex-Temp/pr49-liberacao-20261103.
