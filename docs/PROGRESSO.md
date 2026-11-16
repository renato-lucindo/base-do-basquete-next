# Progresso atual

Ficha pública e refinamento visual na [PR79](https://github.com/renato-lucindo/base-do-basquete-next/pull/79), branch `codex/perfil-atleta-aprovado`. O SHA validado e o deployment em serviço ficam nos [checks](https://github.com/renato-lucindo/base-do-basquete-next/pull/79/checks) e na descrição da PR.

- A ficha mostra até quatro linhas de dados confirmados. A publicação manual usa prévia, decisão explícita e motivo de revisão. O lote reutiliza as confirmações versionadas.
- Migration `20261114002816_player_profile_public_card.sql` aplicada somente no DEV, registro Supabase `20261116111008`. Das 225 pessoas já visíveis, o lote confirmou 64 fichas com recibos individuais. Somado ao perfil piloto, são 65 perfis confirmados. Os outros 160 seguem visíveis sem ficha.
- A navegação do perfil tem fundo branco e contorno. Na Visão geral, Últimos jogos aparece no cabeçalho da tabela, ao lado do Resumo no desktop. As abas, o conteúdo e a legenda compartilham um contorno contínuo. A ficha fica a meio rem das abas. A página de Jogadores tem fundo branco, e o cabeçalho separa os jogos consecutivos. Cabeçalhos têm contorno, e os controles do perfil e de Equipes se alinham acima das tabelas.
- [Preview separado](https://base-do-basquete-next-uiux-preview.renato-lucindo-jr.workers.dev/publico.html), sem Cloudflare Access. O Worker original da PR79 segue em `8f7b38d`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`.

[Rodada anterior](../historico/progresso/2026-11-13-perfil-e-navegacao-por-ano.md). A descrição da PR reúne as provas de publicação e os próximos passos.
