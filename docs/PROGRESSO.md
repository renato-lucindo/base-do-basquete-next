# Progresso atual

Atualizado em 22/11/2026. Estado observado nesta unidade; histórico não autoriza execução.

## Limpeza das referências de design

- Branch `codex/limpeza-referencias-design`, baseada em `origin/main` `824a3d59da5323202d869a4d93a1038bcd377044`, em worktree próprio. Nenhuma PR estava aberta na consulta inicial.
- Retirados 170 arquivos de referências antigas de `docs/design/`; preservados em `historico/documentacao/design/`, com uso restrito a rastreabilidade e regressão técnica. Índices, comentários de proveniência, runners e caminhos de CI ajustados. ZIPs e seis fontes originais conferidos por hash.
- Fontes vigentes: design system, catálogo aprovado, padrões comuns e da área. Legenda estatística explicitamente aberta. Escala anterior removida da orientação tipográfica. [Inventário e limites](design/LIMPEZA-REFERENCIAS.md).
- Verificação observada: `npm run design:verify` PASS; 10 testes Chromium de compatibilidade histórica/controles/reflow PASS; 751 links Markdown conferidos, sem novos links quebrados. Gate consolidado PASS: 828 testes Vitest, 16 contratos SQL, 19 testes de transporte, 35 testes Worker e teste PDF/workerd. Pacote de arquitetura (67 verificações) e 141 regressões de skills PASS. CI remota ainda não publicada. O protótipo HTML desta conversa foi corrigido e suas verificações focais passaram.
- Próximo passo: publicar a PR da unidade e conferir CI do SHA publicado. Merge permanece pendente.

## Main e serviços

- Base real consultada: merge da PR #87 em `824a3d5`; PRs abertas: nenhuma. Não atribuir esse estado aos checkpoints anteriores.
- Esta unidade não consultou a versão em serviço, aplicou migrations, publicou dados nem fez deploy. O último relato de cada serviço e as pendências anteriores estão no checkpoint arquivado; não são prova de nova execução.
- Checkout original `sync/trabalho-casa` preservado, com edição humana de `CONTRIBUTING.md`, `skills-lock.json` e instalação local de `web-design-guidelines`. Outros worktrees não foram modificados.

## Continuidade

O [checkpoint anterior completo](../historico/progresso/2026-11-22-antes-limpeza-referencias-design.md) conserva contexto único das unidades anteriores. Substituir o resumo desta unidade ao concluir; detalhes de comandos e CI ficam na PR. Regras de cota/retomada em [CONTRIBUTING.md](../CONTRIBUTING.md).
