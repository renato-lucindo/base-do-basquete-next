# Ativar a conta administrativa

Fundação publicada em https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/. O código de e-mail do Cloudflare Access protege o preview; depois dele, a aplicação pede sua senha. Não há cadastro público nem conta criada por seed.

## Etapa do responsável

1. Abra [Users do projeto novo](https://supabase.com/dashboard/project/nizmasjddyrhmevvfviz/auth/users?new=true). O formulário “Create a new user” foi deixado aberto no Chrome desta máquina.
2. Informe `renato.lucindo.jr@gmail.com` e uma senha própria de pelo menos 12 caracteres, diretamente no painel. Mantenha “Auto confirm user?” marcado e conclua em “Create user”. Esse caminho não envia convite nem e-mail de confirmação.
3. Informe nesta conversa somente **“conta criada”**. Nunca envie a senha, tokens ou captura contendo credenciais.

A ferramenta de navegador exige intervenção humana para inserir e concluir novas credenciais. Nenhuma senha foi preenchida pelo agente; o formulário foi preparado para essa intervenção. Evidência local, ignorada pelo Git: `.preview-artifacts/admin-user-handoff.png`.

## Continuação pelo agente

Consultar cota e checkpoint primeiro. Conferir no projeto `nizmasjddyrhmevvfviz` se a identidade exata existe, está confirmada e não é anônima; não ler hash de senha. Conferir a tabela `public.admin_access`. Se vazia, inserir somente o UUID verificado por operação administrativa confiável; se já existir, reconciliar sem substituir outra identidade ou reativar revogação silenciosamente. Não criar endpoint de bootstrap, permitir autoatribuição ou usar metadados editáveis para autorização.

Confirmar que apenas essa identidade está habilitada. O responsável então entra no preview, recarrega a página e sai. Validar sucesso, manutenção da sessão e recusa após saída; não capturar/salvar senha, tokens ou estado autenticado. Casos negativos/renovação concorrente já têm evidências específicas no checkpoint; repetir apenas o necessário para a integração que mudou.

Ao encerrar F3/F4: registrar resultado e limitações, reconciliar CI/PR, pausar a automação de retomada e iniciar a próxima unidade autorizada de contextos/cadastros conforme o pacote. Sem promover dados fictícios do protótipo ao banco real.
