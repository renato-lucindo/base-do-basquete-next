# 022 — Campeonato flexível e finalização automática

Decisão do responsável em07/11/2026, com protótipo da configuração validado visualmente e implementação autorizada. Complementa ADR021 e substitui, no novo percurso, a publicação separada da classificação/resultados e a exigência de justificativas em operações comuns. A liberação permanece condicionada ao aceite humano em Worker isolado, com PR aberta.

## Experiência

Grupo único, turno único, quatro classificados, semifinais1×4/2×3 e final em jogo único são o padrão. O admin altera turnos, grupos, vagas diretas/extras, início da eliminatória e séries únicas/ida-volta/MD3/MD5/MD7. Formato por fase é opcional. Grupos e escolhas manuais, comparação entre grupos, regras e estrutura livre ficam recolhidos. Uma ação Salvar aplica a configuração; rascunhos incompletos da estrutura livre continuam privados.

Três grupos com dois classificados por grupo e dois melhores terceiros produzem oito vagas. A comparação entre grupos usa pontos de classificação por jogo, saldo médio e pontos marcados médios, editáveis; é política do produto, não regra atribuída à FIBA. Classificação pode estar provisória enquanto os classificados automáticos aguardam calendário e desempates. O admin pode escolher classificados/adversários manualmente; desempate da tabela mantém comentário privado.

Finalizar súmula, concluir importação ou salvar correção atualiza fonte e resultado na mesma transação, com histórico, concorrência e recibos. Comentário humano é opcional; auditoria identifica quando não foi informado. Escolha explícita de fonte permanece quando há alternativas. Rascunhos não são publicados automaticamente. Configuração não cria jogos, não altera adversários existentes e não impede lançamentos: associações pendentes aparecem como avisos.

## Contratos e compatibilidade

Configuração compacta é separada de `regulation_heads`. Identificadores derivados da disputa são estáveis entre edições da configuração. Novos comandos e leitores usam `competition_setups`, versões imutáveis e recibos privados. O leitor público remove comentários e usa somente configuração aplicada, legado já público e fatos já confirmados. Não adota o regulamento privado nem publica rascunhos anteriores.

`FLEXIBLE_COMPETITION` fica false no serviço principal. Somente o Worker isolado usa a nova tela, leitores e comandos. O HTML administrativo desse Worker contém metadado de ativação; ausência significa legado. RPCs históricos conservam contratos. O novo writer de jogo suspende somente o impedimento de grupo legado durante sua transação; o trigger conserva o comportamento para os demais writers. Imutabilidade de jogo finalizado, contexto, identidades, RLS e fontes continuam valendo.

Banco de preview: o projeto dev atual não oferece branching no plano contratado. Não fazer upgrade nem comprar recurso implicitamente. O Worker tem nome/origem, Durable Objects, segredo de sessão e rate limit próprios e Access restrito ao responsável; o banco dev é compartilhado, com migration aditiva autorizada. Testes fictícios de escrita e Auth/admin ficam no PostgreSQL local isolado. Validação humana remota precisa saber que alterações em dados existentes persistem nesse banco.

## Aceite

Gate completo, regressão dos percursos, CI do HEAD, migration conferida por hash/histórico/privilégios, deploy explícito no Worker novo e smoke remoto. Não mesclar/fechar a PR antes da validação do responsável. Estado real e links ficam em PROGRESSO e na PR. Nenhum deploy ao principal ou UIUX existente integra esta autorização.
