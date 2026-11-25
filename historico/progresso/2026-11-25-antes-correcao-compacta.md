# Progresso atual

Atualizado em25/11/2026. [Checkpoint anterior preservado](../historico/progresso/2026-11-25-antes-tabelas-filtros.md).

## Unidade e evidências

- Mesma branch codex/perfis-equipes/[PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), fonte executável6c08a024a7ef46154df7f52e3dbeff9196c88920. Implementação99d606e, correções visuais a1cefc9/6c08a02. Sem merge autorizado, API, schema, regra esportiva ou dados humanos alterados; checkpoint local anterior e mudanças preexistentes preservados.
- [Plano/matriz anterior à edição](PLAN-TABELAS-FILTROS.md), [validação e limites](design/VALIDACAO-PERFIS-EQUIPES.md#tabelas-filtros-e-buscas--25112026), [capturas](design/evidencias/2026-11-25-consultas/README.md). Padrões compartilhados de consultas substituem rótulos laterais. Formulários mantêm labels visíveis; métricas reservam formatos, cabeçalhos centrais/valores direitos, limpeza não apaga preferências; campanhas e classificação compartilham resultados coloridos.
- Gate completo PASS:182arquivos/857unitários,323,53s;19transporte/16banco local/35acesso/1PDF e builds/fronteira/segredos PASS. Gate:ui final PASS. Matriz final18PASS em seis larguras/zoom200%, incluindo todos os cabeçalhos e valores. Regressão adicional112PASS/32dispensas preexistentes. Catálogo Chromium/WebKit e design:verify completo PASS; detalhes de falhas/correções e reaproveitamento de provas no relatório. Sem novos skips ou limites de tempo maiores.

## Publicação e próximo passo

- Fonte6c08a02 nos mesmos Workers: admin versãoaad50e1b-efcc-4ea5-8fbf-b3142bd816e5/deploymentd015f560-9ec7-43fa-b830-30ac66a97ee9; preview versãod221f8b7-a14d-446f-bab2-f0dc0881f7a0/deploymentf821801b-ab10-43c1-b9cf-dc521881ada8. Upload Wrangler e ativação pelo conector Cloudflare; namespace597c612fd69c447e81547f16d5dcca41, segredos e flag preservados. Sem Access, novo Worker ou alteração de domínio/raiz/www.
- Smoke200/fonte correta, privadas401admin/403preview e12assets iguais ao build por SHA256. Navegador remoto confirmou todas as siglas centrais, valores direitos, labels ocultos nas consultas e E-mail/Senha visíveis no login. Consulta remota apenas de leitura; operação autenticada validada com fixtures. A primeira publicação revelou sobrescritas legadas, corrigidas e revalidadas antes do fechamento.
- Serviços: https://admin.renato-lucindo-jr.workers.dev/ e https://preview.renato-lucindo-jr.workers.dev/. CI do HEAD documental de fechamento pendente; conferir o HEAD real e resultado obrigatório validate. Sem repetir suítes materiais por documentação. Atualizar a mesma PR89 e acompanhar a CI pela checagem oficial; encerrar a checagem quando terminar, sem esperar aceite humano. Merge depende de avaliação visual e aceite explícito do responsável.

HEAD documental d24805a7daddb9ff418aa6124ff5de2eed9d7513 enviado, CI pull_request45629988602 em andamento. Checagem oficial conferir-ci-das-consultas-pr89 ACTIVE, a cada10min, vinculada a esta conversa, confirmada pela ferramenta. Não interpretar CI2143770 como validação desta entrega. Próximo passo: conferir validate desse HEAD e encerrar a checagem ao terminar.

## Pausa obrigatória por cota — 25/11/2026

Ferramenta real:85% usados/15% restante na janela5h; saldo semanal80%. Reset1795627152, retomada autorizada e confirmada para25/11/2026 14:21:12 Brasília (reset+2min). Automação existente conferir-ci-das-consultas-pr89 atualizada, nome Retomar consultas PR89 após reset, ACTIVE, uma execução; DTSTART20261125T172112Z/COUNT1, confirmada por view e configuração gravada. Nenhum crédito ou reset consumido.

CI45629988602:job WebKit139260373227 FAILURE; scope SUCCESS; checks/design/browsers ainda em execução na última consulta. A tentativa de baixar o log do job falhou em handshake TLS no armazenamento de logs; causa do WebKit ainda não diagnosticada. Não confundir isso com falha de transporte do produto. Próxima ação exata: conferir HEAD real da PR e resultado final dessa CI, obter log/annotations de WebKit, reproduzir focalmente e corrigir sem enfraquecer asserções ou aumentar timeout. Atualizar mesma PR e republicar os mesmos Workers se houver mudança executável. Ao concluir CI no HEAD real, excluir a checagem; merge segue sem autorização.

Árvore local: somente este checkpoint contém fechamento posterior ao push; preservar a alteração. HEAD remoto/local d24805a7daddb9ff418aa6124ff5de2eed9d7513; fonte executável6c08a02 publicada, smoke e navegador reais PASS; detalhes e capturas versionados. Não alegar entrega integral enquanto a CI estiver pendente/falhando.
