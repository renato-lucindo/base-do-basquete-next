# Documentação histórica

Material preservado fora de **docs/** para separar feedbacks, planos, relatos e handoffs dos padrões vigentes. **Histórico não cria obrigação nova de produto**; verifique a data, o SHA, a PR e decisões posteriores antes de reaproveitar qualquer orientação.

As escolhas do responsável que ainda não tenham sido absorvidas por contratos ou padrões permanecem registradas nestes arquivos; não presuma que foram revogadas apenas pela mudança de pasta. Em caso de conflito, reconcilie com a decisão posterior e a implementação atual.

| Documento arquivado                                              | Conteúdo e destino                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AJUSTES-DE-EXPERIENCIA.md](AJUSTES-DE-EXPERIENCIA.md)           | Feedback sucessivo de protótipo e instruções pontuais de 22–27/10; regras permanentes aplicáveis foram avaliadas em docs/design e nos contratos atuais. |
| [PLANO-PROTOTIPO.md](PLANO-PROTOTIPO.md)                         | Plano da primeira apresentação navegável e marcos antigos.                                                                                              |
| [HANDOFF-UI-UX-ETAPA2.md](HANDOFF-UI-UX-ETAPA2.md)               | Contexto de transferência de UI/UX da etapa 2.                                                                                                          |
| [HANDOFF-UI-UX-RESULTADO.md](HANDOFF-UI-UX-RESULTADO.md)         | Relato da entrega/validação de uma etapa anterior.                                                                                                      |
| [HANDOFF-UIUX-DESKTOP-ETAPA3.md](HANDOFF-UIUX-DESKTOP-ETAPA3.md) | Transferência da etapa desktop posterior.                                                                                                               |

## Reorganização de 01/11/2026

Autorizada pelo responsável nesta unidade `codex/organizacao-documental`, a partir de `b7de978`/main `89a1b9f`. Foram arquivados **74 documentos**: 72 deste worktree e dois documentos exclusivos de `89eff57`, copiados somente como história. Nenhuma implementação dessas branches foi incorporada. Os cinco arquivos de UI/UX já arquivados acima permanecem preservados.

O inventário auditado tinha 107 Markdown em docs na união dos checkouts; este worktree tinha 103. Após 72 saídas locais e incorporação apenas do ROADMAP operacional, restam **32** (19 ADRs e 13 documentos operacionais). O README do runner de zoom nativo e seus executáveis existem apenas na branch de origem; não se copiou um manual operacional sem dependências. Consulte a [origem imutável](https://github.com/renato-lucindo/base-do-basquete-next/blob/89eff57/docs/evidencias/uiux-native-zoom/README.md).

As movimentações preservam todo o relato, inclusive falhas, decisões e aceites ausentes; somente destinos de referências/links foram ajustados. A tabela registra SHA256 dos bytes originais e commit de origem, que permite recuperar a versão integral anterior aos ajustes de referências. Um verificador local compara cada destino com o original após aplicar apenas essa transformação de caminhos. Datas, SHAs, permissões e instruções antigas não se tornam atuais por estarem acessíveis aqui.

### Condições verificadas

- Planos e relatórios não têm consumidores executáveis diretos. Permanecem intactos fontes, código, fixtures, licenças, capturas, contratos e scripts usados por build/testes/CI. Evidência histórica continua consultável por assunto.
- Pendências de PDF/Storage autenticado, aceite G4, política de inscritos/agenda, regulamento e A26 foram reconciliadas em [MATRIZ-ESCOPO](../../docs/MATRIZ-ESCOPO.md). Cenários de regulamento cobertos por testes posteriores não foram reabertos por caixas antigas.
- A execução da PR #38 e a integração pública da #46 continuam no [checkpoint](../../docs/PROGRESSO.md), com CI por SHA, limites e próximo passo. Arquivar plano não declara aceite nem autoriza reaplicar migration/deploy.
- Decisões de identidade/importação, prevenção de regressões e proveniência foram encaminhadas aos ADRs 008/009. A fonte de componentes fica em PADROES-ADMIN; jornadas e aceite em ADMIN.
- O handoff externo foi conferido contra seu aviso de integração/publicação e a consolidação na história Git da main. Sua ausência na main era ausência do documento, não evidência de trabalho ainda não incorporado. Foi preservado como registro de `89eff57`, sem portar código.

### Mapa de movimentações

Os caminhos de origem abaixo são históricos, resolvidos no commit indicado; os links de destino apontam para os arquivos atuais.

## Análises, proveniência e registros

| Origem histórica                        | Destino atual                                                                 | Commit / SHA256 original                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/ACESSO-ADMINISTRATIVO.md`         | [ACESSO-ADMINISTRATIVO.md](analises/ACESSO-ADMINISTRATIVO.md)                 | `b7de978` / `6078c8ebdd4beefffb272b0b77e57861f541b5599a0ce64068d5fbda5cbe02a4` |
| `docs/ANALISE-IMPORTADOR-DE-EQUIPES.md` | [ANALISE-IMPORTADOR-DE-EQUIPES.md](analises/ANALISE-IMPORTADOR-DE-EQUIPES.md) | `b7de978` / `f5cf98691989eac642bfa77628331dfee55e20fc37073b7c6915b8c7fe147ead` |
| `docs/AUDITORIA-REUSO-BASE-ANTERIOR.md` | [AUDITORIA-REUSO-BASE-ANTERIOR.md](analises/AUDITORIA-REUSO-BASE-ANTERIOR.md) | `b7de978` / `58f9ab5e822498c06243f1510a4a33cc746143ea8da64bd3e09478a92ce706e2` |
| `docs/CONSOLIDACAO-PRS.md`              | [CONSOLIDACAO-PRS.md](analises/CONSOLIDACAO-PRS.md)                           | `b7de978` / `59cde2a91f72fdd61195d7ee533a2144b5ea8f6e448681b8727fd8de30fc7738` |
| `docs/FILA-RETOMADA-ADMIN.md`           | [FILA-RETOMADA-ADMIN.md](analises/FILA-RETOMADA-ADMIN.md)                     | `b7de978` / `3a4366d6bb8fc865f249757e6f445df3f37bf40035ba4df201d9e6053f4c6af5` |
| `docs/ORIGEM-DOS-MODULOS.md`            | [ORIGEM-DOS-MODULOS.md](analises/ORIGEM-DOS-MODULOS.md)                       | `b7de978` / `26e0be307eb2d207f16ff34a3dbc155544d8352bd40892a0e0a67fa2793c9a3a` |

## Planos

| Origem histórica                                                        | Destino atual                                                                                           | Commit / SHA256 original                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/superpowers/plans/2026-10-22-fundacao.md`                         | [2026-10-22-fundacao.md](planos/2026-10-22-fundacao.md)                                                 | `b7de978` / `0846536ca8ded9e413d672d6191bc284bb53b1ad48c7aeade16a4f3096c09be8` |
| `docs/superpowers/plans/2026-10-23-contexto-cadastros.md`               | [2026-10-23-contexto-cadastros.md](planos/2026-10-23-contexto-cadastros.md)                             | `b7de978` / `80a3560d4905fceb938504b14f0ff2234f34375bea45aa72418dcee6ee4f2b9f` |
| `docs/superpowers/plans/2026-10-23-equipes-inscricoes.md`               | [2026-10-23-equipes-inscricoes.md](planos/2026-10-23-equipes-inscricoes.md)                             | `b7de978` / `8ce9c2e92398e5c286f3b40ba54be4b30d99f63e964a0a11df50e77f31bd7e7d` |
| `docs/superpowers/plans/2026-10-23-importacao-texto.md`                 | [2026-10-23-importacao-texto.md](planos/2026-10-23-importacao-texto.md)                                 | `b7de978` / `8481d5eb9ad03ac210eb31b562d7496b216cffa9c7e18e32d51276cae07f196f` |
| `docs/superpowers/plans/2026-10-23-jogo-completo.md`                    | [2026-10-23-jogo-completo.md](planos/2026-10-23-jogo-completo.md)                                       | `b7de978` / `1560b968624d44ecc20d26728b0eff0cfc21bf132ea29931617cf506973341fe` |
| `docs/superpowers/plans/2026-10-23-pessoas-elencos.md`                  | [2026-10-23-pessoas-elencos.md](planos/2026-10-23-pessoas-elencos.md)                                   | `b7de978` / `4e53a57a8d4b7bda790c5d375b435c01300d72d55ba874b7c9fece332a950fd0` |
| `docs/superpowers/plans/2026-10-24-classificacao-publica.md`            | [2026-10-24-classificacao-publica.md](planos/2026-10-24-classificacao-publica.md)                       | `b7de978` / `adad749f2678f8ab3b4fd61e75c1541a89fffaa3a8f6f2aafa3a39847c325c64` |
| `docs/superpowers/plans/2026-10-24-ocorrencias-persistidas.md`          | [2026-10-24-ocorrencias-persistidas.md](planos/2026-10-24-ocorrencias-persistidas.md)                   | `b7de978` / `8f3c0a1380551fc3717cd7704365d5f4ba02c292319c0d16fdfba87767144ce9` |
| `docs/superpowers/plans/2026-10-24-ocorrencias.md`                      | [2026-10-24-ocorrencias.md](planos/2026-10-24-ocorrencias.md)                                           | `b7de978` / `d83941b7916fa5e8e97f46f9b559ce36ebb72341d6c7083650afa14299a2c911` |
| `docs/superpowers/plans/2026-10-24-pdf-workspace.md`                    | [2026-10-24-pdf-workspace.md](planos/2026-10-24-pdf-workspace.md)                                       | `b7de978` / `0ebd2c77e57c42ba6dbeaa7f7b50a1536a724d8469114a8142e703d8dfadba7c` |
| `docs/superpowers/plans/2026-10-24-publicacao.md`                       | [2026-10-24-publicacao.md](planos/2026-10-24-publicacao.md)                                             | `b7de978` / `461e78d41aed0b9169976d56ee7301f7e23c54c9c6f99585fa9387d677fc55ea` |
| `docs/superpowers/plans/2026-10-24-regulamento-classificacao.md`        | [2026-10-24-regulamento-classificacao.md](planos/2026-10-24-regulamento-classificacao.md)               | `b7de978` / `ffac08a6905d8497abf2fc84da8e854f2f25f12a4861b4f686dcb6eaacf3f2c7` |
| `docs/superpowers/plans/2026-10-24-regulamento-persistido.md`           | [2026-10-24-regulamento-persistido.md](planos/2026-10-24-regulamento-persistido.md)                     | `b7de978` / `b4bb505bccc7712b88f95430e55c14c25278b63c457a43cf3d9a3ec0812d3825` |
| `docs/superpowers/plans/2026-10-24-transferencias.md`                   | [2026-10-24-transferencias.md](planos/2026-10-24-transferencias.md)                                     | `b7de978` / `b0ea5409917d932e2aa6007fae7df61793840edd5ac02fc5587fce1780451a87` |
| `docs/superpowers/plans/2026-10-25-conquistas-honrarias.md`             | [2026-10-25-conquistas-honrarias.md](planos/2026-10-25-conquistas-honrarias.md)                         | `b7de978` / `7b9d7b77342dab33f81f0b6e48eaae49bca8bd1154496ddf3a922e3207626792` |
| `docs/superpowers/plans/2026-10-25-estatisticas-confirmadas.md`         | [2026-10-25-estatisticas-confirmadas.md](planos/2026-10-25-estatisticas-confirmadas.md)                 | `b7de978` / `20dd8647f993a15f97f356e629cb7854b94cee925f52e007cb14f9fa890de755` |
| `docs/superpowers/plans/2026-10-25-perfil-confirmado.md`                | [2026-10-25-perfil-confirmado.md](planos/2026-10-25-perfil-confirmado.md)                               | `b7de978` / `012fc80ee0f2d9df9c04280447da99dd78cb7d09dc5836e061df712c09f39b13` |
| `docs/superpowers/plans/2026-10-26-acessibilidade-administrativa.md`    | [2026-10-26-acessibilidade-administrativa.md](planos/2026-10-26-acessibilidade-administrativa.md)       | `b7de978` / `a95fffb83fa6f19e85d53c1390cde5e26fe82a3a950a9b8eb6b990f0a329b1d4` |
| `docs/superpowers/plans/2026-10-26-acessibilidade-consultas.md`         | [2026-10-26-acessibilidade-consultas.md](planos/2026-10-26-acessibilidade-consultas.md)                 | `b7de978` / `e893f25182ba6a0506c94222a5b3d5edd2b6ed40087e8770a024b568fa93070e` |
| `docs/superpowers/plans/2026-10-26-administracao-compacta.md`           | [2026-10-26-administracao-compacta.md](planos/2026-10-26-administracao-compacta.md)                     | `b7de978` / `54c7e77ab4dce0090a45c43795a44f56da17fbf6eefabf917e54f7c67e4f813e` |
| `docs/superpowers/plans/2026-10-26-capacidade-consultas-confirmadas.md` | [2026-10-26-capacidade-consultas-confirmadas.md](planos/2026-10-26-capacidade-consultas-confirmadas.md) | `b7de978` / `c462386a673fa42cea9df7ea08d4389084fce891642638036caec2cb0da5adb1` |
| `docs/superpowers/plans/2026-10-26-compatibilidade-e-tabelas.md`        | [2026-10-26-compatibilidade-e-tabelas.md](planos/2026-10-26-compatibilidade-e-tabelas.md)               | `b7de978` / `8f2a8d2f0e50d68b1773959d5716c49a393f04ec7b813b4c009bb14131c84882` |
| `docs/superpowers/plans/2026-10-26-concorrencia-postgres-nativo.md`     | [2026-10-26-concorrencia-postgres-nativo.md](planos/2026-10-26-concorrencia-postgres-nativo.md)         | `b7de978` / `d87256937cbfdeb2e71fbb3366f3308231c42d5def3b3f957381e50b0ade298f` |
| `docs/superpowers/plans/2026-10-26-equipes-publicas.md`                 | [2026-10-26-equipes-publicas.md](planos/2026-10-26-equipes-publicas.md)                                 | `b7de978` / `5658194ff627c8835a4796d53b381de7020573e904d0044e5af90b32a68deb46` |
| `docs/superpowers/plans/2026-10-26-sumula-desktop.md`                   | [2026-10-26-sumula-desktop.md](planos/2026-10-26-sumula-desktop.md)                                     | `b7de978` / `08a12252081631455fdd1dcda131461692d45aad6cdc277510f766cd055d1722` |
| `docs/superpowers/plans/2026-10-27-demais-telas-compactas.md`           | [2026-10-27-demais-telas-compactas.md](planos/2026-10-27-demais-telas-compactas.md)                     | `b7de978` / `02303b010128cd591721f5c30f607dfaf3da2e4273b67e1941be575133238018` |
| `docs/superpowers/plans/2026-10-27-pessoa-camisa-compacta.md`           | [2026-10-27-pessoa-camisa-compacta.md](planos/2026-10-27-pessoa-camisa-compacta.md)                     | `b7de978` / `350c4c699afffe3712071e53ddd4afd163f10d239d56c6fba646c40e503f875d` |
| `docs/superpowers/plans/2026-10-27-reaproveitamento-elenco.md`          | [2026-10-27-reaproveitamento-elenco.md](planos/2026-10-27-reaproveitamento-elenco.md)                   | `b7de978` / `74d359755b534efa827e98c563d2d3f99c46bdedee7652d087ee8b051532c5fe` |
| `docs/superpowers/plans/2026-10-27-remocao-compacta.md`                 | [2026-10-27-remocao-compacta.md](planos/2026-10-27-remocao-compacta.md)                                 | `b7de978` / `fdfe815a5e02ee461ff5b03827713bbdfcaad1fd3f1d2002aa9c21c61744a6f0` |
| `docs/superpowers/plans/2026-10-28-arbitragem.md`                       | [2026-10-28-arbitragem.md](planos/2026-10-28-arbitragem.md)                                             | `b7de978` / `857d386f87a39efe0dd88deddcaaf23ed4af55111041c92b423c2efd8fec4c6f` |
| `docs/superpowers/plans/2026-10-28-desempenho-salvamentos.md`           | [2026-10-28-desempenho-salvamentos.md](planos/2026-10-28-desempenho-salvamentos.md)                     | `b7de978` / `fa1d2d5098e25484a98f80a4191e29b622fa82fd9b3fadf305834c95b4194875` |
| `docs/PLANO-MIGRATIONS-PR38.md`                                         | [PLANO-MIGRATIONS-PR38.md](planos/PLANO-MIGRATIONS-PR38.md)                                             | `89eff57` / `9762bde621c76021101c80898fca990fd51905f3ba151e2310e3f88746e22575` |

## Validacoes

| Origem histórica                            | Destino atual                                                                           | Commit / SHA256 original                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/VALIDACAO-ACESSIBILIDADE-ADMIN.md`    | [VALIDACAO-ACESSIBILIDADE-ADMIN.md](validacoes/VALIDACAO-ACESSIBILIDADE-ADMIN.md)       | `b7de978` / `aea6d706edba4f67f0acaa88cdb5dc4e4990f30e738cf5e476ed644fe4b3cbc6` |
| `docs/VALIDACAO-ACESSIBILIDADE.md`          | [VALIDACAO-ACESSIBILIDADE.md](validacoes/VALIDACAO-ACESSIBILIDADE.md)                   | `b7de978` / `b7ef778c21dc0df47b4b89961609d702c21a2cb3f9d6acf2ec2b6c88132df155` |
| `docs/VALIDACAO-ADMIN-COMPACTA.md`          | [VALIDACAO-ADMIN-COMPACTA.md](validacoes/VALIDACAO-ADMIN-COMPACTA.md)                   | `b7de978` / `6a803add1094f8de3e9e427f5451988621c66d7594b6d113022dae83ef714f9f` |
| `docs/VALIDACAO-ARBITRAGEM.md`              | [VALIDACAO-ARBITRAGEM.md](validacoes/VALIDACAO-ARBITRAGEM.md)                           | `b7de978` / `147ec3bfc0f2dbfea1601bfe3610676e22ad045813a2238edfe3f971af24cd4d` |
| `docs/VALIDACAO-CAPACIDADE.md`              | [VALIDACAO-CAPACIDADE.md](validacoes/VALIDACAO-CAPACIDADE.md)                           | `b7de978` / `a08064c19b4a07105f56b5d7b8b296e8e1454e87c27d124f1af71fabb09f2877` |
| `docs/VALIDACAO-CLASSIFICACAO-PUBLICA.md`   | [VALIDACAO-CLASSIFICACAO-PUBLICA.md](validacoes/VALIDACAO-CLASSIFICACAO-PUBLICA.md)     | `b7de978` / `9c31869ee6f361022ad2d3adb12eba0ea3b72241744fbdafd93f5c2d5f649d8e` |
| `docs/VALIDACAO-COMPATIBILIDADE-SUMULA.md`  | [VALIDACAO-COMPATIBILIDADE-SUMULA.md](validacoes/VALIDACAO-COMPATIBILIDADE-SUMULA.md)   | `b7de978` / `109461fd5f4233edbc0fa2ed46ee4a19e089cde1c7c4d54af4564f4f9baec23c` |
| `docs/VALIDACAO-CONCORRENCIA.md`            | [VALIDACAO-CONCORRENCIA.md](validacoes/VALIDACAO-CONCORRENCIA.md)                       | `b7de978` / `dee3bdc4ee04b506e138558fd2526cee3c247dfc120ef9db45f9a4cfc79a4c1c` |
| `docs/VALIDACAO-CONQUISTAS.md`              | [VALIDACAO-CONQUISTAS.md](validacoes/VALIDACAO-CONQUISTAS.md)                           | `b7de978` / `5d087f2b0337efaa4396d292d0de465476c0148afed19550260cbc250e09ca0a` |
| `docs/VALIDACAO-CONTEXTO.md`                | [VALIDACAO-CONTEXTO.md](validacoes/VALIDACAO-CONTEXTO.md)                               | `b7de978` / `8b9aaa696cc3bb387220d77a274e6961bc49082b24973d17464c07c037d887d0` |
| `docs/VALIDACAO-DEMAIS-TELAS-COMPACTAS.md`  | [VALIDACAO-DEMAIS-TELAS-COMPACTAS.md](validacoes/VALIDACAO-DEMAIS-TELAS-COMPACTAS.md)   | `b7de978` / `85ec939b38e971e606dfdaff58f5870fbcb444ba33fbc5dc66cb1fc8782578d4` |
| `docs/VALIDACAO-DESEMPENHO-SALVAMENTOS.md`  | [VALIDACAO-DESEMPENHO-SALVAMENTOS.md](validacoes/VALIDACAO-DESEMPENHO-SALVAMENTOS.md)   | `b7de978` / `825e76a7886135535aa7308a319b686878ae56da11bddcd8bdd62ffecf2d6f07` |
| `docs/design/VALIDACAO.md`                  | [VALIDACAO-DESIGN-PUBLICO.md](validacoes/VALIDACAO-DESIGN-PUBLICO.md)                   | `b7de978` / `d3ad9eb1847d89233e32d40be8a7530e7e7603bcb6d1382f7f0274073d5d849d` |
| `docs/VALIDACAO-EQUIPES-PUBLICAS.md`        | [VALIDACAO-EQUIPES-PUBLICAS.md](validacoes/VALIDACAO-EQUIPES-PUBLICAS.md)               | `b7de978` / `d0138ede525a0dfb1a8b8f1351fe03f117dcabae9cd9cbc9a04f3128ae861515` |
| `docs/VALIDACAO-EQUIPES.md`                 | [VALIDACAO-EQUIPES.md](validacoes/VALIDACAO-EQUIPES.md)                                 | `b7de978` / `6536888b9082189c52bffbab7d493ce945afa4c57365772cb2a0bc49838bd4c3` |
| `docs/VALIDACAO-ESTATISTICAS.md`            | [VALIDACAO-ESTATISTICAS.md](validacoes/VALIDACAO-ESTATISTICAS.md)                       | `b7de978` / `8af651d60350e23503f9f8f5690a546df9159c394e81955bb48c38c3844bf835` |
| `docs/VALIDACAO-IMPORTADOR.md`              | [VALIDACAO-IMPORTADOR.md](validacoes/VALIDACAO-IMPORTADOR.md)                           | `b7de978` / `d10f13de56d35099db6d73a6d4520519ff63aff4e61d4d32399d8f54e2d39007` |
| `docs/VALIDACAO-INTEGRACAO-UIUX.md`         | [VALIDACAO-INTEGRACAO-UIUX.md](validacoes/VALIDACAO-INTEGRACAO-UIUX.md)                 | `b7de978` / `d8f8d961d7732e621c0e95460975ef652f36b443defd2bbd4dcffa888489ddfd` |
| `docs/VALIDACAO-JOGADOR-CAMISA-UNICA.md`    | [VALIDACAO-JOGADOR-CAMISA-UNICA.md](validacoes/VALIDACAO-JOGADOR-CAMISA-UNICA.md)       | `b7de978` / `a22bec6536628fd7d3292903ae913e5d64e85fe630137b6a9d5b4f4137c4a7c4` |
| `docs/VALIDACAO-JOGOS.md`                   | [VALIDACAO-JOGOS.md](validacoes/VALIDACAO-JOGOS.md)                                     | `b7de978` / `418faebc5c8328b01c593652747d540a588372519fb2826b1bcc4d4a2b539e67` |
| `docs/VALIDACAO-OCORRENCIAS.md`             | [VALIDACAO-OCORRENCIAS.md](validacoes/VALIDACAO-OCORRENCIAS.md)                         | `b7de978` / `8649f526e42c12bf73466c58998ac60227e68fae9f94f2cea252b2d59a4392dd` |
| `docs/VALIDACAO-PDFS.md`                    | [VALIDACAO-PDFS.md](validacoes/VALIDACAO-PDFS.md)                                       | `b7de978` / `7172895d6bfa2b6af5b82b7de9c51f423e3174e3090fa1c8a6b6fbd655cd9fd7` |
| `docs/VALIDACAO-PERFIL.md`                  | [VALIDACAO-PERFIL.md](validacoes/VALIDACAO-PERFIL.md)                                   | `b7de978` / `e4b4d1deab3b3076ad1aac204c7376404cf699ea25da19a1e393c7a0123add37` |
| `docs/VALIDACAO-PESSOA-COMPACTA.md`         | [VALIDACAO-PESSOA-COMPACTA.md](validacoes/VALIDACAO-PESSOA-COMPACTA.md)                 | `b7de978` / `f9bc494d25b7eb5e6a4863109994a6e6d74a401885151b678b95a27d1cc3a54c` |
| `docs/VALIDACAO-PESSOAS.md`                 | [VALIDACAO-PESSOAS.md](validacoes/VALIDACAO-PESSOAS.md)                                 | `b7de978` / `099cd37884101099f7778610990fa2ccc3b814fac6f0a9db228a38723d167a9e` |
| `docs/VALIDACAO-PROTOTIPO.md`               | [VALIDACAO-PROTOTIPO.md](validacoes/VALIDACAO-PROTOTIPO.md)                             | `b7de978` / `eb03e1d89aad438d1de8ceef942d58a81032d82295183be604ff8521bf98832c` |
| `docs/VALIDACAO-PUBLICACAO.md`              | [VALIDACAO-PUBLICACAO.md](validacoes/VALIDACAO-PUBLICACAO.md)                           | `b7de978` / `a0157e625ef680367c19072fbbcc4447812461bb604859ddf30696068c6259cb` |
| `docs/VALIDACAO-REAPROVEITAMENTO-ELENCO.md` | [VALIDACAO-REAPROVEITAMENTO-ELENCO.md](validacoes/VALIDACAO-REAPROVEITAMENTO-ELENCO.md) | `b7de978` / `774ad15e2f030e8f99d1d1e7a6fe8494faaa10a451abed4ca975d2807cb03568` |
| `docs/VALIDACAO-REGULAMENTO-PERSISTIDO.md`  | [VALIDACAO-REGULAMENTO-PERSISTIDO.md](validacoes/VALIDACAO-REGULAMENTO-PERSISTIDO.md)   | `b7de978` / `ce223618cd80e0fc9eac49062a2bebc45fc6bcf100ed702ea1f0e86610332a7a` |
| `docs/VALIDACAO-REGULAMENTO.md`             | [VALIDACAO-REGULAMENTO.md](validacoes/VALIDACAO-REGULAMENTO.md)                         | `b7de978` / `a64469909caf3fbf0ab6de1a857902b24b88f7482b0ea93a321436b8c77bcae4` |
| `docs/VALIDACAO-REMOCAO-COMPACTA.md`        | [VALIDACAO-REMOCAO-COMPACTA.md](validacoes/VALIDACAO-REMOCAO-COMPACTA.md)               | `b7de978` / `5f89765b9efddd06667be099f831b5fe1793a22c39e92ea42dafc36eef455735` |
| `docs/VALIDACAO-REMOCAO-INSCRICOES.md`      | [VALIDACAO-REMOCAO-INSCRICOES.md](validacoes/VALIDACAO-REMOCAO-INSCRICOES.md)           | `b7de978` / `1d79db05eefd90ef044d3566256fcac57b441b3ccd208c0958cdd4eb1ecac820` |
| `docs/VALIDACAO-RETORNOS-FLUXOS.md`         | [VALIDACAO-RETORNOS-FLUXOS.md](validacoes/VALIDACAO-RETORNOS-FLUXOS.md)                 | `b7de978` / `07a6a01a1c8da166eb277f1e9c3ec3da747936db57f1e4ea30c42a519203418d` |
| `docs/VALIDACAO-SUMULA-DESKTOP.md`          | [VALIDACAO-SUMULA-DESKTOP.md](validacoes/VALIDACAO-SUMULA-DESKTOP.md)                   | `b7de978` / `b886abf19a0ee10ba2eec96fe3f5ab436b25392793e21ddccacc722a093de822` |
| `docs/VALIDACAO-TRANSFERENCIAS.md`          | [VALIDACAO-TRANSFERENCIAS.md](validacoes/VALIDACAO-TRANSFERENCIAS.md)                   | `b7de978` / `7e8b7ba2868fc8723d9e48863bebcaa00e0517a72df7796f03c81f253e632055` |

## Handoffs

| Origem histórica                     | Destino atual                                                           | Commit / SHA256 original                                                       |
| ------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `docs/HANDOFF-UI-UX-OUTRO-AGENTE.md` | [HANDOFF-UI-UX-OUTRO-AGENTE.md](handoffs/HANDOFF-UI-UX-OUTRO-AGENTE.md) | `89eff57` / `71c6c14671c3b6d9c568a67a155130a94659dcc9772733caebc6f5f97e0ce196` |

## Consulta e continuidade

Use o [índice ativo](../../docs/INDICE.md) e consulte aqui apenas a prova pertinente. Runners de concorrência e benchmarks permanecem em [docs/evidencias](../../docs/evidencias/); a CI e os protótipos continuam usando [docs/design](../../docs/design/README.md). [Checkpoints anteriores](../progresso/README.md) conservam contexto de execução. Links para `.preview-artifacts`, logs locais e caminhos de máquina identificam evidências não distribuídas; não são arquivos prometidos pelo repositório.

Originais importados do checkout de origem são snapshots históricos de `89eff57`; o estado mais recente de uma PR deve ser lido na própria PR. Nenhuma branch, worktree de origem, serviço, banco ou dado humano foi alterado nesta reorganização.
