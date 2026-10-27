# Expansão da administração compacta — 27/10/2026

## Escopo e autorização

Responsável aprovou os ajustes de pessoa/camisa (“Ok, gostei”) e autorizou iniciar a padronização das demais telas (“Ok, inicie”). Implementação somente de apresentação desktop, sobre PR30/base16e171a, branch `codex/admin-demais-telas`. Campos e tabelas compactos, sem novas regras, contratos, migrations, dependências ou alterações em dados humanos. Plano `docs/superpowers/plans/2026-10-27-demais-telas-compactas.md`.

## RED e verificações focais

- `admin-expansion-red.log`: quatro falhas reais antes da alteração: Save do campeonato com duas disputas terminava em1364px, além das telas768/1080; regras de transferência/W.O. empilhadas. SHA256c0c6ff6adc6071df751e1481a4ad45676771f2a5eaed32ffaa08ca67a9b38972.
- `admin-expansion-green.log`: quatro cenários aprovados após primeira composição; campeonato salva por teclado e reabre, listagem tabular e contexto mantidos.
- `admin-panels-red.log`: seis falhas geométricas: referências de confrontos estreitas, fontes de premiação na largura inteira/empilhadas e camisa de transferência até1574px. SHA25687aa2a9fea1713436cd12a9c8963b404b555be93591729e9ce4e6cd0755f9c75. `admin-panels-green.log`: seis aprovados após ajuste.
- `admin-related-red.log`: duas falhas reais de perfil em duas colunas; duas falhas de setup no locator de decisão, sem atribuí-las a produto. SHA256ad2acb5929f02b9953ae5c3fec72e5ce44237f58221f7b80707b8b310c4b3efc. Locator corrigido para combobox sem modificar aplicação; `admin-decision-red.log` comprovou diferença87,5px entre campos relacionados, SHA25621a933b61543517401d8b8d720ad78a73bb9157aa81d0dc5915aade75fac5641.
- `admin-game-numbers-red.log`: duas falhas de número do jogo largo, antes da última composição do diálogo; SHA256fda345ddcfa2b6a21eda17e6ab662873c7f9f03d96b2092ae20013e2a7821489.
- `admin-expansion-composition.log`: **87desktop PASS/1,8min**, incluindo campeonatos, acesso, regulamento, premiações, transferência, perfil, decisões, desistência, piloto anterior e toolbar. SHA2563ab3995b253c1fe42be779167dab2e9302cd1e67c6275eece47cd622eea5f268. A última composição de campos do diálogo de jogo é posterior: está sendo validada focalmente em `admin-expansion-related-green.log` com Jogos/Locais/Súmula desktop e os dez cenários novos.
- Types/lint completos aprovados antes do último ajuste somente de wrapper/CSS de jogo; gate final ainda pendente. Não atribuir CI/gate da base às mudanças novas.

## Revisão de apresentação

Capturas próprias em `.preview-artifacts/admin-expansion-before-*`/`admin-expansion-after-*`,1366×768 e1920×1080. Inspecionados campeonato, regulamento, premiações, transferência, perfil e decisão. Campos/avisos/históricos continuam acessíveis, sem alturas fixas para ocultar conteúdo. Campeonato com duas disputas cabe na primeira tela1366; ano120px, data/horário/número curtos, camisa120px. Seleção da fonte de premiação em três colunas; referências de adversários mantêm largura adequada.

Revisão de autor (sem ferramenta de subagente disponível): nenhuma mudança nos comandos/efeitos/API/versões/ACK. Seletores limitados ao piloto administrativo e desktop≥1000px. Região de rolagem da tabela permite foco; tabelas têm cabeçalhos. Confirmações e informações de privacidade preservadas. Regras externas de interface consultadas na fonte oficial; não são especificação de produto. Não representa revisão independente, leitor de tela, zoom nativo, WCAG completa ou carga. Súmula já possuía layout desktop próprio; preservar motor/teclado/tabelas em vez de redesenhá-los.

## Release

- Composição final do jogo: primeira tentativa `admin-expansion-related-green.log` teve22PASS/1FAIL por dropdown de local, ancorado acima, cobrir Criar inscrição após a compactação. SHA256e1a8312f1db736966c0820dbf18e75c6c5aa1d4c03cd9e0983701ee54f87b88e. Corrigida a ordem real do formulário: adversários → agenda → busca/cadastro contextual → ações; sem alterar seleção, ancoragem ou confirmação do local. `admin-game-layout-green.log`: **18PASS/31,7s**, SHA256a9fe496d19447401553cb6c3c35d6640334daffd5dd00016ac217630f95fff5b. Inclui todos os dez casos geométricos/a11y e regressões de Jogos/Locais. Súmula desktop teve cinco aprovados no grupo anterior; mover a busca não muda seu código.
- Dez varreduras axe novas (regulamento, perfil, decisões, premiações, transferências × dois desktops), relatórios `a11y-admin-expanded-*-desktop.json`: **zero violations e zero incomplete**, leitura direta dos dez relatórios. Alcance restrito aos estados fictícios capturados.

Gate final **PASS/exit0**:560unit/115arquivos,6transportes/13PostgreSQL/23workerd/uma prova runtime com4PDFs, builds/tipos/lint/formato/fronteira/segredos729. Log `.preview-artifacts/admin-expansion-final-gate.log`, SHA256fef0f762b81bb9553ee40b2d4b6ce157fbe5aff6d70e91c29ff2534faf71419f. Código estável; CI/deploy novos ainda pendentes. Não repetir gate/SQL/harness por troca de sessão ou documentação.

Preview protegido continua na fontec9fe7e2/deployment5334bd53-262d-459a-b882-2e5ead191549, versão5bb9cff4-caf2-4163-a4a7-e40816eafee0. Preflight somente leitura confirmou mesmo alvo, owner único, previewsOFF e bindings/namespace/cofre preservados. Primeira chamada do conector tinha formato de código incorreto e não executou; consulta em função assíncrona aprovada. Nenhuma DDL, deploy, credencial temporária ou alteração de serviço nesta unidade. Avaliação visual desta expansão ainda pendente após publicação.
