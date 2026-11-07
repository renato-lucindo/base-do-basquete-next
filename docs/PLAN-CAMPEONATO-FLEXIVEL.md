# Campeonato flexível e resultados automáticos

Plano aprovado pelo responsável em 07/11/2026 nesta conversa. Autoriza implementar, migrations e etapas necessárias a um **Worker de preview isolado**. A PR deve permanecer aberta, sem merge ou fechamento antes da validação humana desse preview. Não alterar o serviço principal, publicar rascunhos existentes, dados reais para teste, Auth/Access ou segredos compartilhados. A autorização específica desta unidade amplia a autorização histórica de migrations de leitura somente no necessário para este preview.

## Resultado

Configuração simples conforme o protótipo: FIBA; grupo único; turno único; quatro classificados; semifinais 1×4/2×3 e final em jogo único. Grupos, vagas diretas e extras (incluindo três grupos, dois por grupo e dois melhores terceiros), turnos, fases de final até 32 avos e jogo único/ida-volta/MD3/MD5/MD7 são editáveis. Formatos por fase, regras personalizadas, classificados e confrontos manuais ficam em opções secundárias. Comentários são opcionais nas operações comuns; desempate da tabela mantém justificativa privada.

Jogos e resultados são independentes da organização: ausência ou conflito de grupo/série não bloqueia lançamento ou finalização. Associação posterior atualiza o cálculo. Finalizar súmula/concluir importação e salvar correção disponibilizam o resultado sem outra publicação. Rascunhos permanecem privados. Preservar validações essenciais, controle de concorrência, idempotência, fonte histórica e auditoria.

Classificação usa os dados calculáveis. Classificados automáticos aguardam calendário completo e empates relevantes; decisão manual permite organizar exceções. Não reescrever adversários de partidas existentes quando uma correção muda os classificados. Comparação entre grupos: pontos de classificação por jogo, saldo médio e pontos marcados médios, editáveis e sem atribuir esta política à FIBA.

## Implementação e isolamento

1. Domínio: configuração compacta separada do legado, compilação estável de grupos/confrontos, pools de classificados e substituições manuais; testes de médias, empates, calendário, séries e associação incompleta.
2. Persistência: migrations aditivas, consultas e comandos próprios, com histórico e recibos. Não alterar migrations aplicadas nem a visibilidade dos rascunhos anteriores. Recursos novos acessíveis pelo novo Worker sem mudar o comportamento dos Workers antigos.
3. Tela real: substituir o percurso normal de regulação por formulário/resumo do protótipo; recuperar estruturas legadas sem conversão silenciosa. Configuração incompleta pode ser guardada como rascunho sem impedir jogos.
4. Finalização/correção: gravação transacional da fonte e resultado público. Uma ação, sem justificativa ou revisão extra para operações comuns. Conflito com fonte alternativa continua escolha explícita de fonte, sem texto obrigatório.
5. Público: usar formato atual e resultados finalizados automaticamente; mostrar pendência de organização sem retirar os resultados. Preservar contratos legados, motivos privados e dados humanos.
6. Verificação: domínio, PostgreSQL isolado, HTTP/Worker, browsers dos percursos, gate completo e CI do HEAD. Publicar branch no Worker isolado após checks; preservar proteção e comprovar fonte, assets, banco e estados de autenticação. Aguardar aceite com a mesma PR aberta.

## Execução

- [x] Domínio e compilação com testes.
- [x] Persistência aditiva e testes transacionais.
- [x] Tela simplificada, vagas extras e opções manuais.
- [x] Finalização e correções sem publicação adicional.
- [x] Classificação pública automática e pendências independentes.
- [ ] Gate, PR, CI e preview isolado para aceite.

Base observada: `903dc9cb2ab17db8fd892bf9eea3593e906ab34a` (PR74 integrada); nenhuma PR aberta ao iniciar. Unidade `codex/campeonato-flexivel`, worktree reutilizado `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. Branch local anterior e commit documental `12ca471` preservados. Protótipo de referência fora do repositório: `C:/Users/12405304716/.codex/visualizations/2026/11/06/01a1b339-dfb6-7d91-9870-aa77645ef27f/configuracao-campeonato/index.html`.
