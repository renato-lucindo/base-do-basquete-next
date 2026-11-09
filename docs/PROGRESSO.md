# Progresso atual

## PR75 — rascunho privado de jogos — 09/11/2026

Unidade `codex/campeonato-flexivel`, [PR #75](https://github.com/renato-lucindo/base-do-basquete-next/pull/75) aberta/draft, sem merge. O código implementa visibilidade `draft/published`, autorização no Worker, auditoria e filtros públicos; jogos já finalizados preservam súmula e resultado histórico. A última fonte **anterior ao ajuste do nome da migration**, `8ac5701c`, obteve [CI 42648999569](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42648999569) integralmente SUCCESS (7 jobs). A migration agora tem o nome exato do histórico remoto; conferir CI atual antes de considerar o HEAD validado.

**Banco de desenvolvimento compartilhado:** projeto `base-do-basquete-next-dev` (`nizmasjddyrhmevvfviz`), migration `20261109163216_game_draft_visibility` aplicada em 09/11/2026 sob autorização específica do responsável. Verificações: tabelas e funções presentes, zero mudanças de visibilidade, `anon` sem EXECUTE para leitura administrativa ou escrita, advisors sem novas categorias. Os alertas de segurança que permanecem já estavam presentes antes desta migration. Nenhuma DML, alteração de Auth, segredos ou Access.

**Jogo real preservado:** Copa ES Sub-15, disputa `b5433b13-a8f9-4baa-b4d9-08066ebf3e96`, semifinal `62d99b70-21c9-495f-b0d7-44c0f53b4380` — IVV/Cetaf 88 x 35 Saldanha da Gama, `finished`, jogo v3, publicação v1, sem mudança de visibilidade. São 26 jogos classificatórios cadastrados de 30 esperados; a partida não foi convertida em rascunho, por exigir autorização posterior específica.

**Worker:** ambiente isolado autorizado `base-do-basquete-next-pr75`, com Access e secrets preexistentes. Última versão remota confirmada `f8f2ad0c-f6d5-4298-baeb-b420f9e227b4`, de 08/11; código novo **ainda não implantado**. A conexão Cloudflare disponível não oferece build conectado ao repositório, e o pacote Wrangler contém Worker de ~3,7 MiB e assets: não atualizar o script parcialmente, não mexer no `base-do-basquete-next-preview` (rota de `basedobasquete.com.br`) nem nas outras instâncias. O release isolado exige a cadeia existente de build, upload e deploy via Wrangler com ambiente/credenciais protegidos. Nenhum deploy de produção autorizado.

**Limites antes do aceite:** rascunho é ativado depois do primeiro salvamento do jogo; o leitor legado de classificação retorna vazio para disputas com rascunhos, como proteção conservadora contra agregados antigos. Validar UX e derivados antes da integração. Não fazer merge da PR75 e não tocar nos jogos reais sem autorização.

Referência do bracket/preview anterior: [evidências de 08/11](evidencias/2026-11-08-bracket-eliminatoria.md), incluindo hash dos 35 assets e proteção Access. Preservar trabalho humano e não reexecutar publicação apenas porque a CI passou.
