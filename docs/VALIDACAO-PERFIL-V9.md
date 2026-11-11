# Validação do perfil compacto v9

Unidade PR79, branch `codex/perfil-atleta-aprovado`, base `a55dd7c7ef3b85991238c6e5bd379f5aa60e1b05`. Implementação visual em `429ae1be06f5439e943f27c9b51752ee2cd231fe`; correção de nomes acessíveis em `8f7b38d148d4fa6ddeb2ea711acc0d6737fd4938`. O responsável aprovou o HTML v9 e solicitou a linha do Histórico de equipes limitada aos pontos. Manter a PR aberta, sem merge ou auto-merge.

## Resultado implementado

Quatro abas, filtros independentes de estatísticas e jogos, contexto na URL, resumo branco, datas completas, confronto como um único link e nomes de equipes por contexto. A trajetória agrupa a mesma equipe entre inscrições, mostra anos e nome completo e usa segmentos entre os centros dos pontos. Primeiro e último não têm prolongamento; uma equipe isolada não recebe linha. As conquistas ocupam a direita da identificação no desktop. Recordes completos permanecem em Carreira, conforme a v9 aprovada, com prévia na Visão geral.

Idade depende exclusivamente do ano de nascimento já publicado pelo contrato público. A coluna desaparece integralmente quando ausente. Siglas e placares vêm dos contratos existentes; sem sigla usa-se o nome publicado. Um placar só aparece se disputa, versão e publicação correspondem à participação. Não foram criados endpoints, schema, dados, dependências ou regras de Auth/Access.

## Provas locais

- `vitest` focal: 13 testes em três arquivos, PASS. Estado de quatro abas, serialização de filtros, idade pública, apresentação e modelo.
- Playwright focal na fonte visual: 54 cenários desktop/mobile, PASS. Inclui 320/390/1366/1920, nomes longos, zero a cinco atuações, rankings incompletos, filtros, paginação limitada, publicação incompatível, privacidade, teclado, toque nativo emulado e retorno. Expansão dos recordes tem alvo mínimo de 44 × 44 px.
- Após a correção de nomes acessíveis: oito casos Axe das quatro abas em desktop/mobile e quatro casos de ordenação/descoberta, PASS. Os testes antigos de perfil contínuo foram adaptados para abas e não exigem Evolução, fora do escopo.
- Lint e formato completos da implementação visual, typecheck focal e build público da fonte atual, PASS. Typecheck integral local foi inconclusivo por falta de memória. Gate local parou no teste de Git com TEMP UNC, com dez casos aprovados e um erro de ambiente. Não foram ampliados timeouts, retiradas verificações ou alterado o sistema.

## CI

A rodada inicial [43087046688](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43087046688) aprovou o gate completo, design e WebKit, mas reprovou browsers: seletores legados e um erro real de nome acessível. A correção usa o conteúdo visível dos confrontos como nome do link e inclui as siglas nos nomes dos controles de ordenação.

A rodada da fonte corrigida [43089383243](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/43089383243) aprovou gate completo, design, WebKit e browsers (2). Browsers (1) reprovou; logs e artefatos retornaram HTTP 502 nas ferramentas GitHub e CLI. A repetição somente dos jobs reprovados terminou em `startup_failure`, sem iniciar novos jobs. O GitHub registrou erro inesperado do serviço, request ID `6668:B2A4B:D3BDAC:15FA85B:6AF4CF79`. Isso não explica automaticamente a primeira reprovação. O histórico permanece registrado; ainda falta CI verde e diagnóstico da falha original.

## Worker e verificação real

[Preview da PR79](https://base-do-basquete-next-pr79.renato-lucindo-jr.workers.dev/atleta.html#d8b5a99a-5280-4ad4-bee3-c2f6e50ab0f0), fonte `8f7b38d148d4fa6ddeb2ea711acc0d6737fd4938`, versão `80e95d3b-9a4f-45c7-a418-d8c6d4ac367e`, deployment `abab63fd-a7e9-4687-ab2e-a702764da3ce`, publicado em 11/11/2026 às 19:44:47 UTC. Wrapper identifica a fonte em `X-Bdb-Source`; backend existente preservado.

Smoke remoto PASS: 36 arquivos HTTP 200, 29 hashes JS/CSS idênticos ao build, dez estados geométricos recolhidos/expandidos, sete percursos com retorno, quatro larguras, teclado, toque emulado e zoom real de 200%. No zoom, janela de 1366 px resultou em `innerWidth=683` e DPR 2 por `chrome.tabs.setZoom(2)`, sem simulação por CSS. Foram produzidas 26 capturas, sem erros de página. Sessão e consulta administrativa continuam retornando 401 sem autenticação.

Comparação Cloudflare antes/depois: oito outros Workers e sete aplicações Access inalterados, incluindo bindings, namespace de sessões, limite de login e observabilidade do preview. Nenhuma publicação em produção ou operação de banco. Protótipos e três mudanças preexistentes do checkout humano preservados.

## Revisão e limites

Revisão pelo próprio implementador do diff e das [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md): links nativos por confronto, ações separadas, cabeçalhos de tabela, foco visível, modal com teclado, abas e seleção, nomes acessíveis e dados ausentes. A conversa anterior de review sobre paginação fora do limite continua resolvida e a cobertura foi preservada. Nenhum novo parecer independente foi produzido nesta rodada. Axe automatizado não constitui auditoria integral WCAG.

Os dados reais do atleta de exemplo não incluem nascimento público nem conquistas e têm uma equipe única na trajetória; os estados com idade, conquistas e múltiplas equipes são verificados com fixtures isoladas. A ausência de sigla cadastrada mantém nomes completos no celular. Verificações locais e remotas usam Chromium; a suíte WebKit é executada na CI.

Evidências e capturas ficam no pacote local `outputs/implementacao-perfil-v9` do chat `perfil-jogador-prototipos`, em `smoke-remoto.json`, `preservacao.json`, `servico-publicado.json` e `capturas/`. Os caminhos do pacote são relativos à sua raiz; documentos anteriores permanecem preservados.
