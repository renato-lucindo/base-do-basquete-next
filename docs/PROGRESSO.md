# Checkpoint — 22/10/2026, 20:16 America/Araguaina (UTC-03)

## Atualização atual — feedback da súmula implementado e publicado

Solicitação do responsável registrada em `docs/AJUSTES-DE-EXPERIENCIA.md`: Q1/Q3 vermelho suave, Q2/Q4 azul suave; alternância entre sequência de lançamento e ordem por quarto; editar/excluir ação específica. Implementado com validação completa, recálculo, confirmação de exclusão, desfazer/refazer e preservação da participação. Todas as ações estão acessíveis, inclusive além das últimas trinta. Correções de resultado publicado ainda exigem motivo e republicação, com versão anterior preservada. Não foi presumido aceite final nem iniciada integração.

Versão atual: aplicação/capturas da súmula `f8b6663f15b03a8c9443f9d5d8490f800553ae22`; transporte `7e8d4f56906537ed164c083b01b8b766ba9ea727`. Mesma branch `feat/prototipos-fluxos`, PR draft #2 e novo repositório público. Árvores de terceiros preservadas; somente alterações do agente nesta unidade, todas enviadas ao remoto. Main permanece intacta. Este checkpoint documental é posterior; obter HEAD completo com Git. Seis capturas dos outros percursos reaproveitadas, duas da súmula renovadas e inspecionadas.

Gate consolidado PASS: lint, formatação, TypeScript, **46 testes unitários**, três de transporte, build e segredos. **20 cenários Playwright PASS**, incluindo quatro novas execuções desktop/celular de cores/ordenação, edição inválida, edição/exclusão específica, cancelamento, desfazer/refazer, salvamento/recarga, republicação e acesso a ações antigas. Teste de recarga aguarda a confirmação da gravação assíncrona antes de recarregar. Harness original inalterado: evidências de 126 testes/integridade reutilizadas, sem nova execução. Configuração Playwright agora seleciona somente arquivos `.spec.ts`, evitando executar novamente testes Node de transporte.

Build atual: `dist/assets/index-BtFrNwKi.js`, SHA-256 `991e17767e8299d4e074a307c5d81c01eca6f5b40ed34d95d43e696581a18e65`; `dist/assets/index-CS72YXoI.css`, `ede51a05662c5600b8ebc1721d0f874d0cbbcf15510ebe9a9d92ccccaf9fb5de`. Empacotador atualizado para esses hashes. **13 arquivos/1.246.024 bytes remotos conferidos por hash**, smoke autenticado PASS dos três fluxos, galeria e ajustes da súmula em dois tamanhos. Worker novo já existente nesta conversa atualizado pelo plugin Cloudflare: deployment **`e0e164acee6b4ca6953388faf9bfc074`**, publicado em **22/10/2026 23:15:19 UTC (20:15:19 UTC-03)**.

Após o smoke, token transitório e política de teste removidos com sucesso; única regra permanente permite `renato.lucindo.jr@gmail.com`. Hostname habilitado, previews de versão desabilitados. Seis smokes anônimos finais (raiz, JS/CSS atuais, galeria, PNG atualizado e versão) retornaram 302 para Access, sem conteúdo do app. Nenhum segredo persistido ou exposto. Recursos de Access e Worker permanecem os IDs registrados abaixo; nenhum serviço anterior ou banco alterado. Automação continua PAUSED, sem processo de deploy/gate em andamento.

CI da aplicação `f8b6663`: [39870460144](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39870460144) SUCCESS. Transporte `7e8d4f5`: [39870512378](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39870512378), job `prototype` ID `120143474360` concluído SUCCESS em todas as etapas aplicáveis, incluindo gate e 20 cenários Linux. Não executar rerun por documentação. Próximo passo exato: reabrir/atualizar [a súmula no preview](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/#/sumula), conferir os três ajustes e registrar aceite ou ajustes restantes. O endereço e a proteção são os mesmos; rascunhos salvos anteriores usam o mesmo formato e continuam neste navegador. Não avançar ao banco/API integrada sem avaliação final.

Cota real às 20:16 UTC-03: **64% restante/5h**, **81% restante semanal**; resets permanecem **23/10 00:11:28 UTC-03** e **29/10 14:08:57 UTC-03**. Gatilho de 15% não atingido. Conferir a ferramenta ao retomar, depois Git/CI/feedback e serviços; reutilizar evidências dos arquivos inalterados.

As seções abaixo registram a apresentação inicial e suas evidências históricas; a atualização acima identifica o artefato e o próximo passo atuais.

## Objetivo, unidade e próximo passo

Nova Base do Basquete exclusivamente pelo ZIP fornecido, sem consultar/clonar o repositório anterior. U1–U4 do marco de protótipos concluídas; apresentação remota protegida concluída nesta retomada. **U5 aguarda avaliação humana dos três percursos. Não iniciar banco ou integração antes do aceite.**

Próxima ação exata: o responsável abre [o protótipo](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/), entra com `renato.lucindo.jr@gmail.com` e código de e-mail do Cloudflare Access e segue `docs/VALIDACAO-PROTOTIPO.md`. Resultado esperado: confirmar login humano e registrar decisões/ajustes de campeonato e elencos, PDFs em lote e súmula/correção na [issue #1](https://github.com/renato-lucindo/base-do-basquete-next/issues/1). [Galeria remota](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/docs/evidencias/). Sem feedback, manter a apresentação e aguardar; não repetir gates nem integrar à main.

## Repositório e ambiente

- Novo repositório **público**: https://github.com/renato-lucindo/base-do-basquete-next.
- Workspace: `C:/Users/12405304716/Documents/Codex/Base do Basquete-v1`; Windows/PowerShell, Node 24.18.0, npm 11.16.0, Python 3.12.3.
- Branch `feat/prototipos-fluxos`; main/base `161a5b007833b0af6a0788353205bdba99b286b5`, sem merge. [PR draft #2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2), anexado à conversa; revisão humana pendente, sem comentários novos na issue.
- Aplicação e oito PNGs: `8482d1a4a5a15a12bef8b8ae805a70a01f0c6c23`. Transporte implantado: `f6073beb0b69351f37102c00b697267e0b9b38ea`. Helper de smoke posterior: `0bbab8f` (obter SHA completo/HEAD real com Git); este checkpoint e links são documentação posterior, sem mudança no artefato remoto.
- Todo código e documentação novos são do agente desta conversa. ZIP original do usuário preservado/ignorado; nenhuma alteração de origem desconhecida. Ao terminar o commit/push documental, conferir árvore limpa e remoto sincronizado. Nenhum WIP integrado à principal.

## Trabalho concluído e evidências reutilizáveis

Pacote imutável em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022`; SHA-256 do ZIP `9175a685541815c07716aa7da6614e8c84d5f44c174279c2d577143abc6a915f`. README/documentos lidos na ordem. `PROTOTIPO-E-APROVACAO.md` é citado, mas ausente; usada a seção explícita da primeira entrega, sem presumir aceite.

Implementados: campeonato/disputas na mesma página; elencos por texto com prévia, camisas 0/00 e pendências; PDFs fictícios em lote com destinos, revisão e sucesso parcial; motor original de súmula, teclado, participação, desfazer/refazer, fallback justificado, conflitos até recarga, publicação/correção e histórico. Rascunhos/filtros no localStorage, próprios de cada navegador, sem sincronização entre máquinas. PDF real, autenticação interna e servidor ainda não integrados. A proteção Access não substitui o futuro login por senha.

Evidências válidas para os arquivos inalterados:

- Insumos originais: integridade PASS 67 arquivos, harness PASS 126/126 testes em 17 arquivos e typecheck. Não repetir por mudança de sessão/documentação.
- Aplicação no SHA `8482d1a`: gate local PASS (lint, formatação, TypeScript, 42 testes, build, segredos); navegador PASS 16 cenários desktop/celular, incluindo 320 CSS px reais, duas abas, retomada, falha parcial, fallback e correção. Oito capturas em `docs/evidencias/`, com inspeção visual. Revisão pelo autor; revisão independente e aceite humano pendentes.
- JS congelado `dist/assets/index-CB3QIs5k.js`: SHA-256 `6d149540f16f60f83999c68c7a92b3329970822c7e849f978545dfb486b79810`; CSS `dist/assets/index-BVSMIK4d.css`: `3162ca8132ebed1c1bdfd9b00f3d532c966025d963acdaae918698f9f6aa1614`.
- Transporte novo: `npm run test:transport` PASS 3/3 após RED; lint/Prettier/scan de segredos focais PASS. O gate inclui esses testes. Empacotador valida hashes, inclui somente 13 arquivos (build, galeria, PNGs e versão), 1.203.739 bytes; módulos comprimidos ~928 KB. Não publica ZIP/especificações.
- Remoto em 22/10, até 19:34 UTC-03: **13 hashes SHA-256 iguais ao pacote local**, HTTP autenticado 200; smoke Playwright PASS dos três fluxos em 1440×1000 e 390×844, galeria e zero erros de página. O teste de transporte não substitui o aceite completo. Testes de navegador precisaram aguardar propagação do Access e aceitar o aviso de saída com edição; somente o helper mudou, sem alterar o produto ou o build. Evidência de hashes foi reutilizada na repetição apenas do navegador.
- Sete smokes finais após revogação do teste: raiz, JS, CSS, galeria, PNG e versão anônimos, mais identidade/JWT falsificados; todos HTTP 302 para a organização Access, sem headers/conteúdo do protótipo.

Leitor de tela, zoom real de 200% e auditoria completa de contraste/teclado permanecem manuais; não declarar WCAG plena. Os testes não provam RLS, extração real de PDF, transações ou idempotência de servidor. TS do app 6.0.3; harness original mantém TS 7.

## CI, Cloudflare e serviços

CI desbloqueado após o responsável tornar o repo público; nenhuma mudança financeira. [Run 39864863368](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39864863368) no transporte `f6073be` **SUCCESS**, com gate, integridade e 16 cenários Linux. Runs 39847675871, 39863535945 e 39863977497 também SUCCESS. Falhas de billing anteriores estão superadas. Push do helper `0bbab8f6621a09a833f2286bba936fe2676042e4`: [run 39866091709](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39866091709), job `prototype` ID `120128526913` concluído **SUCCESS**, todas as etapas aplicáveis aprovadas. Workflow ignora docs/README e roda uma vez por push de código; não acionar rerun por documentação.

Recursos criados **somente para esta apresentação** pelo plugin Cloudflare:

- Conta `16b4a5e0a99a031d28051ebadb4811cc`; Worker novo `base-do-basquete-prototipo`, ID `7895e545137946e69cfbe6f09f2f2d56`; deployment `fdd2e2a61121407b8bdd4a99a67edf98`, publicado em 22:25:51 UTC. Hostname habilitado; previews de versões **desabilitados**.
- Access app `6f0540c1-e616-49e1-b6d9-2be806b5a9ee`, hostname exato do preview. Única política permanente `fa001ad7-6d30-4e90-a8a8-c76989608e46`, allow somente `renato.lucindo.jr@gmail.com`; OTP existente `79079fb8-efad-42d1-a8b5-a89a488443d2`, sessão 8h. Organização existente `renato-lucindo-jr.cloudflareaccess.com`. Access aplicado antes de habilitar tráfego.
- Tokens de smoke com duração 10m e políticas específicas transitórias **todos removidos**; última revogação de token/política confirmada por API. Credenciais ficaram apenas em memória; transferência ao processo de teste cifrada com chave privada efêmera em memória. Nenhuma credencial de conta extraída, arquivo de segredo, log de header, cookie ou estado de navegador persistido. Somente regra individual permanece, conferida após os smokes.
- Upload nativo Static Assets cria sessão, mas envio com JWT transitório retorna HTTP 401 no sandbox; alternativa reversível usa módulos ES estáticos, via multipart do plugin. Decisão em `docs/decisoes/002-preview-protegido.md`. `scripts/prepare-preview.mjs`, `cloudflare-preview-upload.mjs`, `preview-worker.mjs` e `smoke-preview.mjs` tornam o transporte revisável. Payload/manifesto em `.preview-artifacts/` ignorado, sem segredos; pode ser regenerado.
- Billing `/subscriptions` retorna 403 por escopo OAuth ausente; plano/custos Cloudflare **não inferidos nem alterados**. Leitura/escrita de Workers e Access funcionam. Nenhum dos três Workers anteriores foi lido em código ou alterado; somente inventário de metadados.

Supabase: organização `renato-lucindo` (`susztsuwjauudvirutdr`), plano Free observado anteriormente; capacidade/custo do novo projeto ainda precisam de conferência antes de criar. **Nenhum banco/Auth/Storage novo criado e nenhum existente alterado.** Não integrar antes do aceite.

Servidor Vite local anteriormente na sessão `32934`, porta 5173; não é necessário ao preview remoto. Nenhum deploy/gate em andamento ao encerrar; conferir processos reais antes de intervir. Rollback: desabilitar hostname do Worker novo antes de remover a aplicação Access. Não remover proteção enquanto conteúdo estiver habilitado.

## Cota e continuidade

Retomada começou com janela reiniciada (100% restante/5h e 86% semanal). Última consulta real, 22/10/2026 19:34 America/Sao_Paulo: **77% restante/5h** (23% usado), **83% restante semanal** (17% usado). Reset/5h **23/10/2026 00:11:28 America/Sao_Paulo (03:11:28 UTC)**; semanal **29/10/2026 14:08:57 America/Sao_Paulo (17:08:57 UTC)**. Verificar ferramenta real ao retomar; outras conversas compartilham a cota. Não comprar créditos, mudar plano ou usar reset manual.

Automação oficial `retomar-preview-base-do-basquete` **PAUSED**, atualização confirmada após concluir o preview. Não há retomada pendente: próxima dependência é avaliação humana. Ao retomar, conferir cota primeiro; reconciliar Git, PR/issue, CI e recursos acima; reaproveitar evidências ainda válidas e seguir o próximo passo exato da abertura. Histórico dos checkpoints anteriores permanece no Git.
