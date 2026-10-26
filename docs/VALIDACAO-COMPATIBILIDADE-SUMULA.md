# Compatibilidade e estatísticas simples — 26/10/2026

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
