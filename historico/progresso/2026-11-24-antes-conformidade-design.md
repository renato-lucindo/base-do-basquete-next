# Progresso atual

Atualizado em24/11/2026. [Histórico anterior](../historico/progresso/2026-11-24-antes-reflow-jogador.md).

## Unidade ativa

- Branch codex/perfis-equipes, [PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), HEAD3fdb4b97c1bd6dbba3bb9a1ead3adfdd454b97a8. Uma unidade, base original824a3d5 e main/PR88 incorporada por merge d6c70e0. Sem merge para main autorizado. Alterações humanas do checkout original preservadas; sem novas PRs empilhadas.
- Plano público de24/11 implementado: [plano](PLAN-CONSISTENCIA-PUBLICA.md), [requisitos](design/PERFIS-EQUIPES.md), [validação](design/VALIDACAO-PERFIS-EQUIPES.md). Perfis, restauração Formato/classificação PR75, PTS após Equipe/AVG=PP÷PC após SLD/duas casas preservados. Sem alteração de regras esportivas ou contratos do banco.
- Revisão posterior **Conformidade de design e correção dos perfis de equipes** aceita e implementação expressamente autorizada. [Matriz e execução](PLAN-CONSISTENCIA-PUBLICA.md#revisão-aceita-em-2411--conformidade-de-design) registradas antes de editar UI. Prioridade: fluxo/documentação rigorosos, depois correções do geral e da disputa; padrões específicos aprovados para ano nas abas e Participação central. Interface desta revisão ainda não alterada. O plano posterior substitui a centralização anterior da classificação.
- Tabela da equipe estável ao ordenar, ordem compartilhada com jogadores da disputa, seletor/contornos/seleção/links/placares corrigidos, vazios concretos, títulos de aba só semânticos. Breadcrumb hierárquico/status abaixo, fontes públicas+2px sem duplicar adoção anterior e rodapé marca/Base do Basquete/Dados a partir de2026. Padrões e checklist com exemplos contra títulos redundantes atualizados e testados. Reutilizados componentes/tokens; guia Navegação/Estados/Dados/Tipografia e acessibilidade aplicado.

## Correções e provas

- Gate:ui anterior e36unitários PASS; browsers focais e capturas no relatório. CI2ee3ed8/45438050865:878Chromium PASS/9falhas/125dispensas existentes, demais jobs de código/design/WebKit PASS. Falhas finais reproduzidas em reflow320px, reserva de altura e posição de atletas da súmula; sem alterar asserções/timeouts.
- Fonte3fdb4b9 corrige rolagem interna de abas do jogador em19rem, reserva de três linhas, corpo/detalhe16/14px e somente intervalos desktop da súmula, preservando fontes/alvos. Medições locais: largura320 nas quatro abas, painel456,875px nas quatro abas desktop, primeiro atleta y394 (<400).
- Rechecagem3fdb4b9:112browsers PASS/8dispensas preexistentes, cobrindo todos os nove casos e consumidores públicos. Novo gate:ui PASS (lint/formato/tipagem app/Worker/builds/fronteira/segredos). Provas de fontes inalteradas reutilizadas; não declarar PASS de CI antiga para a composição nova. Revisão autoral, sem parecer independente alegado.

## Serviços publicados

- Publicado3fdb4b9 pelo conector Cloudflare: admin versão5ecc75bd-544a-4a2d-ab54-4900da798f19/deploymentcc138c2e-16d3-45cc-8a14-eb1d25864fcc; preview versão24bfd26a-60ca-4ee1-a5e8-d2861a8d4a54/deployment8da2f8ca-0969-4309-985f-dc42f6e4d82f,100% cada. URLs admin.renato-lucindo-jr.workers.dev e preview.renato-lucindo-jr.workers.dev.
- BDB_SOURCE3fdb4b9/flag formato true/namespace597c612fd69c447e81547f16d5dcca41 e segredos conferidos antes da ativação. Smoke200/header correto nos dois serviços, admin metadado true/API401 e preview API403;11assets públicos iguais ao build por SHA256. Navegador real: quatro abas do jogador em320px sem transbordamento/alertas; perfis/cabeçalhos/rodapé e vazio da eliminatória confirmados em leituras anteriores de fontes inalteradas.
- Somente admin/preview ativos; demais10Workers e URLs de versões fechados. Preview só leitura e sem Access. Conector reconectado pelo responsável; fallback Wrangler usado apenas na publicação inicial. Sem DML/migrations/DDL/publicação de rascunhos ou mudanças de Auth/Access. Domínios próprios aliases mantidos; bloqueio corporativo já confirmado, não repetir testes. Raiz/www fora do escopo.

## Próximo passo

- CI push45444517462 **SUCCESS** no3fdb4b9. CI de pull_request45444529563 **FAILURE**: timeout30000ms de src/achievements/context-database.test.ts (856unitários PASS/1falha); browsers/design/WebKit PASS. PR89 continua aberta no3fdb4b9; não declarar aprovação completa. Diagnosticar sem elevar timeout/enfraquecer testes. Automação antiga conferir-ci-da-consist-ncia-p-blica excluída após conclusão das execuções.
- Pausa obrigatória por cota consultada na ferramenta real: usedPercent88 na janela300min, **12% restante**, abaixo do gatilho15%. Reset informado1795550760 =24/11/2026 20:06UTC/17:06SãoPaulo; retomada+2min às **17:08SãoPaulo/20:08UTC**. Automação oficial **retomar-conformidade-de-design ACTIVE**, criada e conferida via view e configuração local, execução única COUNT1 no horário17:08. Sem créditos ou reset manual. Primeiro create com DTSTART foi rejeitado por formato; criação efetiva usa RRULE local sem DTSTART e foi confirmada.
- Próxima ação: consultar cota/estado real; implementar primeiro a seção Fluxo obrigatório e reconciliar docs/design/README.md, hierarquia do INDICE, AGENTS, guia e template da PR conforme matriz do plano. Depois UI/testes/CI/preview na mesma unidade. Não há autorização para merge. Preservar checkpoint/histórico locais preexistentes; não publicar plano/checkpoint sozinho para disparar outra CI sem alteração material.
