# Legibilidade de estatísticas — 25/11/2026

Capturas de páginas reais com fixtures fictícias; revisão autoral, sem aceite humano. Fonte: commit que acrescenta este diretório na PR89. Os dados não são referência visual nem dados humanos.

- [Jogadores1366px](legibilidade-jogadores-1366.png):100linhas na região de altura preservada;110registros/2páginas, nome288px, métricas com10px de espaço por lado e médias uniformes.
- [Jogadores390px](legibilidade-jogadores-390.png): nome240px, rolagem interna, fonte16px e44px nos três controles. Lupa central medida com diferença inferior a1px nas seis larguras.
- [Equipes1366px](legibilidade-equipes-1366.png): sem busca externa, seleção e grupos44px alinhados; números com,0 nas médias, ausências preservadas.

Medidas de modos, limites nativos, nomes longos, foco, teclado/toque, zoom200%, vazios e axe estão nas suítes existentes. Novos contratos cobrem320/390/639/640/1366/1920px; anexos adicionais no artefato da CI do SHA. [Matriz e decisões](../../../PLAN-TABELAS-FILTROS.md#legibilidade-e-controles--revisão-aprovada-em25112026).

## Conferência dos Workers

Fonte `a88d42ded657b6303dff971e8b629a001c16b80f`, Copa ES Sub-15/2026, consultas públicas sem escrita. [Medidas](medidas-remotas.json): 100 atletas na primeira página; 0px de mudança de largura entre Total/Por jogo no campeonato, em Elencos e em Jogadores da disputa; nomes288px desktop, campos44px/fonte16px. No perfil LUSB há15jogadores publicados: isso não cria registros para completar100. As oito abas foram carregadas até terminar as consultas, sem alertas ou transbordamento da página em1366px. Campanhas930px, preenchendo o painel sem rolagem desktop. As demais dimensões e estados têm provas nas suítes de fixtures.

- [Jogadores1366](remoto-jogadores1366.png), [Jogadores390](remoto-jogadores390.png), [Equipes390](remoto-equipes390.png).
- [Visão geral](remoto-geral-resumo-1366.png), [Elencos](remoto-geral-elencos-1366.png), [Visão da disputa](remoto-disputa-resumo-1366.png), [Jogadores da disputa](remoto-disputa-jogadores-1366.png).

Capturas inspecionadas pelo agente. Círculos verde/vermelho, check/X branco e anel original preservados; AVG apósSLD com duas casas. São evidências de execução, não referência de design. Nenhum aceite humano ou revisão independente é alegado.

Observação encontrada na inspeção: o acesso direto de Jogadores herda a fase regular do parser antigo, enquanto Limpar filtros considera Todos o inicial. A decisão sobre a abertura foi apresentada ao responsável; a correção dependente aguarda resposta e não altera os cálculos.

## Resultado consolidado

[CI45731786815](https://github.com/renato-lucindo/next/actions/runs/45731786815), SHA7f18cae1a86cf617af962f5a2fc7ba55903e8c30: SUCCESS em todos os jobs, incluindo validate;859unitários,927Chromium e44WebKit, com125dispensas mobile preexistentes. [Registro final](verificacao-final.json) vincula fonte, versões, smoke e teste remoto. O código executável é idêntico ao runtime5bdb298 dos Workers; a diferença é teste/documentação. Rechecados health200, proteção401/403,12assets porSHA256 e deployments dos três Workers, incluindo o fixo preservado. Encerramento documental não requer republicar UI nem repetir inspeções de artefatos inalterados.
