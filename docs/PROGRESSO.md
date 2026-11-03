# Progresso atual

Atualizado em 03/11/2026. Escopo em [MATRIZ-ESCOPO.md](MATRIZ-ESCOPO.md), objetivos em [ROADMAP.md](ROADMAP.md). O [checkpoint anterior](../historico/progresso/2026-11-03-antes-classificacao-publica.md) preserva a entrega inicial e a retomada por cota; não representa o estado vigente.

## Unidade — navegação, classificação e agenda públicas

- Mesma branch `codex/navegacao-publica` e [PR #49](https://github.com/renato-lucindo/base-do-basquete-next/pull/49), base `d84c09e`, worktree `C:/Users/12405304716/.codex/worktrees/navegacao-publica`. Implementação atual `a1e706a2ebc20a32feb16dbe9576b151fcdbdd35`, posterior ao contrato `b874709` e navegação inicial `13dc912`/`2f04dca`. O responsável pediu continuar as páginas nesta mesma conversa após definir os contratos; a ampliação ficou na mesma PR, sem merge ou nova pilha.
- Implementados confirmação autenticada/atômica com prévia nominal, fonte mínima e leitor público, classificação por grupo/fase/série, agenda futura e descoberta de disputas sem resultados. Regras/agenda/identidades/efeitos permanecem na versão confirmada; resultados publicados/corrigidos atualizam os derivados. Ordem fixa Categoria → Divisão, sem nível vazio. Estatísticas e perfis mantêm suas fontes próprias.
- Verificação local: `npm run gate` **PASS**, 665 testes/135 arquivos, 6 transportes, 13 testes de banco descartável, 28 HTTP/Workerd e 1 runtime PDF, tipos/lint/formato/builds/fronteiras/segredos. Reforços finais: 7 testes de banco/catalogação PASS, 1 HTTP/Workerd PASS, build foundation e verificações focais PASS. Playwright: 70 PASS no conjunto afetado; 8 PASS após os links de fase e 4 PASS no fechamento da prévia administrativa, execuções sobrepostas. Comandos, capturas e limites em [evidências atuais](evidencias/2026-11-03-classificacao-publica.md); não somar execuções como cenários únicos.
- CI anterior `b874709`: [run 41567034057](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41567034057) **SUCCESS**, reconfirmada. A prova consolidada do novo HEAD, posterior ao checkpoint, fica nos [checks da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/49/checks) e na descrição por SHA. A CI antiga não valida este incremento. PR em **draft** enquanto a entrega com migration não aplicada aguarda revisão/validação autorizada; sem aceite humano do fluxo ou parecer independente.
- Preview local reproduzível: `npm run preview:public`, [127.0.0.1:5177/publico.html](http://127.0.0.1:5177/publico.html). Quatro disputas fictícias, inclusive Feminino/Sub-18 2027 sem resultados; tabelas/agenda/equipes verificadas desktop/mobile, sem erro de página. APIs somente de fixtures e GET, sem banco ou admin conectado; confirmação administrativa testada com fixtures Playwright. A disponibilidade do link depende do processo local em execução.
- Migration `20261103024332_public_standings_confirmed.sql` preparada e testada em banco descartável, **não aplicada ao banco real**. Automação `retomar-navega-o-p-blica-pr-49` permanece pausada: esta execução não pausou por cota. Próximo passo: revisão humana da PR/capturas e autorização específica para aplicação da migration e piloto autenticado no serviço protegido; depois conferir CI/revisão antes de eventual integração. Sem autorização de merge ou deploy.

## Base integrada e alterações alheias

- Base da unidade `d84c09e` inclui PRs #38/#46. O histórico anterior preserva suas evidências e serviços; não refazer integrações nem atribuir suas autorizações à PR #49.
- Checkout principal `sync/trabalho-casa`, mudanças humanas em CONTRIBUTING/skills e outros worktrees/branches preservados. Somente o worktree exclusivo desta PR foi alterado.

## Serviços e banco

- Nenhuma consulta/alteração de dados humanos, aplicação de migration no banco real, deploy ou mudança de Access. DDL da nova migration exercitado somente em PGlite descartável; migrations anteriores preservadas. O código da PR não está implantado no serviço remoto.
- Serviços/deployments anteriores não foram republicados nem reconsultados. Regras de cota e retomada em [CONTRIBUTING.md](../CONTRIBUTING.md); conferir estado real por SHA ao retomar.
