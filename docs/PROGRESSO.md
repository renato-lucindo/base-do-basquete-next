# Progresso atual

## Administração de disputas

- Unidade `codex/administracao-disputas`, baseada em `54ffd93`, em worktree próprio. Regras na [ADR 023](decisoes/023-administracao-disputas.md). O checkout original conserva as alterações locais de contribuição e skills.
- Gate local aprovado, com 820 testes Vitest. Navegador da unidade com 16 aprovados e 2 skips de desktop no mobile. PostgreSQL 17.11 isolado com duas conexões confirmou os conflitos entre edição e primeira inscrição, e entre cancelamento e nova inscrição.
- DEV com as migrations da unidade registradas como `20261117163812` e `20261117163815`. Resultado do inventário: 3 disputas em andamento e 1 planejada com exposição herdada, 7 planejadas e privadas. Leitor anônimo manteve jogos públicos de 3 disputas e não tem execução para prévia ou administração. RLS ativa nas três tabelas privadas. Avisos de advisors revisados na PR. A migration de categorias etárias já consta no DEV como `20261117132108`.
- Próximo passo: conferir CI de integração e disponibilização do Worker no ambiente de destino. Nenhum deployment do Worker nesta unidade até este checkpoint.

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
