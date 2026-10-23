# Importador de equipes por texto

## 1. Objetivo

Permitir cadastrar ou atualizar o elenco de uma equipe a partir de texto simples, reduzindo o preenchimento manual e a criação de jogadores duplicados.

O sistema interpreta a lista, organiza os dados, procura jogadores já cadastrados e apresenta uma conferência. O usuário pode corrigir informações e decidir quais cadastros utilizar antes de confirmar a gravação.

A funcionalidade atende ao cadastro inicial de equipes, à montagem de elencos para competições e a ajustes no dia do jogo.

## 2. Entrada dos dados

A importação parte do cadastro de uma equipe. O usuário seleciona a equipe ou informa o nome de uma nova e cola a lista, com um jogador por linha.

```text
Equipe: Lobos

4 - João Silva
12 - Ricardo Souza - 193 - 1999
23 - Mike Santos - "MJ" - 2000 - SG
77 - Lucas Oliveira - 1,80 - 75kg
88 - John Pereira - 2/7/2001 - 117kg - Pivô
Pato Ganso - "PH" - Canhoto
Henrique Simões
```

Cada linha pode ter uma quantidade diferente de informações. Não é necessário preencher campos vazios nem manter uma ordem fixa para os dados complementares.

O interpretador deve aceitar os principais separadores, como hífen, ponto e vírgula e barra vertical, além de formatos simples como `4 João Silva`. Também deve reconhecer linhas sem camisa, inclusive `- Henrique Simões`.

Cabeçalhos como `Equipe: Lobos` e `Nº - NOME - NASC. - ALT. - POS.` devem ser reconhecidos sem gerar jogadores indevidos.

## 3. Campos suportados

Somente o nome é obrigatório. Todos os campos devem estar disponíveis para preenchimento e edição durante a conferência.

| Campo | Regra |
|---|---|
| Nome | Obrigatório; pode ser corrigido antes da confirmação |
| Número da camisa | Opcional; aceitar inclusive o número zero |
| Apelido | Opcional; reconhecer exemplos entre aspas, como `"MJ"` |
| Nascimento | Opcional; aceitar data completa ou somente o ano |
| Posições | Opcional; permitir até duas posições conhecidas |
| Altura | Opcional; aceitar metros ou centímetros e normalizar em cm |
| Peso | Opcional; reconhecer informações como `75kg` |
| Mão dominante | Opcional; considerar direita quando não informada |
| Registro da Federação | Opcional; deve ter seis dígitos e ser único entre jogadores |

O registro federativo acompanha o jogador, independentemente da equipe, e deve preservar zeros iniciais.

## 4. Interpretação e normalização

O sistema deve reconhecer o significado das informações pelo formato e pelo contexto. Exemplos:

| Entrada | Interpretação esperada |
|---|---|
| `1999` | Ano de nascimento, sem inventar dia ou mês |
| `2/7/2001` | Data apresentada como `02/07/2001` |
| `193`, `1,93` ou `1.93m` | Altura apresentada como `193 cm` |
| `75kg` | Peso de 75 kg |
| `"MJ"` | Apelido MJ |
| `Canhoto` | Mão dominante esquerda |

As posições devem ser convertidas para termos padronizados em português:

| Códigos ou termos reconhecidos | Posição |
|---|---|
| `1`, `PG`, `Point Guard` | Armador |
| `2`, `SG`, `Shooting Guard` | Ala Armador |
| `3`, `SF`, `Small Forward` | Ala |
| `4`, `PF`, `Power Forward` | Ala Pivô |
| `5`, `C`, `Center` | Pivô |

Também são aceitos os próprios termos em português. Combinações como `PG/SF` e `1-2` representam duas posições. O hífen dentro de `1-2` não deve quebrar essa informação em campos independentes.

Posições desconhecidas, mais de duas posições ou dados inválidos devem ser sinalizados para correção. Informações ambíguas não devem ser tratadas como interpretação confirmada.

## 5. Identificação de jogadores existentes

Antes de propor um novo cadastro, o sistema deve procurar jogadores existentes nesta ordem:

1. Registro da Federação, quando informado.
2. Nome exato normalizado, desconsiderando acentos e diferenças entre maiúsculas e minúsculas.
3. Compatibilidade aproximada, considerando nome e outros dados disponíveis, como apelido e nascimento.

O resultado deve distinguir correspondências claras, sugestões que precisam de confirmação e jogadores não encontrados.

Nomes iguais não significam necessariamente a mesma pessoa. Quando houver mais de um candidato, apresentar informações que ajudem na escolha, como nascimento, registro e equipe. O usuário poderá selecionar um cadastro existente ou confirmar a criação de outro jogador.

A semelhança entre nomes deve gerar uma sugestão para revisão, sem fundir cadastros automaticamente.

## 6. Conferência e confirmação

A interpretação deve gerar uma tabela com todos os campos suportados, o status de cada linha e a ação a executar.

| Nome importado | Situação | Decisão disponível |
|---|---|---|
| João Silva | Jogador encontrado | Usar cadastro existente |
| Ricardo Souza | Não encontrado | Criar jogador |
| Luke Silva | Possível correspondência com Luka Silva | Escolher o existente ou criar novo |
| John Pereira | Vinculado a outra equipe | Conferir contexto da competição |

Durante a revisão, o usuário poderá:

- Corrigir nome, camisa e demais informações interpretadas.
- Completar dados que não estavam no texto.
- Aceitar uma sugestão ou selecionar outro jogador cadastrado.
- Confirmar a criação de um jogador novo.
- Resolver erros e conflitos antes da gravação.

As decisões e correções devem ser preservadas na importação. Alterações propostas em dados de um jogador existente também devem ficar visíveis para confirmação.

## 7. Regras de equipe e elenco

Se a equipe informada não existir, apresentar sua criação para confirmação. Se já existir, comparar a lista importada com o elenco atual e mostrar jogadores novos, mantidos e ausentes.

A ausência de um jogador no novo texto não autoriza sua remoção automática. O usuário deve decidir o que fazer com as diferenças.

A camisa pertence ao vínculo com a equipe e a competição, não ao cadastro permanente do jogador. O número importado funciona como referência inicial e pode ser alterado no contexto dos jogos.

Camisas repetidas no mesmo elenco/contexto devem gerar conflito; vários jogadores sem camisa informada são permitidos.

Quando o jogador já estiver em outra equipe, apresentar essa informação. O vínculo com outra equipe é permitido em outra competição ou edição; o sistema deve respeitar as restrições do contexto escolhido.

## 8. Gravação e resultado

Somente após a confirmação, o sistema deve criar os jogadores novos, reutilizar os cadastros escolhidos, salvar os dados aprovados e estabelecer os vínculos com a equipe.

O resultado esperado é um elenco cadastrado e utilizável no sistema. Uma tela que apenas interpreta o texto ou simula a gravação não representa a entrega funcional completa.

## 9. Limites da primeira versão

O foco é importar uma equipe por vez, usando texto, com revisão humana e gravação efetiva dos dados confirmados.

Ficam para evoluções futuras:

- Importação estruturada de planilhas Excel/CSV.
- Importação de várias equipes em uma única operação.
- Histórico detalhado de importações.
- Aprendizado das decisões de compatibilidade.
- Identificadores adicionais além do registro federativo.

## 10. Critérios de aceite

- Importar listas apenas com nomes e listas com informações complementares variadas.
- Reconhecer jogadores sem camisa, camisa zero e cabeçalhos.
- Normalizar datas, alturas e até duas posições corretamente.
- Apresentar sugestões de jogadores existentes e permitir resolver homônimos.
- Permitir revisar todos os campos e preservar as correções.
- Sinalizar registros inválidos, posições desconhecidas e conflitos de camisa ou vínculo.
- Gravar os dados confirmados e atualizar o elenco sem remoções automáticas.
