# Progresso atual

Atualizado em 10/11/2026. Unidade ativa: lista pública de Jogos, com protótipo aceito e PR77 aberta. Pedido posterior autorizou publicar somente um Worker PR77 sem Access. Merge, deploy no principal e publicação de dados não foram autorizados.

## Unidade e evidências

- Branch `codex/jogos-publicos-lista`, criada de `origin/main` **91f11fb** em worktree gerenciado isolado. Fonte material atual **83e8e13912687250275285e0cf16937e1cbd1a48**; inclui navegação real5133f3a, remoção de sublinhado65027da e compactação das linhas de jogadores83e8e13. Este checkpoint posterior é documental.
- Formato centralizado em todas as larguras; número/data/horário no topo, confronto, fase/série e local. W.O. em texto junto à fase. Lista completa, busca, contagem, vazio e ausência versus zero preservados. Placar agora abre jogo publicado e nomes abrem os perfis disponíveis, com IDs de equipe/inscrição explícitos e retorno preservando a busca. Catálogo público da mesma disputa confirma destinos; jogos sem publicação não recebem link de detalhe.
- Gate consolidado **PASS/exit0** na correção:805unitários/171arquivos,11política de CI,11transporte,15banco isolado,35Worker/HTTP e teste dos quatro PDFs; lint, formato, tipos, builds, fronteira cliente e segredos aprovados.52cenários de browser mais12de layout com links PASS. Desktop/mobile, teclado, cliques nos dois nomes, retorno/reload/busca, nomes longos e reflow200% verificados. [Detalhes e limites](VALIDACAO-JOGOS-PUBLICOS.md).
- Refinamentos somente CSS: nomes/placares sem sublinhado normal/hover/foco, links e foco preservados;14cenários da lista PASS e gate UI PASS. Linhas do detalhe do jogo iguais à densidade de Estatísticas:47,5px desktop e31,296875px celular, com expansão para nomes longos;14cenários de partida PASS, buildfoundation/formato/fronteira/segredos aprovados. Domínio e APIs inalterados; o gate805testes acima corresponde à fonte5133f3a.
- [PR77](https://github.com/renato-lucindo/base-do-basquete-next/pull/77) aberta; CI do novo HEAD pendente neste registro. A CI42868504280(7/7SUCCESS) comprova apenas a primeira fonte4b002626, não esta correção. Revisão pelo autor, sem parecer independente adicional. Checagem oficial desta conversa **conferir-ci-da-navega-o-p-blica-pr77**, ACTIVE/a cada10min, confirmada pela ferramenta; acompanha HEAD real e pausa ao concluir, sem avisos de estado inalterado.

## Execução e preservação

Projeto local de fixtures em http://127.0.0.1:5186/publico.html#f2200000-0000-4000-8000-000000000090?secao=jogos; Vite real em5174 para verificações automatizadas, sem banco. Worker exclusivo **base-do-basquete-next-pr77** atualizado por autorização vigente, sem Access, fonte **83e8e13**, versão **066ab789-7424-4542-a303-2a4ee314c03c**,100%. [Aba Jogos](https://base-do-basquete-next-pr77.renato-lucindo-jr.workers.dev/publico.html#b5433b13-a8f9-4baa-b4d9-08066ebf3e96?secao=jogos). Smoke atual36assets/hash/source PASS; provas de26detalhes/6perfis e privados401 reutilizadas do backend inalterado5133f3a. Sessões, limitador e segredos preservados; banco dev compartilhado, sem DDL/DML ou publicação de dados. [Evidências](evidencias/2026-11-10-worker-pr77.md).

`npm ci` foi interrompido por falta de espaço. Instalação parcial desta unidade preservada em `.preview-artifacts/npm-incomplete` após rejeição da exclusão pela política automática; dependências diretas compatíveis conferidas e reutilizadas por junction. Artefatos de execução e dependências não entram no commit.

Checkout principal `sync/trabalho-casa` preservado: alteração humana em CONTRIBUTING.md, `.agents/skills/web-design-guidelines/` e `skills-lock.json`. Nenhum outro worktree/branch alterado. Contexto único da integração anterior das PRs75/76 preservado no [histórico](../historico/progresso/2026-11-10-antes-jogos-publicos.md).

## Próximo passo

Acompanhar a CI do HEAD atual e validar humanamente a navegação na aba Jogos do Worker PR77. Controle de navegador local indisponível nas configurações Work; navegação local automatizada e smoke remoto aprovados. Pausar a checagem quando a CI terminar; não repetir deploy por checkpoint documental. Integração ou publicação no serviço principal exigem autorização própria; não iniciar branch dependente ou alterar dados de produção.
