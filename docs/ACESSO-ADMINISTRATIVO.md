# Ativar a conta administrativa

Fundação publicada em https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/. O código de e-mail do Cloudflare Access protege o preview; depois dele, a aplicação pede sua senha. Não há cadastro público nem conta criada por seed.

## Etapa do responsável

**Concluída em 23/10/2026:** responsável informou “conta criada”; conta confirmada e não anônima conferida no projeto correto. Bootstrap administrativo executado em transação com bloqueio e recusa de administrador preexistente. Uma única identidade habilitada; leitura do próprio acesso e recusa de outra identidade verificadas por RLS no banco real. Nenhuma senha ou hash de senha foi consultado.

Procedimento de criação usado (histórico; não repetir):

1. Abra [Users do projeto novo](https://supabase.com/dashboard/project/nizmasjddyrhmevvfviz/auth/users?new=true). O formulário “Create a new user” foi deixado aberto no Chrome desta máquina.
2. Informe `renato.lucindo.jr@gmail.com` e uma senha própria de pelo menos 12 caracteres, diretamente no painel. Mantenha “Auto confirm user?” marcado e conclua em “Create user”. Esse caminho não envia convite nem e-mail de confirmação.
3. Informe nesta conversa somente **“conta criada”**. Nunca envie a senha, tokens ou captura contendo credenciais.

A ferramenta de navegador exige intervenção humana para inserir e concluir novas credenciais. Nenhuma senha foi preenchida pelo agente; o formulário foi preparado para essa intervenção. Evidência local, ignorada pelo Git: `.preview-artifacts/admin-user-handoff.png`.

## Continuação pelo agente

Consultar cota e checkpoint primeiro. Conferir no projeto `nizmasjddyrhmevvfviz` se a identidade exata existe, está confirmada e não é anônima; não ler hash de senha. Conferir a tabela `public.admin_access`. Se vazia, inserir somente o UUID verificado por operação administrativa confiável; se já existir, reconciliar sem substituir outra identidade ou reativar revogação silenciosamente. Não criar endpoint de bootstrap, permitir autoatribuição ou usar metadados editáveis para autorização.

**Validação humana concluída em 23/10/2026:** à pergunta que solicitava entrar no preview real, recarregar e sair, o responsável respondeu **“Entrada, recarga e saída funcionaram”**. Ambiente: Worker `base-do-basquete-next-preview`, código `6ecfacf618d30ba6fc0346597da6fb4d539d2eca`, deployment `9c3ceeef-a094-4f3d-9706-ba38b78493ba`. É evidência humana do percurso real, distinta dos testes automatizados com fixtures. Nenhuma senha, token ou estado autenticado capturado pelo agente. Renovação prolongada e falhas seguem as evidências específicas do checkpoint; não atribuir à confirmação humana cenários que ela não testou.

F3/F4 encerradas com essa validação e as evidências técnicas registradas. Automação `retomar-preview-base-do-basquete` pausada pela ferramenta oficial e status PAUSED conferido. Próxima unidade autorizada: contextos/cadastros conforme a etapa 3 do pacote, sem promover dados fictícios do protótipo ao banco real. PR da fundação continua draft, sem merge; revisão independente pendente.
