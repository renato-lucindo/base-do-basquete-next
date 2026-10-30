# Progresso atual

Atualizado em 29/10/2026. Este arquivo resume o estado observado; histórico não autoriza execução. Antes de agir, confira Git, PRs e CI reais. Leia o [escopo do MVP](MATRIZ-ESCOPO.md), o [roadmap](ROADMAP.md) e as regras de [contribuição](../CONTRIBUTING.md).

## Unidades ativas

| Unidade                                                | Estado e evidências                                                                                                                                                                                                                                                                                                                                                                                                                                        | Próximo passo                                                                                                                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #38 — reaproveitamento de elenco e súmula v2        | Branch `codex/reaproveitar-elenco-banco`; remoto `391703e4`, CI [40992290296](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40992290296) **SUCCESS**. Teste HTTP/Workerd isolado acrescentado localmente: 27/27 PASS, ESLint/Prettier PASS. Novo SHA e nova CI serão conferidos na mesma PR. Migrations já aplicadas: 52. Preview protegido devolve HTTP 302 sem sessão. **Draft**, sem prova Supabase Auth/HTTP remoto nem aceite. | Publicar teste e checkpoint na PR #38; conferir CI do novo SHA e revisão. Só integrar após prova autenticada em ambiente isolado autorizado e aceite. Não reaplicar migrations, deploy ou DDL. |
| PR #46 — apresentação pública de súmula e estatísticas | Último HEAD consultado `3c75a41436f7ae8bdad0dd55b585d286a7e8cd71`; aberta, com conflito com main. CI desse SHA SUCCESS: 591 unitários e 471 browsers PASS/105 SKIP, [run 40952609048](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40952609048). Há respostas de correção aos dois apontamentos; resolução final e aceite visual precisam de conferência.                                                                          | Resolver conflitos preservando mudanças locais de outros agentes, conferir revisão/aceite e CI da composição atualizada antes do merge.                                                        |

## Documentação e checkout local

- PR #47 integrada na main em `89a1b9f`; guias vigentes em [design](design/README.md). Documentos antigos de UI/UX em [histórico documental](../historico/documentacao/README.md).
- Checkout principal em `C:/Users/12405304716/Documents/Codex/Base do Basquete-v1`, na branch da PR #38. O commit local `06385a9` e o teste novo de Workerd seguem para a mesma PR; confirmar SHA publicado e CI no GitHub. Alterações humanas fora do commit preservadas.
- Skills pessoais preservadas em `C:/Users/12405304716/Documents/Codex/Base-do-Basquete-local-skills-backup-20261029-232142`. `skills-lock.json` e `.agents/skills/web-design-guidelines/` locais permanecem fora do commit. Outros worktrees e alterações de outros agentes devem ser preservados.
- Histórico completo anterior, com evidências e checkpoints de outras unidades: [registro arquivado](../historico/progresso/2026-10-29-antes-da-sintese.md). Consulte somente a seção necessária; datas e instruções antigas não representam o estado atual.

## Banco e serviço publicado

- Registro mais recente da PR #38 informa 52 migrations aplicadas e reconciliadas, incluindo contexto/escrita de reaproveitamento e súmula v2. Esta tarefa documental não fez nova consulta ao banco. Detalhes: [plano de migrations](PLANO-MIGRATIONS-PR38.md) e [validação da unidade](VALIDACAO-REAPROVEITAMENTO-ELENCO.md). Migrations aplicadas são imutáveis.
- Preview remoto protegido: HEAD observado retornou `HTTP 302` sem sessão Cloudflare Access. Não houve deploy e a versão publicada não foi identificada; não confundir com a versão da PR. Testes Workerd usam credenciais e RPCs sintéticos.
- Nenhum deploy, DDL, publicação ou alteração de dados humanos nesta reorganização documental.

## Manutenção do checkpoint

Substitua o resumo da unidade ao concluir, pausar ou trocar de agente. Registre branch/SHA, CI real, serviço publicado quando verificado, alterações alheias, bloqueios e um próximo passo concreto. Preserve contexto único no [histórico](../historico/progresso/README.md), sem acrescentar sucessivos relatórios completos aqui. Provas detalhadas ficam nas validações e PRs. Objetivo: uma ou duas páginas, com as unidades ativas legíveis.

O procedimento permanente de cota e retomada fica em [CONTRIBUTING.md](../CONTRIBUTING.md); não reutilize horários ou agendamentos históricos.
