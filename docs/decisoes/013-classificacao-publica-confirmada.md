# 013 — Classificação pública com confirmação e fonte mínima

24/10/2026; política de produto aprovada pelo responsável em 02/11/2026, nesta conversa, após definição dos contratos de publicação e navegação pública. Escopo: pacote atual ESCOPO§7/8 e ARQUITETURA/publicação/segurança; R3e após O4. A decisão técnica original é reversível, sem contratação/serviço novo. Não altera a publicação por jogo G4. O aceite da política não constitui evidência de implementação, implantação ou publicação de dados.

Salvar regulamento, ocorrência ou desistência privados não publica automaticamente catálogos ou rascunhos. A leitura pública depende de uma versão explicitamente confirmada para essa finalidade. Regra, identidades necessárias, agenda incluída e efeitos publicados formam um conjunto consistente, separado dos heads privados. A prévia deve identificar nominalmente o que ficará público; dados fora desse conjunto não entram incidentalmente.

## Política de publicação aprovada

- A confirmação pode incluir **equipes inscritas e jogos futuros sem resultado**. Sua unidade é uma **versão completa do regulamento da disputa**, com todos os participantes, jogos vinculados e efeitos competitivos necessários. Não há liberação parcial por fase/grupo neste recorte; jogos privados fora desse conjunto permanecem excluídos.
- A prévia identifica nominalmente participantes, fases/grupos, jogos e efeitos que ficarão públicos. Uma operação autenticada confirma o conjunto de forma atômica. Mudança nas fontes durante a revisão invalida a prévia e exige outra antes da confirmação.
- Confirmar permite descobrir a disputa no catálogo público, mesmo sem resultados. O catálogo deverá combinar essas disputas com resultados já públicos, preservando as publicações existentes. Agenda sem data, horário ou local conhecido indica **a definir** no campo correspondente; jogo sem resultado mantém placar e vencedor ausentes.
- Antes do primeiro resultado computável, as tabelas dos grupos apresentam os participantes com **J=0**, totais calculáveis zerados e posição indefinida. Dados ausentes e percentuais indefinidos não viram zero; não há desempate por nome ou UUID. Fases e séries mantêm a representação própria do domínio, sem inventar tabela onde ela não se aplica.
- Alterações privadas de participantes, regulamento, agenda ou efeitos exigem nova confirmação. Até lá, permanece a versão pública anterior. Resultados publicados dos jogos incluídos atualizam a classificação na leitura seguinte, inclusive correções, sem divulgar essas alterações privadas.
- Publicar participantes não publica automaticamente elencos, perfis de atletas, documentos, motivos internos ou dados administrativos. Estatísticas individuais continuam dependendo das fontes públicas próprias. A classificação calculada não confirma colocações finais ou premiações.

## Fonte e leitura públicas

O RPC anônimo nunca recebe regulation_context privado para calcular no Worker. Produz uma fonte pública mínima e fechada: contexto confirmado, IDs/nomes públicos, regulamento confirmado, agenda incluída e fatos/efeitos de escopo público. Sem pessoa privada, usuário/autor/motivo, comando/recibo, arquivo, contexto histórico bruto ou jogo não atribuído. DTO inesperado é erro seguro, sem ecoar o corpo. Não usar service-role genérica nem deslocar autorização para o browser.

O Worker reutiliza o domínio puro para calcular classificação/critério/cobertura/linhagem. O DTO final valida novamente que todos os IDs pertencem à fonte pública; nenhuma classificação porUUID, estatística ou placar ausente inventados. Colocações e honrarias confirmadas são outra operação, não consequência da resolução de grupos/séries. Nomes públicos são identificadores de apresentação, não chaves de identidade.

Correção G4 já publicada deve aparecer na leitura seguinte dos derivados, sem cache obsoleto; uma decisão ancorada em fonte anterior vira revisão/conflito. Alteração privada posterior do regulamento/agenda/efeito não pode vazar por essa atualização. Regras e efeitos confirmados mantêm suas versões; fonte de resultado atual é lida consistentemente sob a raiz do campeonato. História privada permanece íntegra. Não materializar a classificação neste primeiro recorte; ler/calcular sob origem/versionamento explícitos, Cache-Control no-store no início.

## Interfaces e critérios de aceitação

Preservar os contratos públicos existentes de fonte/classificação e o cálculo do domínio. A implementação requer confirmação autenticada, fonte pública mínima, leitor anônimo e integração do catálogo, agenda e tabelas. A aprovação desta política não autoriza publicar dados reais, aplicar migrations, fazer merge ou deploy; estado de execução e validação pertence ao checkpoint e às evidências.

Validar que confirmar uma disputa sem resultados permite encontrá-la e consultar participantes, agenda e tabela com J=0; salvar/alterar rascunhos mantém a versão pública; participantes/jogos fora do conjunto confirmado não aparecem; publicar/corrigir resultado incluído recalcula os derivados sem divulgar mudanças privadas; empates e valores indefinidos são preservados. Exigir também provas de confirmação atômica, prévia desatualizada, concorrência, exposição anônima e interface.

Custo: contrato público e operação de confirmação próprios, provas SQL zero/upgrade/RLS/grants/locks e testes de exposição/correção. Evita desclassificar todo o contexto privado ou tornar cada salvamento uma publicação implícita. Escala/corrida PostgreSQL real e revisão independente continuam a exigir evidência própria.
