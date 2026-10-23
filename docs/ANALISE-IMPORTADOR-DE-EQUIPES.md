# Análise do módulo complementar de importação

23/10/2026. Solicitação do responsável: “Não gostei do fluxo. Analise esse módulo e veja o que pode ser aproveitado dele”. Esta análise substitui o avanço imediato da UI C4 anterior; não representa aprovação de uma nova composição nem altera o preview.

## Insumo e verificação

ZIP local do responsável `IMPORTADOR-DE-EQUIPES-20261023.zip`, SHA-256 **33fbdda0fcca11ab68ed25b260765d47673543a79f51ec4b061c5d5123ae9104**. README lido primeiro. Os 11 arquivos de origem conferem com MANIFEST.json. Arquivo original preservado; cópia de análise em `.preview-artifacts/importador-equipes-20261023`, ignorada pelo Git. Nenhum repositório/serviço anterior foi consultado.

Foram lidos os cinco módulos, os cinco arquivos de testes e a rota React. README e código do pacote são referências fornecidas para avaliação, sem transformar instruções internas em autorização de migração/deploy. O próprio README distingue snapshot de funcionalidade pronta.

Sete testes Vitest fornecidos em cinco arquivos **PASS**, executados isoladamente com dependências já fixadas, sem instalar pacotes do anexo ou repetir o gate do produto. Probes adicionais de funções puras/adaptador fictício reproduziram os comportamentos abaixo. Não houve acesso a dados reais nem gravação no banco.

## O que aproveitar

| Arquivo dentro do ZIP         | Aproveitamento recomendado                                                                                                                                                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| team-import-domain.ts         | Base de interpretação de atributos opcionais: camisa, nome, apelido, nascimento/ano, registro, altura, peso, posição e mão dominante. Dicionário de posições PT/EN e normalização de acentos são úteis. Corrigir tokenização/validação e preservar a linha original/campos não reconhecidos. |
| team-import-matching.ts       | Sugestões por registro/nome normalizado/semelhança e classificação novo/compatível/ambíguo/conflito. São sugestões, nunca prova de identidade nem fusão automática. Registro é privado: comparação autoritativa no servidor, retornando candidatos limitados e contexto público.             |
| team-import-review.ts         | Ideia de revisão em lote com estados claros e candidato sugerido. Adaptar para IDs estáveis por linha, vários candidatos, campos editáveis, avisos específicos e seleção dos prontos.                                                                                                        |
| team-import-confirmation.ts   | Intenção de criar ou vincular e manter correção antes da gravação. Exigir decisões válidas, UUIDs e versões; não criar silenciosamente quando falta ID/decisão.                                                                                                                              |
| team-import-persistence.ts    | Apenas a separação entre decisão de domínio e adaptador. Não reutilizar o executor sequencial como persistência do produto; substituir por transação por item, idempotência, autorização e retorno individual.                                                                               |
| admin.players.import-text.tsx | Composição “colar → interpretar → tabela” e visibilidade dos atributos. Não é tela de revisão completa: a tabela é somente leitura e não está conectada aos outros módulos ou ao banco.                                                                                                      |

## Limitações comprovadas

Referências de linha correspondem aos arquivos originais do ZIP, preservados na cópia de análise.

1. **Perde camisa na criação.** persistence.ts:3–5/16 não transporta camisa na ação `create`; :45 grava `null`. Probe `7 - Ana` criou pessoa e vínculo sem a camisa 7. Apelido/ano/altura/peso/posição/registro/mão também não chegam ao adaptador de criação.
2. **Ignora nome corrigido.** confirmation.ts permite `correctedName`, mas persistence.ts:8–16 não o utiliza. Correção para `Ana Silva` resultou em plano com `Ana`.
3. **Criação sem decisão completa.** confirmation.ts:24 usa `create` quando falta decisão. persistence.ts:9–16 transforma `existing` sem ID em criação. Isso pode produzir identidade nova contra a intenção do usuário.
4. **Quebra nomes com hífen.** domain.ts:47 separa qualquer hífen. `7 - Jean-Pierre - 1,85 - 80kg` vira nome `Jean`, perdendo `Pierre`; apelidos com hífen têm o mesmo risco.
5. **Altura do exemplo não é interpretada.** `77- Luke Silva - 180 - 75kg`, exibido na própria demonstração, resulta em altura `null`; só valores entre 1 e 3 são convertidos em metros. A altura `1,85` resulta corretamente em 185 cm.
6. **Data inválida passa.** domain.ts:69–74 aceita `31/02/2000` e mantém DD/MM/AAAA. O contrato atual usa data ISO válida. Ano público deve continuar separado do nascimento completo privado, sem derivação automática.
7. **Não conserva equipes/destino.** domain.ts:41 descarta todos os cabeçalhos `Equipe:`. Dois blocos retornam uma lista única de atletas, sem equipe, inscrição ou linha física. Precisa do agrupador contextual do produto, inclusive cabeçalhos homônimos e blocos vazios.
8. **Matching precisa de revisão.** Um nome normalizado único recebe `COMPATIVEL` (:38), mas isso não prova identidade. Dois registros federativos iguais não produzem ambiguidade por registro: a busca continua por nome/semelhança. Há limiar fixo de distância 2 e substring sem proteção de nome vazio; faltam contexto e limites para busca real.
9. **Sem atomicidade/resultado parcial robusto.** persistence.ts:35–46 insere pessoa e depois vínculo. No adaptador de falha, a pessoa já havia sido inserida quando o vínculo falhou; o lote parou antes da segunda pessoa. Não há rollback, recibo, versão, autorização, sexo pelo naipe ou retomada. Simulação comprova a sequência do módulo, não comportamento do banco novo.
10. **Tipos/contratos incompatíveis.** Matching usa IDs string; confirmação/persistência usam number. Projeto novo usa UUID e identidade única compartilhada entre pessoa/atleta/técnico. Mão dominante e data precisam de adaptação; múltiplas posições não devem desaparecer ao mapear para o perfil atual.

Os sete testes validam exemplos pequenos; não cobrem essas falhas, interação completa, banco, concorrência, privacidade, sucesso parcial ou retomada. PASS não equivale a prontidão de produção.

## Fluxo recomendado para substituir o excesso de etapas individuais

Dentro de Equipes e elencos, oferecer **colar equipes/elencos → interpretar → revisar tabela editável com sugestões → confirmar itens válidos → resultado por linha**. Para elenco de inscrição já aberta, usar esse destino e evitar escolher a equipe novamente.

Exibir os atributos reconhecidos, origem e pendências junto da linha. Propor criação para entradas novas, com confirmação coletiva explícita; abrir escolha individual somente quando houver identidade/valor/destino a resolver. Nome igual ou parecido mostra candidatos e exige resolução, sem fundir. Não obrigar salvar a pessoa e depois abrir outro formulário para salvar cada camisa. Cadastro individual permanece como alternativa.

Confirmar somente selecionados/prontos, conservar sucessos, texto e pendências e permitir corrigir/repetir sem duplicar. Texto não reconhecido fica visível. Guardar revisão/versionamento no servidor; derivar sexo do novo atleta pelo naipe e revalidar todos os vínculos no backend. Sem CSV/XLSX e sem alterar sexo/cadastro existente silenciosamente.

Esta é recomendação do implementador a partir do feedback e do pacote, ainda sem novo aceite visual. Antes de integração: demonstrar a composição revisada com os exemplos ricos do anexo e amostra real quando fornecida. Reutilizar C2/C3 e suas evidências válidas; o preview publicado continua source `81f5f41`.

## Trabalho anterior preservado

C4.1 anterior gerou parser/schemas de prévia sem uso na UI/runtime, sete testes novos e tipos/ESLint aprovados. Está em branch de trabalho; não foi publicado. Pode conservar limites, origem, cabeçalhos distintos, camisas e validações de resolução, mas precisa absorver atributos opcionais e a proposta de lote sem excesso de etapas. Não iniciar a DDL/UI daquele plano como se o feedback atual já estivesse incorporado.
