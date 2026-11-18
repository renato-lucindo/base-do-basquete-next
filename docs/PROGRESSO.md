# Progresso atual

## Protótipo do perfil de equipe

- Unidade `codex/prototipo-perfil-equipe` baseada em `4891dc6`, com [CI aprovada na base](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43967897859). [Histórico da unidade](https://github.com/renato-lucindo/base-do-basquete-next/commits/codex/prototipo-perfil-equipe) e [CI da branch](https://github.com/renato-lucindo/base-do-basquete-next/actions?query=branch%3Acodex%2Fprototipo-perfil-equipe).
- [Protótipo offline](design/README.md#protótipo-do-perfil-público-da-equipe) com quatro abas, duas entradas e fixtures. A revisão humana do protótipo é o próximo passo. A implementação pública depende da situação oficial publicada da disputa. O estado do serviço consta no registro do perfil do atleta abaixo.
- A [PR #81](https://github.com/renato-lucindo/base-do-basquete-next/pull/81) incorpora a main em `7d9633f` com o guia visual aprovado. Verificar a CI do novo HEAD. A unidade usa worktree isolado. A edição de `CONTRIBUTING.md` e as skills locais do checkout de origem estão preservadas.

## Revisão visual do design system

- Unidade `codex/revisao-design-system` baseada em `745e964`. O [guia visual de 18/11/2026](design/catalogo/guia-completo-autonomo.html) rege alterações futuras de interface. A engrenagem recebeu contorno centralizado. O [guia de adoção](design/DESIGN-SYSTEM.md#referência-visual-aprovada-em-18112026) registra escopo e evidências.
- Escopo de referência e catálogo offline. A [PR #86](https://github.com/renato-lucindo/base-do-basquete-next/pull/86) registra o SHA integrado e os checks. A [CI de `9c6adf5`](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/44313865121) passou. A revisão seguinte reproduziu no WebKit e corrigiu o cancelamento da confirmação ilustrativa. Após o merge, incorporar a base nas PRs abertas e conferir seus checks. O checkout de origem mantém sua edição local de `CONTRIBUTING.md` e as skills pessoais. O estado dos serviços consta abaixo.

## Lista de disputas

- Unidade `codex/lista-disputas` baseada em `71b8901`. Uma disputa por linha, filtros/ordenação na consulta paginada, botão Adicionar e cadastros em diálogo. Procedimento e evidências esperadas no [plano da unidade](PLAN-LISTA-DISPUTAS.md).
- Validação local do catálogo: 8 linhas inteiras em 1366×768 com zoom a 100%. Migration de leitura `20261117204021_admin_dispute_listing` testada com PGlite. A confirmação da integração, do DEV e da publicação fica registrada na PR e no checkpoint de execução.

## Administração de disputas

- [PR #83](https://github.com/renato-lucindo/base-do-basquete-next/pull/83) integrada à main no SHA `71b8901628aefc9180c54934ebf31aa2b9364404`. [CI do SHA integrado](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/44134240291) concluída com todos os checks aprovados. Regras na [ADR 023](decisoes/023-administracao-disputas.md). Worktree da unidade preservado em `codex/administracao-disputas`. Alterações de contribuição e skills do checkout original preservadas.
- PostgreSQL 17.11 com conexões separadas confirmou o bloqueio concorrente de edição e cancelamento. A regressão da revisão cobre jogos adiados, interrompidos e decisões com versões obsoletas. DEV com as três migrations registradas como `20261117163812`, `20261117163815` e `20261117165533`. Exposição anônima anterior preservada e prévia/admin inacessíveis ao papel anônimo.
- Worker dedicado [`base-do-basquete-admin`](https://base-do-basquete-admin.renato-lucindo-jr.workers.dev/admin) publicado em 17/11/2026 com fonte `71b8901`, versão `cebc6b0f-8cea-4402-a8bf-ed8a0db3f86e` e deployment `da506319-6a5d-4943-a370-1fd537909498`. Sem Cloudflare Access por decisão do responsável, com login interno, Durable Object e segredo de sessão próprios. Banco Supabase DEV compartilhado e nenhuma rota de domínio principal. Smoke GET confirmou painel/health 200, APIs privadas 401 sem sessão e catálogo DEV 200. A validação com login real fica pendente. O preview público manteve a versão `0fffde67-41a6-42e9-bf5c-3369a0d7ffe3`.
- Próximas mudanças de administração usam este Worker. Configuração de implantação em `wrangler.admin.jsonc`, conforme o [procedimento do admin](PLAN-LISTA-DISPUTAS.md#atualização-do-worker-administrativo). O primeiro deploy criou apenas o SQLite do Durable Object deste Worker.

## Categorias etárias e notificações administrativas

- Unidade `codex/categorias-etarias`, baseada em `4891dc6`. Cadastro de Adulto, Base e Master nas disputas e aviso após inscrições fora da faixa ou acima das duas vagas ativas do Sub-22. O design system inclui os três toasts e o catálogo atualizado.
- A consulta ao DEV encontrou 11 disputas e zero colisões na classificação. A migration `20261117122456_dispute_age_categories.sql` está na unidade e foi exercitada em banco local isolado. A classificação no DEV e o deploy seguem pendentes de autorização específica.
- Worktree próprio. Mantidas as alterações locais do checkout original. O SHA, as evidências de validação e a revisão de integração ficam na PR da branch.

## Design system

- Unidade `codex/design-system`, baseada em `a7f8aee`. [CI da base integrada](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43897953923) com sucesso. [Commits da unidade](https://github.com/renato-lucindo/base-do-basquete-next/commits/codex/design-system) e [execuções de CI](https://github.com/renato-lucindo/base-do-basquete-next/actions?query=branch%3Acodex%2Fdesign-system) identificam o SHA e resultado de cada rodada.
- [Guia e catálogo](design/DESIGN-SYSTEM.md) com tokens consumidos pelo tema público e pela base administrativa. O catálogo offline inclui autocomplete, filtros, seletor de colunas, tooltip, legenda, formulários, estados de consulta e feedback. O guia identifica os componentes reaproveitáveis e seus consumidores. O contorno dos campos do tema compartilhado passa a usar o tom administrativo.
- A unidade usa worktree próprio. A edição de `CONTRIBUTING.md`, a instalação de `web-design-guidelines` e o `skills-lock.json` do checkout de origem permanecem lá.
- A [PR #80](https://github.com/renato-lucindo/base-do-basquete-next/pull/80) inclui consulta ao design system antes de editar UI e revisão da tela renderizada antes da entrega. A [CI do commit anterior](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43944645508) passou em `6353ada`. A rodada de catálogo corrigiu fechamento prematuro de filtro de equipe e seletor de colunas no WebKit. Evidências e próximo passo nos checks da PR.

## Última unidade integrada

Ficha pública e refinamento visual na [PR79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), branch `codex/perfil-atleta-aprovado`. O SHA validado e o deployment em serviço ficam nos [checks](https://github.com/renato-lucindo/base-do-basquete-next/pull/79/checks) e na descrição da PR.

- A ficha mostra até quatro linhas de dados confirmados. A publicação manual usa prévia, decisão explícita e motivo de revisão. O lote reutiliza as confirmações versionadas.
- Migration `20261114002816_player_profile_public_card.sql` aplicada somente no DEV, registro Supabase `20261116111008`. Das 225 pessoas já visíveis, o lote confirmou 64 fichas com recibos individuais. Somado ao perfil piloto, são 65 perfis confirmados. Os outros 160 seguem visíveis sem ficha.
- A navegação do perfil tem fundo branco e contorno. Na Visão geral, Últimos jogos aparece no cabeçalho da tabela, ao lado do Resumo no desktop. As abas, o conteúdo e a legenda compartilham um contorno contínuo. A ficha fica a meio rem das abas. A página de Jogadores tem fundo branco, e o cabeçalho separa os jogos consecutivos. Cabeçalhos têm contorno, e os controles do perfil e de Equipes se alinham acima das tabelas.
- [Preview separado](https://base-do-basquete-next-uiux-preview.renato-lucindo-jr.workers.dev/publico.html), sem Cloudflare Access. O Worker original da PR79 segue em `8f7b38d`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`.

[Rodada anterior](../historico/progresso/2026-11-13-perfil-e-navegacao-por-ano.md). A descrição da PR reúne as provas de publicação e os próximos passos.
