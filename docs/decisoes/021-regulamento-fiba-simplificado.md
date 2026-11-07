# 021 — Configuração simples da classificação e desempate administrativo

Decisão do responsável em 06/11/2026, refinada e autorizada nesta conversa. Evolui o [ADR 012](012-regulamento-declarativo.md) para novas configurações; conserva o cálculo de definições antigas e a publicação confirmada do [ADR 013](013-classificacao-publica-confirmada.md).

## Regras e formato

Novas definições recebem pontuação e desempates FIBA 2026: vitória 2, derrota 1, W.O. 20–0 e 0 ponto para o perdedor. `calculationPolicy: fiba-2026` adota o reinício dos critérios entre os remanescentes empatados (D.1.4); ausência da política mantém o algoritmo sequencial anterior. Os motores identificam suas versões. O padrão cobre esses pontos e critérios, sem alegar implementação integral das regras FIBA.

Grupos admitem um ou dois turnos. O total previsto ajuda a revisar a organização dos jogos existentes; não gera confrontos ou agenda. Ausência de turnos em versões antigas aparece como não definida. Adotar FIBA é edição explícita, seguida de revisão e salvamento; não migra resultados ou publicações silenciosamente.

Regras avançadas permitem alterar pontuação, placar/pontos de W.O. e critérios de desempate. A configuração passa a personalizada, com justificativa privada. O núcleo FIBA de reinício permanece nas novas políticas, inclusive quando a ordem dos critérios é personalizada. Fórmulas/scripts e desempate implícito por identificador continuam proibidos.

## Decisão administrativa

Empate não resolvido não impede salvar ou publicar. O administrador pode ordenar as equipes empatadas e registrar justificativa. Sem decisão, mantém-se o empate, sem escolher classificados artificialmente. Não exigir sorteio.

A definição contém somente o identificador, fase/grupo, ordem escolhida e base exata dos fatos públicos relevantes. A projeção aplica a ordem apenas ao conjunto empatado e à base revisados; nova publicação de resultado, exclusão, mudança de atribuição ou regras relevantes retira seu efeito e sinaliza revisão. Métricas, placares e fontes não são alterados. Pendências de jogos e conflitos de cruzamento conservam suas proteções.

As notas ficam em `tieNotes` na definição privada, auditadas pelo servidor com autor/data, preservados em edições sem mudança da decisão. O candidato público remove `tieNotes` e `customReason`, e o contrato público rejeita esses campos. O histórico privado conserva as versões anteriores.

## Rascunhos e percurso

Uma tela: participantes → grupos/formato/jogos existentes → revisão/publicação; regras avançadas recolhidas. Rascunho aceita campos incompletos dentro de uma estrutura fechada e limitada. É salvo em tabelas privadas próprias e nunca alimenta cálculo oficial, catálogo ou fonte pública.

Rascunho tem versão e base do regulamento oficial. Escrita autenticada verifica ambas sob o lock da competição; comando idempotente permite recuperar resposta perdida. Concorrência exige recarga, preservando a edição local para comparação. Um rascunho de base antiga só é recuperado explicitamente. O rascunho atual pode ser retomado após recarregar sem exigir configuração completa.

Salvar regulamento continua distinto de publicar. A publicação nominal confirmada permite classificação inicial antes de resultados e agenda com informações a definir, mantendo privada a edição posterior até nova confirmação.

## Limites e liberação

Excluídos pelo responsável: insuficiência de jogadores, reincidência de W.O., sorteio, geração de jogos, copiar edições, automatizar cruzamentos, comparar grupos e alterar mata-mata.

Migrations desta unidade precisam de aplicação remota autorizada e verificada antes da liberação do serviço. Os testes usam banco isolado e fixtures; não publicam dados humanos. Situação real de execução/CI/serviço permanece no [checkpoint](../PROGRESSO.md).

Fonte: [FIBA Official Basketball Rules 2026 v1.1](https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-1.pdf), artigo 20.2.1 e Apêndice D.1.
