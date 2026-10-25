# Colocações e honrarias — plano de implementação

> Execução inline com TDD e continuidade durável. Reutilizar evidências inalteradas; decisões reversíveis delegadas. Novo checkout não é necessário: branch sequencial isolada codex/conquistas-honrarias sobre4b2f4d7, sem mudanças humanas. TransferênciasT3 têm gate local aprovado; aguardar CI40171975751 antes do preview preparado dessa fonte. Não sobrescrever seu manifesto/bundle ao iniciar esta unidade.

**Objetivo:** sugestões privadas de colocações a partir de fonte explícita, decisão revisável própria e honrarias confirmadas no contexto de campeonato/temporada/disputa, conforme pacote preservado.

**Arquitetura:** módulo pequeno `src/achievements`, consumindo contratos de regulamento/classificação existentes; sem cópia do motor nem dependência web/SDK no domínio. Persistência versionada separa rascunho, confirmação e histórico. ADR015 registra limites de inferência; documento atual/pacote prevalecem sobre referências antigas.

## Restrições

- Somente ZIPs preservados/feedback aceito; nunca consultar/clonar repo/serviços anteriores. Supabase sóprojeto nizmasjddyrhmevvfviz/vínculo autorizado. Cloudflare sópreview atual, protegido antes e depois do deploy.
- Nenhum campeão automático, resultado0–0 inventado, desempate porUUID, MVP por fórmula implícita ou atleta identificado por nome. Vínculo atual não substitui participação histórica.
- Posição compartilhada deve ser explícita; inscrição competitiva difere de equipe global. Campos privados não entram no DTO público. Rascunho e sugestão não publicam.
- Política de elegibilidade pública de inscritos/agenda futura segue pendente; não deduzir aceite da indisponibilidade humana para testar. Construir partes independentes sem repetir perguntas pendentes.
- Cota real entre unidades/antes de operações longas; aos85%usados5h, operação mínima/checkpoint/push/MESMAautomação reset+2. Sem compra/plano/reset manual/credenciais em código ou mensagens.

## A1 — contrato e sugestão privados, sem serviços

Arquivos novos `src/achievements/contract.ts`, `suggest.ts`, `suggest.test.ts` e `tests/fixtures/achievements.ts` somente quando a interface existente estiver examinada. Não usar DTO de classificação fornecido pelo browser como fonte autoritativa futura.

- [x] Examinar `regulation/view-contract.ts`, `organized.ts`, `groups.ts`, `series.ts` e contratos de publicação; usar a projeção real, sem segunda fórmula.
- [x] RED: fonte de grupo explícita e completa sugere inscrições distintas nas posições; partida pendente, classificação empatada/incompleta ou fonte fora do contexto bloqueia. Identidade competitiva preservada mesmo com mesma equipe global.
- [x] RED: final/bronze escolhidos explicitamente; campeão/vice e bronze sócom séries completas e entradas coerentes. Sem bronze, deixar demais posições pendentes. Não adivinhar dependências por nomes/ordem/data; recusar sobreposição de finalistas/bronze.
- [x] Contrato fechado da decisão privada: grupos de posição/inscrições sem repetição e honrarias ID/título/destinatários explícitos. Sem ator/fatos/fórmulas do browser; referências sóIDs e contexto conhecido. Limites compatíveis com o regulamento; normalização Unicode/UUID consistente.
- [x] GREEN focal, composição de regulamento/classificação afetada e tipos/lint/formato. Registar evidências e commit próprio; sem gate integral ou deploy por biblioteca pura.

## A2 — fonte e persistência próprias

A2a concluída: get_achievement_context deriva regulamento/contexto/catálogos/versões; list_achievement_athletes pesquisa nomes em períodos da disputa e pagina20/20. FK de publicaçãoG4 preserva vínculo, então histórico encerrado continua elegível; não filtrar pelo sexo ou vínculo ativo atuais. Authfresh→raiz compartilhada, sem lock de atleta depois da raiz. Fonte sem atributos privados nem motivos administrativos originais; fingerprint estável em visita/inativação que não altera elegibilidade, variável por identidade/regra/inscrição/fato relevante. Limites1000/10000 explícitos, sem truncate. Gate375unit/75arquivos e contrato realrollback PASS; aplicada/reconciliada **20261025074640_achievement_context**,36migrations. NÃO editar/reaplicar. Tipos/advisors reconciliados; detalhes em VALIDACAO-CONQUISTAS.md. Rascunho/confirmação permanecem pendentes.

- [x] Inspecionar tabelas/FKs/contexto real e definir elegibilidade contextual dos destinatários sem depender de vínculo ativo. Separar fatos estatísticos de decisões de premiação. Verificar invariantes do pacote antes da DDL.
- [x] RED PostgreSQL descartável do zero/upgrade: rascunho privado, fonte derivada/versionada, confirmação atômica, autor revogado, recibo/replay/conflito, motivo de revisão, nomes/IDs/contexto e invalidação de derivados. Histórico imutável e grants/RLS/índices próprios.
- [x] Gerar migration pela CLI fixada após RED; nunca editar/reaplicar migrations anteriores. Matriz TS×SQL para validação compartilhada, gate quando estável; aplicar uma vez somente no projeto novo, reconciliar versão/tipos/advisors/prova real com rollback e preservar dados humanos.
- [x] Consulta pública entrega somente premiação confirmada/DTO mínimo; confirmação não libera agenda futura ou rascunhos externos. Não implementar exposição enquanto seu contrato/invalidação não estiverem provados.

A2b concluída: rascunho versionado privado, recibo/ACK e contexto derivado preservados; fonte opcional explícita, histórico20/20 e leitura de versão completa. Matriz TS×SQL/rollback/zero-upgrade aprovados; gate379unit e contrato real Supabase PASS. Migration **20261025114819_achievement_drafts**,37aplicadas/reconciliadas, tipos/advisors atualizados. Nenhuma confirmação/publicação/rota/UI ainda. Próximo A2c: RED de confirmação do rascunho atual, fonte/versão/recibo/motivo de revisão, snapshot público mínimo e sinalização de fonte alterada sem substituição automática; depois integração A3.

## A3 — integração e confirmação contextual

A2c concluída: confirmação do rascunho corrente com fonte fresca, revisão com motivo, ACK/atomicidade e histórico/snapshot mínimo sem dados privados. Mudanças na fonte/rascunho sinalizam revisão e preservam confirmação anterior. Gate383unit e contrato realBEGIN/ROLLBACK PASS; aplicada/reconciliada **20261025115754_achievement_publication**,38migrations. Nenhuma premiação real confirmada. Próxima unidade A3a: fonte de trabalho enxuta para a UI com fonte/grupos/séries e nomes dos destinatários já selecionados, sem enviar catálogo10000identidades/fatos internos ao navegador; provider/DO/rotas específicos e testes de correlação/reauth/ACK. API/UI ainda não disponíveis.

- [x] Adapter/SessionStore/rotas com authfresh antes do corpo e no DO, limites/mesma origem, ACK e correlações. Repetir comando congelado na incerteza, somenteGET depois de ACK conhecido. Nenhum derivado aceito do browser.
- [x] Administração dentro de Regulamento/contexto da disputa: escolher fonte da sugestão, revisar posições/honrarias, selecionar atletas por identidade e contexto, guardar rascunho, confirmar/revisar com motivo e mostrar impacto/pendências. Manter teclado/foco/guardas/320px e histórico.
- [x] Focais desktop/mobile e composição, gate único estável, CI e preview protegido com smokes novos/revogação. Evidência remota/técnica não substitui aceite humano, carga/concorrência real ou auditoriaWCAG completa.
- [x] PRdraft empilhado e checkpoint exato. Depois retomar exposição pública/perfis/estatísticas conforme pacote e pendências; não declarar etapas4/5 completas antecipadamente.

Entrega técnica publicada da fonte7997a158, CI40194877229 SUCCESS399unit/268browsersLinux e smokes novos/revogação PASS. Nenhum prêmio humano publicado, nenhuma integração na principal/produção. Avaliação humana pendente sem nova solicitação. Próxima unidade independente: estatísticas sobre fatos confirmados, adaptando os módulos portáveis e preservando cobertura/amostra/participação; não liberar agenda futura/inscritos sem a definição pendente.
