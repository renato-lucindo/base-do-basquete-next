# Implementação do perfil aprovado v9

Unidade existente: PR79, branch codex/perfil-atleta-aprovado, base a55dd7c, HEAD inicial f238e7a. Autorização direta de 11/11/2026 para implementar a v9 e melhorar Histórico de equipes. Manter PR aberta, sem merge/auto-merge. Autorização anterior de atualizar o mesmo Worker de preview permanece; preservar proteção, outros Workers e dados.

## Arquitetura e limites

React/TypeScript sobre loadPublicCareer e contratos públicos existentes. Separar estado de URL, componentes de apresentação e página. Siglas vêm de game.home/away.team.abbreviation, com nome publicado na ausência. Idade usa apenas publicBirthYear já publicado; não consultar data privada, alterar banco ou inventar códigos. Placar só é aceito quando resultado/disputa/versão/publicação coincidem com a participação. Preservar carregamento completo, rejeição de páginas inconsistentes e cancelamento.

1. [x] Estado de quatro abas e filtros independentes, URLs antigas compatíveis, expansões e trajetória persistidas. Provas focais de leitura/serialização e idade pública.
2. [x] Composição v9: resumo branco e quatro marcas na Visão geral; recordes em Carreira; Ver jogos com 12 por página e painel de filtros; estatísticas Ano/Idade/Campeonato, modo segmentado, legenda final curta. Reutilizar tooltip/catálogo e controles do produto.
3. [x] Confronto único clicável, placar validado compartilhado, nomes completos desktop/siglas mobile, nome completo em estatísticas. Conquistas no topo à direita desktop e em Carreira mobile.
4. [x] Trajetória de equipes mais recente primeiro, ponto e segmentos por item: primeiro sem segmento acima, último sem segmento abaixo; linha termina no centro dos pontos. Um único item não recebe linha. Nomes completos, anos separados e links reais.
5. [ ] Adaptar testes de comportamento antigo para abas sem retirar provas de privacidade, carregamento, erro/retry, ordenação, ausências e retorno. Verificar 320/390/1366/1920, teclado/toque, zoom real quando suportado e fonte/targets efetivos.
6. [ ] Atualizar documentação vigente/checkpoint, gate proporcional real (perfil ainda exige completo), revisão e CI do SHA publicado. Atualizar mesma PR e Worker protegido; smoke e capturas; manter PR aberta.

## Evidência e continuidade

Referência imutável: outputs/perfil-jogador-mobile-v9 deste chat, ZIP SHA256 8c45e056220fc37ca6a4b460dd080dfa894e92b2b66cec9fc6ad982eec99a962. Protótipos anteriores preservados. Intermediários/test-results/TEMP pesados na recuperação devido ao espaço variável de C:. Não executar limpeza recursiva nem alterar o sistema. Manter checkpoint deste chat e docs/PROGRESSO.md com estado observado. Durante CI pendente, acompanhar pela mesma automação; cota de 15% restante segue CONTRIBUTING.md.
