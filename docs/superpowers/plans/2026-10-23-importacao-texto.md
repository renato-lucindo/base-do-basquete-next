# C4 — importar equipes e elencos por texto

**Revisão de direção, 23/10 13:55 UTC-03:** responsável não gostou do fluxo e forneceu `IMPORTADOR-DE-EQUIPES-20261023.zip` para análise. Ler primeiro `docs/ANALISE-IMPORTADOR-DE-EQUIPES.md`. C4.1 abaixo tem sete testes/tipos/ESLint PASS, mas está sem integração/publicação. Incorporar atributos opcionais/sugestões e compor a revisão em tabela antes de executar a DDL/UI deste plano. Não tratar o fluxo anterior como aprovado.

> Executar com superpowers:executing-plans e test-driven-development, na mesma conversa. Decisões reversíveis delegadas; branch `codex/importacao-texto` sobre C3 `0d34242`. Sem subagente/revisão independente disponível.

**Objetivo:** colar lista/blocos, revisar e resolver identidades no contexto, confirmar itens válidos e manter texto/pendências/sucessos para retomada.

**Arquitetura:** parser puro de prévia e schemas TS novos, sem alterar o parser fictício do protótipo. Revisão privada/versionada no PostgreSQL, operações específicas por sessão no Worker. Cada linha é unidade atômica: equipe global + inscrição, ou pessoa necessária + vínculo de elenco. Lote é sequência de itens, com resultados independentes e retry do mesmo comando. Não usar duas escritas HTTP independentes para anunciar uma linha concluída.

**Stack:** React/TypeScript/Zod/Worker/PostgreSQL existentes e versões fixadas; sem dependências novas.

**Spec:** ZIP, EXPERIENCIA F03/F04 e exemplos, CONTRATOS “Texto de equipes/elencos”/concorrência, ARQUITETURA/VALIDACAO etapa 3. Feedback em AJUSTES-DE-EXPERIENCIA.md. Apenas projeto novo, dados humanos preservados.

## Decisões do implementador

Revisão tem texto original imutável, modo, disputa, linhas com origem e escolhas editáveis. Reinterpretar texto gera outra revisão; linhas já confirmadas não podem ser apagadas/regravadas por salvar uma cópia antiga. Guardar no servidor evita perder pendências na recarga e não expõe cadastros em armazenamento anônimo do browser.

Cada cabeçalho/lista representa uma inscrição revisável, inclusive blocos vazios e nomes repetidos. Não agrupar cabeçalhos pelo nome. Opções explícitas: nova equipe/inscrição, inscrição nova usando equipe global existente ou inscrição existente no destino. Atleta: nova identidade com confirmação de homônimo quando necessária, ou identidade existente/versionada. Cadastro existente não é renomeado nem tem sexo alterado pelo texto. Novo atleta recebe sexo do naipe atual no servidor; técnico existente pode receber papel atleta preservando seus dados.

Formato visível: uma equipe por linha, ou `Equipe: Nome` e linhas `camisa - nome`; também aceitar travessão/dois-pontos/tab/espaço após número. Camisa ausente continua pendente, 0/00 distintos; nada de inferência pelo nome. Sem CSV/XLSX. Limites de operação: 20 mil caracteres, 500 linhas físicas e 200 itens, envio JSON até 256 KiB. Limites não são regras esportivas.

## Pontos de revisão e provas

Cabeçalhos homônimos não fundem inscrições; atleta antes do cabeçalho mantém linha sem destino. Camisa repetida é avaliada entre itens selecionados do mesmo destino, incluindo inscrições existentes resolvidas; desmarcar uma linha permite importar a outra. Nome igual nunca escolhe pessoa automaticamente. Falha após commit repete comando; mudança de versão não obtém token novo para dados antigos. Uma linha recusada não desfaz as concluídas.

## C4.1 — contratos e parser

- [ ] Criar `src/text-import/contract.test.ts` e `parse.test.ts`; observar RED. Schemas de revisão/linhas/resolução/resultado, limites/IDs/parentes e ausência de status de sucesso editável.
- [ ] Implementar `contract.ts`, `parse.ts` e `review.ts` (pendências/readiness), mantendo fontes/linhas, cabeçalhos distintos, camisas e identidades explícitas. Exercitar os três exemplos do ZIP e entradas sem separador, órfãs/Unicode/CRLF/limites; rodar focais/tipos e commit.

## C4.2 — revisão durável e confirmação por item

- [ ] `supabase/tests/text_import.sql` com fixtures isoladas/rollback, anexar ao runner, RED antes de migration CLI. Cobrir autorização/RLS/grants/revogação, pais/versão/recibos, proteção de linhas aplicadas, sexo derivado/preservado, rollback pessoa+vínculo, sucessos entre falhas e retomada.
- [ ] Migration própria: revisão privada, resultados por linha/recibos privados; leitores invoker e escritores privados delimitados autorizados antes dos dados. Validar shapes/limites/origem/identidades no banco, manter ordem de locks atleta → campeonato. Reutilizar writers privados C2/C3 sem contornar regras.
- [ ] Do zero/upgrade com C3 salvo, contrato real no projeto novo com rollback, contagens/advisors/tipos e commit. Não repetir contratos antigos não isolados sobre dados humanos.

## C4.3 — transporte e UI

- [ ] Provider/SessionStore/rotas fixas de revisar/retomar/salvar/confirmar item; testes de sessão/origem/query/schema/limites e erro por item. Sem SDK/token no browser.
- [ ] UI dentro de Equipes e elencos: texto/modo/explicação, prévia editável, escolha contextual de equipe/inscrição/pessoa, seleção dos prontos, progresso/resultados/pendências e recarga explícita em conflito. Estado não salvo/gravando/salvo/falha, rascunho e guardas/foco/reautenticação, desktop/celular.
- [ ] Testes browser RED→GREEN: exemplos, homônimos, correção/deseleção, cabeçalhos repetidos, partial/retry/reload/destino e 320px. Amostra real solicitada ao responsável; não declarar compatibilidade universal ou aceite sem ela.

## C4.4 — entrega

- [ ] Gate consolidado ao estabilizar, PR draft sobre C3, CI source exato e preview protegido, smokes novos/credenciais temporárias revogadas. Reusar harness/protótipo inalterados.
- [ ] Checkpoint, evidências/limites, avaliação humana e próximo bloco da etapa 4 conforme pacote/cota. Ao gatilho real de 85% usado, encerrar menor operação consistente, salvar remoto e atualizar mesma automação para reset+2.
