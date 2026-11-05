# Validação — refinamento de Estatísticas dos Jogadores

Unidade `codex/estatisticas-jogadores`, baseada em main5d028e5. Pedido e plano explícitos de05/11/2026. Escopo restrito à página de Jogadores e sua projeção de consulta. SHA/PR/CI e publicação efetiva ficam no [checkpoint](../PROGRESSO.md).

## Implementação

- Padding horizontal14/10px, altura compacta, colunas pelo conteúdo e excesso de largura depois delas. Nomes longos quebram; rolagem permanece interna.
  -30linhas por página; tabela → paginação → legenda. Formulário avançado ausente nas disputas exclusivamente de súmula; navegação deixa de depender da existência do formulário.
- Maior falta positiva por coluna F/T/U/5F/GD no conjunto filtrado inteiro antes de paginar. Empates preservados, zero/ausência sem destaque; comparação continua com menos faltas como melhor desempenho.
- Camisa modal por pessoa/inscrição nos fatos publicados do recorte, incluindo DNP;0/00 distintos e empate exibe todas as modais. A agregação compartilhada mantém o histórico completo e as participações/cálculos anteriores. Os contratos atuais de publicação exigem camisa válida; o contador ignora valores ausentes sem inventar número.
- Legenda somente com siglas visíveis e nova definição de PP%. Os cinco textos de rodapé e todo o painel de cobertura foram removidos. Cobertura interna continua no DTO/cálculos e ausência continua —.

`pageSize` aceita20/30; ausência ou valor fora da allowlist usa20. O novo cliente sempre solicita30; somente esse opt-in acrescenta `hasBoxscore`, computado antes de recortes/consulta/paginação sobre a fonte completa. Validação do DTO verifica tamanho, total, última página e presença dessa capacidade. Rota mantida, sem migrations. Equipes, perfil e súmula não receberam alterações.

## Verificações e revisão

- RED inicial: quatro casos falharam pelas lacunas reais de tamanho/capacidade, negrito e camisa modal. GREEN focal:15testes dos três arquivos; depois ampliado a cinco casos novos, incluindo T/U/5F/GD, empates e cobertura indisponível.
- Browsers afetados:57PASS/7skips mobile preexistentes (`statistics-simple`), quatro arquivos, desktop/mobile. Controles sem formulário,30+3linhas, recarregar/ordenar/filtrar, retorno do perfil com consulta e duas rolagens, comparação e opções avançadas nas fontes com boxscore.
  -1366×768/1920×1080,390×844/320×844, texto200% e viewport equivalente a zoom200% (683CSSpx). Teclado, foco e axe nas quatro larguras; não equivale a certificação WCAG nem a ensaio com todas as tecnologias assistivas.
- Adicionais:4PASS de capturas finais,2PASS de retorno à última página,2PASS de seletor de colunas sem formulário e10PASS de fidelidade/seletores/Arial200% em320px, sem skips novos.
- Gate consolidado exit0:704unitários/146arquivos, transporte11, banco isolado13, Worker/HTTP30, PDF/workerd1, lint/formato/tipos/build/fronteira cliente/segredos PASS. Logs locais `.preview-artifacts/players-gate.log` e browsers `players-browser-validated.log`/`players-captures-final.log`.

Aplicadas `ui-ux-pro-max` (consulta específica de tabelas/legibilidade) e `web-design-guidelines` com [fonte atualizada](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) em05/11. Revisão do autor, sem parecer independente. Pontos revistos/corrigidos:

- `src/statistics/public-page.tsx`: paginação antes da legenda, ausência do formulário não bloqueia a navegação; capacidade não depende da página filtrada.
- `src/statistics/reference/scoresheet-statistics-table.tsx`: definição longa de PP% pertence à descrição (`dd`), preservando sigla curta (`dt`). A primeira tentativa de rótulo longo provocou2px de overflow em320px desktop e foi corrigida; regressão passou sem mascarar overflow.
- `src/statistics/reference.css`: padding14/10 somente na tabela dessa página; sem distribuição da largura excedente.

Fixtures de testes avançados passaram a incluir um boxscore real de teste: correção de contexto e nomes distintos na fixture, sem simular `hasBoxscore` artificial. Falhas intermediárias de expectativas/foco/nome acessível foram diagnosticadas e corrigidas. Nenhum skip novo ou timeout aumentado.

## Entrega e limites

Capturas usam fixtures interceptadas, não dados humanos. [1366](evidencias/jogadores-refinamento/jogadores-1366.png), [1920](evidencias/jogadores-refinamento/jogadores-1920.png), [390](evidencias/jogadores-refinamento/jogadores-390.png), [320](evidencias/jogadores-refinamento/jogadores-320.png), [texto200%](evidencias/jogadores-refinamento/texto-200.png) e [viewport equivalente a zoom200%](evidencias/jogadores-refinamento/zoom-200.png).

Autorização de publicação restrita ao Worker independente **base-do-basquete-next-uiux**. Domínio principal, Worker canônico, Access, banco e dados humanos preservados. Não alegar deploy até existir versão/fonte e prova remota no checkpoint. Sem novo boxscore, comparação ou recordes; os recursos já existentes são apenas preservados.
