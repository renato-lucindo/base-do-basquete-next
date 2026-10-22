# Ajustes solicitados na avaliação do protótipo

22/10/2026 — decisão posterior do responsável, complementar ao pacote original preservado. A solicitação não presume aceite final dos três percursos.

## Súmula: conferência e correção de ações

- Q1 e Q3 em vermelho suave; Q2 e Q4 em azul suave, com identificação textual do período. Aplicar ao lançamento e às linhas registradas. Prorrogações mantêm a identificação OT e o azul já definido pelo motor fornecido.
- Alternar entre ordem de lançamento e ordem por quarto, Q1 → Q2 → Q3 → Q4 → OT. Preservar a sequência de lançamento dentro de cada período e não reordenar o documento salvo apenas para apresentação.
- Permitir editar quarto, equipe, camisa/alvo e código de uma ação escolhida, preservando seu ID e posição original. Revalidar o documento inteiro e recalcular placar, parciais e faltas; rejeitar alteração que invalide ações posteriores.
- Permitir excluir uma ação escolhida, com confirmação contextual. Não retirar automaticamente a participação do atleta, pois pode ter jogado sem ações. Edição e exclusão integram desfazer/refazer e o rascunho recuperável.
- Todas as ações devem permanecer acessíveis, inclusive além das últimas trinta. As etiquetas de ação indicam a posição atual na sequência de lançamento.
- Em resultado publicado, alterar o rascunho da revisão e exigir motivo, prévia e republicação para produzir outra versão; manter a anterior.

Implementação no protótipo, com dados fictícios e persistência local. Segurança de escrita, auditoria e persistência de servidor continuam nos próximos marcos. Validação humana dos ajustes ainda pendente.

## Súmula: ciclo de teclado e atalhos

Solicitação adicional do responsável em 22/10: operar o lançamento por `camisa → Enter → ação → Enter`, com atletas diferentes e repetidos, e trocar equipe/quarto por atalhos.

- Enter na camisa valida o alvo e avança ao código sem registrar ação. Enter no código registra uma única ação válida e retorna à camisa com o valor selecionado; digitar substitui a camisa anterior, Enter permite repeti-la. Não confundir 0 e 00.
- Erro mantém camisa/código para correção e não avança nem cria ação. Eventos repetidos de Enter mantido pressionado não registram novos lançamentos no ciclo de entrada. Códigos B/C continuam possíveis.
- `Alt+A` e `Alt+B`: selecionar equipe A/B e focar a camisa. `Alt+1` até `Alt+4`: selecionar quarto e focar a camisa. `Alt+Q`: focar o seletor de período; setas escolhem também prorrogações existentes e Enter retorna à camisa.
- Trocar equipe/quarto não registra ação e mantém os campos ainda não lançados; a camisa precisa pertencer à equipe selecionada antes de prosseguir. Atalhos com Ctrl/Meta/Shift ou durante composição de texto não são interceptados.
- Informar o ciclo e os atalhos na própria área de lançamento. Manter seletores, botões e navegação por Tab para acesso convencional.

Os testes reproduzem integralmente o exemplo `12/P2, 77/3, 23/2, 23/3, 77/1, 77/1, 34/U2` somente com teclado após preparar os relacionados. São verificados também atalhos, 0/00 e retomada após erros em desktop/celular.

## Treinador no banco novo — implementação futura

Esclarecimento do responsável em 22/10: prever cadastro persistente de treinador como entidade, com tabela própria no modelo novo, ligada à identidade da pessoa e aos vínculos com equipe/inscrição. O pacote define regras da súmula para treinador e atleta-treinador, mas não prescreve uma tabela física de treinadores; este esclarecimento complementa a modelagem.

Uma mesma pessoa pode ser atleta e treinador, sem duplicar sua identidade. A identificação na súmula deve permitir associar o treinador ao jogo e conservar o histórico quando seus vínculos mudarem. Nomes físicos, campos e constraints serão definidos na modelagem das migrations, respeitando os contratos existentes. Nenhuma tabela ou integração é criada nesta atualização documental; o protótipo atual ainda representa apenas os alvos B/C e a seleção de atleta-treinador.
