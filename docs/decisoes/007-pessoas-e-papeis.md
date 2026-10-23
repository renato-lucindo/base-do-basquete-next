# 007 — pessoa única, atleta e técnico

`persons` conserva identidade e campos públicos opcionais. `private.athletes` mantém sexo obrigatório, nascimento completo e registro federativo em schema não exposto; `coaches` é tabela própria, como solicitado, com FK para a mesma pessoa. Uma pessoa pode ocupar ambos os papéis. Papéis não são removidos implicitamente. Nenhuma pessoa tem nome único nem proprietário esportivo estrutural.

Chave normalizada NFD/remove diacríticos/minúsculas/espaços serve à busca e ao aviso de homônimo; nunca é chave de identidade. O escritor serializa pelo nome normalizado e por pessoa antes de verificar/criar, exigindo confirmação explícita para nova identidade homônima. Nome continua correto, sem sufixo numérico artificial. SQL testa comportamento serializado; corrida real multi-conexão ainda não foi medida.

Escrita contextual de novo atleta valida sexo contra o naipe no servidor. Sexo de atleta existente não é alterado por esse fluxo contextual; edição global explícita é distinta. Técnico sem papel de atleta não exige sexo privado. Capitão/técnico do jogo, assistente condicionado e cinco titulares continuam escolhas da súmula, não inferências do cadastro global ou elenco.

Leitor `get_person` é **administrativo**, com RLS/grants atuais e projeção de detalhes privados para administração. Não reutilizar essa resposta na consulta pública futura; `publicPersonSchema` exclui completamente os dados privados e não calcula ano/idade a partir do nascimento completo. Nenhum endpoint público de pessoas foi antecipado.

Busca administrativa devolve candidatos limitados a nome/apelido/ano público, papéis e contexto público de participação. Atleta e técnico na mesma inscrição compartilham um contexto; histórico é identificado como tal. Abrir uma identidade é uma operação separada, sem assumir que nomes iguais correspondem à mesma pessoa. A UI usa o naipe **salvo** para novo atleta, mesmo quando há um rascunho de Informações ainda não salvo.

Elenco e comissão são vínculos temporais próprios: encerrar conserva o registro, trocar técnico exige encerrar o anterior e criar vínculo novo. A UI não oferece transferência automática nem reutiliza o capitão do jogo como comissão global. A preparação da súmula aplicará a regra do capitão-técnico e do assistente.

Padrão de autorização, recibos e invoker/definer delimitado segue decisões 005/006. C3.1 tem contrato real Supabase com rollback e tipos gerados. Dados reais anteriores preservados. Não criar fixtures no ambiente permanente; nenhuma migração de serviços antigos.
