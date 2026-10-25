# Perfil público confirmado — plano de implementação

> Execução inline com as skills executing-plans/TDD. Decisões reversíveis já delegadas pelo responsável; não pedir aprovação redundante. Este plano é a próxima unidade, ainda sem código/DDL próprios.

**Objetivo:** uma URL por pessoa, com Resumo, Estatísticas, Conquistas e honrarias, Jogos e Histórico derivados de fontes publicadas; metadados opcionais têm confirmação própria.

**Arquitetura:** ampliar a fonte confirmada existente com projeção pública indexada por pessoa/jogo e snapshots próprios de metadados. HTTP/Worker calcula somente sobre essas fontes fechadas; publicação do resultado atualiza a projeção na mesma transação. Cadastro live/privado e vínculo atualmente ativo não são fontes públicas.

**Stack:** TypeScript/Zod/PostgreSQL/Supabase/Worker/React atuais, dependências fixadas, sem SDK no browser ou service-role. **Especificação:** ZIP preservado docs/CONTRATOS.md§Perfil público e§Estatísticas, docs/ESCOPO.md§8, ADR016. Adaptar comportamento dos módulos player-profile-domain/game-detail do ZIP, sem suas queries/tipos do schema de referência. Não consultar repo/serviços anteriores.

**Base:** estatísticas661bb5b4af93fa39e890317e43efafd77e380083, PR18 sobre17; abrir branch codex/perfil-confirmado somente após reconciliar CI/preview da unidade anterior. Banco41migrations até20261025170346_statistics_lineage_index, imutáveis. Plano não equivale a aceite humano, produção ou publicação de novos dados.

## P1 — metadados públicos versionados

- [ ] RED em src/player-profile/contract.test.ts e publication-database.test.ts, supabase/tests/player_profiles.sql: nome obrigatório/opcionais ausentes, homônimos separados, UTF16/Unicode/limites, versão esperada de pessoa/perfil, revogação/replay/rollback, privado nunca público, perfil sem jogos não cria placar/estatísticas fictícias. Observar RED antes de migration new pela CLI fixada.
- [ ] Contratos: proposta privada contém somente publicPersonSchema e versão de origem, estado/histórico paginado. Comando de confirmação usa commandId/personId/expectedPersonVersion/expectedPublicationVersion/reason/acknowledgeImpact, nunca metadados derivados do cliente. Mesmo sem jogos, confirmação explícita pode publicar o perfil de atleta; não publica inscrições/agenda. Sem foto/visibilidade por campo/MFA adicional.
- [ ] Writer próprio: authfresh→commandlock→pessoa/atleta, snapshot de campos permitidos lido no servidor sob lock, recibo idempotente privado e histórico imutável/FKs. Replay conhecido retorna ACK original sócom autorização fresca; não faz GET prévio de mutação no adapter. Revisão exige motivo. Nunca obter ano público a partir do nascimento privado neste fluxo; publicBirthYear é campo distinto.
- [ ] Perfil público atual somente SELECT com RLS/grants mínimos; snapshots não incluem sexo/data completa/registro federativo/ator/motivo ou versão privada da pessoa. Editar cadastro não republica o perfil nem reescreve nome/camisa de jogos anteriores.
- [ ] PostgreSQL do zero/upgrade, matriz TS×SQL e rollback real antes de declarar integração. Migration própria aplicada uma vez no projeto novo, reconciliar timestamp/tipos/advisors. Provas existentes inalteradas não se repetem por sessão.

## P2 — participações públicas por identidade

- [ ] RED do adaptador SQL×TS contra normalizeConfirmedGame para súmula/PDFSite/FIBA/domínios mistos/DNP/camisa0/00, homônimos e participação sem ações. Snapshot público por jogo+pessoa conserva contexto/jogo/versão/fatos/fase explícita e mínimo da fonte estatística; lookup indexado por pessoa e contexto, sem depender de elenco ativo.
- [ ] Trigger de projeção acompanha publicação/correção do jogo, na ordem de locks existente. Falha preserva resultado/fonte/recibo; guardar linhagem/FKs para versões confirmadas. Sem expor rascunhos, atribuições privadas de fase, agenda futura ou cadastros atuais. Dados antigos de jogo continuam na ocasião correta.
- [ ] RPC pública read-only retorna fonte fechada por pessoa: metadados confirmados ou null, participações publicadas e honrarias de destinatário explícito. Limites de tamanho/capacidade são explícitos, sem truncar carreira para fabricar totais; paginação dos jogos/histórico independente dos totais. Não copiar todos os demais atletas para cada consulta.
- [ ] Colocações de equipe sópodem aparecer com ligação contextual comprovada por participação publicada; não inferir premiação individual ou elegibilidade a medalha de vínculo live ou de uma primeira inscrição arbitrária. Fonte insuficiente permanece identificada. Prêmios individuais exigem personId confirmado no snapshot da honraria.

## P3 — domínio de perfil/carreira

- [ ] RED em src/player-profile/domain.test.ts: cinco seções, filtros por edição/campeonato/carreira, todas inscrições, nomes da ocasião, transferências/inativos, DNP versus ausência versus jogou sem ação, percentuais ponderados e denominadores por cobertura.
- [ ] Reutilizar o núcleo observado de estatísticas; carreira valida cada contexto e não duplica jogo+pessoa. Não somar médias ou substituir ausência por zero. Fases desconhecidas sóall. Se recortes misturarem mínimos de por30 diferentes, pedir seleção de um contexto ou marcar modo inaplicável, sem inventar um mínimo global retroativo.
- [ ] Nome principal vem do perfil explicitamente publicado; sem ele, usar identidade da última ocasião pública com proveniência, preservando nomes históricos nas linhas. Nenhuma equipe antiga é apresentada como equipe atual. Honrarias e colocações mantêm ano/edição/categoria/origem de confirmação.

## P4 — Worker/UI e navegação

- [ ] Testes RED de provider/rotas/workerd, resposta limitada/correlacionada, GET público sem sessão app/chave no cliente e mutação administrativa com authfresh/origem/corpo limitado. Erros não vazam dados do provedor. Adapter tipado e métodos específicos, sem CRUD genérico privilegiado.
- [ ] atleta.html#personId?contexto&secao com navegação acessível entre Resumo/Estatísticas/Conquistas e honrarias/Jogos/Histórico; voltar/avançar/links profundos. Estatísticas e resultados ligam à identidade estável. Seções vazias sem zeros que pareçam resultados. Jogos e trajetória conservam camisa/equipe/data/hora reais, sem meia-noite inventada.
- [ ] Confirmação de metadados no percurso administrativo da pessoa: proposta→conferir exposição→confirmar/revisar com motivo→reabrir; edição privada isolada da publicação. Fonte alterada/version409 não descarta edição; ACK perdido congela o comando, ACK conhecido com falhaGET repete sóGET; reautenticação preserva trabalho.
- [ ] Browsers desktop/mobile/teclado/foco/320px/zoom, composição e capturas inspecionadas. Allowlist/manifestos/gates/smoke incluem novoHTML, sem fixtures publicadas. Gate único da vertical estável, CI, preview protegido e revogação de credenciais temporárias. Não pedir novamente testes humanos adiados nem tratar silêncio como aceite.

## Revisão e continuidade

Foco: campos privados de pessoa em objetos aninhados; carreira truncada ou contada duas vezes; primeira inscrição escolhida automaticamente; correções que reescrevem nomes antigos; GD versus exclusão e ausência; colisão de homônimos; versões e mínimos misturados; identidade sem jogos; falsa atribuição de troféu; concorrência/replay/reauth; foco e resposta atrasada.

Sem revisor independente disponível, registrar self-review como tal, não inventar parecer. Sem claims de carga/corridaPGmulticonexão/WCAG completa sem prova. Apenas projetoSupabase nizmasjddyrhmevvfviz/vínculo link_6adaa8aab5688191b1e7ae1cddc55a82 e Worker próprio protegido. Preservar quaisquer dados/mudanças humanos e segredos. Cota real antes/entre unidades/antes longas; aos85%usados5h parar novas unidades/gates, checkpoint/push e MESMAautomação reset+2.
