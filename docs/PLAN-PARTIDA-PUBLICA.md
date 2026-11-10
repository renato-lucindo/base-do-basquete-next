# Página pública da partida aceita

**Objetivo:** implementar o protótipo aceito em 10/11/2026, com camisas 00 por último, parciais sem faltas e legenda compartilhada com 2P/3P separados.

**Abordagem:** adaptar a página React existente, reutilizando cabeçalho, navegação, escala e definições das outras páginas. Uma consulta optativa expõe somente recortes e faltas da versão imutável já publicada. O RPC legado e os snapshots permanecem intactos. Fontes sem detalhe conservam cobertura ausente.

**Escopo:** elencos com 12 linhas, preenchimento cinza sem dados, DNP com apresentação normal; máximos positivos independentes em PTS/2P/3P/LL; filtros sincronizados e cronologia de cinco faltas/GD. O responsável confirmou que participação desconhecida no quarto permanece —. Titular comprova presença somente no primeiro quarto; um evento individual comprova presença naquele período; a falta de evento não comprova ausência. Nenhuma gravação de participação nova.

**Fora do escopo:** deploy, publicação de dados, seeds remotos, novos formulários e mudanças nos cálculos oficiais.

## Execução e verificação

- [ ] Centralizar comparação de camisas (0, 1…99, 00; ausentes depois), aplicar nos consumidores públicos/admin e documentar a regra. Testar ordenação e preservação de identidades.
- [ ] Criar consulta de leitura por versão publicada, contrato estrito e testes SQL isolados de privacidade, recortes, revisão e cronologia. Não expor documento, IDs internos, razões ou rascunho.
- [ ] Adaptar a página e detalhes acessíveis, reutilizar definições de métricas; comprovar máximos/empates, DNP/zero/ausência, preenchimentos, filtros, totais e fallback PDF/legado.
- [ ] Conferir 1366/1920/320/390, zoom 200%, teclado/toque e axe; rodar gate e consumidores afetados, registrar resultados reais e abrir uma PR para main.

## Estado inicial

Base origin/main 903dc9c. Branch codex/partida-publica em worktree isolado. Checkout principal sync/trabalho-casa e alterações humanas em CONTRIBUTING.md/skills preservados. PR75 independente permanece draft. Nenhum deploy autorizado nesta unidade.
