# Progresso atual

## Regulamento simplificado — WIP, 06/11/2026

Unidade `codex/regulamento-fiba`, [PR #72 draft](https://github.com/renato-lucindo/base-do-basquete-next/pull/72), base `39ed1c42975c44d775460517c15ff66211a9f7ac`, implementação parcial `83ef12bfb2f88d2ef9838272500cbc2f49f0db56`. HEAD real pode incluir checkpoint posterior. Worktree: `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. Plano autorizado: [PLAN-REGULAMENTO-FIBA.md](PLAN-REGULAMENTO-FIBA.md).

Implementado: política opcional `calculationPolicy: fiba-2026` reinicia desempates nos dois motores; ausência mantém algoritmo legado. Contratos distinguem versões. Factories com pontos 2/1, W.O. 20–0/0 e turnos 1/2; novos rascunhos/fases da tela usam os padrões. Migration `20261107010722_regulation_fiba_policy.sql` criada pela CLI e testada apenas no PostgreSQL isolado, preservando OID/ACL e validação antiga.

Provas locais: `npx vitest run src/regulation --maxWorkers=1`: **141 PASS/21 arquivos**. Inclui exemplo D.2.2, cenário que distingue reinício, empate completo, placar desconhecido e paridade SQL/TypeScript; testes novos RED→GREEN. Typecheck, ESLint/Prettier focal e diff check PASS. Chromium desktop `--grep 'nova configuração recebe FIBA'`: **1 PASS**, após RED; verifica padrões e gravação de dois turnos. Sem publicação real.

[CI de 83ef12b](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/42322720923) **IN_PROGRESS** na última consulta, sem conclusão alegada. Gate consolidado, browsers completos, revisão final e aceite pendentes. Não integrar WIP.

## Pendências e próximo passo

- Implementar decisão manual de empate: ordem/quem avançou, comentário privado, autor/data/contexto; sem bloquear salvar/publicar se não houver decisão. Sinalizar revisão ao mudar fatos relevantes; comentário não entra na fonte pública.
- Persistir rascunhos incompletos privadamente sem enfraquecer validação oficial/publicação; preservar idempotência, sessão, recuperação e conflitos.
- Reorganizar a tela: participantes, grupos/formato/jogos e revisão/publicação; regras avançadas recolhidas, exceções justificadas e identificação personalizada; adoção explícita em versões antigas.
- Integrar contratos e persistência das pendências. Migration atual cobre apenas política/turnos. Nunca modificar migrations já aplicadas.
- Adaptar browsers antigos que esperam W.O. inicialmente vazio e critérios manuais, preservando cobertura de exceções, sessão e legado. Suíte completa de browsers ainda não executada.
- Próxima operação concreta: contratos/persistência privada de desempate manual e testes da aplicação somente no contexto vigente, sem justificativa pública. Continuar na mesma branch/PR.

Fora: insuficiência de jogadores, reincidência de W.O., sorteio, geração de jogos, copiar edições, automatizar cruzamentos, comparar grupos e mudanças no mata-mata. Sem nova autorização para deploy, banco remoto ou publicação de dados reais.

## Pausa por cota e retomada

Ferramenta oficial: **85% usados/15% restantes em 5h**, semanal 43% usado. Reset observado `2026-11-07T04:22:54Z`. Retomada mais dois minutos: **07/11/2026 01:24:54 America/Sao_Paulo** (`04:24:54Z`). Automação oficial **retomar-regulamento-fiba**, ACTIVE, criada e conferida, vinculada à conversa `01a1b339-dfb6-7d91-9870-aa77645ef27f`. Nenhum crédito/reset consumido. Conferir cota/Git/PR/CI ao retomar; pausar automação ao concluir.

## Serviços e preservação

Sem deploy ou banco remoto nesta unidade. Última publicação comprovada nesta conversa: preview UIUX origem `39ed1c4`, versão `c2ffca6b-66a5-4cfd-8925-edc6fc6be4f3`, deployment `61ed1489-8811-4af0-909c-3fceef987f7d`. Principal preservado em `139410ce-a8d6-4710-9b94-e1b1222cd3dc`; sem nova consulta remota nesta pausa.

Checkout principal `sync/trabalho-casa`, alteração humana em CONTRIBUTING.md, skills/skills-lock e demais worktrees preservados. Revisão final ainda pendente, sem revisão independente alegada. Pesquisa UI de progressive disclosure retornou resultado irrelevante; seguir padrões do projeto e pesquisar pontualmente na etapa visual, sem alegar recomendação verificada.

Contexto anterior no [histórico](../historico/progresso/2026-11-06-antes-regulamento-fiba.md).
