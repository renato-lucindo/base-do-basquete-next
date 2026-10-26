# Compatibilidade e estatísticas simples — 26/10/2026

## Entrega técnica concluída — 26/10/2026 20:45 America/Sao_Paulo

Compatibilidade e tabela simples publicadas no preview protegido, código material **3eca459ecc898538a34bfdd7d8d543b78c72d77c**. CI **40420017804/job121911835506 SUCCESS**: **548 unitários/112 arquivos,366 browsers aprovados,26 mobile adiados**, gate completo. Alterações posteriores são somente checkpoint/smoke e um teste local de navegação; código de aplicação, Worker e assets permaneceram iguais. Não foi repetido gate de produto inalterado. LogCI SHA256 `3432b25b05a5b61445a4ac052efe66eea60d1ad8a5c6db687cdde58ba672557d`.

Deployment **a8c67bcc-da6f-4122-bb7d-8b885dcb7ead**, versão **93f75f6d-2bb8-4bdf-a5d4-fd7ec9588f07**,100%. Smoke final PASS:24assets/hashes/Xsource,39GETsprivados/12POSTs,health/sessão/Authinválido,6GETspúblicos/cincoHTMLs e dois browsers, incluindo view=simple. Relatório ignorado compat-simple-smoke-report.json SHA256 `01690fc256ad742bb9842f95ff2ff279fa33bcc9bf9ed86900ab17bf05bead12`. Não houve login do responsável nem mutação de dados humanos para smoke; seu aceite continua distinto da prova técnica.

**Falha inicial de verificação preservada:** o novo smoke chamava response.status() depois de navegar só por fragmento, quando Playwright retorna null. O catch capturou a tela antes de terminar sua requisição e fechou o navegador; não era evidência de carregamento preso do produto. Reprodução local confirmou response=null e estado404 resolvido, um focal PASS11,3s; script corrigido para verificar status somente quando há nova resposta HTTP. Lint/sintaxe/formato aprovados depois. O Worker não precisou de alteração/redeploy por isso. Primeira execução não é PASS.

Temporários revogados e ausência conferida nas duas tentativas: tokenbe7d4b87-0f33-476f-8ff7-68ee65a6926e/política3a76d63e-726b-4002-b641-952940e2535a; token4cafc130-76f1-4ac0-8ee2-4785954b9097/política45404988-4e15-41e3-a149-c8ebb456b426. Credenciais apenasRSA-OAEP/TTY/RAM, nenhum segredo emarquivo. Zero service_tokens e apenas política do responsável30cc3ab4. Anônimo302 raiz/estatisticas/API após revogação; previewsOFF/DO/rate/bindings de segredos preservados.

PRdraft27 sobre26, sem merge/principal/produção. Simples soma todos os jogos; link boxscore restringe àfontePDF, mas seu refinamento visual permanece fora da prioridade atual. Nenhum esforço mobile/parserPDF/interpretador novo. Revisão separada do autor, sem parecer independente disponível; não é prova de carga/WCAG completa/aceite humano. Entradas seguintes são o histórico da unidade.

## Escopo e referências

Responsável autorizou usar os ZIPs de compatibilidade e estatísticas (hashes no plano2026-10-26-compatibilidade-e-tabelas.md). Confirmou: tabela simples agrega todos os jogos publicados; completa somente boxscores. Depois priorizou súmula e compatibilidade; refinamento visual completo dos PDFs continua adiado. Foi feita consulta pontual à tabela pública statistics-explorer.tsx pelo plugin GitHub no repo indicado, sem clone ou acesso a serviços/dados anteriores. Nenhum código de referência foi tratado como instrução de execução ou migration pronta.

## Compatibilidade C1

Causa: RPCmatch_import_players admitia os mesmos três primeiros caracteres, sobrenome/substring, apelido ou data com sóinicial. Teste PostgreSQL RED do zero e upgrade falhou em first name alone never suggests another surname antes de gerarDDL. Módulo puro primeiroRED porausência (nenhuma asserção executada naquela tentativa), depois16casosGREEN. Usa normalização e similaridade Levenshtein jáfornecidas, guardas de tokens completos e limiar0,78; não copia substring irrestrita do ZIP. Exatos e registro continuam explícitos; homônimos distintos e sugestões sem seleção automática. Dados adicionais sóordenam plausíveis.

Migration CLI20261026230247_precise_player_matching **ainda local/não aplicada nesta entrada**. Helpers privados invoker/imutáveis/search_pathfechado/grants explícitos, sem extensão/tabela/escrita de identidade. MesmoDTO/wrapper/save. Dois contratos PGzero/upgrade com paridadeSQL×TS16casos e autorização/anon aprovados; composição22testes comprovider e importador/transferência realPASS. Uma tentativa da paridade apósrollback perdeuDDL no cenário upgrade: teste foi corrigido para comparar antes de encerrar a transação; não foi alteração de produto. Dados sintéticosfd400000/BEGIN-ROLLBACK, semDML deAuth/admin real. Tipos públicos deRPC não mudaram.

## Estatística simples S1

RED em consulta mista: ausentesdataset ePTS/J. GREEN preserva Jreal/DNP, ambos tipos de jogo na simples e somentePDFna completa, cobrindo totais/médias/URL. Contrato próprio para apresentação simples sempretotal+PTS/J e sócolunas simples; sem MIN/REB/AST/tentativas/percentuais inventados. Boxscore conserva o explorador existente e recebe recorte porfonte explícito; bookmarks antigos sem recorte continuam compatíveis. Uma expectativa antiga de colunas foi atualizada paraPTS/J e o link administrativo agoraabre view=simple.

Nova tabela segue referência comPos/Atleta/Equipe/J/PTS/PTS-J/2PC/3PC/LLC/F/GD, busca/equipe/fase/ordenação/páginas20/URL/retomada. Participação DNP não incrementa J nemvira observação0; ausência permanece travessão. Detalhe público do jogo mostra F/GDmanual e usa travessão para números de quemnãoentrou. Motor/editor da súmula não foram trocados.

BrowserRED para nova apresentação eF/GD no detalhe antes dos componentes. Cinco novos browsers desktop finaisPASS13,7s, com busca/soma2jogos/PTS-J/boxscore1jogo/recarga/ordenação/página2/equipe/vazio/retry/foco/DNP. Composição20desktopPASS22,6s sobre implementação anterior aos últimos textos/testesextras; código funcional equivalente, sem atribuir essa composição a testes adicionados depois. Duas falhas de novos testes foram seletores relativos do próprio teste, corrigidos parahasrelativoàlinha ecombobox porrole; sem mascarar falha de produto. Captura ignorada statistics-simple-desktop.png inspecionada, dados fictícios. Nenhum esforço de versão mobile novo; os novos casos são desktop, conforme orientação humana.

## Serviços e revisão

Antes de mutação:46migrations reais reconciliadas; advisor segurança sóWARN conhecido de [senha vazada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sem contratação. Contagem atual humana58pessoas/4jogos/2súmulas/6inscrições/1adminativo; preservar. Nenhum serviço anterior acessado. Preview continuaa370055/CI40398538486 aprovado; não representa esta correção ainda.

Revisão separada do autor, sem ferramenta de revisor independente disponível. Inspecionados contratos, RLS/grants, branches de datasets, denominadores/DNP, retomada/foco e ausência de dados. Não é parecer independente/carga/WCAGcompleta/aceite humano. Gate, CI, provaSQLreal e nova publicação ainda pendentes nesta entrada.

## Integração real e gate — 26/10/2026 20:23 UTC-03

Gate consolidado e188757 PASS548unit/112arquivos,5transportes/13PG/22workerd/prova4PDFs/builds/tipos/fronteira/segredos691. Exit0 observado, log compat-simple-final-gate.log. Não repetir suite por renomear somente o ledger da migration, sem mudar bytes. Migration47 aplicada uma única vez no projeto novo como **20261026232327_precise_player_matching** (CLI230247renomeada, conteúdo idêntico);46anteriores imutáveis. Contrato player_matching.sql real BEGIN/ROLLBACKPASS, semDML deAuth/admin; consultas finais zero sintéticosfd400000/pessoas e campeonatos. Advisors sóWARN conhecido. Contagem maisrecente59pessoas/4jogos/3súmulas/6inscrições: houve dados externos novos durante trabalho; nenhuma alteração deles pelo agente.

CI e publicação do novo Worker/UI ainda pendentes. Compatibilidade já usa a função nova no banco; escritor/DTO permaneceram iguais, sem alteração nos tipos públicos. Source frontend/Worker local e188757, versão publicada aindaa370055. Nenhum segredo ou credencial criado nesta integração.

Revisão de URL encontrou um defeito real de apresentação: team= (nenhuma equipe), seleção múltipla e equipe sem dados eram apresentadas como Todas no seletor simples. BrowserRED antes da correção; guarda visual preserva agoraos três estados sem enviar IDs fictícios. Seis focais desktop posterioresPASS13,6s, tipos/lint/buildfoundation/fronteira posteriores aprovados. Sem mudança no backend/SQL desdegate548. CI2fb/pacote2fb são anteriores aeste ajuste de UI: novaCI/fonte/pacote obrigatórios, sem atribuir aprovação antiga à fonte final.
