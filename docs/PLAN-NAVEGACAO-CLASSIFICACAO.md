# Refinamento de navegação e classificação — PR #89

## Unidade e execução

Pedido explícito do responsável em 26/11/2026; continuar `codex/perfis-equipes`,
base `0af33e3`, HEAD inicial `517c140`. Reutilizar a PR #89 e seus componentes.
Executar nesta sessão, sem nova rodada de confirmação das decisões fornecidas.
Sem merge; atualizar somente os Workers de avaliação admin e preview após validar.
Preservar admin-publicacao, sessões, configurações, dados e alterações alheias.

## Matriz de conformidade

| Comportamento / decisão                                              | Referência                                              | Componente / consumidores                                                                          | Aceite observável                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Ano → Campeonato → Naipe → Categoria → Divisão; novo padrão aprovado | Pedido §1–3; guia #navegacao/#perfis; PUBLICO, contexto | PublicHeader/DisputeNavigation; classificação, jogos, equipes, jogadores e perfis contextualizados | Ordem dos níveis, ausência dos inexistentes; painéis sobrepostos, aba e foco conservados                         |
| Retorno contextual único; refinamento aprovado                       | Pedido §2; PADROES, navegação                           | PublicHeader, navigation, searchHitHref; perfis/jogo e descoberta                                  | Jogadores/busca/equipes/jogos retornam à URL completa; acesso direto tem fallback público; sem repetir título    |
| Situação textual compacta junto ao caminho; padrão existente         | Guia #perfis; PUBLICO                                   | DisputeNavigation/navigation.css; todos os consumidores                                            | Ponto com anel + texto menor; desktop alinhado às abas; mobile sem overflow/deslocamento                         |
| Busca compacta no mobile; refinamento aprovado                       | Pedido §4; guia #selecao/#consultas; PADROES            | PublicSearchForm/Search CSS; cabeçalho público                                                     | Buscar oculto só até639px; placeholder cabe; label completo; Enter e sugestões preservados                       |
| Tabela → critérios → legenda; novo padrão aprovado na principal      | Pedido §5; guia #dados/#consultas; PUBLICO              | PublicStandingsTables/ScrollableTable                                                              | Mesma borda/largura visível, bloco natural centralizado; perfil permanece à esquerda; legenda aberta única final |
| Números e siglas centrais; novo padrão aprovado só na classificação  | Pedido §1/5; DESIGN-SYSTEM/PADROES                      | public-standings.css; principal e perfil de equipe                                                 | Identificação à esquerda; nomes destacados; PTS negrito; AVG após SLD/2casas; cabeçalhos/células coincidem       |
| Rodapé em fluxo normal; padrão existente refinado                    | Pedido §6; guia #perfis                                 | PublicFooter/navigation.css; páginas públicas                                                      | Próximo à base em página curta; após conteúdo longo; marca/dados preservados                                     |
| Resultados recentes e estatísticas fora da classificação inalterados | Pedido §7; padrões aprovados                            | RecentResultsCell, métricas/Total/Por jogo                                                         | Regressões existentes PASS; ícones/cores/anel/tooltips/disposição e largura entre modos preservados              |

## Plano de implementação

- [x] 1. Navegação/retorno: ampliar testes de URLs e browser (listagem, busca,
      direto, histórico e seletores), observar falhas; corrigir os componentes existentes.
- [x] 2. Busca: testar breakpoint639/640, label, Enter sem sugestão e com sugestão,
      toque e retorno; compactar somente a apresentação mobile.
- [x] 3. Classificação/rodapé: testar ordem, geometria, centralização/identificação,
      perfil à esquerda e páginas curtas/longas; ajustar composição/CSS restrito.
- [x] 4. Atualizar padrões e catálogo conflitantes. Revisar UI com
      ui-ux-pro-max e web-design-guidelines; comparar páginas reais renderizadas.
- [x] 5. Conferir320/375/390/430/639/640/768/1366/1920px e200%; executar focais,
      gate e Chromium/WebKit aplicáveis; corrigir regressões sem afrouxar critérios.
- 6. Encerramento na mesma PR: CI real do HEAD nos checks, publicar admin/preview,
     conferir versão/assets/privados e admin-publicacao intacto; atualizar evidências
     e checkpoint. Sem aceite humano presumido.

## Atenção na revisão

Preservar parâmetros/paginação/ordenação e histórico; sugestões na busca fora da
listagem precisam guardar o termo disponível; nomes extensos e níveis ausentes;
rolagem interna versus overflow da página; reserva da ordenação nas demais
tabelas; seletores abertos/zoom; nenhuma mudança de regra esportiva/API/banco.

## Registro de execução

Estado inicial limpo confirmado no worktree da PR. Checkout humano
`sync/trabalho-casa` contém CONTRIBUTING/skills locais e foi preservado.
PR #91/worktrees e admin-publicacao pertencem a outra unidade e ficam intactos.
CI anterior não comprova os novos ajustes. Escolha pendente Todos/Fase regular
em Jogadores permanece fora deste pedido e não será presumida.

26/11:18unitários de navegação PASS. Testes novos reproduziram os dois retornos
redundantes, ano depois do campeonato e perda de busca; depois passaram. Matriz
inicial22browsers PASS nas nove larguras; revisão ampliada114/120PASS, com seis
seletores antigos de retorno ajustados ao novo texto (retentativa10/10PASS).
Critérios/zoom/vazio, toque, acesso direto e tipo da busca foram acrescentados.
WebKit reproduziu fechamento prematuro ao clicar no filtro de entidades; impedir
blur do mouse no acionador e reabrir na seleção resolveu (4focais PASS).

Páginas reais:108combinações (seis páginas × nove larguras × Chromium/WebKit)
com fonte local e15GETs públicos reais do preview; nenhuma escrita/fixture humana.
Capturas e JSON estão em design/evidencias/2026-11-26-navegacao-classificacao/.
Inspeção visual identificou/corrigiu baseline da categoria, com regressão geométrica.
A prova de publicação e a repetição final pertencem à etapa5/6.

Execução simultânea esgotou espaço no C: e invalidou dois runs (ENOSPC); interrompidos
sem apagar evidência, arquivos humanos ou worktrees. Espaço se recuperou ao encerrar
os processos desta tarefa; gates finais executados com menor concorrência. Não
classificar essa execução interrompida como aprovação. Contenção de diretórios de
rastros em um run inicial também foi eliminada usando saídas distintas.

Revisão autoral com web-design-guidelines (fonte atual consultada) e ui-ux-pro-max:
sem novo ícone/componente de produto; links nativos, label completo, foco/retorno,
Escape, semântica e rolagem interna conservados. Padrões locais prevalecem sobre
sugestões genéricas de placeholder e virtualização. Sem subagente disponível;
revisão de diff feita pelo implementador, sem alegar parecer independente.

Gate consolidado final PASS (865unitários/183arquivos,19transportes,16banco,35Worker,1PDF, builds/fronteira/segredos).26Chromium +26WebKit finais PASS, sem novas dispensas. Regressão adicional de retornos antigos em execução; CI/publicação pendentes.

Encerramento: fonte805fc5b publicada em admin/preview, configurações e serviço fixo
intactos. Health/raiz200, privados401/403 e76assetsSHA256;108combinações de páginas
publicadas conferidas. CI inicial73dbbe8 aprovou gate/design/70WebKit, mas encontrou
2falhas da súmula por12px extras do retorno. Correção mínima reproduzida e validada:
desktop394<400, mobile456<460;30Chromium+26WebKit PASS, teste/limites intactos.
Regressão adicional96/96PASS. Evidência da CI final acompanha os checks do HEAD
na PR e seu resumo final; o run inicial não é prova de aprovação. Os commits de
encerramento não alteram runtime. Aguardar aceite explícito antes de qualquer merge.
