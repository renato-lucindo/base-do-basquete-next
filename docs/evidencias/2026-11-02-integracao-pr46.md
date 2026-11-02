# Integração da PR #46 após a PR #38

Em 02/11/2026, o responsável pediu executar todas as etapas de atualização, validação e integração da PR #46. A autorização de merge está vigente; não equivale a declarar aceite visual humano nem autoriza nova publicação de serviços ou SQL.

## Composição e preservação

Branch existente codex/implementacao-publica, HEAD de origem a74584a32189f9ce42bdde5a3cd27eee0be4f8bd. Main afe95a52ab1d357e0078f20cd169a8f62e7b4ec1 incorpora a PR #38 com CI integrada 41523717012 SUCCESS. Worktree de integração destacado exclusivo, sem trocar a branch do worktree antigo ou sobrescrever sua edição de PROGRESSO.

Merge explícito da main encontrou conflito textual somente em PROGRESSO. O checkpoint antigo da PR foi preservado em historico/progresso/2026-11-02-pr46-antes-integracao.md e substituído por síntese vigente. O merge automático de contract.ts gerou duas declarações de actualClock e regras antigas de metadados que a main já ampliou para escrita de horários reais. Foi mantido integralmente o contrato de jogos da main: data/calendário/duração e campos estritos, leitura compatível, horários opcionais também nos comandos. A regressão de Jogos da PR usa o campo atual Hora de início e verifica que editar apenas o local preserva startAt, endAt e hora da agenda; não retirar a funcionalidade da PR #38 para satisfazer uma asserção histórica.

Os demais arquivos da implementação pública permanecem sem alteração funcional em relação ao HEAD da PR. As provas anteriores de fidelidade não são tratadas como prova da composição nova; os testes públicos, Jogos e CI são executados para ela. Unitários focais de jogos/providers, arbitragem, publicação e estatísticas: 46 PASS/6 arquivos. Resultados de browsers, gate e CI do candidato final serão registrados na PR e no checkpoint.

## Navegador e limites

A visita ao preview protegido da PR #46 nesta retomada exigiu novo login no Cloudflare Access. A proteção foi mantida; solicitado login ao responsável. Não extrair/copiar sessões ou criar credenciais temporárias para essa verificação. A prova local usa fixtures descartáveis; resultado de login remoto e avaliação visual devem ser registrados conforme efetivamente ocorrerem. A autorização de integração não é descrita como um aceite visual humano fictício.

Nenhum deploy, migration, DDL, DML, seed ou alteração em dados humanos nesta integração. Os previews da PR #46, PR #38 e compartilhado permanecem nas publicações anteriores. A validação da composição usa os contratos atuais da main; não modificar migrations aplicadas ou snapshots públicos para compatibilizar apresentação.

## Validação focal da composição

Playwright em desktop/mobile: 42 PASS/0 SKIP, em 48,8 s, cobrindo Jogos, apresentação pública, fidelidade ao protótipo e acessibilidade pública. Inclui filtros/equipes/colunas/ordenação, foco/Escape, detalhes de faltas, identidade fixa, rolagem interna, 320 px e texto 200%. Capturas locais de súmula desktop e estatísticas mobile inspecionadas: nomes longos legíveis, tabelas lado a lado no desktop e identificação preservada no mobile, sem transbordamento global. Não equivale a aceite visual humano ou WCAG integral. Gate consolidado em andamento; aguardando login Access para a conferência remota atual.

Gate consolidado PASS, exit 0: 647 unitários/131 arquivos, 6 transportes, 13 contratos PostgreSQL descartáveis, 27 Workerd, quatro PDFs/runtime, lint/formato/tipos/builds, fronteira e scanner (962 arquivos). Log ignorado .preview-artifacts/pr46-integration-gate.log. Candidato será enviado à mesma PR; CI do novo SHA ainda pendente. Autorização para integração recebida, sem alegar aceite humano das capturas de fixtures.
