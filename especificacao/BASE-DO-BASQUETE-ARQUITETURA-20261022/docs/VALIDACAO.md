# Desenvolvimento e validação

## Sequência de entregas

| Etapa | Entrega vertical | Dependências e conclusão |
| --- | --- | --- |
| 1 | Referências e protótipo fictício | Três percursos de EXPERIENCIA.md avaliados pelo responsável; registrar os ajustes aceitos |
| 2 | Fundação | Repositório, decisões de stack, CI/preview, projeto Supabase novo, migrations e acesso por senha; domínio/infraestrutura separados, RLS e tipos verificados |
| 3 | Contexto e cadastros | Campeonato/temporada/disputa numa página, equipes/elencos, homônimos, texto e Recentes; sem depender de transferências ou modelos avançados da etapa 5 |
| 4 | Jogo completo | Cadastro direto, PDFs e súmula, revisão, confirmação/publicação e consulta pública do resultado na mesma entrega; sem exigir chave gerada |
| 5 | Organização e histórico | Regulamento, grupos, séries, desempates, transferências/retornos, exceções e premiações; implementar junto as regras e classificações que dependem delas |
| 6 | Consulta completa e publicação | Todas as capacidades estatísticas/perfil e demais consultas públicas; performance, acessibilidade, segurança e operação verificadas antes de produção |

Na etapa 4, resultado, estatísticas e visibilidade pública necessários à confirmação já funcionam; a etapa 6 completa os exploradores e recortes. Transferência usa as regras entregues na etapa 5, não bloqueia o cadastro básico da etapa 3. Cada formato de regulamento inclui sua classificação e testes na própria entrega.

Protótipo é avaliação de produto; testes técnicos não a substituem. Durante implementação usar testes focais. Ao estabilizar uma entrega, executar formatação/lint/typecheck, testes afetados, SQL/RLS quando aplicável, build e segredos; validar CI/preview correspondente ao artefato. Não repetir suítes completas por documentação ou código materialmente idêntico com evidência válida.

## Estratégia de testes

Domínio: cálculos, regras e parser com testes unitários. Infraestrutura: SQL, constraints, RLS, idempotência e concorrência em banco descartável. Integração: caso de uso com adaptadores reais. Navegador: percursos afetados em desktop/celular e teclado; verificar leitor de tela, foco, contraste, zoom e reflow. Mock não é evidência de integração.

O contrato estatístico define o resultado esperado; executar casos de referencias/estatisticas nas implementações SQL/TypeScript conforme sua fronteira. Testar arredondamento de valores negativos e de meia unidade decimal; não assumir que funções padrão de linguagens diferentes são equivalentes. Conferir os nove cruzamentos entre modo e escopo e os limites de cobertura/amostra.

## Publicação e operação

Preview por branch/PR e produção por origem protegida, com artefato identificável. Definir bindings e secrets por ambiente. Medir dados representativos, registrar volume e condições, verificar planos de consulta quando necessário. Não usar banco vazio para comprovar escala. Estabelecer metas mensuráveis de desempenho no início da integração.

Produção exige aceite funcional, migrations verificadas, CI aprovado, smokes públicos/administrativos, privacidade, ausência de Sienna e rollback testável. Não há limpeza nem migração do ambiente em operação nesta especificação. Dados fictícios pertencem ao ambiente de teste; não publicar seeds como dados reais. Novas importações reais passam pelo fluxo da aplicação.

Issues/PRs registram estado e evidências; o README do produto documenta execução/configuração. Atualizar os contratos quando uma decisão de produto mudar. A suíte do harness verifica somente os insumos selecionados, não certifica a aplicação completa.

## Cenários de aceite

Uma etapa só está concluída com o percurso real correspondente e evidências técnicas proporcionais. Marcar resultado, ambiente, versão, data e evidência de cada cenário no novo repositório. Esta lista é um roteiro; nenhum cenário está declarado aprovado por estar escrito aqui.

## Navegação e produto

- A01: criar edição com várias disputas numa página; deixar opcionais vazios; retomar sem perder contexto.
- A02: acessar diretamente cada uma das quatro abas; cadastrar dado auxiliar sem visitar cadastro global; voltar com filtros/rascunho.
- A03: Recentes muda ao salvar e não muda ao apenas visitar.
- A04: importar textos de referencias/exemplos; revisar nomes/camisas, deixar linha inválida pendente, criar/vincular na mesma área.
- A05: duas inscrições da mesma equipe têm nomes públicos/elencos distintos; duas pessoas homônimas têm perfis/URLs distintos, sem fusão automática.
- A06: novos atletas de destinos feminino/masculino recebem o sexo correto; existente divergente exige resolução sem sobrescrita silenciosa.

## PDF, súmula e publicação

- A07: os três PDFs FIBA e o PDF Basketball Site passam nos parsers/reconciliações; fonte incompatível/sem texto/excesso de tamanho/páginas produz erro compreensível por arquivo.
- A08: lote com destinos distintos, duplicata e um arquivo inválido; trocar destino sem reupload e revalidar associações; retomar decisões salvas.
- A09: criar equipe/inscrição/atleta/jogo durante revisão; ambiguidade fica pendente; selecionar apenas prontos e confirmar/publicar com resultado por jogo.
- A10: interrupção de rede e repetição do pedido não duplicam jogo/fatos; um item falho não desfaz os demais; falha da publicação não deve aparecer como sucesso completo.
- A11: súmula com camisa 0 e 00, atleta que jogou sem ações, relacionado que não jogou, todos os códigos de faltas aceitos, exclusão, GD/D e atleta-treinador.
- A12: empate ao fim de Q4 admite OT; OT exige empate anterior; até oito OT; confirmação rejeita empate final e LL convertidos acima dos inferidos. Testes do motor detalham demais condições.
- A13: rascunho, recuperação, desfazer/refazer, revisão com motivo, fallback com motivo e conflito explícito de fontes.
- A14: duas abas com baseVersion antiga; a primeira grava, as duas tentativas antigas seguintes continuam rejeitadas até recarga explícita; não reciclar token novo para a cópia antiga.
- A15: Salvar e republicar atualiza derivados consistentes, mantém versão/autoria anterior e não publica rascunho de outro jogo.

## Estatísticas e histórico

- A16: estatísticas simples/avançadas, filtros, colunas, busca, ordenação, líderes com empate, paginação e comparação atendem ao contrato; URL reproduz a consulta.
- A17: percentuais ponderados por tentativas; médias com denominador de cobertura correto; por 30 com amostra mínima; missing não vira zero e insuficiente não participa de filtro/liderança.
- A18: consulta não mistura disputas, fases, grupos, fontes, publicações ou homônimos. Transferência mantém equipe/camisa das partidas anteriores e perfil acessível com vínculo inativo.
- A19: cinco seções do perfil, campos públicos opcionais completos, atleta sem jogos e dados ausentes; sem sexo/nascimento completo/registro federativo em HTML, JSON ou preloads.
- A20: Site não mostra parciais fabricadas, plus/minus zero inventado ou DNP deduzido apenas por minuto zero; game_total não aparece como quarto real.

## Regulamento e ocorrências

- A21: pontos corridos, eliminatória e grupos/mata-mata; partida única, ida/volta e melhores de 3/5/7; classificados e cruzamentos editáveis.
- A22: ordem de desempate com empate entre duas e entre várias equipes; recálculo depois de correção e prévia antes de alteração do regulamento.
- A23: transferência autorizada/inadmissível, exclusividade de vínculo ativo por disputa e conservação do histórico.
- A24: W.O., adiamento, cancelamento, interrupção, desistência nas duas políticas e decisão administrativa; nenhum desses inventa estatística individual.
- A25: sugestões de colocação e honrarias só se tornam públicas após revisão/confirmação.
- A26: excluir sem dependências; registros históricos oferecem inativação/arquivamento/cancelamento sem cascata rotineira.

## Segurança, acessibilidade e operação

- A27: matriz anônimo/autenticado não autorizado/admin, sessão expirada, ID/contexto adulterado, chamadas diretas, CSRF, arquivo privado e lote parcialmente indevido. Administrador por senha funciona sem obrigar MFA.
- A28: todas as tarefas essenciais por teclado; foco visível/restaurado; leitor de tela, labels/erros/estados; contraste, zoom 200%, reflow 320 CSS px e redução de movimento; celular e desktop.
- A29: build não inclui SDK administrativo/server modules, dados privados ou segredos; logs/respostas não expõem credenciais.
- A30: migrations do novo banco funcionam desde zero e no upgrade; conta administrativa, RLS, Storage privado vazio e variáveis de ambiente configurados sem dados de produção.
- A31: candidata identificada, CI válido, promoção do artefato exato, smokes públicos/admin e rollback documentados; métricas com volume representativo.

Os testes unitários fornecidos contribuem para vários itens, mas não substituem SQL/RLS, integração, avaliação de usabilidade nem verificação produtiva.
