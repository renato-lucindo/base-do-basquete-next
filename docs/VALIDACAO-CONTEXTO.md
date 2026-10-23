# Contexto persistido — C1

Entrega da etapa 3 em https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/, mesma conta administrativa e proteção do preview. Código publicado `9c64ab948781c284c63182168b02bcd3c9a30454`; deployment `dd4c204b-3312-40f6-82a7-40046dd5cce5`, versão `b4bff8b2-4997-4dab-bf65-2dcdc6b4c22d`, em 23/10/2026 08:42:28 America/Sao_Paulo (11:42:28 UTC).

## Percurso real

Entrar → Novo campeonato → informar nome/temporada e mais de uma disputa → Salvar campeonato → recarregar → reabrir contexto salvo. Em resposta a esse roteiro, o responsável confirmou **“Cadastro, salvamento e retomada funcionaram”** em 23/10/2026.

Conferência posterior por contagens, sem ler nomes ou dados privados: um campeonato, uma edição, duas disputas e um recibo; um administrador e um usuário Auth preservados. São dados criados pelo responsável, não fixtures do agente. Não excluir nem sobrescrever em testes futuros. Nenhuma senha, JWT ou estado autenticado foi capturado pelo agente para essa avaliação.

## Evidência técnica

- Gate local PASS: 86 testes unitários/12 arquivos, cinco de transporte, dois cenários PostgreSQL do zero/upgrade com contratos compartilhados, quatro workerd/DO, lint/formatação/tipos/builds/fronteira do cliente/segredos.
- CI do artefato publicado [39947912211](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39947912211), job `120395001555`, SUCCESS; inclui 40 cenários de navegador e integridade do pacote. Não repetir gate por documentação ou troca de sessão.
- CI posterior do helper de smoke `c88ca2b`, [39948754042](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39948754042), completed/SUCCESS. Helper e documentação não mudam o código/assets publicados.
- Seis cenários novos em desktop/celular: múltiplas edições/disputas, validação de duplicidade, retomada, reflow 320, envio incerto com mesmo comando, conflito sem sobrescrever, confirmação de saída e reautenticação preservando edição em memória. Quatro cenários anteriores de login também aprovados. Capturas com fixture em `.preview-artifacts/contexto-desktop.png` e `contexto-mobile.png`, inspecionadas; não são dados do ambiente remoto.
- Contrato SQL executado também no Supabase real com rollback completo; RLS/grants, usuário indevido, revogação, pais, omissão, idempotência, versão e Recentes verificados. Tipos gerados; aviso remanescente Auth/Pro registrado na decisão 005. Nenhuma contratação paga.
- Smoke remoto: três arquivos por hash/source SHA, health 200, sessão e competição sem cookie 401 após Access, módulo servidor 404, senha inválida recusada pelo Auth real, tela em dois viewports sem erros/storage. Não usou senha do responsável. Service tokens e políticas temporárias revogados depois.
- Após revogação: seis caminhos anônimos 302 para Access sem conteúdo/cabeçalho da aplicação; identidade/JWT forjados bloqueados. Cofre, namespace de sessão e previews de versão desabilitados preservados.

## Limites

Revisão pelo autor; revisão independente do PR #4 pendente. Sem merge/aceite de produção. Teste concorrente multi-conexão real, escala representativa, leitor de tela e avaliação completa de contraste/zoom continuam específicos e não são inferidos desses resultados.

C1 entrega contexto. Equipes/inscrições, pessoas/treinadores/elencos e importação por texto são as próximas unidades; jogos/PDF/súmula reais pertencem à etapa seguinte. O protótipo fictício continua separado.
