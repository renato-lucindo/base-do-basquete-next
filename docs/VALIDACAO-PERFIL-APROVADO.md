# Perfil do atleta aprovado — implementação

11/11/2026. Revisão 4 local aceita pelo responsável, com autorização para implementar, publicar Worker e abrir PR mantendo-a aberta. Ajustes adicionais: resumo branco e ano simples, marcas em azul do placar, fundo sutil nas posições expandidas, navegação real sem sublinhado.

## Escopo

- Identificação e resumo à esquerda; conquistas à direita. Nome completo separado da equipe por20px desktop e16px celular. Equipe/camisa e campeonato/categoria vêm antes dos metadados publicados. Não inferir metadados privados ou vínculo contratual atual.
- Trajetória vertical somente de equipes, agrupando inscrições consecutivas da mesma equipe e preservando retornos posteriores. Períodos representam anos de participações publicadas.
- Conquistas coletivas agrupadas por colocação real e campeonato; emoji aparece uma vez por grupo, primeiro campeonato ao lado e os demais abaixo. Sem colocação inexistente ou medalha artificial em MVP. Individuais e coletivas lado a lado inclusive em320px. Só o nome/contador é expansível; medalha permanece inativa.
- Cinco últimos jogos com participação explícita, ordenados pela data do jogo. A rota `atleta.html#id?secao=jogos` apresenta uma página dedicada com todas as participações publicadas e paginação local, sem repetir o perfil. Retorno preserva filtros e contexto; os mesmos dados, cálculos e componente de jogos são compartilhados.
- Filtros recolhidos inicialmente, ação discreta à direita. Resumo e recordes independentes dos filtros.
- Recordes PTS/2P/3P/LL na mesma tabela, Marca em duas colunas, Data e Confronto centralizados. Contexto do campeonato abaixo dos nomes. No celular, data incorporada ao confronto. Expansões independentes acrescentam somente2º–5º, preservando a coluna de ação e os limites do cabeçalho. Marca azul `#1557a4`, igual ao placar; posições expandidas com fundo `#f5f8fc`.
- Nomes de equipes abrem seus perfis com inscrição correta; placar e valor do recorde abrem o resultado publicado. Links sem sublinhado, com foco visível e retorno seguro pelo contrato existente.

Somente dados públicos validados pelo loader existente. Nenhuma fixture fictícia foi incorporada à aplicação, nenhum bronze foi inventado para demonstração no produto. Sem alteração de API, contrato persistido, SQL, Auth, Access ou publicação de dados.

## Evidência local

- `public-model.test.ts`:4 testes da base PASS antes de implementar.
- `presentation.test.ts`:5 casos RED→GREEN para cobertura/zero, ordenação/empates/limite, trajetória com retorno, ausência de prata e distinção de MVP.
- `tests/player-public.spec.ts` e primeira versão de `player-approved.spec.ts`:34cenários PASS desktop/mobile; testes legados adaptados aos cinco recentes, filtros recolhidos e jogos dedicados.
- `tests/player-approved.spec.ts` final:14cenários PASS, incluindo cliques reais em resultado/equipe e retorno, quatro larguras320/390/1366/1920, centros/limites das colunas, nomes longos e quatro execuções axe A/AA sem violações. Testes continuam a distinguir indisponível de zero.
- Lint, formato, tipos do Worker, typecheck e diff focal PASS. Captura1366 inspecionada: resumo branco, ano simples, identificação à esquerda, conquistas à direita e tabela de recordes centralizada.
- Gate completo local iniciado: política11PASS, lint/formato/tipos/typecheckPASS. Pool padrão de forks do Vitest ficou sem progresso e foi interrompido. Nova tentativa com threads encontrou disco local cheio no teste que cria um repositório temporário. Essas tentativas não são declaradas como gate completo aprovado. CI remota do SHA da PR será a prova consolidada antes da entrega do Worker.

Dois problemas do verificador foram corrigidos: fixture de nome longo precisava atualizar também a inscrição correspondente; lista dinâmica de botões não pode ser percorrida por índices depois de trocar “Ver” por “Recolher”. Não houve aumento de timeout ou remoção de asserções para aprovar o produto.

## Revisão e continuidade

Revisão do autor, sem subagente de revisão disponível. Aplicadas as skills `ui-ux-pro-max` e `web-design-guidelines`, com [diretrizes atualizadas consultadas](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). Sem achados impeditivos na revisão focal de cobertura, links, semântica, estados vazios e responsividade. Verificação não equivale a auditoria WCAG integral, leitor de tela ou dispositivo físico.

PR, CI consolidada, zoom real e serviço publicado ainda em preparação neste checkpoint. As três entregas locais anteriores e a revisão4 aceita permanecem preservadas. Histórico da unidade anterior em `historico/progresso/2026-11-11-antes-perfil-atleta-aprovado.md`.
