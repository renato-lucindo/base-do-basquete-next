# Confrontos da fase regular

## Escopo e decisão

Pedido de 25/11/2026: checkbox no formato para gerar confrontos conforme organização, turnos e quantidade de equipes; revisão do mando e dos dados dos jogos. Entrega em uma PR para main, limitada ao administrativo indicado pelo responsável. Sem alterar outras PRs, serviços, banco ou publicação.

Reutilizar inscrições, formato e API de jogos existentes. A quantidade deve coincidir com as inscrições da disputa; em vários grupos, todas precisam estar distribuídas, com pelo menos duas por grupo. Não criar equipes fictícias. Gerar uma prévia por rodadas, sem repetir confrontos cadastrados. Ida e volta inverte o mando no segundo turno. Conforme correção explícita do responsável, **Trocar mando fica somente em Editar jogo**, ao lado das inscrições. Agenda, número, rodada, arbitragem e demais dados usam o editor existente. Jogo encerrado e decisões administrativas preservam os bloqueios atuais.

Alternativas: uma nova API de lote exigiria persistência e migration sem necessidade; criar jogos imediatamente impediria revisar a tabela antes da escrita. A prévia local seguida do cadastro existente preserva contratos e permite recuperação por item.

## Plano de execução

- [x] Testar e implementar gerador determinístico de todos contra todos, folgas para número ímpar, dois turnos, grupos e deduplicação por par.
- [x] Acrescentar checkbox, quantidade e prévia compacta paginada. Troca de mando somente no diálogo Editar jogo, preservando os campos e os contratos existentes.
- [x] Salvar somente após o formato estar salvo. Conservar IDs/comandos em falha incerta, não repetir itens confirmados, bloquear edição durante envio e avisar ao sair com pendências.
- [ ] Cobrir o percurso com fixtures de navegador: geração, edição, salvamento, repetição de envio e grupos inválidos; conferir desktop, celular, foco e reflow.
- [ ] Executar gate consolidado, revisão do diff e CI do SHA da PR. Atualizar checkpoint e entregar somente o link da PR, sem merge/deploy.

## Pontos de revisão

Quantidade vazia/divergente, grupos incompletos, equipes ímpares, jogos preexistentes com mando invertido, resposta perdida e falha parcial não devem perder edições nem duplicar jogos. Alterar organização depois de gerar torna a prévia obsoleta até nova geração. Resultados/identidades de jogos existentes permanecem protegidos pela API vigente.
