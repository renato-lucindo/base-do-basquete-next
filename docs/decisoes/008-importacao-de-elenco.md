# 008 — revisão de um elenco com dados opcionais

O escopo complementar do responsável em ESCOPO-IMPORTADOR-DE-EQUIPES.md substitui o WIP anterior de múltiplas equipes/camisa obrigatória. Confirmação em tabela e lote de atletas de uma inscrição, com dados aprovados + vínculo atômicos por item e revisão recuperável. Cadastro individual permanece alternativa.

Camisa ausente é null; unicidade vale para números informados e ativos, preservando 0/00. Registro federativo privado tem seis dígitos e unicidade global. Não converter para número. Ausência de dado no texto não apaga campo de pessoa existente; alterações explícitas exibem antes/depois e usam versão esperada. Nenhuma ausência remove atleta do elenco.

Ano parcial de nascimento fica em private.athletes, separado do ano público. Importar somente ano não inventa data nem publica esse dado. Leitor administrativo do importador será próprio; não ampliar payload legado do preview de maneira incompatível antes de publicar o cliente correspondente. Posições do importador são até duas canônicas; ambas cabem na representação textual atual do perfil (`Armador / Ala`), evitando migração desnecessária do perfil público.

Novos atletas usam naipe do destino e mão direita quando omitida. Existentes preservam sexo e mão não informada. Matching é sugestão administrativa, registro primeiro e nomes/dados depois; identidade continua UUID e homônimos exigem decisão. Transações/constraints revalidam propostas no banco. Revisão pelo autor não prova corrida multi-conexão/escala ou acessibilidade completa.
