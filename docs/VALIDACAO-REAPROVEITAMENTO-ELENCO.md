# Reaproveitamento de elenco e pré-seleção de identidade

## Estado final deste checkpoint,27/10/2026

Responsável solicitou encerrar após publicação, com reserva semanal baixa. Pré-seleção publicada na fonte **260713c138cc8595322d76102702325d90f08901**, CI **40525486718/job122263790799 SUCCESS**,573unit/117arquivos e413browsersPASS/67SKIP. Release protegido deployment **fc8d9c55-91a2-4454-b7d0-2308888d4c04**, versão64d4ebee-7d47-44ff-a55d-76847c705f24,100%. Smokes24assets/hash/Xsource/41GETs privados/13POSTs privados/health/Auth inválido/projeções/HTMLs/dois browsers aprovados. Relatório `.preview-artifacts/automatic-match-smoke-report.json`, SHA256 **a4f8dd78c4d5582c42bae03499e319e3e8e78c0752d492c4e8652f4459a1b2cf**. Recursos temporários revogados e ausência conferida; owner único/previewsOFF/bindings/anônimo302 preservados. Sem aceite humano ou mutação de dados humanos.

R2a/R2b locais na branch `codex/reaproveitar-elenco-banco`, sobre merge5241860. Migrations **20261027143904_roster_reuse_context.sql** e **20261027145431_roster_reuse_write.sql NÃO APLICADAS**; remoto continua48migrations. Rascunho do writer será salvo comoWIP `[skip ci]`, sem CI/deploy novo. Não há provider/rotas/diálogo integrados: o reaproveitamento direto de outra disputa ainda não está disponível ao responsável. Registros abaixo sobre pendência de CI/deploy da pré-seleção e ausência de writer são históricos, superados por esta seção.

### Writer local e compatibilidade com remoção

- RED real: `roster-reuse-write-red.log`, doisPGzero/upgrade demonstram writer ausente após corrigir somente a fixture da vaga administrativa singleton. CLI2.121.0 gerou migration nova apósRED;48anteriores intocadas.
- Contrato fechado até200itens,64KiB, confirmação explícita, versões/fingerprint; SQL×TS alinhados, inclusiveUnicode e limites. A execução inicialmente nomeada `roster-reuse-parity-red.log` passou; foi copiada como `roster-reuse-parity-green.log`, **não constituiRED**.
- Writer deriva elegibilidade, trava atletas antes da raiz, mantém trigger produtivo habilitado, cria apenas novos vínculos, recibo/linhagem imutáveis e replay do mesmo autor. Origem/destino existente/identidades/G4 preservados. Matriz inclui registro em outra inscrição/naipe/camisa/versionamento/contexto/revogação/replay/200itens/limite2000/rollback sem parcial e0/00/null.
- Onze focais/3arquivos PASS7,05s, log `.preview-artifacts/roster-reuse-final-focused.log`, SHA256 **8bac7ff904b83e0d7bad8ad74c4960e6146b28329e4bc5001fd7f415cb270af3**.
- Primeiro gate banco **FAIL**574PASS/3FAIL: inventário explícito deFKs na remoção passou a exigir a nova tabela `private.roster_reuse_commands`. Revisão confirmou que os vínculos de origem/destino mantidos pela linhagem já bloqueiam remoção por histórico. Teste não foi afrouxado: acrescentada tabela ao inventário fechado e comprovada recusa409 de ambas inscrições com elenco ativo e também encerrado. Focal5PASS7,33s, SHA256 **e1969c6bcf9a43e31d853818ed1393a81dd2146ef4b01047a07d9e64999025a4** em `.preview-artifacts/roster-reuse-removal-focused.log`.
- Segundo gate, já iniciado antes do pedido de checkpoint, **PASS/exit0:577unit/119arquivos,6transportes/13PG/23workerd/4PDFs**, builds/tipos/lint/formato/fronteira/segredos744. Log `.preview-artifacts/roster-reuse-bank-final-gate-2.log`, SHA256 **051d6d448022a646c6f16b0937f52d0564a0d5e182c41be756e4fb79dab99179**. Sem CI, prova remota, carga ou concorrência multiconexão desta unidade; gate não valida aceite do fluxo inexistente na UI.
- Fixtures locais usam Auth/admin fictícios e trocam o singleton administrativo dentro do banco descartável. **Não executar esses seeds inalterados no Supabase remoto.** Próxima prova real deve adaptar produto sintéticoBEGIN/ROLLBACK ao administrador já existente sem inserir/excluir/alterar Auth/admin. Nenhuma migration nova será aplicada durante este encerramento.

Checkpoint completo e próximo passo em `docs/PROGRESSO.md`. Preservar `.agents/` e `skills-lock.json` humanos fora dos commits. Automação permanecePAUSED por encerramento humano, sem novo despertar agendado.

27/10/2026, branch `codex/reaproveitar-elenco`, base `cc02882`. Auditoria do projeto anterior concluída e commitada antes da implementação. Nenhum código antigo executado ou migration antiga copiada. `.agents/` e `skills-lock.json` humanos preservados.

## R1: prévia pura, ainda sem produto integrado

- RED real: `.preview-artifacts/roster-reuse-preview-red.log`, seis asserções falharam contra retorno vazio; não foi falha de import ausente.
- GREEN inicial: seis casos em416ms, `.preview-artifacts/roster-reuse-preview-green.log`.
- Composição final: `npx vitest run src/people/roster-reuse.test.ts src/text-import/name-matching.test.ts src/people/transfer.test.ts`,43PASS/3arquivos em586ms; `.preview-artifacts/roster-reuse-composition.log`. Sete casos próprios, incluindo limite201 sem truncamento e correção explícita até200.
- Prévia valida mesma equipe/campeonato/temporada e outra disputa; preserva destino existente, identidades e camisas0/00/null, bloqueia naipe/vínculo/transferência e conflitos de camisa. Não cria pessoa/equipe/inscrição, não grava banco e não altera origem.
- Não há reader/writer SQL, API ou diálogo de reaproveitamento disponíveis ainda. Esta prova pura não equivale a integração ou capacidade real de banco.

## Correspondências de alta confiança no importador atual

Pedido adicional do responsável: não exigir conferir individualmente nomes e registros já correspondentes. A descoberta já estava disponível no matching, mas `refreshMatches` descartava todas as escolhas existentes para os statusregistration/name/suggestion.

`automatic-match.ts` escolhe somente identidade segura, com `approveChanges:false`, mantém camisa/vínculo existente porID quando apropriado e deixa a confirmação do conjunto como única operação de gravação. Registro exato único tem prioridade; nome completo normalizado deve ser único; grafia muito próxima exige data completa igual. Homônimos/primeiro nome isolado e dados contraditórios permanecem pendentes. Não altera o matcher SQL nem suas guardas, não aprova campos globais e não desfaz decisões manuais ou linhas desmarcadas.

- RED: `.preview-artifacts/automatic-match-red.log`, três asserções de seleção falharam e três guardas já passaram contra retorno nulo. Nenhum código de produto antes do RED desse helper.
- GREEN: seis casos novos e composição com contrato/matching/prévia,31PASS/4arquivos em790ms; `.preview-artifacts/automatic-match-green.log`.
- Desktop: `npx playwright test tests/automatic-import-match.spec.ts tests/text-import.spec.ts --project=desktop`,11PASS em24,8s; `.preview-artifacts/automatic-match-browser-green.log`. Inclui seleção pelo registro entre homônimos, nome exato, nenhuma gravação antes de confirmar, retomada sem cliques individuais, ausência de pessoa duplicada, homônimos pendentes, escolha manual/linha desmarcada e regressões de ACK/reauth/conflito do importador.
- A primeira execução dos três browsers falhou apenas por locator exato de “Conferência salva”, que é parte de uma mensagem composta. Snapshot comprovou estado salvo. Corrigido para status com sufixo exato, sem correção de produto por essa falha. Não declarar a primeira execução aprovada.
- `npm run typecheck` PASS; ESLint focal dos arquivos novos/afetados PASS.
- Gate consolidado final **PASS/exit0:573unitários/117arquivos,6transportes,13PostgreSQL,23workerd,uma prova com4PDFs**, builds/tipos/lint/formato/fronteira/segredos738 aprovados. Log `.preview-artifacts/automatic-match-final-gate.log`, SHA256 `3b75324e7f38f434af8316e5a9d3f441f37e6a4f5f4ddd5e2b1df833542e5a99`. Browsers focais SHA256 `4dddeb69ed2fea50c1a2ebe40a61653237a148c2a4159c22c85bf5b3d7241ad8`. CI/deploy ainda pendentes; não atribuir esta evidência a código futuro de R2.
- Revisão do próprio autor; sem agente revisor independente disponível. Fixtures controladas não são aceite humano ou teste HTTP autenticado no ambiente real.

## Próximo

Gate consolidado quando a correção de pré-seleção estiver estável, CI e preview protegido conforme pipeline existente. Depois R2 de reaproveitamento porIDs com banco real descartável e versão/contexto, antes de oferecer cópia na interface. Nenhum dado humano removido/reescrito para testar;48migrations aplicadas permanecem imutáveis.

## CI e correção focal do alinhamento

CI40522137547/job122251769759/sourceb21f04a: gate573 aprovado, browsers **410PASS/2FAIL/66SKIP** em8,4min. As duas falhas são de alinhamento no painel compacto de transferência em1366/1920: diferença9,75px noLinux. Pré-seleção não consta entre as falhas; não atribuir aprovação integral a essaCI.

O grid esticava oslabels; ao quebrar um rótulo, distribuía a altura extra e desalinhava os controles. Reproduzido localmente com rótulos18px: diferença13,5px emRED, `.preview-artifacts/automatic-match-ci-layout-red.log`. A primeira tentativa de reprodução não alterava a fonte pela especificidade doCSS e passou; não foi evidênciaRED. `align-items:end` nofieldset alinha os campos pelas bases sem cortar o rótulo ou fixar altura.

Focal final `tests/admin-expansion.spec.ts tests/transfers.spec.ts --project=desktop`: **20PASS/33,4s**, `.preview-artifacts/automatic-match-ci-layout-green.log`. Formato/lint/buildfoundation/fronteira aprovados. JS/contratos/backend não mudaram depois do gate573; reutilizar essas provas e aguardarCI da fonte corrigida, sem repetir o gate local porCSS/teste. Download do artefatoCI falhou uma vez porTLS; diagnóstico usa logs e reprodução local, não trace baixado.

---

## R2a: fonte privada local,27/10/2026

Branch sequencial `codex/reaproveitar-elenco-banco`, baseb21f04a. CI40522137547/job122251769759 está verificando **b21f04a** (pré-seleção/visual), não o leitor posterior. Pacote b21/24assets/WorkerSHAdeb6fe60fb000a89c3e2dd373c93eb58369abcbcec8308c266a4fd08cd6d69d2 preparado de checkout limpo antes de R2. Usá-lo somente se a CI específica aprovar; não reempacotar R2WIP.

- RED real em `.preview-artifacts/roster-reuse-context-red.log`: zero/upgrade falharam na ausência constatada da operação de contexto. Seed válido de origem/destino foi aplicado antes da asserção.
- CLI fixada2.121.0, help específico lido, criou **20261027143904_roster_reuse_context.sql** apósRED. **Somente local, NÃO APLICADA no Supabase.** As48migrations existentes não mudaram.
- Reader identifica origens por equipe/temporada/disputa, separaA/B, inclui contagem/ordem de salvamento e páginas20. Contexto contém candidatos porIDs, camisas e elegibilidade derivada, destino atual e fingerprint. Sem nascimento/registro privado noDTO e sem inferência etária pelo nome da categoria. Não grava vínculos.
- Autorização fresca antes de olhar o contexto, RPCs estreitas e helpers internos sem grants públicos. Lock compartilhado da raiz para leitura consistente, sem adquirir lock de atleta depois da raiz. Writer futuro deverá adquirir atletas antes da raiz.
- GREEN final: nove testes/2arquivos em4,46s (`roster-reuse-context-composition.log`), dois cenários PostgreSQL do zero/upgrade e sete da prévia. Verificados11candidatos, já incluído preservado, vínculo em outra inscrição/histórico de transferência, conflitos0/00/null, naipe, exclusão de outra equipe/temporada, páginas20+3 e IDs únicos, fingerprint alterado por camisa destino,2000inteiros/2001recusado413, anon/outro usuário/revogação e rollback. Origem e vínculos existentes iguais antes/depois do reader.
- Tipos completos e ESLint focal aprovados. Sem gate/CI do reader e sem prova remota ou de carga/concorrência multiconexão para ele; não atribuir gate573 à migration nova.

PróximoR2b: RED de writer atômico/recibo por comando, seleção/camisa/contexto/versão/freshAdmin, preservação da origem/destino e G4, antes de nova migrationCLI. Sóaplicar reader/writer ao projeto novo após estabilizar essa unidade; nenhum SQL produtivo executado por simples retomada.
