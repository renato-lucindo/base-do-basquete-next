# Capacidade das consultas confirmadas — diagnóstico e evolução

> Executar inline com executing-plans/TDD. Descoberta concreta após equipes, sem DDL iniciada. Base material cfdcaf4/preview72eb9b6/PR20. Decisões reversíveis delegadas; escopo não depende de expor inscritos/agenda futura.

**Fechamento técnico26/10:** C1/C2/C3 executados em PR21, fonte material1c2d3ff/previewc2e8734;44ªmigration20261026082747 aplicada/reconciliada. CI515/338 e smokes protegidos PASS, evidências/limites em VALIDACAO-CAPACIDADE.md. Checkboxes abaixo registram execução técnica, não certificam escala real/edge/PGmulticonexão/WCAG ou aceite humano. Preservar ledger incremental.

**Objetivo:** sustentar o volume declarado de100inscrições/1000partidas sem fonte monolítica impedir publicação, sem truncar totais ou relaxar privacidade/linhagem. Medir separadamente custo puro, tamanho, banco e runtime; benchmark sintético não comprova edge/plano/carga.

**Fatos verificados:**43migrations imutáveis até20261025221911.20261025170111 cria histórico **incremental** private.statistics_publication_versions/changes e projeção atual public.published_statistics com snapshot completo limitado4MiB. refresh_confirmed_statistics é trigger síncrono de published_games e pode lançarPT413 nessa transação. Não há cópia completa por versão no histórico, portanto não redesenhar algo que jáfoi resolvido. MediçãoNode24.18/Windowsx64,100inscrições/1000partidas simples: JSONcompacto5.299.965bytes/p95lista298,459ms/detalhe296,031ms, fora da meta provisória250ms e do limite.100partidas couberam530.145bytes/p95até40,053ms. Método reproduzível em docs/evidencias/benchmarks, escopo em VALIDACAO-EQUIPES-PUBLICAS.

**Arquitetura a fechar após diagnóstico:** preferir fonte atual compacta com leituras em páginas limitadas e versão consistente, reutilizando ledger imutável e cálculos TS. A versão solicitada é precondição para detectar alteração da fonte, não autorização para ler snapshots históricos privados. Alternativa de agregação SQL exige paridade de fórmulas/cobertura/arredondamento. Não decidir mudança de tabela/view/contrato antes de mapear consumidores e observar o RED de capacidade/atomicidade.

## C1 — diagnóstico e RED em banco descartável

- [x] Ler src/statistics/source-database.test.ts, supabase/tests/statistics.sql e migrations20261025170111/20261025170346/20261025221911. Auditar **todas** referências a public.published_statistics/refresh_confirmed_statistics/get_public_statistics_source em banco/servidor/tipos, especialmente private.refresh_player_game e consumidor do mínimo/fase por participação. Uma view compatível que ainda agregue tudo pode recriar o bloqueio na transaçãoG4: provar que nenhum trigger força o blob grande.
- [x] Definir fixture sintética válida de100inscrições/1000jogos e medir octet_length(snapshot::text)/tamanho real em PostgreSQL descartável, distinguindo JSONcompacto da serializaçãoJSONB. Observar RED de capacidade/atualização atômica sem semear serviços reais nem enfraquecer guards produtivas. Preservar relacionados/camisas/histórias/recibos/perfis/prêmios e dadosC1/C2/G4 existentes no upgrade.
- [x] Auditar índices por disputa/jogo/versão e plano de consulta em volume representativo. Registrar limites/SLO/ambiente antes das otimizações, sem contratar plano ou elevar limite para aparentar desempenho.

## C2 — contrato da fonte limitada e compatibilidade

- [x] Propor contrato fechado de metadados/publicações por página com IDs/versão/mínimo/fase realmente confirmados, limite por página e limite global explícito. Cada página precisa pertencer à mesma versão; mudança intercalada recusa ou reinicia GET de forma limitada, nunca aceita fonte parcial nem expõe histórico privado. Testar correção entre páginas e resposta final de outro contexto.
- [x] Compatibilidade com estatísticas/perfil/equipes e projeção por pessoa/jogo. Identificar caminho de migração/deploy que mantenha leitores existentes corretos (ou falha explícita segura), sem servir cache obsoleto. Não ler regulamento/elenco/pessoa live para preencher fonte.
- [x] RED contratos TS/SQL/RLS/revogação/upgrade/rollback, então migration gerada pela CLI fixada; não editar43anteriores. Preservar ordem de locks e recibos atuais. Sóaplicar no projeto novo autorizado após provas locais, reconciliar timestamp/tipos/advisors e prova realBEGIN/ROLLBACK.

## C3 — custo e fechamento

- [x] Adaptar leitores específicos, leitura limitada por página/total/timeout e limites explícitos, semservice-role/SDKno browser. Otimizar validação repetida apenas com prova de equivalência contra495regressões e matriz das fontes. Não remover guardas para ganhar tempo.
- [x] Medir100/1000partidas antes/depois, inclusive runtimeworkerd; rede/SQL/edge/plano e carga reais precisam evidências próprias. Se meta falhar, registrar falha sem chamar experimento de sucesso funcional.
- [x] Focais durante iteração; gate/CI somente quando unidade estável, reutilizar artefatos inalterados. Preview protegido/smokes novos/credencialRSA revogada. Sem produção/merge, revisão independente ou WCAGcompleta inventadas; aceites humanos e pilotoStorageHTTP seguem pendentes, sem repetir pedidos adiados.

Workspace/remoto/link/projeto/Worker e proteção são os de PROGRESSO.md; preservar alterações/dados humanos e nunca consultar repositório/serviços anteriores. Cota real entreunidades/anteslongas; aos85%usados5h menoroperação consistente/checkpoint/push e MESMAautomação resetefetivo+2. Sem compra/plano/resetmanual ou credenciais em Git/log/docs/agendamento.
