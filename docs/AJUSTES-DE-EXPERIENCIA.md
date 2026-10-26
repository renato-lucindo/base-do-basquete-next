# Ajustes solicitados na avaliação do protótipo

## Feedback de26/10/2026 — importações e conferência do MVP

Pedido do responsável, ainda em planejamento; não atribuir implementação ou aceite a estes itens:

- PDF de teste do responsável não importou. Conferir uso do módulo e PDFs originais do ZIP; diagnosticar o arquivo `docs/boxscore/Box Score FIBA ALC vs IVV 02 junho.pdf`, preservado como material humano fora do Git. A reprodução local já mostrouBDB_PDF_TEAM_LARGEST_LEAD; integração autenticada completa continua a comprovar.
- Interpretador precisa aceitar mudanças simples de ordem, inclusive nome do jogador antes da camisa. Evitar atribuir números a campos errados sem aviso.
- Mostrar apenas o nome da equipe, sem código técnico na apresentação. IDs internos permanecem necessários para vínculos.
- Súmula com filtros checkbox por quarto/equipe, separação de faltas e pontos e somente últimas10 ações na visualização inicial; ações anteriores continuam pesquisáveis.
- Cada cesta deve indicar placar acumulado da própria equipe após a ação. Cada falta do atleta deve mostrar sua contagem ou a desqualificação gerada naquele lançamento. Exemplos pedidos: `3. Q1 - A - #25 - 2p (5)`; `23. Q3 - B - #12 - Tc (3)`; `24. Q3 - B - #12 - U2 (GD)`.
- Outros refinamentos ficam para depois do MVP. Plano proposto em `docs/superpowers/plans/2026-10-26-refino-mvp-importacao-sumula.md`; paginação, duas seções e política explícita de ambiguidades são propostas técnicas, não escolhas já confirmadas pelo responsável.

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

Uma mesma pessoa pode ser atleta e treinador, sem duplicar sua identidade. A identificação na súmula deve permitir associar o treinador ao jogo e conservar o histórico quando seus vínculos mudarem. Nomes físicos, campos e constraints serão definidos na modelagem das migrations, respeitando os contratos existentes. Nenhuma tabela ou integração foi criada neste marco; o protótipo usa metadados locais, descritos abaixo.

## Capitão, Técnico e Ass. Técnico na súmula

Solicitação posterior de 22/10: o atleta que assume como técnico é sempre o capitão, na ausência de técnico próprio. Por equipe, selecionar o capitão entre os relacionados; a opção “Sem técnico: capitão assume” preenche “Técnico” com esse atleta e oculta “Ass. Técnico”. Desmarcar permite informar técnico próprio e assistente opcional, mantendo o capitão identificado separadamente. Não oferecer seleção arbitrária de outro atleta como técnico.

O papel duplo usa a mesma identidade do relacionado e o motor existente de faltas/desqualificações. Mudança de capitão/técnico revalida a sequência inteira; edição inválida preserva o estado anterior. Rascunho pode ficar incompleto; publicação exige capitão selecionado quando assume ou nome do técnico próprio. Assistente não é admitido no modo capitão-técnico. Alternar para esse modo retira os nomes de técnico/assistente da súmula atual, com desfazer disponível.

Os exemplos fictícios iniciais já identificam Ana da Silva e Carla Souza como capitãs; jogos novos e rascunhos antigos sem essa informação exigem seleção explícita, sem inferir capitão pelo primeiro atleta. Atleta-treinador identificado no formato legado é interpretado como capitão conforme a regra do responsável. Metadados são preservados nas versões publicadas; corrigir exige motivo e republicação, sem reescrever a versão anterior. Seleção real de identidades de treinadores permanece na integração futura.

## Ordem dos relacionados, cinco titulares e opções no final

Solicitação de 22/10 após autorização para seguir à fundação: mover criação de confronto e revisão de fontes para o final da súmula; ordenar atletas pela camisa e selecionar os cinco titulares.

- Blocos auxiliares ficam em “Outras opções”, depois dos controles de publicação/histórico. O primeiro foi renomeado para “Criar outro jogo nesta área”: cria novo rascunho e preserva o trabalho anterior; não é seletor de jogo existente. Jogos existentes são abertos pela lista Jogos. A utilidade foi explicada ao responsável antes da alteração.
- Relacionados e seletores usam ordem numérica de camisa, 0 antes de 00, preservando IDs e sem reordenar o documento salvo apenas para apresentação.
- Checkbox “Titular” por atleta e contador por equipe. No máximo cinco na edição e exatamente cinco de cada lado para publicar a súmula. Rascunhos incompletos continuam salváveis. Titular implica participação; desmarcar não apaga a participação já registrada. Desfazer/refazer, recarga e versões preservam os marcadores. Formato legado sem marcador não infere titularidade.
- Fixture inicial ampliada para seis atletas por equipe, sem titulares pré-selecionados. Rascunhos anteriores não recebem pessoas fictícias automaticamente; se tiverem menos de cinco relacionados, precisam ser completados pelo fluxo contextual.

O responsável autorizou avançar às próximas etapas antes deste refinamento. Concluir e publicar o ajuste, então continuar a fundação real em unidades pequenas; a interrupção anterior ocorreu antes de qualquer mutação de infraestrutura. Não solicitar novamente autorização já concedida. Criação de serviço pago continua condicionada à decisão específica do responsável.
