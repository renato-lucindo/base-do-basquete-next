# Regulamento e classificação — plano de implementação

> Executar inline com superpowers:executing-plans e TDD, tarefa por tarefa. Decisões técnicas reversíveis já delegadas; não solicitar nova aprovação de arquitetura prevista no ZIP. Avaliação humana G4 permanece aberta, não é substituída por este trabalho independente.

**Objetivo:** entregar organização/histórico da etapa5 com regras e derivados coerentes na mesma unidade vertical de cada formato.

**Arquitetura:** núcleo puro TypeScript/Zod, adaptador das projeções publicadas da etapa4, migrations próprias e escritores/rotas específicos quando os contratos estiverem estáveis. Regulamento declarativo, nenhum código arbitrário. UI na aba Regulamento e operações contextuais, classificação correspondente por formato.

**Stack:** stack existente; nenhum serviço, credencial ou dependência nova para o núcleo.

**Especificação:** especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/{ESCOPO,CONTRATOS,ARQUITETURA,VALIDACAO,EXPERIENCIA}.md; docs/decisoes/012-regulamento-declarativo.md; docs/AJUSTES-DE-EXPERIENCIA.md. ZIPs preservados são a única fonte do produto. Repositório/serviços anteriores proibidos.

## Restrições e revisão

- Inscrição é identidade competitiva; equipe global repetida e pessoa homônima não se fundem.
- Não contar rascunho, duplicar versão, cruzar disputa/grupo ou inferir fase por nome/data.
- Empate não resolvido não produz classificado ou campeão por ordem de exibição.
- Ocorrências têm efeitos declarados; sem placar0–0, tentativas, minutos ou participação inventados.
- Configuração/atribuição/ocorrência concorrente deve conflitar antes de recalcular/publicar; histórico de fatos permanece imutável.
- Gate consolidado quando unidade estável; preservar evidências de artefatos inalterados. Nenhuma escala, corrida real multi-conexão ou auditoriaWCAG completa presumida.

## R1 — pontos corridos puro

Arquivos novos src/regulation/{contract,standings}.ts e testes correspondentes.

Interface: RoundRobinRules exige pontuação e critérios ordenados finitos; CompetitiveFact guarda disputa/jogo/versão/inscrições/placares/origem. competitiveFactFromPublication(input) valida PublicResult estrito; calculateStandings({disputeId,registrationIds,rules,games}) calcula somente a lista explícita de fatos já atribuídos ao recorte.

- [x] RED: pontuação configurável, duas inscrições da mesma equipe, sequência de critérios, mini-classificação de três empatados, empate não resolvido, fase vazia, origem manual/PDF e rejeição de fórmula/draft/duplicata/versão/inscrição/disputa incompatíveis.
- [x] Implementar tipos/validação e cálculo provisório com trilha de critérios e grupos empatados. Inteiros e somas seguros; não criar fatos de partidas ausentes.
- [x] Focais, tipos/lint/formato e gate de código quando estável. Registrar volumes/ambiente; sem API/DDL/deploy deste núcleo. Commit coerente e PRdraft sobre G4.

## R2 — organização e resolução competitiva

- [ ] Contratos/testes de fases/grupos/atribuições e séries partida única, ida-volta, melhor3/5/7. Cruzamentos explícitos e sugestões opcionais; bloqueio de avanço em empate/pendência.
- [ ] Conectar cada formato à resolução e classificação correspondente, sem disponibilizar formato que não calcula seu resultado.
- [ ] Ocorrências W.O./adiamento/cancelamento/interrupção/desistência/decisão administrativa, efeito configurado no regulamento e prévia sem estatística individual fabricada.

## R3 — persistência/API/UI e histórico

- [ ] Testes SQL RED em banco descartável, migrations CLI, regras/atribuições/versões/snapshots e recibos, autorização fresca/locks/isolamento/Recentes. Zero/upgrade preservando jogos/publicações G4, RLS/grants e contrato real com rollback antes de declarar integração.
- [ ] Provider/DO/rotas fixos, versões independentes e prévia de impacto ao alterar regulamento com resultados; histórico sem reescrever fatos.
- [ ] Aba Regulamento e classificação no contexto, retorno/rascunho/foco/teclado/celular, erros e conflitos explícitos. Cada formato entregue junto de sua classificação.
- [ ] Transferências/retornos conforme regras e vigência, preservando participações; sugestões/confirmar colocações e honrarias com identidade e contexto, sem exposição antes da confirmação.

## R4 — integração e aceite

- [ ] Gate/CI/preview com fontes e hashes correspondentes; smokes novos sem repetir harness/serviços inalterados por sessão.
- [ ] Avaliação humana/piloto real; metas de desempenho/privacidade/acessibilidade e evidências explícitas. Não marcar etapa5 concluída pela presença de funções puras.

## Continuidade

PROGRESSO.md governa a retomada. Cota real no início/entre unidades/antes de longas; aos85%usados5h menoroperação/checkpoint/push/MESMAautomação reset+2, também semanal. Sem compras/plano/resetmanual, sem segredos em logs/docs/agendamentos. Não alterar preview G4 enquanto esta unidade pura é preparada; incorporar feedback humano quando chegar.
