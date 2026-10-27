# Administração compacta — expansão aprovada em27/10/2026

Autorização: após aprovar Editar pessoa/camisa e pedir próximos passos, o responsável confirmou “Ok, inicie” a padronização das demais telas. Referência: piloto claro/azul aprovado, campos expostos e proporcionais, desktop1366×768/1920×1080, pouca rolagem. Plano anterior: `2026-10-26-administracao-compacta.md`, unidade4.

## Unidades e critérios

1. Campeonatos/temporadas/disputas: ativar cabeçalho compacto na listagem e Informações; listagem tabular, ano curto, disputas com campos lado a lado e ações próximas. Nomes acessíveis, navegação, guarda de alterações, versões/ACK/reauth intactos. Comparar capturas nos dois desktops e testar salvamento/retomada existentes.
2. Regulamento e premiações: mesmo cabeçalho, seções e ações próximas, campos curtos proporcionais, inscrições/seleções em colunas e estrutura hierárquica legível. Conferência/motivo/impacto continuam explícitos, sem publicar nem inferir regras.
3. Painéis administrativos relacionados: examinar transferência, perfil, decisões e confirmação manual; aplicar apenas densidade/formulários coerentes, preservando avisos e confirmações, súmula lado a lado e teclado. Sem modificar cálculos, APIs, dados ou comportamento de publicação.
4. Composição focal desktop, capturas, revisão de código e acessibilidade do recorte; um gate consolidado/CI quando estável; preview protegido com smokes e revogação imediata de credenciais temporárias.

## Continuidade

- Branch sequencial `codex/admin-demais-telas` sobre `16e171a9baa09173af71b4e521b6c74ce4908b55`/PR30, sem escritor paralelo. `.agents/` e `skills-lock.json` são humanos e permanecem preservados/não rastreados.
- Produto e banco atuais preservados. Nenhuma migration prevista. PDF, parser, mobile e consulta pública fora deste recorte. Nenhuma instalação de biblioteca ou mudança de identidade adicional necessária.
- Reutilizar gate560/CI394/SQL/harness anteriores para artefatos inalterados. Mudança de composição exige prova focal nova; não equivale a aceite funcional integral/WCAG completa/revisão independente.
- Cota inicial observada61%usados5h/79%semanal; parada real aos85%usados5h conforme responsável, reset+2min pela ferramenta oficial, sem estimar horários. Automação anterior excluída; criar uma única retomada apenas se necessário.
- Este plano e `docs/PROGRESSO.md` são o ledger do projeto. Preflight: CSS compartilhado afeta demais painéis; limitar seletores por classe/desktop e verificar composição antes de release. Checkout sequencial já autorizado, sem criar worktree paralelo.

## Ledger

- A1/A2/A3 implementadas: cabeçalho/listagem/informações, regulamento/premiações, transferência/perfil/decisões/desistência. REDs geométricos observados e corrigidos;87desktop de composição PASS. Campos do diálogo de jogo ajustados por último após RED próprio; focal final em andamento. Sem backend/DDL ou alteração em dados humanos. Ver `docs/VALIDACAO-DEMAIS-TELAS-COMPACTAS.md`. Nenhuma nova decisão de produto; aprovação prévia cobre composição e publicação no preview protegido.
- Início: árvore rastreada limpa, HEAD/base16e171a remoto confirmado na PR30 OPEN/MERGEABLE; previewc9fe7e2/CI40500316561 já aprovado. Nenhuma nova operação remota em andamento. Próximo: capturas/testes de densidade reais antes de alterar layout.
