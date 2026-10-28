# Equipes em resultados confirmados — plano de implementação

> Execução inline com executing-plans/TDD; decisões reversíveis delegadas. Este plano cobre a parte independente da política ainda pendente de inscritos/agenda futura. Não interpreta indisponibilidade humana como aceite. Branch própria codex/equipes-publicas sobre84baf38; perfil jápublicado com CI/smokes aprovados em VALIDACAO-PERFIL.

**Objetivo:** tabela pública de equipes/inscrições com busca, ordenação e totais/médias, detalhe contextual com estatísticas, participantes publicados e jogos, links estáveis a pessoas/resultados/equipe. Somente fontes já publicadas, sem ampliar a exposição de rascunhos.

**Arquitetura:** reutilizar get_public_statistics_source/confirmed-statistics-v1 como fonte fechada e versionada. Novo domínio puro por inscrição; Worker produz DTOs públicos limitados, sem sessão interna ou SDK no browser. Não exige DDL nova, não lê regulamento/elenco/pessoa/equipe live. Correção G4 já atualiza a fonte atomicamente. Uma equipe global com duas inscrições conserva duas linhas/contextos; nunca escolher a primeira silenciosamente.

**Stack:** TypeScript/Zod/Worker/React/Vite existentes e dependências fixadas. **Especificação:** ZIP preservado docs/ESCOPO.md§8, CONTRATOS.md§Estatísticas/Identidade, EXPERIENCIA.md e VALIDACAO.md A05/A18. Reutilizar helpers puros percentage/perGame/normalizeStatisticsSearch quando pertinentes, sem queries/schema do repositório de referência. Base: perfil confirmado material23eede4/PR19; preview e CI precisam ser reconciliados antes de abrir branch codex/equipes-publicas.

## Decisões de implementação

- Linha de tabela é inscrição na disputa, com registrationId/teamId e nomes/aliases públicos. Mesmo teamId em Lobos e Lobos B não soma nem funde essas linhas. Nome de exibição vem da última publicação no conjunto, com proveniência; linhas de jogos mantêm nomes da ocasião.
- URL da tabela equipes.html#disputeId?mode=...&scope=...&q=...&sort=...&direction=...&page=.... URL de detalhe equipe.html#teamId?disputeId=...&registrationId=...&section=...&mode=...&scope=...&page=...&rosterPage=.... registrationId deve corresponder a teamId/disputa; se houver ambiguidade, oferecer seleção explícita entre inscrições publicadas, sem find/primeira inscrição.
- Modos total/per-game para equipes. J conta partidas publicadas da inscrição, não soma jogos dos atletas. PP/PC/saldo derivam do placar oficial publicado, não de estatísticas avançadas/fallback manual incompatíveis. Saldo pode ser negativo, zero conhecido é zero; arredondar após soma/divisão com helper puro. Não calcular pontos de classificação/vencedores administrativos lendo decisões privadas.
- Estatísticas individuais do detalhe reutilizam aggregateConfirmedStatistics com fatos filtrados por inscrição e fase confirmadas. A lista de participantes é histórica, inclui relacionados/DNP e quem jogou sem ações, com IDs/camisas/nomes conhecidos, nunca é chamada elenco atual. Fatos sem fase só entram em all; não inferir pelo nome da partida.
- Dados coletivos avançados fornecidos pelo PDF ficam vinculados a cada partida, com fonte/versão/cobertura. Não somar maior vantagem, pontos por posse ou outras métricas não aditivas como um total fictício; não inferir rebotes coletivos a partir da soma incompleta dos atletas.
- Sem rascunhos, agenda futura, inscritos sem resultado, campos opcionais de cadastro ou nova política de publicação. Essas partes continuam dependentes da resposta da decisão013. A página informa honestamente o conjunto confirmado; não vira uma segunda lista manual de times.
- Limites fechados: fonte existente10000jogos/4MiB, no máximo1000inscrições e10000pessoas do contexto; excesso explícito, nunca truncamento aceito de totais. Páginas de apresentação20. Busca80caracteres e sort whitelist; URLs UUID canônicas.

## ET1 — contratos e cálculo puro

Arquivos: src/team-statistics/{contract.ts,query-contract.ts,domain.ts,domain.test.ts}, tests/fixtures/team-statistics.ts.

- [ ] RED: mesmo time global com duas inscrições e confronto entre elas conserva duas linhas; J1 por lado em vez de somar jogadores; pontos oficiais diferentes dos avançados conservam PP/PC reais; saldo negativo e médias calculadas sobre jogos, não média de médias.
- [ ] Fonte inteira validada antes de filtro; duplicidade jogo/inscrição, inscrição associada a outro time, contexto trocado, IDs/privados extras recusados. DNP não produz observação nem J individual, mas continua na lista histórica;0/00 distintos e nomes de jogos antigos preservados.
- [ ] Contratos fechados para tabela/detalhe, versões/cobertura/contexto, paginação20 independente de totais. Buscar/ordenar antes de paginar; ausências não são0. Fonte corrigida muda os derivados na próxima leitura.
- [ ] Matriz total/per-game x regular/playoffs/all, sem fase inferida. Recorte sem partidas fica vazio, não placar0–0. Mínimo temporal não é necessário a PP/PC; não inventar duração de partida.
- [ ] GREEN focais, composição estatística afetada e tipos/lint/formato/segredos. Commit pequeno skipci até vertical estável, evidências em docs/VALIDACAO-EQUIPES-PUBLICAS.md/ADR018; não repetir harness126/SQL imutáveis.

## ET2 — adapter e rotas read-only

Arquivos: src/team-statistics/{provider.ts,provider.test.ts,routes.ts}, src/server/worker.ts, tsconfig.json, tests/access-worker.test.mjs e fixture outbound própria.

- [ ] RED do provider/Worker404 antes de implementar. GET público /api/public/teams/:disputeId e /api/public/teams/:disputeId/:teamId com registrationId e query fechada; nenhuma rota genérica privilegiada.
- [ ] Somente RPC tipada get_public_statistics_source com UUID de disputa; chave publicável apenas no Worker, sem JWT/cookie/segredos no browser. Timeout8s/read5MiB, query8192, erros sanitizados/429 explícito. API devolve DTO derivado e limitado, nunca documento bruto com todas as pessoas.
- [ ] Correlação de disputa/time/inscrição, método e ID inválidos400/405, fonte ausente404, resposta incoerente503; nenhuma leitura Auth/admin e cookie interno inválido não altera consulta pública.
- [ ] Workerd/composição afetada PASS; provas reais existentes da fonte mantidas. Como não muda DDL/RLS, não reaplicar migrations ou repetir contratos do banco só por adicionar consumidor.

## ET3 — tabela e detalhe navegáveis

Arquivos: equipes.html/equipe.html, src/team-statistics/{list-main.tsx,detail-main.tsx,list-page.tsx,detail-page.tsx,screen.css}, tests/team-statistics.spec.ts e fixture browser. Links em resultados/estatísticas/perfil/contexto administrativo, vite.foundation.config.ts, package.json e scripts prepare/smoke.

- [ ] RED dos percursos completos: tabela busca/ordena/muda modo/escopo/página, abre inscrição certa e retorna com URL/filtros. Detalhe com Resumo/Participantes/Jogos; mostra opção explícita quando várias inscrições compartilham equipe.
- [ ] Participantes históricos com nomes/camisas/contexto e link por pessoa; jogos com placar oficial, data/hora/local somente conhecidos e resultado atual vinculado. Nenhum nome live ou cadastro privado; métricas coletivas do PDF mantêm fonte e ausência.
- [ ] Back/forward/recarga/links profundos, duas requisições em ordem inversa sem substituir resposta nova, corpo contaminado sem renderizar privados, erros/retry/vazios. Foco após resposta/commitDOM com useLayoutEffect; skiplink não destrói hash com ID.
- [ ] Desktop/mobile320/zoom200%, tabela rolável/focável, controles/língua portuguesa. Capturas inspecionadas e provas focais, sem afirmar WCAG completa por automação. Sem nova comparação avançada de equipes.

## ET4 — gate/CI/preview e continuidade

- [ ] Revisão de integração e gate consolidado único quando vertical estável. Não alegar revisor independente se ferramenta não existe. CI precisa corresponder ao código material; documentação posterior pode reutilizar evidência.
- [ ] Preparar manifesto de fonte limpa verificada; publicar só Worker existente pelo plugin Cloudflare, Access só responsável/previewsOFF/DO/rate/cofre preservados. Smokes assets/hash/Xsource/novosHTMLs/GETs públicos/ausência de sessão, token efêmero RSA emTTY e revogação imediata/anônimo302.
- [ ] PR draft empilhado sobre19/anexado, checkpoint e próximo passo exato. Não pedir novamente testes humanos adiados; não declarar aceite nem produção. Política R3eP2/P3 continua pendente separadamente.

Cota real entre unidades/antes de longas; aos85%usados5h menor operação consistente/checkpoint/push e MESMAautomação reset+2. Sem compra/plano/resetmanual. Preservar mudanças/dados humanos; nunca consultar/clonar repositório anterior ou extrair segredos do conector/cofre.
