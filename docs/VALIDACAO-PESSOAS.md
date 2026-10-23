# C3 — pessoas e elencos persistidos

Branch `codex/pessoas-elencos`, PR draft #6 sobre C2/#5. Banco no projeto novo `nizmasjddyrhmevvfviz`; migrations 20261023122129, 20261023122809, 20261023123042, 20261023161538 e 20261023161949. Dados reais anteriores preservados. Técnico tem tabela própria e compartilha identidade com atleta quando aplicável.

## Evidências locais, 23/10/2026

- Gate consolidado PASS: lint, formatação, bindings/tipos, **98 unitários/19 arquivos**, cinco transportes, quatro cenários PostgreSQL do zero/upgrade com contratos compartilhados, seis cenários workerd/DO, builds, fronteira do cliente e scan de 234 arquivos sem padrão de segredo.
- **24 cenários de navegador PASS**: oito novos de C3 e dezesseis regressões acesso/C1/C2 em desktop/celular. Repetição focal do percurso de elenco após ajuste de tabela: dois PASS. CI consolidará todos os cenários Linux do source final, sem execução local redundante do harness imutável.
- C3 cobre ordem 0/00, mesma pessoa atleta/técnico, assistente, inscrições independentes, vínculo ativo duplicado recusado, encerramento/histórico, homônimos explícitos, mesmo comando após envio incerto, conflito de pessoa/camisa até recarga explícita, reautenticação/rascunho e naipe salvo apesar de edição pendente em Informações.
- RED→GREEN adicional impediu retirar o papel exigido pelo fluxo durante o cadastro contextual. Recarga de conflito de camisa foi corrigida para não ser bloqueada pelo próprio estado de envio.
- Capturas de fixtures `.preview-artifacts/pessoas-desktop.png` e `pessoas-mobile.png` inspecionadas. Reflow em 320px sem rolagem da página; tabela mantém rolagem contida e foco por teclado. Não comprovam dados reais nem auditoria completa WCAG.
- Contratos de pessoa/elenco/comissão executados também no Supabase real com rollback; comissão/candidatos mais recentes preservam pessoas/vínculos/recibos novos vazios. Contagens do responsável C1 1/1/2, C2 2/2, Auth/admin 1/1. Advisors: somente aviso conhecido de proteção de senha vazada/Pro; plano Free preservado.

Busca contém apenas dados públicos e contextos de desambiguação; abertura de pessoa é administrativa. Banco é autoritativo, navegador não recebe chave/JWT/SDK Supabase. Nenhuma transferência automática, capitão ou titular de jogo é inferido do elenco.

## Entrega

Publicação C3 e avaliação humana ainda pendentes neste registro. O preview permanece protegido; detalhes do deployment anterior em VALIDACAO-EQUIPES.md. O helper de smoke inclui as seis novas leituras de pessoa/elenco/comissão, que devem retornar 401 sem sessão mesmo após passar pelo Access.

Revisão pelo autor; revisão independente, corrida real multi-conexão, escala e auditoria completa de acessibilidade continuam pendentes. Reutilizar evidências dos 126 testes do harness, ZIP e protótipo inalterados.
