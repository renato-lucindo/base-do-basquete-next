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
- [x] Gate, PR, CI e preview isolado para aceite. [Provas da entrega](evidencias/2026-11-07-preview-isolado-pr75.md); aceite humano pendente, PR aberta.

## Refinamento de apresentação — 08/11/2026

Responsável determinou duas etapas sequenciais nesta mesma unidade/PR75. A primeira entrega é **somente documental**, sem componentes, CSS, testes de produto, Worker ou deploy. O padrão fica nos documentos de referência; esta lista registra o trabalho restante, sem confundir decisão com execução.

- [x] Etapa1: consolidar textos, tooltips e legendas em [Padrões](design/PADROES.md#textos-de-apresentação), atualizar [Público](design/PUBLICO.md#classificação--decisão-de-06112026) e tornar obrigatória a [conferência de revisão](design/README.md#conferência-obrigatória-de-textos-e-tabelas). Revisão documental, conflitos e evidências no checkpoint.
- [x] Etapa2: remover o bloco genérico “Classificação provisória” e seu parágrafo na classificação, incluindo a orientação equivalente na projeção administrativa; preservar mensagens de estados concretos.
- [x] Etapa2: cabeçalhos abreviados com somente o significado no tooltip; Equipe e Últimos jogos sem tooltip/botão de ajuda; legenda conforme Jogadores/Equipes, apenas abreviações visíveis e definições curtas.
- [x] Etapa2: renomear Últimos5 para **Últimos jogos**, centralizar o cabeçalho e manter até cinco resultados e a ordem atual.
- [x] Etapa2: aplicar o tooltip compacto `LUSB 56 x 66 IVV/Cetaf - 20/09`, sigla cadastrada ou nome publicado da inscrição, sem horário/ano/explicações; ausência conforme Público e identificação acessível separada.
- [x] Etapa2: verificar texto/alinhamento/legenda e teclado/toque/responsividade nos testes e capturas pertinentes:28cenários desktop/mobile PASS. [Evidências](evidencias/2026-11-08-classificacao-apresentacao.md).
- [ ] Etapa2: atualizar somente o preview isolado após CI, mantendo a PR aberta para validação humana.

A primeira etapa foi entregue isoladamente no conteúdo1714f39/checkpoint46a8274. Após confirmar a CI42512523431 SUCCESS, o responsável autorizou prosseguir com a etapa2 e determinou programar checagem sempre que houver espera por CI; regra permanente em CONTRIBUTING. Não criar outra branch/PR dependente nem mesclar/fechar PR75 antes do aceite humano.

Base observada: `903dc9cb2ab17db8fd892bf9eea3593e906ab34a` (PR74 integrada); nenhuma PR aberta ao iniciar. Unidade `codex/campeonato-flexivel`, worktree reutilizado `C:/Users/12405304716/.codex/worktrees/classificacao-ultimos-cinco/Base do Basquete-v1`. Branch local anterior e commit documental `12ca471` preservados. Protótipo de referência fora do repositório: `C:/Users/12405304716/.codex/visualizations/2026/11/06/01a1b339-dfb6-7d91-9870-aa77645ef27f/configuracao-campeonato/index.html`.
