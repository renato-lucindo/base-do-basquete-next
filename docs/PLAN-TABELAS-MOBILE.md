# Tabelas mobile e padronização pública — PR #89

Base: 8418673. Branch: codex/perfis-equipes. Mesma unidade e worktree; nenhum merge autorizado.

## Plano e matriz antes da implementação

| Pedido / referência vigente                        | Componente / decisão                                                                                                                 | Prova prevista                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Atleta + camisa; PUBLICO e catálogo 09 tabelas     | ScoresheetStatisticsTable: variante team-profile, largura intrínseca limitada à região; camisa inline sem coluna; picker só métricas | Jogadores e Elencos, zero/ausente/00, nomes longos, Total/Por jogo, ordem, links e rolagem |
| Confrontos; PUBLICO e catálogo 09 tabelas          | ProfileMatch + linha compacta compartilhada até639px; nomes completos, equipes iguais, placar auto nowrap                            | Últimos jogos, Ver jogos e Carreira em320/375/390/430/639/640/768/1366                     |
| Recordes; catálogo 05 ações e09 tabelas            | Uma apresentação ativa; toggle no cabeçalho do grupo mobile; tabelas desktop preservadas                                             | Top5, teclado/toque, URL/voltar e cobertura ausente                                        |
| Prorrogação azul, instrução direta                 | periodColor compartilhado: vermelho só Q1/Q3; prorrogações sempre azul; sem mudar cálculos                                           | Unitários e consumidores de projeção/súmula                                                |
| Retorno sem sublinhado; catálogo 05 Botões e ações | Ação discreta compartilhada, link preservado, hover suave e foco                                                                     | Retorno à equipe normal/hover/foco e densidade da súmula                                   |
| Principal #075FCA; catálogo 02 cores               | Tokens públicos principal/hover/suave; eliminar cores de ação antigas, preservar semântica                                           | Cor computada nas páginas públicas e contraste                                             |

## Execução

1. Testes focais de regressão antes das correções.
2. Variante de atletas e apresentação compacta compartilhada; cores e retorno.
3. Regressões dos consumidores, inspeção visual real e evidências; gate completo e CI.
4. Publicar admin/preview já autorizados; admin-publicacao intacto; atualizar checkpoint e PR.

Não alterar contratos, schema, pontuação, rankings ou validação esportiva. Os quatro quartos preservam as cores existentes. Dados de teste são sintéticos. A nova apresentação de nomes completos restringe-se aos contextos solicitados do jogador.

## Registro

- Inicial: checkout limpo, HEAD8418673, PR89 aberta e correspondente à branch. Sem ferramenta de subagentes disponível; revisão final será autoral e explicitada.

- Decisão de execução: `jerseys.min(0)` acumulava a verificação anterior min1 no Zod e rejeitava camisa ausente. Recriar somente o array de camisas das linhas públicas a partir do mesmo tipo de elemento, mantendo o limite101, materializa a intenção existente de aceitar zero camisas sem mudar o formato da API. O teste browser reproduziu a rejeição antes da correção.
- Os testes mobile antigos de nomes abreviados e alinhamento das cinco colunas de recordes passam a verificar a apresentação compacta solicitada; as asserções desktop permanecem.

- Implementação concluída e revisão autoral separada: dados/ordem/cálculos e tabelas desktop preservados; nenhuma deficiência crítica ou importante encontrada. Sem subagente disponível.
- Provas focais:43 testes unitários;62 consumidores Chromium e teste mobile de links final aprovados. Matriz final após fallback de tokens:16Chromium +16WebKit (oito larguras). Matriz anterior de toque WebKit32PASS. Catálogo/design completo PASS com axe.
- Gate local: lint/formato/tipos gerados aprovados; retomado após corrigir variável document sombreada no teste. Suíte unitária completa e transportes aprovados; restantes em execução. CI e publicação ainda pendentes.
- Catálogo isolado: o azul antigo fixo não dependia de tokens. Os novos aliases precisam de fallback canônico #075FCA onde a amostra carrega CSS sem cabeçalho público; contraste revalidado, sem afrouxar axe.

- Fechamento local: gate completo aprovado (867/19/16/35/1); design/catálogo/axe aprovados. Fonte1d6ce17 publicada emadmin/preview;76assets e108páginas/seções-larguras-engines reais conferidos; configurações eadmin-publicacao preservados. [Validação detalhada](design/VALIDACAO-TABELAS-MOBILE.md). CI obrigatória do HEAD vinculada naPR, sem merge.
