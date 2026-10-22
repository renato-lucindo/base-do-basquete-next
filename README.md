# Base do Basquete — nova implementação

Projeto novo, especificado exclusivamente pelo pacote de 22/10/2026 em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/`. Nenhum repositório ou banco anterior foi consultado.

A primeira entrega é um protótipo navegável com dados fictícios para avaliar os três percursos de `docs/EXPERIENCIA.md` do pacote. A integração real depende dessa avaliação.

## Executar

Node 24 ou superior. `npm ci --ignore-scripts` e `npm run dev` (http://localhost:5173). O protótipo salva somente neste navegador. Não informe dados reais nem senhas. Não há autenticação ou publicação real nesta etapa.

`npm run gate` verifica lint, formatação, TypeScript, testes, build e segredos. `npm run test:e2e` percorre o protótipo em navegador; requer Chromium do Playwright (`npx playwright install chromium`). O harness original tem instalação e comandos independentes, descritos no README do pacote; não altere seus insumos.

## Acompanhar

- `docs/PLANO-PROTOTIPO.md`: unidade e critérios.
- `docs/PROGRESSO.md`: checkpoint e próximo passo.
- `docs/VALIDACAO-PROTOTIPO.md`: roteiro e evidências da apresentação.
- `docs/decisoes/001-prototipo-local.md`: limites e evolução para o monólito full-stack.

Os documentos originais mantêm sua autoridade de especificação. Documentos deste repositório registram execução e decisões, sem substituir contratos do pacote.
