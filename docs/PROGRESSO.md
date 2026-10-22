# Checkpoint — 22/10/2026, 20:51 America/Araguaina (UTC-03)

## Objetivo, unidade e próximo passo

Nova Base do Basquete exclusivamente pelo ZIP fornecido, sem consultar/clonar o repositório anterior. Marco de protótipos U1–U4 implementado; U5 aguarda avaliação humana final. Última unidade: **Capitão, Técnico e Ass. Técnico implementados e publicados**, preservando cores/ordenação/edição/exclusão e o ciclo de teclado aprovados anteriormente pelo responsável. Não presumir aceite final desta unidade nem iniciar banco/API integrada.

Próximo passo exato: atualizar [a súmula no preview protegido](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/#/sumula), entrar como `renato.lucindo.jr@gmail.com` por código do Cloudflare Access e selecionar capitão por equipe. Conferir “Sem técnico: capitão assume” → Técnico automático e assistente oculto; desmarcar → técnico próprio/assistente. Registrar aceite ou ajustes em [issue #1](https://github.com/renato-lucindo/base-do-basquete-next/issues/1)/[PR draft #2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2). [Galeria](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/docs/evidencias/). Sem feedback, manter apresentação e aguardar; não repetir gates.

## Git, ambiente e autoria

- Novo repositório público: https://github.com/renato-lucindo/base-do-basquete-next. Workspace `C:/Users/12405304716/Documents/Codex/Base do Basquete-v1`; Windows/PowerShell, Node 24.18.0, npm 11.16.0, Python 3.12.3.
- Branch `feat/prototipos-fluxos`; main/base `161a5b007833b0af6a0788353205bdba99b286b5`, sem merge. PR #2 aberto/draft e anexado à conversa. Revisão pelo autor; revisão independente pendente.
- Aplicação e capturas da súmula **`0f40ac1db413933ea41d6a0f649aa548039684fc`**; transporte congelado **`d5b09b0d7a4a9ee0d895c07dd530bd4a05aa9873`**. Código enviado ao remoto; este checkpoint documental é posterior, obter HEAD real com Git. Capturas dos demais fluxos continuam no SHA inicial `8482d1a4a5a15a12bef8b8ae805a70a01f0c6c23`.
- Todo código/documentação novos são do agente desta conversa; ZIP original do usuário preservado/ignorado. Nenhuma alteração alheia encontrada. Árvore limpa antes deste checkpoint; após commit/push documental, verificar novamente. Nenhum WIP integrado à principal.

## Funcionalidade atual e limites

Campeonato/disputas numa página; elencos por texto com revisão, 0/00, homônimos e pendências; PDFs fictícios em lote com destinos e sucesso parcial; súmula por teclado, participação, fallback justificado, conflitos até recarga, publicação/correção e histórico. Dados fictícios, rascunhos/publicações no localStorage de cada navegador, sem sincronização entre máquinas. PDF real, autenticação interna por senha, novo banco, RLS e persistência de servidor ainda não integrados. Access protege a apresentação e não substitui o futuro login interno.

Solicitações posteriores em `docs/AJUSTES-DE-EXPERIENCIA.md`:

- Q1/Q3 vermelho suave, Q2/Q4 azul; ordenar por lançamento ou por quarto sem reordenar o documento salvo. Ações antigas continuam acessíveis. Editar/excluir pelo ID, validar/recalcular, confirmar exclusão e permitir desfazer/refazer. Correção publicada exige motivo e preserva versão anterior.
- `camisa → Enter → ação → Enter`; retorno à camisa selecionada para substituir/repetir, valores/foco preservados em erro. `Alt+A/B` equipe; `Alt+1–4` quarto; `Alt+Q`, setas e Enter para período/OT. Trocar contexto não lança ação. Sequência exata do responsável testada sem mouse.
- Capitão escolhido entre relacionados da própria equipe. Sem técnico próprio, somente esse capitão assume; Técnico automático e Ass. Técnico oculto. Técnico próprio libera assistente opcional e mantém capitão separado. Trocas revalidam ações e combinam faltas/GD/D pelo motor existente; alteração inválida preserva o estado anterior. Assistente é retirado ao alternar para capitão-técnico, com desfazer disponível. Publicação exige capitão no modo correspondente ou nome do técnico próprio.
- Metadados opcionais `staff` no documento da cópia do motor. Documento legado permanece sem reescrita na leitura: atleta-treinador identificado equivale ao capitão conforme instrução do responsável; informação ausente deve ser selecionada antes de publicar. Jogos novos não inferem capitão pelo primeiro atleta; os capitães iniciais são fixtures fictícias explícitas. Histórico publicado preserva a comissão anterior. Extensão/proveniência documentada em `docs/ORIGEM-DOS-MODULOS.md`.
- Futuro banco: tabela própria de treinadores ligada à identidade da pessoa e aos vínculos equipe/inscrição, sem duplicar atleta-treinador. Nenhuma tabela criada neste marco; nomes no protótipo são campos locais e não integração de cadastro.

Leitor de tela, zoom real de 200% e auditoria completa de contraste/teclado continuam manuais; não declarar WCAG plena. Amostras textuais reais continuam necessárias para validar importação produtiva. `PROTOTIPO-E-APROVACAO.md` é citado, mas ausente do ZIP; usada a definição explícita da primeira entrega.

## Evidências e artefato atual

- Pacote imutável em `especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022`; SHA-256 ZIP `9175a685541815c07716aa7da6614e8c84d5f44c174279c2d577143abc6a915f`. README/documentos lidos na ordem indicada. Integridade PASS 67 arquivos, harness PASS 126 testes/17 arquivos e typecheck em 22/10. Insumos originais não mudaram: reutilizar evidência, sem repetir harness por sessão/documentação.
- Último **gate consolidado PASS** na aplicação atual: lint, Prettier, TypeScript, **51 testes unitários**, três de transporte, build e scan de segredos. **28 cenários Playwright PASS** desktop/celular, incluindo reflow 320 CSS px, conflitos, recuperação, fallback, republicação, teclado/atalhos e comissão/capitão. Novos testes: cinco unitários e quatro execuções de navegador da comissão, com nomes digitados, rascunho/recarga, assistente condicional, faltas combinadas e troca inválida. Demais percursos regressivos continuam aprovados.
- Duas capturas da súmula atualizadas/inspecionadas; seis composições inalteradas reutilizadas. Capturas ilustram capitão-técnico em uma equipe e técnico próprio/assistente na outra. Referências anteriores e checkpoints históricos permanecem no Git.
- Build: `dist/assets/index-912copVh.js`, SHA-256 **`777dbe23122c63273b5edf0edc576e017d5c4577235fdbd53377d44269135163`**; CSS `dist/assets/index-AiEjv5fZ.css`, **`936b207ecf793ff0294ee91d7eee8be3b496041faa4b26af098bebe0b08bb678`**. Empacotador exige esses hashes antes de publicar.
- **13 arquivos/1.303.355 bytes remotos conferidos por hash**, HTTP autenticado 200. Smoke remoto PASS dos três fluxos, galeria, edição/exclusão, ciclo/atalhos e Capitão/Técnico/Ass. Técnico em 1440×1000 e 390×844, sem erros de página. Não substitui aceite humano.
- Token/política de teste revogados após o smoke; seis consultas anônimas finais (raiz, JS/CSS atuais, galeria, PNG e versão) retornaram **302 para Access**, sem app. Identidade/JWT falsificados também foram bloqueados no transporte inalterado em unidade anterior; reutilizar essa evidência.

## CI, Cloudflare e serviços

CI da unidade: aplicação [39874277519](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39874277519), job `120155947329`, e transporte [39874315721](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39874315721), job `120156073159`: ambos `prototype` concluídos **SUCCESS**, incluindo gate e 28 cenários Linux. O workflow roda uma vez por push de código, ignora docs/README e não publica serviços. Actions desbloqueado após o responsável tornar o repositório público; nenhum ajuste financeiro. Não executar rerun por documento ou troca de sessão.

Cloudflare pelo plugin:

- Conta `16b4a5e0a99a031d28051ebadb4811cc`; Worker criado nesta conversa `base-do-basquete-prototipo`, ID `7895e545137946e69cfbe6f09f2f2d56`. Deployment atual **`f7cf9ba3ca104c07a3329679e8a81047`**, publicado em **22/10 23:50:09 UTC (20:50:09 UTC-03)**. Hostname habilitado; previews de versão desabilitados.
- Access app `6f0540c1-e616-49e1-b6d9-2be806b5a9ee` para hostname exato do preview; única política permanente `fa001ad7-6d30-4e90-a8a8-c76989608e46`, allow somente `renato.lucindo.jr@gmail.com`. OTP existente `79079fb8-efad-42d1-a8b5-a89a488443d2`, organização `renato-lucindo-jr.cloudflareaccess.com`, sessão 8h. Proteção aplicada antes de habilitar tráfego e reconfirmada após cada smoke.
- Todos os tokens de teste (10m) e políticas transitórias removidos; última revogação confirmada pela API. Credenciais somente em memória, transferência ao processo local cifrada para chave privada efêmera em memória. Nenhum segredo/cookie/header/estado de navegador persistido ou exposto; nenhuma credencial da conta extraída do conector.
- Transporte reversível em módulos ES estáticos: upload nativo de Static Assets recebeu 401 no envio com JWT transitório do conector. Decisão 002 descreve alternativa. `.preview-artifacts/` ignorado contém payload/manifesto regeneráveis, sem segredos. Só build/galeria/PNG/versão são publicados, nunca ZIP/especificações.
- Billing `/subscriptions` retorna 403 por falta de escopo OAuth; plano/custos não inferidos nem alterados. Nenhum Worker anterior teve código consultado ou foi alterado. Rollback: desabilitar hostname deste Worker antes de retirar Access; nunca remover proteção com conteúdo habilitado.

Supabase: organização `renato-lucindo` (`susztsuwjauudvirutdr`), plano Free observado anteriormente; conferir capacidade/custo antes do projeto novo. **Nenhum banco/Auth/Storage novo criado e nenhum existente alterado.** Nenhuma assinatura paga contratada. Vite local anteriormente na sessão `32934`, porta 5173; não é necessário para o preview remoto. Sem deploy/gate em andamento ao encerrar; conferir processos reais antes de intervir.

## Cota e retomada

Última consulta real, 22/10/2026 20:51 UTC-03: **46% restante/5h** (54% usado), **78% restante semanal** (22% usado). Reset/5h **23/10/2026 00:11:28 America/Araguaina (03:11:28 UTC)**; semanal **29/10/2026 14:08:57 America/Araguaina (17:08:57 UTC)**. Outras conversas compartilham a cota; conferir ferramenta ao retomar. Não comprar créditos, mudar plano ou usar reset manual.

Gatilho <=15% restante não atingido. Automação oficial `retomar-preview-base-do-basquete` continua **PAUSED**, conforme confirmação da publicação inicial; não há retomada pendente. Ao retomar: conferir cota primeiro, ler esta abertura, reconciliar Git/PR/CI/feedback/serviços e seguir o próximo passo exato da abertura. Preservar evidências de arquivos inalterados e mudanças alheias.
