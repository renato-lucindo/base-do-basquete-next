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
