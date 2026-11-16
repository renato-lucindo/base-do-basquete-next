# Progresso atual

Atualizado em 11/11/2026. Unidade única: perfil do atleta, branch codex/perfil-atleta-aprovado, [PR79 aberta](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), sem merge ou auto-merge. O responsável aprovou o HTML v9 e autorizou implementá-lo na mesma PR, melhorando o Histórico de equipes para que a linha não ultrapasse os pontos.

## Implementação v9

- Quatro abas: Visão geral, Estatísticas, Carreira e Ver jogos. Resumo branco e quatro marcas na primeira aba; conquistas à direita da identificação no desktop; recordes completos e trajetória em Carreira. Colunas superiores e inferiores alinhadas com divisória fina.
- Confrontos como um único link real para a partida, incluindo data/contexto/PTS na lista. Equipes fora de confrontos continuam levando à equipe. Nomes completos no desktop, siglas cadastradas no mobile e nomes completos nas estatísticas em todas as larguras. Data DD/MM/YYYY, campeonato sem repetir ano e placar em grafite; marca em azul.
- Ver jogos com 12 atuações por página e filtros Ano/Campeonato/Equipe/adversário no mesmo modal das estatísticas. Preparação, Aplicar, Cancelar e Limpar; filtros independentes, retorno e paginação preservados na URL. Estatísticas com Ano/Idade/Campeonato/J e Total/Por jogo. Idade usa somente o ano de nascimento já publicado; coluna integralmente ausente sem esse dado.
- Trajetória agrupada por equipe, com anos separados e segmentos entre os centros dos pontos; primeiro sem linha acima, último sem linha abaixo e item único sem linha. Legenda única final e tooltips curtas do catálogo; Evolução permanece fora do escopo.
- Arquitetura e escopo em [PLAN-PERFIL-V9.md](PLAN-PERFIL-V9.md); regras vigentes em [PUBLICO.md](design/PUBLICO.md). Sem alteração de API, banco, dados, Auth/Access ou dependências.

## Validação concluída

CI [43117734778](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43117734778), HEAD 893939cd31828d1128545523423ecae430f4de62, completed/success: gate completo com 814 unitários/173 arquivos, transporte19, banco15, Worker35 e PDF1; browsers 475 + 357 PASS/118 skips preexistentes; WebKit42, design e validate PASS. Nenhum novo skip, retry ou timeout. O commit posterior de registro altera apenas documentação; seu resultado vigente fica nos checks da PR e em ci-registro.json do pacote local, conferidos antes da entrega.

Provas focais: 13 unitários, 54 cenários da composição, oito Axe das quatro abas, quatro de ordenação/descoberta e dez repetições da sincronização de placar PASS. Incluem 320/390/1366/1920, dados ausentes, nascimento público, filtros, retorno, teclado, toque e alvos de 44 × 44 px. Typecheck focal e build público PASS. O relatório preserva as falhas anteriores, causas e limites locais; não as trata como aprovações.

O gate local foi tentado e interrompido no teste de CLI Git em pasta temporária UNC: dez casos PASS e um erro de ambiente “not in a git directory”. Typecheck local também encontrou falta de memória do sistema, sem resultado conclusivo. Não foram alterados testes, timeouts ou sistema para contornar esses limites. Gate e browsers completos continuam obrigatórios na CI.

## Serviço, preservação e próximo passo

Worker https://base-do-basquete-next-pr79.renato-lucindo-jr.workers.dev atualizado para fonte 8f7b38d148d4fa6ddeb2ea711acc0d6737fd4938, versão 80e95d3b-9a4f-45c7-a418-d8c6d4ac367e, deployment abab63fd-a7e9-4687-ab2e-a702764da3ce. Smoke remoto PASS: 36 arquivos 200/29 hashes exatos, dez estados geométricos, sete percursos, 26 capturas, teclado/toque e zoom real 200% (1366 → 683 px, DPR 2). Oito outros Workers, sete aplicações Access e os bindings do preview inalterados. Sem operação de banco, dados, Auth/Access ou produção. [Evidências e limites](VALIDACAO-PERFIL-V9.md).

Worktree da unidade em work/perfil-atleta-produto do chat perfil-jogador-prototipos; checkout humano sync/trabalho-casa e suas três mudanças preexistentes preservados. HTML v9 e capturas anteriores preservados, ZIP de referência SHA256 8c45e056220fc37ca6a4b460dd080dfa894e92b2b66cec9fc6ad982eec99a962. Intermediários em //es-rdc01/recover/Codex-Worktrees/perfil-atleta-pr79-intermediarios; sem limpeza recursiva ou alteração do sistema.

Logs da CI43089383243 recuperados após o reset comprovaram uma corrida no próprio teste: o conteúdo de Últimos jogos foi capturado antes do carregamento do placar (— → 2 × 0). O teste passou a aguardar o placar publicado conhecido antes da comparação. A correção foi validada pela CI completa acima; nenhum código do produto mudou e não houve novo deploy. Startup_failure e downloads HTTP502 anteriores ficam no histórico, separados da causa do teste.

Entrega local em outputs/implementacao-perfil-v9 do chat perfil-jogador-prototipos: relatório, evidências JSON, 26 capturas do smoke, duas capturas reais com placares carregados e duas demonstrativas da trajetória com equipes fictícias, além do ZIP e manifesto de hashes. Revisão pelo implementador; sem novo parecer independente declarado. PR destinada ao aceite do responsável, aberta e pronta após conferir os checks do HEAD. Não fazer merge ou novo deploy por documentação/testes. A automação concluir-perfil-do-atleta-e-worker-pr79 deve ficar pausada ao terminar a entrega. [Resumo anterior preservado](../historico/progresso/2026-11-11-antes-perfil-v9-produto.md).
