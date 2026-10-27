# UI/UX desktop — etapa 3 (revisão incremental)

## Referências consultadas
- Figma Make: `Improve Player Profile and Game Details UI`, visual de perfil e detalhes de partida (protótipo de dados fictícios).
- Especificação visual vinculada ao Make: `plans/identidade-visual-base-do-basquete.md` (Sports Data Minimalism, azul #075FCA, tinta #101827, superfícies brancas, divisores e WCAG AA).
- Repositório histórico `renato-lucindo/base-do-basquete` está arquivado; não deve ser usado como alvo de commits.
- Produto ativo: `renato-lucindo/base-do-basquete-next`, continuidade da PR #35.

## Recorte implementado
- Estilos somente desktop, `min-width: 1000px`, sobre `.compact-pilot`; sem mudanças no mobile.
- Estados `:focus-visible` para navegação, ações e campos de formulário; destaque de linha por `:focus-within`.
- Cabeçalhos de tabelas com contraste mais forte, divisores consistentes e valores tabulares.
- Importação textual compacta: largura mínima de 1900px para 1220px no desktop quando dentro de `.compact-pilot`, redução de espaçamentos; preservada a rolagem horizontal quando os dados não couberem.
- Sem mudança em React, API, RLS, banco, regras, validações ou contratos.

## Limites e validação
- Esta primeira unidade cobre a base visual das tabelas e da importação; **não equivale** à conclusão da padronização de todos os formulários nem à auditoria WCAG.
- Confirmar montagem real de `.compact-pilot` sobre os fluxos de importação em capturas de 1366×768 e 1920×1080.
- Conferir casos de tabelas extensas, nomes longos, zoom de 200%, navegação Tab/Shift+Tab e perda de foco.
- Executar `npm run gate` e `npm run test:e2e` no SHA da branch; não declarar PASS sem consultar o workflow.
- PR deve continuar draft, sem merge ou deploy.

## Próximas unidades
1. Conferir por capturas reais a geometria das telas de Campeonatos, Jogos, Equipes, Pessoas e Regulamento, com a mesma fixture antes/depois.
2. Corrigir inconsistências comprovadas em cabeçalhos, formulários, tabelas e fluxos de edição, preservando controles existentes.
3. Validar foco de diálogos, contraste e reflow 200%; não substituir guards síncronos sem revisão de contrato.
4. Consolidar feedback de operações sem duplicar avisos nem ocultar erros persistentes.
