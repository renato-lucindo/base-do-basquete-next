# C4 — importador de um elenco por texto

> Executar inline com executing-plans/TDD; continuidade e cota conforme PROGRESSO.md. Autorizado em 23/10: “Ok, bora implementar”. Branch codex/importacao-texto sobre C3 0d34242. Sem aprovação técnica redundante; revisão independente indisponível.

**Objetivo:** importar/atualizar uma equipe por operação, em tabela editável, resolvendo identidades e gravando os selecionados com resultado individual.

**Spec:** docs/ESCOPO-IMPORTADOR-DE-EQUIPES.md fornecido pelo responsável, complementar e posterior aos ZIPs. Módulo adicional analisado em ANALISE-IMPORTADOR-DE-EQUIPES.md; manter regras gerais de autorização/privacidade/contexto do pacote original. O escopo novo substitui múltiplas equipes e camisa obrigatória do WIP anterior. Preservar literalmente o documento do responsável.

**Arquitetura:** parser puro de atributos + revisão privada/versionada no PostgreSQL + operações específicas no Worker/SessionStore, sem SDK/token no browser. Confirmação transacional por atleta (dados aprovados + vínculo), com idempotência e versões; uma falha não desfaz os outros itens. Equipe/inscrição nova também atômica. Texto/decisões e sucessos sobrevivem recarga, sem construir histórico detalhado de importações.

## Decisões relevantes

- Nome único obrigatório na UI; sexo de novo atleta derivado do naipe no servidor. Camisa pode ser null, inclusive várias ausentes; números informados preservam 0/00 e unicidade ativa por inscrição. Jogo continuará exigindo camisas quando necessário à súmula.
- Registro federativo privado nullable, seis dígitos ASCII e único globalmente quando informado, zeros iniciais preservados. Auditar antes da constraint sem corrigir dados humanos silenciosamente.
- Data completa/ano parcial de nascimento são privados. Ano público segue separado; não publicar implicitamente o ano extraído do texto. Adicionar ano parcial privado para identificação sem inventar mês/dia. Até duas posições canônicas no DTO do importador; perfil existente conserva representação textual compatível, sem perda das duas posições.
- Novo atleta assume mão direita quando ausente. Em existente, campo ausente não altera cadastro; alterações/limpezas explícitas ficam destacadas antes da confirmação. Versões de pessoa/vínculo impedem sobrescrita concorrente.
- Busca de sugestões ocorre no backend administrativo, primeiro registro, depois nome normalizado, depois aproximação/dados disponíveis. Nomes semelhantes não fundem; conflitos/homônimos permitem escolher identidade ou confirmar nova. Vínculo ativo incompatível na mesma disputa bloqueia, outra disputa/edição não.
- Entrada usa inscrição aberta ou criação/escolha contextual na mesma área. Cabeçalhos são metadados, não atletas; segundo nome de equipe distinto bloqueia para correção. Tabela com todos os campos, correção local/teclado, ações/pendências por linha; cadastro individual continua alternativa.
- Limites operacionais iniciais: 20 mil caracteres, 500 linhas físicas, 200 atletas e JSON até256KiB; sem truncar dados silenciosamente. Sem CSV/XLSX, lote de equipes, aprendizado ou histórico detalhado.

## M1 — compatibilidade do cadastro e banco

- [x] RED TS/SQL para camisa null, múltiplas ausentes, 0/00, registro formato/unicidade e ano privado parcial/data coerente. Reutilizar contratos válidos sem repetir harness.
- [x] Migration CLI própria, writer de elenco nullable e ano privado/registro com constraints; dados/RLS/recibos/lock order preservados. C3 UI compatível com null e validação federativa. Do zero/upgrade com dados C3 e contrato real rollback; tipos/advisors/contagens e commit.

## M2 — parser rico e revisão

- [x] Substituir WIP não integrado por DTO de uma equipe e atletas com origem, campos normalizados, campos efetivamente informados, pendências e decisão/versionamento. RED antes de código.
- [x] Casos do escopo: separadores - ; | / espaço, nomes/apelidos hifenizados, cabeçalhos, sem camisa, 0/00, datas reais, metros/cm, duas posições PG/SF e1-2, desconhecidos/ambiguidade, zeros de registro e limites. Preservar tokens não reconhecidos para correção. Nove testes focais, tipos/ESLint PASS. Campo ano segue privado e ausência de mão é distinguida do padrão direito.

## M3 — revisão durável, matching e confirmação

- [x] SQL RED: draft privado, shapes/limites/origem, matching administrativo, identidade única, contextos, mudanças explícitas, versão/idempotência, atomicidade, sucessos entre falhas, sem apagar ausentes.
- [x] Migrations/readers invoker/writers privados delimitados. Autorização fresca antes de dados/recibos; ordem atleta → campeonato, nada de service-role. Aplicar apenas projeto novo, contrato real isolado rollback, tipos/advisors e commit.
- [x] Provider/SessionStore/rotas fixas com sessão/origem/query/schema/limites e erros sanitizados; testes focais/workerd. Sem segredos/SQL nos erros.

## M4 — fluxo em tabela e entrega

- [x] UI colar → interpretar → tabela editável/sugestões → confirmar válidos → resultado por item. Todos os campos editáveis; diferenças em pessoa e elenco visíveis; ausentes mantidos. Rascunho/reload/guardas/foco/reautenticação, desktop/celular320 e confirmação coletiva dos novos sem dupla gravação por pessoa.
- [x] Browser RED→GREEN para exemplo rico, corrigir/selecionar/homônimo, comparar atual/ausente, parcial/retry/recarga/conflito e teclado. Mostrar composição revisada, continuar integração autorizada; amostra real solicitada, sem alegar compatibilidade universal.
- [x] Gate consolidado estável, PR draft sobre C3, CI source exato, preview protegido/hash/negação e revogação dos acessos temporários. Reusar artefatos inalterados.
- [ ] Checkpoint/avaliação humana/próxima etapa. Aos85%usados5h, menor operação segura, push/checkpoint e mesma automação reset+2; semanal também, sem compras/resets manuais.

## Entrega de M4

Source033d404 publicado no preview protegido em23/10 15:32 UTC-03; evidencias em VALIDACAO-IMPORTADOR.md. CI40003611826 SUCCESS em c5a8d10; delta final de cabecalho/teste verificado focalmente, sem repetir gate inteiro. Avaliacao humana com texto real solicitada; aceite pendente.
