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

Source **`81f5f41769793c7fd6bc257222bb41bb50a7a249`** publicado em **23/10/2026 13:45:07 America/Sao_Paulo (16:45:07 UTC)**. [CI 39989303613](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39989303613), job `120536610213`, **SUCCESS**: gate e 54 cenários de navegador Linux (9 arquivos), integridade do pacote preservado. Responsável convidado a validar C3; resultado humano ainda pendente.

[Preview protegido](https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/), Worker `base-do-basquete-next-preview`, conta `16b4a5e0a99a031d28051ebadb4811cc`. Deployment **`2ff9f5e0-9dee-4c26-a4dd-e9b0aeeff429`**, versão **`55eaf93b-a4aa-4e56-b537-7f834bbe9354`**, 100% do tráfego. Access app/política permanente continuam somente do responsável; previews de versão OFF. Namespace SessionStore `0411ac931ca54d289d270606c7e87ef7`, limiter e nomes das duas credenciais no cofre preservados, sem ler valores/rotacionar chave AES.

| Artefato                     |  Bytes | SHA-256                                                          |
| ---------------------------- | -----: | ---------------------------------------------------------------- |
| foundation.html              |    480 | 096074535144a490ccf505a2bd3ff45ce4ed9d8f259c852598e3e58a22addb46 |
| foundation-k0iOh_nk.js       | 352790 | fcd0d20bdc46d6d26a1ef34ce49fdab6a271c6204839ecc0b331a3ac6a584256 |
| foundation-uVv-pZmL.css      |   6625 | 28ee819d62001a500e2e9191a79913ffe313c87b96c8b8a3850cda06a0afde36 |
| Módulo servidor, não servido |      — | 59cc8499919d06f75ce19376dd3ba41d20c36379c640cd998940147a96880c64 |

Smoke remoto PASS: três arquivos por hash/source, health 200, sessão e 12 leituras C1/C2/C3 sem cookie 401 depois do Access, módulo servidor 404, login inválido recusado pelo Auth real sem cookie da aplicação; formulário pronto nos dois viewports, sem erros nem armazenamento de tokens no browser. Não usou senha do responsável. Primeiro início local foi encerrado antes de criar credenciais por parsing de ANSI do PTY; repetição válida concluiu.

Token efêmero `65e87f77-42ea-4f04-888a-ac72c53b8b1a` e política `361afc39-9f0b-4edf-b2c9-c6b379799290` **revogados**. Credencial trafegou cifrada para chave privada efêmera em memória. Após revogação, raiz, três novas coleções, JS/CSS e worker.js retornaram 302 Access sem conteúdo/cabeçalho da aplicação; política única do responsável reconfirmada. Nenhuma credencial/processo de smoke ficou ativo.

Contagens reais reconfirmadas às 13:47 UTC-03: C1 1/1/2, C2 2/2, pessoas/elenco/comissão 0, Auth 1. Não houve gravação de fixture permanente. Rollback de código conserva Access/cofre/namespace e dados/migrations; versão C2 anterior registrada em VALIDACAO-EQUIPES.md.

Feedback posterior do responsável em 23/10: **não gostou do fluxo** e forneceu módulo complementar de importação para análise. Isso exige revisão da experiência; não registrar aceite humano C3/importador com base nos testes. Análise e recomendação em ANALISE-IMPORTADOR-DE-EQUIPES.md, sem alteração do preview neste pedido.

Revisão pelo autor; revisão independente, corrida real multi-conexão, escala e auditoria completa de acessibilidade continuam pendentes. Reutilizar evidências dos 126 testes do harness, ZIP e protótipo inalterados.
