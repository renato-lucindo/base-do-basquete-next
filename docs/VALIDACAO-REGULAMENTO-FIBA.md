# Validação do regulamento simplificado

Material: `16734b3e5231847c1767dc1336e50a04dc9ab8a2`, [PR #72](https://github.com/renato-lucindo/base-do-basquete-next/pull/72). Base `39ed1c4`. Plano autorizado em [PLAN-REGULAMENTO-FIBA.md](PLAN-REGULAMENTO-FIBA.md); contrato vigente em [ADR 021](decisoes/021-regulamento-fiba-simplificado.md).

## Resultado observado

Novas configurações recebem pontos, W.O. e desempates preenchidos. A página reúne participantes, grupos/turnos e revisão/publicação; exceções ficam recolhidas e justificadas. O regulamento anterior não é reinterpretado. Turnos ausentes em dados antigos aparecem como não definidos, até escolha explícita.

Rascunhos incompletos sobrevivem à recarga, sem gravar regulamento oficial nem publicar. CAS da versão do rascunho e da base oficial impede sobrescrita concorrente; recibo recupera ACK perdido. A recarga conserva a edição local e atualiza o contexto oficial. É possível voltar à configuração confirmada e salvar essa escolha como novo rascunho.

O administrador pode ordenar um empate com comentário privado. O servidor registra autor/data e ignora metadados forjados. A decisão aplica somente à base exata e ao conjunto empatado revisados; mudança relevante retira seu efeito e sinaliza revisão. Sem decisão, salvar/publicar continua possível. Editar um desempate admite aplicar ou cancelar, com guarda contra navegação e salvamentos que perderiam o texto local.

O teste integrado de navegador configura a disputa, salva, revisa/confirma publicação e abre a classificação pública antes de resultados, com empate pendente. Banco e navegador usam dados sintéticos; não são prova de publicação real.

## Verificações

Ambiente local: Windows, Node **24.18.0**, lockfile existente. Logs completos ficam ignorados em `.preview-artifacts/`.

| Verificação                                                    | Resultado comprovado                                                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Etapas de `npm run gate`, unitários com `--maxWorkers=1`       | PASS; 758 testes/159 arquivos                                                                                                           |
| Transportes                                                    | 11 PASS                                                                                                                                 |
| PostgreSQL isolado do gate                                     | 15 PASS                                                                                                                                 |
| HTTP/Worker após acrescentar o novo caso de rascunho           | 34 PASS                                                                                                                                 |
| Runtime PDF                                                    | 1 PASS                                                                                                                                  |
| Lint, formato, tipos, builds, fronteira cliente e segredos     | PASS                                                                                                                                    |
| Chromium completo desktop/mobile                               | 712 PASS, 116 SKIP existentes, 2 FAIL corrigidos; repetição focal 2/2 PASS                                                              |
| Consumidores finais: regulamento, fluxo, expansão e publicação | 69 PASS, 11 SKIP existentes, 80 cenários desktop/mobile                                                                                 |
| Fluxo novo isolado                                             | 18 PASS, desktop/mobile                                                                                                                 |
| CI final                                                       | [Checks do HEAD da PR](https://github.com/renato-lucindo/base-do-basquete-next/pull/72/checks); conclusão registrada na descrição da PR |

O gate foi executado em etapas sequenciais equivalentes, limitando somente a concorrência dos unitários. O comando de fronteira via `npm exec` resolveu um Node alpha no cache; a verificação foi repetida diretamente em Node 24.18.0 e passou. Nenhuma dependência ou lockfile do projeto mudou. Após ajustes finais de UI, tipos/lint/build/fronteira e cenários focais foram verificados novamente; a CI compõe a árvore final.

A [CI f610ce2](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42341718405) falhou somente nos dois casos de expansão administrativa que pressupunham regras abertas. Abrir explicitamente as regras revelou um desalinhamento no desktop; o grid foi corrigido e as asserções de geometria, largura e axe foram preservadas. Os demais jobs passaram, incluindo 28 cenários WebKit. Não foram acrescentados skips nem alterados timeouts. A suíte final dos 80 consumidores passou após a correção; as provas anteriores dos artefatos inalterados são reutilizadas até a composição da nova CI.

Provas relevantes incluem RED→GREEN para reinício FIBA versus legado, empate completo, placar desconhecido, paridade SQL/TypeScript, corpo de rascunho inválido, padrões/turnos, preservação de turnos antigos e guarda de edição do desempate. Os testes também cobrem autoria forjada, remoção de notas privadas da fonte pública, sessão/CSRF, comando congelado, concorrência e base oficial obsoleta.

Reflow/capturas: **1366×768**, **1920×1080**, **390×844** e **320×720**, incluindo nomes longos. Axe focal sem violações. Evidências `regulation-workflow-after-*` são produzidas no artifact dos browsers. Inspeção autoral e axe não constituem aceite humano nem certificação WCAG.

## Revisão e decisões de implementação

Revisão autoral separada sobre o diff do material, sem revisor independente disponível. A revisão de UI usou os padrões do repositório e as [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas em 07/11/2026. Não foram importadas recomendações irrelevantes da pesquisa inicial de progressive disclosure.

- Política opcional distingue o reinício FIBA do algoritmo histórico; personalizar a ordem conserva o reinício nas novas políticas.
- Base exata dos fatos públicos mantém a projeção síncrona e evita depender do fingerprint privado. Continua sujeita ao limite existente de **1 MiB** da definição/operação; não é um novo formato ilimitado.
- Notas ficam no JSON privado versionado. O escritor audita metadados, o candidato remove notas/motivos e o contrato público rejeita esses campos, inclusive vazios.
- Não foi ampliado o escopo para insuficiência, reincidência, sorteio, geração de jogos, cópia de edições, comparação entre grupos ou mudanças no mata-mata. Pendências de jogos e conflitos existentes não são eliminados pela decisão de empate.

## Migrations e serviço

Somente criadas e testadas localmente, em ordem:

| Migration                                        | SHA-256 do conteúdo Git/LF em `f610ce2`                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `20261107010722_regulation_fiba_policy.sql`      | `3f19067e0b154d58f6385b1851b8eb11ecd2dfd039dcea1bda7524dbf89058a2` |
| `20261107042840_regulation_private_workflow.sql` | `16470a0b5319803e21b939524836fe60cf9e0a333311fa4643ae59d8ba75c2f5` |

A segunda migration contém tabelas/recibos privados de rascunho, validação fechada de documentos incompletos, RPCs autenticadas, auditoria e redação do candidato público. Privilégios diretos são revogados e RLS permanece ativo. Não foi executado DDL/DML remoto, seed, deploy, alteração de Access/bindings ou publicação de dados humanos.

A autorização permanente para migrations somente de leitura no desenvolvimento não cobre estas tabelas/escritas. Aplicação remota e liberação permanecem pendentes; pela regra de `AGENTS.md`, esta PR fica fora da main enquanto houver migration não aplicada. Estado real de CI/serviço e próximo passo no [checkpoint](PROGRESSO.md).
