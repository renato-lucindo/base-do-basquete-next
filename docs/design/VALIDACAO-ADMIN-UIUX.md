# Validação — administração UI/UX

04/11/2026, branch `codex/admin-uiux`, base main9b06df88a6d34c12e480d435a03e1be617d69d85 após PR53 e CI do merge41882067210/job126756801609 SUCCESS. SHA/CI atuais em [PROGRESSO.md](../PROGRESSO.md). Somente fixtures nos browsers e PostgreSQL isolado nos testes de banco; sem dados humanos nas capturas.

## Resultado

Jogos conserva a tabela semântica e ganha Nº como primeira coluna, ordenação única por cabeçalho com button/aria-sort/seta ativa e consulta autoritativa antes da paginação. Textos à esquerda e número à direita, largura pelo conteúdo, excesso depois das colunas e rolagem interna. Busca/ordem/página e posição permanecem ao fechar o editor. Falha ao ordenar limpa linhas antigas, não finge estado vazio e oferece nova tentativa. Mudança de busca/ordem reinicia a página; requisições antigas são canceladas/descartadas.

Informações deixa Categoria limitada a200px no desktop; Naipe160px, Divisão220px e Ano120px continuam proporcionais. Valores de até80 caracteres e contratos de salvamento não mudam. Reflow preserva rótulos e campos.

Equipes usa dois painéis30/70 no desktop; inscrição selecionada por registrationId, sem fundir inscrições da mesma equipe. Estado inicial discreto. Celular mostra elenco com retorno que restaura filtro/página/rolagem/foco da lista. Componentes existentes de pessoas, transferências, reuso, desistência e exclusão preservam guardas, comandos, ACK, conflitos e reautenticação. Retirado título duplicado do painel; identidade global permanece disponível quando diferente do nome da inscrição.

## Banco e segurança

Nova migration `20261104182151_admin_game_ordering.sql`, gerada via Supabase CLI3.0.0 `migration new`. Uma função `public.list_games_ordered(uuid,text,integer,text,text)`, STABLE SECURITY INVOKER/search_path vazio. EXECUTE somente authenticated, respeitando RLS/admin_access existentes. Consulta legada intacta, sem overload ambíguo. Valida campo/direção/offset/busca; ordem antes do recorte20/hasMore. Números naturais por segmentos até40 caracteres, sem cast que estoure; ausentes no fim nas duas direções, desempate por ID. Textos usam lower e collation C; não é mudança da normalização da busca global.

**NÃO aplicada**. Operação preparada para autorização específica somente no `base-do-basquete-next-dev`/`nizmasjddyrhmevvfviz`: uma função e privilégios, sem DML, tabela, coluna, índice, extensão ou alteração de publicação. SQL UTF8/LF SHA256 **79b3a8e7420147abbe609526d766bd8e04d1aec0673892611d19619f18967402**. Migrations anteriores imutáveis. Metadados do alvo e RLS conferidos; função nova ausente. Baseline advisors:4 RLS sem política,3 achados SECURITY DEFINER anon+3 authenticated, alerta prévio de senhas vazadas,11 FKs sem índice,59 índices não utilizados. Nenhuma configuração alheia corrigida nesta unidade. Sem deploy/Access/seeds/publicação.

## Evidências

- RED SQL: função ausente; RED provider: operação ainda chamava RPC antiga. Após implementação,14PASS SQL/provider. SQL cobre35 jogos, paginação completa, 00/2/10/A2/A10/número40 caracteres, ausentes em date/time/venue nas duas direções, empates/ID, campo/direção/offset inválidos, anon negado e não-admin sem linhas. Preparação pesada em beforeAll; nenhum timeout ampliado.
- Workerd focal1PASS com rota autenticada/DO/provider, nova RPC e parâmetros fechados; caminhos inválidos recusados. Uma execução inicial usava Worker compilado antigo; recompilado pelo script oficial antes da prova válida.
- Browsers iniciais38PASS/3skips prévios e um teste antigo incompatível com painel mobile; ajustado o percurso por Voltar às equipes, sem desativar verificação. Revisão seguinte28PASS/10skips prévios. Casos finais de layout/zoom/guardas/retorno12PASS; transferências/desistências/exclusões e novos fluxos55PASS/5skips prévios. Nenhum skip novo nesta unidade.
- Capturas320/390/1366/1920, nomes longos, texto200%, rolagem interna e axe. O teste reinicia o documento entre larguras para não carregar o zoom/seleção do cenário anterior. Gate consolidado PASS:699 unitários/145 arquivos, transporte7, banco isolado13, Workerd30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos. Log local `.preview-artifacts/admin-gate.log`, execução encerrada com código0. Regressão adicional de jogos/campeonato/equipes/demais telas:44PASS/14skips prévios, log `.preview-artifacts/admin-regression-browser.log`; não confundir com CI remota.

## Revisão

Aplicadas ui-ux-pro-max, Supabase, Workers best practices e Wrangler para build dry-run. [APG tabela ordenável](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/) e [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) atualizadas consultadas em04/11. Tema/protótipo/padrões locais prevalecem. Revisão do autor, sem ferramenta de subagente ou parecer independente; axe não comprova WCAG integral.

Achados corrigidos: games/workspace.tsx (linhas antigas sob nova ordenação após falha; retry/aria-busy), teams/screen.tsx (título repetido e contexto mobile), teams/screen.css (reflow e retorno sem ocultar o título do contexto), competition/compact.css (Categoria elástica e tabela100%). A restauração do foco usa window.document para não colidir com função local document. Estado de busca administrativa permanece em memória, evitando colocar termos privados na URL; não promete restauração após reload/logout. Datas conservam representação civil brasileira existente, sem criar horário/timezone novos.

## Capturas

[Equipes1366](evidencias/admin-uiux/admin-after-equipes-1366.png), [Jogos1920](evidencias/admin-uiux/admin-after-jogos-1920.png), [elenco390](evidencias/admin-uiux/admin-reform-equipes-390.png), [reflow320/texto200](evidencias/admin-uiux/admin-reform-equipes-320-text200.png), [Informações1920](evidencias/admin-uiux/admin-reform-informacoes-1920.png), [jogo com nomes longos1366](evidencias/admin-uiux/admin-reform-jogos-1366.png). São fixtures, sem aceite humano de produção ou prova de gravação remota.

Revisão por arquivo/linha: games/workspace.tsx:1095 (aria-sort), :189 (limpeza de coleção/cancelamento), :435 (restauração de foco/posição); teams/screen.tsx:710 (guardas da seleção), :781 (retorno com guarda); teams/screen.css:46 (30/70 e reflow), competition/compact.css:328 (campos proporcionais). Sem achado bloqueante aberto na revisão do autor; cobertura remota/autenticada e desempenho em volume real não foram comprovados.
