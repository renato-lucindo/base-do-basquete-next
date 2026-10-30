# Integração futura das páginas públicas

Contrato **específico dos protótipos de súmula e estatísticas**. Para regras gerais, consulte [PADROES.md](PADROES.md); para o fluxo público aprovado, consulte [PUBLICO.md](PUBLICO.md). Este arquivo descreve comportamento e limites de integração, não declara que a implementação real já foi feita ou liberada.

## Limite desta PR

Entrega de design e comportamento demonstrável. As fontes em `docs/design/prototipos/` não são importadas pela aplicação. Os cenários, a faixa de protótipo e as fixtures são recursos de avaliação; não entram automaticamente no produto.

Use os componentes, navegação e tokens existentes na aplicação ao implementar. Preserve as projeções públicas e suas permissões. Disponibilidade de dados por período e penalidade precisa ser comprovada antes de conectar o detalhe; não inferir informação ausente.

## Súmula

- Contexto compacto: fase quando existir, senão número normalizado do jogo, data/hora e local. O fixture usa 024 e a UI mostra 24.
- Equipes nas linhas, períodos nas colunas, incluindo prorrogações e Total. Pontos são principais; marcadores de faltas coletivas têm menor hierarquia. A contagem coletiva é própria, não soma indiscriminada de tipos disciplinares.
- Elencos por camisa, preservando 0/00. Cinco titulares com nome em negrito e asterisco; capitão independente, inclusive reserva. Participação define números versus travessões; quem participou e zerou mantém 0.
- Colunas Nº, Atleta, PTS, 2P, 3P, LL e F. 2P/3P/LL são convertidos. PTS = 2×2P + 3×3P + LL. Total de LL da equipe inclui convertidos/tentados e percentual; zero tentativas tem percentual —.
- Recorte de jogo todo, quartos e prorrogação sincroniza os dois elencos. Não altera o placar final. Atleta sem participação no recorte mantém —; ausência de cobertura não vira zero.
- F mostra somente o total clicável, com toda a célula como alvo. No detalhe, eventos explícitos têm tipo P/T/U/D, período, LL da penalidade e compensação quando conhecida. Não inventar cronologia.
- Vermelho nos períodos ímpares, azul nos pares/prorrogação, com código textual do período. Contornos separam primeiro tempo, segundo tempo e prorrogação. Cor não é a única identificação.
- Exclusão por cinco faltas e desqualificação têm fonte vermelha e negrita; CAP sem balão, à direita. Ausência de exclusão não ganha mensagem.
- Comissão técnica abaixo de cada equipe; equipes lado a lado quando couberem, empilhadas no celular.

## Estatísticas r6

Colunas disponíveis: Pos., Atleta, Equipe, J, PTS, PPJ, PP%, 2P, 3P, LL, F, T, U, 5F e GD. Os acréscimos T/U pertencem à referência r6 enviada.

- Uma linha por atleta/equipe; a mesma pessoa em equipes diferentes mantém linhas separadas. J conta participações. PPJ = PTS/J. PP% usa os pontos da equipe nos mesmos jogos em que o atleta participou.
- Totais/Por jogo altera apenas 2P, 3P, LL, F, T e U. As demais estatísticas mantêm o significado e o valor.
- F já inclui T/U; não somar novamente. Cobertura dessas colunas é independente. Não deduzir 5F ou GD de um total agregado.
- Ordenação usa precisão completa; empates compartilham posição 1,1,3. Ausentes ficam ao final. Busca sem acento, seleção múltipla de equipes e mínimo de jogos se combinam.
- Seletor com 13 colunas opcionais; posição/atleta permanecem. Nenhuma mantém somente essas duas colunas e o ranking. No celular, T/U/5F/GD começam ocultas e podem ser recuperadas. Escolhas manuais persistem na sessão entre filtros e redimensionamento.
- Camisa após nome; tooltip curto nas siglas; seta apenas na coluna ordenada. Não reintroduzir avatares ou ornamentos removidos.

## Aceite da implementação

Reaplicar as provas com dados da projeção pública e erros reais, validar nomes longos, teclado/leitor de tela, toque, tabelas com rolagem interna e primeira tela nas duas larguras. Registrar lacunas de contrato em vez de preencher com zeros. Os protótipos não comprovam integração, publicação, leitura real ou aceite visual do responsável.
