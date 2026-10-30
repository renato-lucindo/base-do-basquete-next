# UI/UX administrativo — MVP

Complementa os [padrões comuns](PADROES.md). Respeite o [escopo técnico](../MATRIZ-ESCOPO.md) e contratos existentes de cadastro, jogo, súmula, importação e publicação.

## Projetar o percurso antes da tela

- Especificar **entrada → edição → validação → confirmação/feedback → retorno**, contemplando cancelamento, erro, falha de salvamento e conflito de versão.
- Tabelas e listas compactas com busca, filtros e ações próximas às linhas. Reduzir títulos repetidos, cartões grandes e espaços vazios; usar toda a largura disponível para organização coerente.
- Formulários com campos essenciais **visíveis** e larguras proporcionais. Expandir somente detalhes secundários quando houver ganho concreto; evitar múltiplas etapas desnecessárias.
- Identificar sempre o contexto de destino (campeonato, edição, disputa, equipe, jogo) antes de salvar ou publicar. Preservar dados e avisar ao sair de edição pendente.

## Componentes e feedback

| Necessidade                         | Comportamento esperado                                                                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selecionar jogador, equipe ou local | **Combobox/autocomplete pesquisável**, sem despejar catálogo completo ao abrir; teclado, foco, estados vazios, seleção e opção de limpar quando pertinente.    |
| Criar/editar jogos ou eventos       | Diálogo contextual quando o formulário couber, com título, ações visíveis, foco, campos proporcionais e rolagem interna se necessária.                         |
| Adicionar atleta ao elenco          | Diálogo com identidade, equipe, camisa e conflito antes de confirmar; distinguir `0` de `00`.                                                                  |
| Gravar/excluir/corrigir/publicar    | Mostrar salvando/salvo/erro e conflitos. Toast para feedback complementar; erros persistentes ficam no contexto e consequências relevantes exigem confirmação. |
| Listagens densas                    | Nomes e identificação legíveis, alinhamento e ordenação previsíveis, ações visíveis/focáveis e navegação por teclado.                                          |

## Aceite proporcional

No desktop, conferir **1366×768** e **1920×1080** com nomes longos, listas representativas (12 atletas quando houver elenco), dropdowns e diálogos abertos. Verificar teclado, zoom, foco, vazios e erros; validar mobile se a alteração o afetar. Não introduzir dependências, cálculos, recursos ou páginas fora do MVP a partir de sugestões estéticas. As regras estatísticas, disciplinares e de publicação permanecem nos contratos do domínio.

Feedbacks e handoffs anteriores foram preservados no [arquivo histórico](../../historico/documentacao/README.md).
