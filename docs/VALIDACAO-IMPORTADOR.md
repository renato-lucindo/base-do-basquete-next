# C4 — importador de elenco por texto

## Ajuste básico do MVP — 23/10, amostra João/Renato

Pedido posterior do responsável: reconhecer `01/01/97`, preencher ano a partir da data completa e distinguir pesos sem unidade. Regra reversível do MVP: números sem unidade de10 a150 sugerem kg; acima de150 sugerem cm; decimais em metros e unidades explícitas kg/cm/m conservam prioridade. Assim João74,9 fica com peso74,9 e Renato127/151 com peso127/altura151. A tabela continua editável e a regra aparece antes da interpretação. Não equivale a inferência universal de medidas; alturas menores ou pesos maiores usam unidade explícita ou correção na tabela.

Datas dd/mm/aa usam corte fixo00–29→2000–2029 e30–99→1930–1999, explicitado na tela; datas impossíveis continuam pendentes. Data completa preenche ano privado na interpretação/edição, e conferências anteriores exibem o ano derivado sem reescrever seu documento. Nenhum ano público é inferido. Data e ano divergentes continuam bloqueados; banco/schema/contratos HTTP inalterados.

RED observado nos dois casos unitários novos. Parser/provider/contratos15 testes PASS; gate consolidado113 unitários/22arquivos,5 transportes,5 SQL,7 workerd e demais checks PASS.16 browsers do importador PASS; dois focais adicionais verificam a amostra e retomada de documento anterior com data completa/ano separado ausente. Evidências do SQL/serviços/harness inalterados reutilizadas. Source/CI/deployment deste ajuste serão registrados no checkpoint de entrega.

Implementado conforme ESCOPO-IMPORTADOR-DE-EQUIPES.md fornecido pelo responsável e preservado literalmente. Branch `codex/importacao-texto`, PR draft [#7](https://github.com/renato-lucindo/base-do-basquete-next/pull/7) sobre C3/#6. Sem merge na principal. A avaliação humana com texto real foi solicitada e permanece pendente.

## Fluxo entregue

Na aba Equipes e elencos, **Importar equipe e elenco** permite escolher inscrição existente, criar inscrição de equipe global existente ou criar equipe e inscrição juntas. Dentro da inscrição expandida, **Importar elenco** usa o destino aberto. A interpretação salva uma conferência privada, sem criar atletas ou vínculos; a criação do destino ocorre ao confirmar atletas prontos.

A tabela permite editar nome, camisa, apelido, nascimento completo ou ano privado, duas posições, altura, peso, mão e registro federativo. Nome é obrigatório, camisa é opcional, 0/00 são distintos. Cabeçalhos são metadados; desconhecidos e ambiguidades permanecem sinalizados, com origem preservada e descarte explícito de fragmentos. Separadores incluem hífen, ponto e vírgula, barra vertical e tabulação.

Sugestões administrativas priorizam registro federativo, nome normalizado e dados disponíveis; a escolha de identidade é explícita. Homônimos não se fundem. Campos omitidos mostram os valores atuais sem serem marcados como alterações. Antes/depois e aprovação explícita controlam a atualização do cadastro global; camisa pertence ao vínculo. Ausências não encerram vínculos. Ano parcial e nascimento/registro completos permanecem privados; ano público não é inferido.

Salvar e retomar preserva texto, correções, decisões, versões e resultados por linha. Cada atleta confirma pessoa e vínculo na mesma transação. Falhas não desfazem sucessos de outras linhas. Envios incertos congelam a edição até repetir o mesmo comando; reautenticação conserva a conferência. Conflito não sobrescreve edições sem recarga explícita. Tab/Shift+Tab percorrem a tabela; rolagem horizontal permanece contida em 320px.

## Evidências

- Migrations próprias reconciliadas no projeto novo: `20261023172909_import_optional_fields`, `20261023174315_text_review_and_matching`, `20261023175310_text_import_confirmation`, `20261023175828_new_target_matching`. Tipos gerados do schema real, autorização fresca, RLS/grants explícitos e operações fixas no Worker/SessionStore. Sem SDK/chave/JWT do banco no browser ou service-role genérica.
- Gate consolidado local PASS: 111 unitários em22 arquivos, cinco transportes, cinco cenários PostgreSQL do zero/upgrade/preservação C1–C3, sete cenários workerd/DO, lint/formatação/tipos/builds/fronteira/segredos. Contratos reais `import_fields`, `text_review` e `text_confirm` executados com rollback; não repetidos por mudanças posteriores exclusivas de UI.
- 36 browsers locais de C1/C2/C3/importador PASS; incluem 14 percursos C4 em desktop/celular: texto rico, omitidos, homônimos, falha parcial/correção, retry com mesmo UUID, reautenticação, recarga explícita de conflito, destinos e operação por teclado. Fixtures verificam UI; os contratos PostgreSQL separados comprovam persistência e atomicidade.
- [CI 40003611826](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/40003611826), job `120585801014`, **SUCCESS**, source `c5a8d100df7d32778b8e79eeea2c8f6c65bcea7f`: gate, integridade do pacote e **70 cenários Linux PASS**. O ajuste posterior `033d404` move somente o título da coluna para acompanhar a ordem dos campos e acrescenta a asserção correspondente. RED observado e dois browsers focais GREEN, build novo PASS. CI completa não repetida para esse delta; não atribuir seu resultado ao SHA posterior.
- Capturas locais `.preview-artifacts/importador-desktop.png` e `importador-mobile.png` inspecionadas. A revisão visual detectou e corrigiu o desalinhamento dos títulos antes do fechamento. Não equivalem a auditoria WCAG completa.
- Dados humanos reconciliados às15:28 UTC-03: campeonato/edição/disputas1/1/2, equipes/inscrições2/2, pessoas1, elenco0, revisões/recibos de texto0, Auth1. Preservados. Advisor remanescente conhecido de proteção de senha vazada exige Pro; sem contratação/mudança de plano.

Harness imutável126 e smokes C3 de artefatos inalterados reutilizados. Não há evidência de revisão independente, carga/escala, concorrência real entre conexões ou compatibilidade universal com textos externos. A validação humana do importador e uma amostra real continuam pendentes. Sem CSV/XLSX, múltiplas equipes por lote, transferências automáticas ou histórico detalhado de importações.

## Preview protegido

Retorno humano em23/10 15:35–15:38: títulos não correspondiam aos campos. Inspeção da aba autenticada confirmou que ela ainda mantinha a ordem antiga no cliente carregado. Recarregada a página e retomada a única conferência salva do responsável: títulos na ordem correta (Nome, Camisa, Apelido, Nascimento, Ano, Posições, Altura, Peso, Mão, Registro, Seleção, Identidade), seis atletas preservados e zero confirmados. Sem editar/confirmar dados. Teste de regressão ampliado para os doze títulos e localização dos dez campos, desktop/mobile PASS. Captura local .preview-artifacts/importador-cabecalhos-real.png, SHA-25679d044ec1a83dfdc01e58586c65b9faebae0a14da69570bc27b4a463d81e31fb; não publicar a captura real no repositório público. Contagens15:38: conferências/recibos de texto1/1 criados pelo responsável; demais contagens preservadas. Isso comprova a correção dos títulos e a retomada real, sem representar aceite de importação/confirmar todo o fluxo.

[Preview](https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/), Worker `base-do-basquete-next-preview`, source **`033d404571e2b48c75124883a790aa1b88397c9f`**, publicado em **23/10/2026 15:32:21 America/Sao_Paulo (18:32:21 UTC)**. Deployment `37c716d3-54e0-4515-8844-2f930d6cc6d4`, versão `658ee17e-8dc5-4e61-b6a8-06f06915bc9b`, 100%.

| Artefato                |  Bytes | SHA-256                                                          |
| ----------------------- | -----: | ---------------------------------------------------------------- |
| foundation.html         |    480 | df94f230417afed365b317651fc0dba8a322ead119cacb271f35745719431d83 |
| foundation-CGfsJHyr.js  | 392174 | c8991191c6f779f4a16d0fd76c11807c1c2fc6839bf4a98e4c144315534957fb |
| foundation-D5NNniPY.css |   8445 | f6bd1917ce2f2ea354c3a36231af5351f70b448755b0e11c149d83780c816ad4 |
| worker.js               |      — | a2d31eed2972b647d70f479c8a254712258bc590184809babcebdea657b323f4 |

Smokes completos no source c5a8d10: três arquivos/hash/source, saúde, sessão e15 rotas privadas sem sessão401 (inclui revisão/lista/pessoa do importador), módulo interno404, login real inválido401 sem cookie de aplicação, login apresentado em dois navegadores sem erro JavaScript ou dados em local/sessionStorage. Source final033d404 alterou apenas o cliente: revalidados três arquivos/hash/source e dois navegadores; evidências do backend com hash idêntico reutilizadas. Não foi usada senha do responsável nem realizada importação humana pelo agente.

Access app `556be918-42ad-44e5-a85f-c2783f65b2ba`, única política permanente `30cc3ab4-9331-4df6-8d13-d840c2652210`, somente responsável. Tokens de smoke `b244f648-0dcc-4297-9049-ab7b08a9f763` / `79b58f42-a47f-4a4d-a933-c23b7e07f12a` e políticas correspondentes `3f44bbb9-b313-4b37-8f22-d99a54516b87` / `1b41177b-179b-477a-81d6-d4c71f09476b` **revogados**. Depois da última revogação: anônimo302 para Access, sem X-Bdb-Source; única política do responsável reconfirmada. Credenciais efêmeras entregues somente cifradas à chave privada em memória; nenhum segredo salvo no Git/documentação.

Previews de versão OFF; cofre, chave AES, limiter862073195184 e SessionStore0411ac931ca54d289d270606c7e87ef7 preservados. Nenhum upload/DDL/smoke/processo de credencial em andamento. Supabase único `nizmasjddyrhmevvfviz`, organização base-do-basquete, vínculo autorizado `link_6adaa8aab5688191b1e7ae1cddc55a82`. Plano Free preservado.

Rollback da apresentação pode retornar ao source c5a8d10 ou C3 sem remover migrations/dados, namespace/cofre ou Access; preservar sempre os vínculos e dados humanos. Não desabilitar proteção para testar o hostname público.
