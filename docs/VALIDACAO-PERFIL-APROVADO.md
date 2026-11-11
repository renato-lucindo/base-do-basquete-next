# Perfil do atleta aprovado — implementação e publicação

Em 11/11/2026, o responsável aceitou a revisão 4 do protótipo, autorizou implementar e publicar o Worker e determinou manter a PR aberta. Os ajustes finais foram incluídos: resumo branco e ano simples, marcas no azul do placar, preenchimento sutil no ranking expandido e links reais sem sublinhado.

## Resultado e limites do recorte

Identificação e resumo ficam à esquerda; conquistas à direita no desktop. O nome completo tem 20 px de separação da equipe no desktop e 16 px no celular. Equipe/camisa e campeonato/categoria antecedem os metadados publicados. A trajetória vertical agrupa passagens consecutivas pela mesma equipe, preserva retornos posteriores e mostra anos das participações conhecidas, sem inventar vínculo contratual.

Coletivas e individuais permanecem lado a lado inclusive em 320 px. Cada colocação publicada tem seu emoji uma vez, primeiro campeonato ao lado e os demais abaixo; o nome/contador expande edições e a medalha permanece inativa. MVP mantém sua natureza de honraria. Nenhuma conquista fictícia ou colocação ausente foi acrescentada ao produto.

O perfil apresenta cinco últimos jogos com participação explícita. A rota `atleta.html#id?secao=jogos` abre uma página dedicada com todas as participações publicadas, em ordem decrescente, paginação local e retorno ao perfil. Compartilha os dados e o componente de jogos. Filtros começam recolhidos à direita e preservam seu estado na URL; resumo, conquistas, recentes e recordes não mudam com esses filtros.

Recordes PTS/2P/3P/LL usam uma tabela com Marca em duas colunas, Data, Confronto e ação reservada em todas as linhas. Campeonato, ano e categoria acompanham o confronto; no celular, a data integra essa célula. “Ver top 5” acrescenta somente as posições 2º–5º, independentemente por métrica; a primeira atuação não se repete. Marca e placar usam azul `#1557a4`; posições expandidas usam fundo `#f5f8fc`. Somente atuações com cobertura confirmada entram no ranking, incluindo zero confirmado e distinguindo dado ausente.

Nomes abrem o perfil da equipe com a inscrição correta; placar e marca abrem o jogo publicado. Links preservam retorno seguro, navegação padrão e foco visível, sem sublinhado. API, contratos de publicação e dados privados não foram alterados. Assistências, rebotes e idade na data do jogo não foram inventados a partir das fontes disponíveis.

## Fonte, revisão e CI

- [PR #79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), branch `codex/perfil-atleta-aprovado`, base `a55dd7c7ef3b85991238c6e5bd379f5aa60e1b05`. Manter aberta, sem merge ou auto-merge.
- Fonte de código publicada: **fc276b3f50d913bd43014938206d90d0bf205406**. Implementação em `acbc5f2`; o commit seguinte apenas adapta o teste de acessibilidade ao percurso dedicado. Commits de registro posteriores não alteram os artefatos executáveis.
- [CI completa 42958772570](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42958772570): **SUCCESS**, sete jobs incluindo `validate`. Gate: **810 unitários / 172 arquivos**, 19 transportes, 15 testes de banco isolado, 35 de Worker/HTTP e 1 de PDF, além de política, lint, formato, tipos, builds, fronteira do cliente e segredos.
- Browsers completos: **814 PASS / 118 SKIP** nos dois shards (466 e 348 PASS). Skips preexistentes, sem novos skips ou timeouts ampliados nesta unidade. Design e WebKit também SUCCESS. A CI do registro documental segue o classificador proporcional; consultar os checks do HEAD real da PR.
- Local: cinco casos novos RED→GREEN e quatro existentes de modelo; execução inicial de 34 cenários, depois 14 de aceite/geométrica e dois de acessibilidade focal PASS. Os testes de perfil e de aceite somam 44 cenários distintos nas duas configurações. Axe: quatro estados geométricos e 12 estados do percurso/filtros sem violações automáticas nas regras A/AA selecionadas.
- O primeiro run, 42957135715, aprovou gate/design/WebKit e falhou somente nos dois cenários do teste de acessibilidade que ainda esperavam Jogos como painel. O consumidor foi adaptado para a página dedicada e confirmado localmente antes da CI final. Fixtures de nomes longos e seleção de botões dinâmicos também foram corrigidas no verificador, sem reduzir asserções.

O gate local completo não é declarado aprovado: forks ficaram sem progresso e tentativas posteriores encontraram disco cheio. A evidência consolidada é a CI remota do SHA acima. Artefatos temporários próprios foram preservados em armazenamento de trabalho na rede, permitindo concluir os verificadores focais. Nenhuma limpeza de dados humanos ou mudança de configuração do sistema foi feita.

Revisão do autor complementada pelo review automatizado Codex. O apontamento P2 de paginação no commit 20522a7 foi reproduzido e corrigido: com `page=500`, uma única ação Anterior usa a página efetiva e volta à página precedente. Teste RED→GREEN desktop/mobile e conjunto focal final de 44 cenários PASS. Aplicadas `ui-ux-pro-max`, `web-design-guidelines` e a [fonte atualizada de diretrizes](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Cobertura/zero, empates, agrupamento, retorno, semântica e limites das células revisados; sem achados impeditivos. Não se declara auditoria WCAG integral, leitor de tela ou teste em aparelho físico.

## Worker e verificação remota

| Item                  | Valor                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Worker                | `base-do-basquete-next-pr79`                                                                                      |
| URL                   | https://base-do-basquete-next-pr79.renato-lucindo-jr.workers.dev                                                  |
| Perfil de exemplo     | https://base-do-basquete-next-pr79.renato-lucindo-jr.workers.dev/atleta.html#ab277378-2b23-4e71-8234-b6d2b3915f9f |
| Deployment ativo      | `d56c620d-c918-4d32-b91b-316beb91f879`                                                                            |
| Versão, 100%          | `4efd167c-7778-429e-82a2-04bfd7aaaf48`                                                                            |
| Fonte em X-Bdb-Source | `fc276b3f50d913bd43014938206d90d0bf205406`                                                                        |
| SESSIONS próprio      | `f12d689440054666976f78289a51eb55`                                                                                |
| Rate limit próprio    | `791111202611`, 10 requisições / 60 s                                                                             |

Build foundation e pacote Worker por Wrangler local 4.152.0; configuração isolada de PR, sem rotas ou domínio de outro serviço. Dry-run e deploy aprovados. Configuração correspondente ao preview público existente, com `FLEXIBLE_COMPETITION=true`, integração de desenvolvimento e sessão independente. Chaves configuradas diretamente no cofre, sem valores em logs/commits. O provisionamento da classe de sessão do novo Worker não altera schema ou dados da aplicação.

Smoke: raiz/health/perfil e 36 arquivos retornaram 200 com a fonte correta; 29 JS/CSS têm SHA256 idêntico ao build, e sete HTMLs referenciam os fingerprints esperados. `/api/session` e `/api/competitions` retornam 401. Sem login de teste ou escrita em dados reais. Oito Workers anteriores tiveram seus deployments reconferidos e preservados; a lista de sete apps Access permaneceu idêntica. Nenhuma alteração no Pages.

Perfil e jogos verificados em **320, 390, 1366 e 1920 px**. Dez configurações geométricas remotas, recolhidas/expandidas e com zoom, sem transbordamento horizontal. Três percursos reais: placar → jogo → perfil, equipe → perfil e marca → jogo → perfil, preservando o filtro na URL. Teclado: Espaço/Enter e foco de 3 px visível. Toque nativo emulado: duas métricas abertas, recolhimento independente e alvo medido de 72 × 44 px.

**Zoom real 200%:** `chrome.tabs.getZoom=2`, DPR 2, viewport CSS de 683 px em janela de 1366 × 768; largura de documento também 683 px. Capturas CDP nos dois estados. Foram inspecionadas capturas desktop, celular e zoom; 14 imagens finais e as provas JSON estão na entrega local `outputs/implementacao-perfil` do chat.

Capturas versionadas: [desktop](design/evidencias/perfil-aprovado/recordes-1366.png), [celular](design/evidencias/perfil-aprovado/recordes-390.png) e [celular expandido](design/evidencias/perfil-aprovado/recordes-390-expandido.png).

## Continuidade

Checkout principal `sync/trabalho-casa`, suas três alterações preexistentes, demais branches e protótipos preservados. Histórico anterior em `historico/progresso/2026-11-11-antes-perfil-atleta-aprovado.md`. Sem SQL, alteração de Auth/Access, publicação de dados ou merge nesta unidade. Próximo passo do responsável: revisar a PR aberta e o Worker entregue.

## Correção da revisão final

A fonte atual inclui a correção P2 da paginação em fc276b3. A CI 42958772570 acima registra a composição anterior 697c7af; não é declarada como prova desta correção. O conjunto focal completo passou 44/44 após reproduzir a falha. A CI completa do HEAD atual e seu resultado são conferidos na [PR79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79) e na entrega local. Este registro posterior é exclusivamente documental; os novos artefatos do Worker identificam a fonte fc276b3 em X-Bdb-Source.
