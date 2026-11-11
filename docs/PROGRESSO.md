# Progresso atual

Atualizado em 11/11/2026. Unidade única: perfil do atleta, branch codex/perfil-atleta-aprovado, [PR79 aberta](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), sem merge ou auto-merge. O responsável aprovou o HTML v9 e autorizou implementá-lo na mesma PR, melhorando o Histórico de equipes para que a linha não ultrapasse os pontos.

## Implementação v9

- Quatro abas: Visão geral, Estatísticas, Carreira e Ver jogos. Resumo branco e quatro marcas na primeira aba; conquistas à direita da identificação no desktop; recordes completos e trajetória em Carreira. Colunas superiores e inferiores alinhadas com divisória fina.
- Confrontos como um único link real para a partida, incluindo data/contexto/PTS na lista. Equipes fora de confrontos continuam levando à equipe. Nomes completos no desktop, siglas cadastradas no mobile e nomes completos nas estatísticas em todas as larguras. Data DD/MM/YYYY, campeonato sem repetir ano e placar em grafite; marca em azul.
- Ver jogos com 12 atuações por página e filtros Ano/Campeonato/Equipe/adversário no mesmo modal das estatísticas. Preparação, Aplicar, Cancelar e Limpar; filtros independentes, retorno e paginação preservados na URL. Estatísticas com Ano/Idade/Campeonato/J e Total/Por jogo. Idade usa somente o ano de nascimento já publicado; coluna integralmente ausente sem esse dado.
- Trajetória agrupada por equipe, com anos separados e segmentos entre os centros dos pontos; primeiro sem linha acima, último sem linha abaixo e item único sem linha. Legenda única final e tooltips curtas do catálogo; Evolução permanece fora do escopo.
- Arquitetura e escopo em [PLAN-PERFIL-V9.md](PLAN-PERFIL-V9.md); regras vigentes em [PUBLICO.md](design/PUBLICO.md). Sem alteração de API, banco, dados, Auth/Access ou dependências.

## Verificação em curso

Vitest focal: 13 testes em três arquivos PASS; lint focal e build público PASS. Rodada final de browsers: 54 cenários desktop/mobile PASS, com 320/390/1366/1920, alinhamento, extremos da trajetória, dados ausentes, nascimento público, filtros, teclado e retorno. Toque emulado confirmou alvo de expansão mínimo de 44 × 44 px após ajuste da coluna; voltar/avançar e rejeição de placar de outra publicação também PASS. Typecheck focal de todos os arquivos TS/TSX alterados PASS. CI do código v9 ainda pendente: provas da versão anterior não validam esta revisão.

O gate local foi tentado e interrompido no teste de CLI Git em pasta temporária UNC: dez casos PASS e um erro de ambiente “not in a git directory”. Typecheck local também encontrou falta de memória do sistema, sem resultado conclusivo. Não foram alterados testes, timeouts ou sistema para contornar esses limites. Gate e browsers completos continuam obrigatórios na CI.

## Serviço, preservação e próximo passo

Worker anterior preservado: https://base-do-basquete-next-pr79.renato-lucindo-jr.workers.dev, fonte fc276b3f50d913bd43014938206d90d0bf205406, versão 4efd167c-7778-429e-82a2-04bfd7aaaf48. Ainda não recebeu a v9. Autorização anterior permite atualizar somente este preview, preservando proteção e demais Workers.

Worktree da unidade em work/perfil-atleta-produto do chat perfil-jogador-prototipos; checkout humano sync/trabalho-casa e suas três mudanças preexistentes preservados. HTML v9 e capturas anteriores preservados, ZIP de referência SHA256 8c45e056220fc37ca6a4b460dd080dfa894e92b2b66cec9fc6ad982eec99a962. Intermediários em //es-rdc01/recover/Codex-Worktrees/perfil-atleta-pr79-intermediarios; sem limpeza recursiva ou alteração do sistema.

Próximo passo: concluir verificações e revisão, publicar a atualização na mesma PR, observar CI do HEAD real, atualizar o mesmo Worker protegido e produzir novas capturas/relatório. Deixar PR aberta. A espera por CI usa a mesma automação concluir-perfil-do-atleta-e-worker-pr79 conforme CONTRIBUTING.md. [Resumo anterior preservado](../historico/progresso/2026-11-11-antes-perfil-v9-produto.md).
