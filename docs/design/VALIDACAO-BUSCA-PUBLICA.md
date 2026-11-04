# Validação — busca pública e autocomplete

04/11/2026, branch `codex/busca-global`, base834693f após PR52. SHA/CI/aplicação real em [PROGRESSO.md](../PROGRESSO.md); contrato em [ADR020](../decisoes/020-busca-publica-normalizada.md).

## Resultado e limites

Autocomplete compartilhado, cinco sugestões por grupo, filtro de tipo, consulta a partir de dois caracteres após300ms, cancelamento e descarte de resposta antiga. Setas/Home/End/Enter/Escape, foco no campo, Tab nativo, clique em links e acesso aos resultados completos. Equipes deduplicadas com participações públicas e campeonatos com hierarquia; perfil sempre carreira completa. Busca/tipo/página/identidade e retorno na URL, página restaurada após carregamento dos resultados.

A RPC PostgreSQL normaliza antes da seleção e paginação em toda a fonte pública, com ordenação determinística e contagens. Não depende dos50 registros antigos nem de catálogo baixado no navegador. Consultas de páginas diferentes não têm token de snapshot compartilhado. Nenhuma promessa de desempenho no volume máximo real; não há índice materializado novo. Resposta excedente falha inteira, sem omitir participações silenciosamente.

## Evidências observadas

- SQL PGlite isolado: banco completo do zero, fixtures transacionais de publicações,67 perfis confirmados (66 correspondentes ao termo), resultado além do antigo corte50, ranking exato/início/trecho, caixa/acentos/NFD, apelido, páginas20/6 e ajuste ao fim. Cadastro privado e nome alterado não aparecem; perfil sem jogos e honraria sem atuação são descobertos. Retirada confirmada da honraria remove destinatário sem outra fonte. Helpers privados negados ao anônimo e entradas inválidas recusadas com PT400.
- Provider:3 testes PASS de RPC parametrizada sem JWT/cookie, correlação, contaminação, contagens e falha/abort sem eco do diagnóstico privado. SQL+provider:4 PASS.
- Workerd real local:1 PASS no endpoint, método/parâmetros, nenhuma sessão/Authorization encaminhada, no-store, DTO contaminado e erro seguro. Build Worker dry-run PASS; sem deploy.
- Browsers públicos:106 PASS antes dos últimos ajustes de CSS; novas verificações focais cobrem largura das opções, Escape a partir do filtro e320px/texto200%. Revisão focal final32PASS +2PASS do acesso direto por contexto. Gate anterior697unitários/144 arquivos, transporte7, banco13, Workerd30, PDF1 PASS; após fechar os últimos ajustes de contexto/teclado, gate final PASS:697 unitários/144 arquivos, transporte7, banco13, Workerd30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos.

## Revisão UI/UX

ui-ux-pro-max, consulta local de autocomplete/vazio/carregamento; [APG combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) e [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) consultados em04/11. Tema claro/azul e contratos locais prevalecem. Workers best practices aplicada ao transporte limitado e ciclo de requisição; Supabase a funções/privilégios/migration.

Achados corrigidos: herança `.public-search > div` colocava sugestões em colunas estreitas, detectada por captura e protegida por geometria; Escape no filtro reabria o painel ao focar o input; cabeçalho320/texto200% quebrava a marca em caracteres, agora reflow em linhas completas. Retirada a repetição “Perfil público” em cada sugestão sem apelido. Capturas revisadas, sem aceitar apenas o resultado de axe. A ordem recebida da API não altera a navegação entre grupos: setas acompanham a ordem visual. Disputa identificada abre Classificação diretamente. Revisão do autor, sem parecer independente; axe não prova conformidade WCAG integral.

## Operação preparada

Migration nova `20261104163154_public_global_search.sql`, criada por Supabase CLI3.0.0 `migration new` (comando local/help conferido). Contém somente três funções e seus privilégios, sem DML, tabelas, colunas, índices, extensão ou publicação de dados. Migrations anteriores intactas. Alvo de desenvolvimento conferido por metadados: `base-do-basquete-next-dev`, ref `nizmasjddyrhmevvfviz`. Advisors do alvo consultados como baseline; isso não é prova da migration aplicada.

Aplicação real ainda NÃO executada nem autorizada por inferência. Primeiro concluir gate/revisão e disponibilizar diff, capturas e SQL exato na draft; então solicitar a operação concreta conforme CONTRIBUTING.md. A unidade permanece WIP até aplicação/validação compatível; não integrar código dependente de função ausente. Nenhum deploy, Access, seed ou confirmação de dados humanos nesta preparação.

## Capturas e operação revisável

[Autocomplete390](evidencias/busca-publica/autocomplete-390.png), [desktop](evidencias/busca-publica/autocomplete-desktop.png), [participações da equipe](evidencias/busca-publica/participacoes-equipe.png), [reflow320/texto200%](evidencias/busca-publica/reflow-320-texto200.png). Somente fixtures identificadas, sem alegar acesso real ao banco.

Browsers finais44PASS (busca/navegação/classificação/tabelas/retorno), mais10PASS após ajuste final de linguagem/isolamento CSS. Fonte estável; gate final PASS:697 unitários/144 arquivos, transporte7, banco13, Workerd30, PDF1, lint/formato/tipos/build/fronteira cliente/segredos. Revisão por arquivo/linha: search-form.tsx:104 (Escape/foco), search-contract.ts:130 (correlação da disputa), search.css:4 (painel vertical sem herdar layout antigo), search-state.ts (cancelamento/correlação), search-database.test.ts (prova de limite e publicação).

Migration preparada SHA-256 (UTF-8/LF, blob Git) `a444b816b374eeea0f78a9b2df7f13598cbe753701420216db21a0496b851b19`. Aplicação proposta somente no projeto de desenvolvimento identificado, em uma transação de migration com histórico, sem DML/seed, dados publicados, deploy ou mudança de Access. Após autorização/aplicação: conferir histórico e definições/grants, consulta anônima somente leitura, erros de entrada/negação dos helpers e advisors em comparação ao baseline; registrar resultado efetivo. Reversão técnica, se necessária e autorizada: remover apenas as três funções novas na ordem RPC → helper de entidades → normalizador, sem CASCADE nem alteração de dados. Não executar reversão automaticamente.

Preview local desta unidade: [abrir com fixtures](http://127.0.0.1:5180/publico.html), isolado dos previews4189/5177 e sem banco/sessão. Porta configurável por PUBLIC_PREVIEW_PORT; cache Vite por porta. Smoke Playwright390px: busca “joao”, escolha por teclado, abertura do perfil contínuo e zero pageerrors. [Captura do preview](evidencias/busca-publica/preview-local-390.png). Script/logo identificam dados fictícios, sem alegar implementação remota.
