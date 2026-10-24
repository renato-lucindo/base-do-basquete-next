# G4 — confirmação, publicação e correções

> Execução inline por executing-plans/TDD. Continuação autorizada do plano jogo-completo e do protótipo avaliado; decisões técnicas reversíveis delegadas. Branch codex/publicacao-jogos sobre f2d634b/codex/pdf-fontes, sem merge.

**Objetivo:** concluir o percurso da etapa4 com confirmação/publicação atômica por jogo e correção com motivo, versão anterior e projeções coerentes. Salvar rascunho continua separado de publicar.

**Arquitetura:** monólito TypeScript/Worker/DO existente, escritores PostgREST fixos e migrations próprias no projeto novo. Fontes privadas/rascunhos não ganham permissões públicas. Uma projeção mínima publicada por jogo, histórico imutável administrativo e recibos duráveis são atualizados na mesma transação; fatos mantêm identidade, inscrição/camisa da ocasião e capacidades reais.

**Fontes:** especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/docs/{ESCOPO,EXPERIENCIA,ARQUITETURA,CONTRATOS,VALIDACAO}.md; módulos fornecidos keyboard-scoresheet/ingestion/statistics; AJUSTES-DE-EXPERIENCIA.md. Repositório/projeto antigos proibidos. G1/G2 e revisãoG3 publicados em preview protegido, não produção.

## Limites e revisão

- Publicar apenas o jogo escolhido e cadastros necessários; nada de sexo, nascimento completo, registro federativo, notas, credenciais, caminhos de Storage ou outros drafts no público.
- Cinco titulares por equipe e capitão explícitos; capitão é técnico só sem técnico próprio, assistente só com técnico próprio. Relacionados/camisas confirmados da súmula não mudam; participação é corrigível com motivo.
- Confirmar manual exige fechamento real: OT só após empate acumulado anterior, final sem empate e LL convertidos não superiores aos inferidos. SQL e motor precisam concordar.
- Site preserva desconhecidos/ausências; game_total nunca é quarto. Pontos oficiais e pontos avançados podem ter cobertura distinta, conforme escolha explícita de fonte. Nenhuma métrica incompleta vira zero.
- Não reciclar versões automaticamente após conflito. Motivo de revisão/fallback entre10–500 caracteres. Autor/versão/fingerprint privados, sem chave genérica privilegiada.
- Casos de maior risco: commit com resposta perdida, replays por ator revogado, mudança concorrente de fonte/contexto, DNP versus desconhecido, troca de identidade/camisa já confirmada. Cada caso tem teste de sua unidade, não apenas happy path.

## P1 — súmula confirmada e projeção pública mínima

- [ ] Criar src/publication/{contract,manual}.ts e testes TS; adaptar o motor existente com UUIDs e validar final. DTO separado para intenção de publicar: requestId/gameId/gameVersion/basePublicationVersion/versão da fonte/documento/motivo/decisão de fallback explícita. Não aceitar fatos calculados do browser como autoridade.
- [ ] Escrever supabase/tests/publication.sql e cenário em tests/database.test.mjs antes da DDL, observar RED. Usar PostgreSQL descartável existente; fixtures sintéticas em rollback. Cobrir primeira publicação, correção/motivo, duas tentativas antigas rejeitadas, replay/fingerprint/ator revogado, rollback de falha e isolamento de outro jogo.
- [ ] Validar SQL de fechamento contra o motor: cinco titulares/capitães, empateQ4/OT1 e OT inválida/atéOT8/empate final/LL inferidos. Reutilizar335 casos de rascunho inalterados; os novos casos finais são evidência adicional.
- [ ] Preflight somente projeto nizmasjddyrhmevvfviz/vínculo autorizado; conferir tabelas, funções/constraints próprias, grants/policies e contagens humanas. Gerar migration com CLI fixado; não criar IDs de entidade em DDL. Criar projeção atual e histórico/receipts com RLS/grants/índices, snapshot construído por whitelist no servidor/banco e referências históricas por IDs.
- [ ] Escritor atômico fresh-admin antes de replay; versões da agenda/fonte/publicação verificadas sob locks. Validar relacionados/naipe/comissão no estado bloqueado. Ao confirmar manual, fixar a composição/camisas e atualizar snapshot público+histórico+recibo juntos. Falha não altera qualquer um deles. Corrigir fonte confirmada exige motivo também no salvamento do rascunho; somente publicar troca a versão pública.
- [ ] Manter ordem de locks compatível: comando/recurso da fonte antes de raízes ordenadas e jogo; nunca adquirir atleta/pessoa FOR UPDATE depois de campeonato. Se envolver revisãoPDF, seu resource lock vem antes das raízes, conforme escritorG3. Helpers internos antigos não podem continuar expostos como caminho alternativo à guarda nova; revisar grants após qualquer wrapper/renomeação.
- [ ] Matriz anônimo/autenticado não autorizado/admin: readers públicos enxergam só projeção mínima publicada; não recebem tabelas esportivas privadas por grants incidentais. Histórico/autoria/motivo só administrativos. Criação do zero e upgrade preservam drafts G1–G3.
- [ ] Aplicar somente após focais locais verdes; contrato Supabase real com rollback, contagens após teste, tipos gerados/advisors, commit coerente. Sem declarar corrida multi-conexão/escala por teste PGlite sequencial.

## P2 — PDF e autoridade por domínio

- [ ] Integrar comparator fornecido por adaptador UUID; comparar confronto, número quando informado, placar/parciais cobertos, participação e pontos/cestas. Empate de identidade permanece pendente; inversão de lados é escolha registrada. Testes RED de fonte divergente, ausência e mismatch de equipe/jogo.
- [ ] Documento suplementar explícito para marcadores/participação/comissão que o Site não informa. Cinco titulares/capitão escolhidos sem atribuir origemPDF a esses dados. FIBA pode apresentar marcadores da fonte para conferência. Cada linha publicada resolve pessoa/vínculo do destino; não criar identidades por similaridade.
- [ ] Versões independentes de fonte/revisão/jogo/publicação; confirmação deriva fatos do original pronto e revisão salva/validada. Escolha de fonte por domínio: placar/pontos básicos, períodos, fatos avançados de atleta, faltas recebidas e blocos coletivos/gerais quando disponíveis. Só combinar fontes compatíveis ou decisão explícita com motivo; nunca sobreposição silenciosa.
- [ ] SQL revalida todos os IDs/versões/capacidades, fingerprint e integridade. Snapshot anterior preservado; correção pode substituir apenas o jogo selecionado. Preservar o original, hash e parser privados. Derivados congelados têm origem/versão e são substituídos atomicamente ao republicar.

## P3 — API, administração e consulta mínima

- [ ] Provider/SessionStore/rotas específicos com testes workerd de sessão/origem/limites/ACK/versões/falha. Consulta pública mínima usa DTO explícito e não reutiliza reader administrativo. Cloudflare Access continua protegendo a apresentação do preview.
- [ ] Súmula: Confirmar e publicar / Salvar e republicar na própria tarefa, validação/motivo e comparação de fontes. Rascunho de outro jogo não é publicado. Fonte confirmada mostra restrição de relacionados/camisas; participação corrigível.
- [ ] PDFs: seleção dos itens prontos e publicação por jogo com resultado individual. Chamadas/commits separados, não uma transação de lote. Erro mantém pendência; resposta perdida permite repetir o mesmo comando e verificar o resultado. Nenhum sucesso completo quando um item falhou.
- [ ] Prévia de impacto limitada aos derivados implementados da etapa4; não inventar classificação/chave enquanto etapa5 não existe. Manter versão pública anterior administrativa e uma consulta mínima de resultado/participações/fatos realmente cobertos, com estados ausente/insuficiente do módulo estatístico.
- [ ] Testes browser RED de publicação/correção/duas abas/retry/lote parcial/privacidade/320px e teclado; foco/restauração/reauth. Auditoria WCAG completa e carga só serão alegadas com evidência própria.

## P4 — gate, preview e evidências

- [ ] Gate consolidado somente quando unidade estável, CI/source correspondentes e preview protegido com smokes públicos/administrativos, hashes e revogação efêmera. Reutilizar gates/SQL/harness de artefatos inalterados.
- [ ] Piloto StorageHTTP real autenticado e avaliação humana da etapa continuam necessários; mocks outbound e SQL de metadados não os substituem. Não extrair tokens do cofre/conectores nem solicitar senha no chat para obter essa evidência.
- [ ] Registrar limites e volumes de testes. Projeção por PK e listagem contextual paginada devem ter metas explícitas antes de alegar desempenho; banco vazio não prova escala. Não implantar seeds como dados reais.
- [ ] Só marcar etapa4 concluída após percurso completo e avaliação apropriada. Regulamento/transferências/ocorrências e exploradores completos seguem nas etapas5/6.

## Continuidade

PROGRESSO.md é a abertura válida. Cota real no início/entre unidades/antes de longas; aos85%usados5h, menor operação consistente/checkpoint/push e mesma automação reset+2, também semanal. Sem compra/reset manual/plano. WIP só em branch de trabalho, nunca principal. Revisão independente indisponível é limitação, não aprovação.
