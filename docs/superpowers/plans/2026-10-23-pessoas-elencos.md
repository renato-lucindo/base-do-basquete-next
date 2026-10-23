# C3 — pessoas, atletas, técnicos e elencos

> Execução inline com executing-plans e test-driven-development; decisões reversíveis delegadas. Branch `codex/pessoas-elencos`, base C2 `22b9f39`. Sem revisão independente disponível; não inventar aceite. Checkpoint central PROGRESSO.md.

**Objetivo:** cadastrar/localizar pessoas sem fusão por nome, usar a mesma pessoa como atleta e técnico e montar elenco dentro da inscrição. Tabela própria de técnicos conforme esclarecimento do responsável.

**Spec:** ESCOPO §5/Perfil, EXPERIENCIA F03/F04, CONTRATOS Identidade/Perfil e AJUSTES-DE-EXPERIENCIA.md. Capitão-técnico, assistente condicionado e cinco titulares pertencem à preparação do jogo (etapa 4); não inferir essas escolhas do cadastro global.

**Arquitetura e decisões do implementador:** identidade global `persons` com dados públicos opcionais; especialização `private.athletes` conserva sexo, nascimento completo e registro federativo fora do schema exposto; `coaches` própria referencia a mesma pessoa. Nenhuma identidade depende de proprietário único. Buscar/listar administrativo devolve apenas campos necessários, em operações fixas de sessão. Publicação/perfil público futuro terá projeção pública própria; não reutilizar resposta administrativa com dados privados.

Alternativas descartadas: duplicar pessoas em atletas/técnicos quebra histórico; nome único impede homônimos; sexo/nascimento completo em payload público viola contrato. Técnico pode existir sem especialização de atleta; só novo atleta exige sexo. Papéis existentes não são apagados silenciosamente. Nomes normalizados sugerem possível duplicidade, nunca fundem; nova identidade homônima exige confirmação explícita e lock do nome normalizado no banco.

## C3.1 — identidade e especializações

Concluído: migration `20261023122129_person_identity` aplicada no projeto novo. Dois contratos TS e quatro cenários SQL locais PASS, incluindo preservação de dados C1/C2. Contrato C3.1 também PASS no Supabase real, fixtures isoladas/rollback. Contagens reais preservadas C1 1/1/2, C2 2 equipes/2 inscrições, Auth/admin 1/1; pessoas/atletas/técnicos/recibos novos 0. Tipos regenerados, advisors só WARN prévio senha vazada/Pro. Nenhum endpoint/interface C3 publicado ainda; próximo é vínculo de elenco/comissão.

- [ ] Testes RED→GREEN em `src/people/contract.test.ts`/`contract.ts`: nome, papéis atleta/técnico, sexo obrigatório de atleta, dados opcionais, confirmação de homônimo e versão/comando/contexto.
- [ ] Contrato compartilhado `supabase/tests/people.sql` com fixtures isoladas/rollback, anexado ao runner: mesma pessoa nos dois papéis, homônimos explícitos sob serialização, sexo contextual de novo atleta, preservar sexo de existente, RLS/grants, campos privados, revogação, versão e idempotência. Observar vermelho antes da migration.
- [ ] Migration CLI própria, leitores invoker administrativos e escritor privado delimitado, nomes qualificados/search_path vazio/autorização fresca antes de dados/recibos. Índices de busca/FKs e sem cascatas. Rodar do zero/upgrade; inspecionar projeto novo antes de aplicar, contrato real isolado/rollback, comparar contagens, tipos/advisors e commit. Não repetir bootstrap nem contratos antigos contra dados reais.

## C3.2 — elencos e comissão

- [ ] Contratos/testes antes de DDL: elenco por inscrição com camisa textual 0/00/1–99, pessoa existente e apenas um vínculo ativo por disputa; índices únicos parciais e FK de contexto. Sem movimentar atleta/transferência nesta unidade. Repetição e conflito não duplicam vínculos.
- [ ] Técnicos de inscrição referenciam `coaches`, papéis técnico/assistente distintos. Cadastro não escolhe capitão de jogo. Vínculos preservam histórico; não apagar pessoa para substituir nome.
- [ ] Rotas/API e SessionStore específicos, adapter testado por JWT privado; matriz sessão/origem/destino/schema/ausência de token no workerd.

## C3.3 — experiência e entrega

- [ ] Expandir inscrição com elenco ordenado por camisa (0 antes de 00), localizar/criar atleta/técnico na área, campos privados só no administrativo; prévia de sexo contextual de novo atleta e resolução explícita de homônimo. Manter filtros/rascunho/foco e independência de inscrições Lobos/Lobos B.
- [ ] Navegador desktop/celular antes da UI: vínculo contextual, papéis sobre mesma identidade, homônimos, 0/00, repetição/conflito/reautenticação e controle de trabalho não salvo.
- [ ] Focais; gate consolidado estável, PR draft sobre C2, CI/publicação protegida/source exato/smokes/avaliação humana. Reutilizar evidências de insumos imutáveis. Não afirmar segurança concorrente multi-conexão/escala ou WCAG completa sem provas.
- [ ] Checkpoint e próximo passo C4 texto com revisão/pendências/parcial, conforme cota real; ao gatilho de 15% restante, salvar remoto e atualizar a mesma automação oficial para reset+2.

Limites operacionais iniciais de pessoa: nome/apelido/cidade 120, posição 80, estado 80, biografia 4000, registro privado 120, ano público 1–9999; altura/peso positivos até 1000, sem inferir regra esportiva. Sexo privado male/female; mão dominante left/right/both opcional. Nenhum campo opcional ausente impede cadastro/perfil futuro.
