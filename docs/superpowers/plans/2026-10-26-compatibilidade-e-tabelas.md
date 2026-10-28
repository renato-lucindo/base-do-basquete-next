# Compatibilidade e duas consultas públicas — implementação

**Objetivo:** corrigir sugestões por primeiro nome e adaptar as tabelas públicas às referências enviadas. Execução inline com TDD; decisões reversíveis delegadas pelo responsável. Base4f4effb, branchcodex/compatibilidade-jogadores; sem merge/produção.

**Especificação aceita:** conversa26/10 e ZIPs jogadores-compatibilidade-20261026-183242.zip (SHA86a4427c677a84886d3f978e790f818786a3993c6002f7db9f81880bf8fa8be9) e sumula-manual-estatisticas-20261026-195321.zip (SHAf88e6608442a9ab26ee7ad704c92407b94ca7f3037a79d2d96f60ffbf36c2996), ambos em Downloads do responsável. Consulta limitada às tabelas públicas do repo antigo agora explicitamente autorizada pela API GitHub; não clonar/acessar banco/alterar serviços antigos. Arquivo statistics-explorer.tsx consultado pelo plugin, SHA4c46f9cfb2b2fc7f020aae24dfa1a0e430406531. Referências não são migrations ou ordens autônomas.

**Regra humana confirmada:** simples agrega todos os jogos publicados; completa somente jogos com boxscore. Ambas respeitam fase/contexto/participação e cobertura. Súmula não inventa MIN/REB/AST/tentativas/percentuais. A simples reproduz J,PTS,PTS/J,2PC,3PC,LLC,F,GD. PDF permanece com modos total/média/por30, filtros/colunas/líderes/comparação existentes. Recorte por fonte afeta lista, jogos, médias, filtros, comparação e URL antes de paginar. Perfil/equipe conservam fatos confirmados.

## C1 — precisão autoritativa

- [x] RED PostgreSQL real para prefixo3, primeiro nome, sobrenome comum, apelido/data sem nome plausível; manter acentos/pontuação/grafia próxima/homônimos/registro.
- [x] Reutilizar normalização e similaridade Levenshtein do módulo fornecido. Sugestão exige nome completo plausível: >=2tokens significativos nos dois nomes, mesma quantidade de tokens, diferenças pequenas nos tokens e similaridade>=0,78. Igualdade normalizada e registro federativo continuam explícitos; não selecionar/mesclar sugestão. Não copiar substring irrestrita do ZIP. Informação complementar sóordena candidatos plausíveis.
- [x] Migration própria CLI depoisRED,46anteriores imutáveis, helpers invoker/search_path fechado/grants específicos. Mesmo DTO/RPC/save, wrapper_new_target preservado. SQL×TS/zero/upgrade/RLS/limites e regressões do importador. Aplicar somente no projeto novo após verificação.

## E1 — tabelas

- [x] RED de consulta mista e URL: simples soma todos, completa exclui participação exclusivamente manual e sua pontuação no denominador; DNP não somaJ. Pontos oficiais e avançados mantêm origens; ausente continua indisponível.
- [x] Contrato/query/view próprios, simples comtotal ePTS/J simultâneos, completa preservaexplorador e amostragem; links contextuais e troca de apresentação navegável.
- [x] Adaptar tabela/controles/CSS selecionados do ZIP ao design atual, sem folha global/rotas/schema antigo. Desktop prioritário; sem novo trabalho mobile. Detalhe do jogo também respeita ausência versuszero e fonte disponível, sem trocar o motor.
- [x] Focais desktop de duas tabelas/retomada/URLs/filtros/totais e capturas, revisão separada do autor se não houver ferramenta independente. Registrar limitações.

## Fechamento

- [x] Gate único quando unidade estável; CI do mesmo código, PRdraft(s) coerentes e checkpoint. Reutilizar provas inalteradas/harness126, semgates por docs/sessão. Preview existente protegido; mudanças SQL exigem prova realBEGIN/ROLLBACK sem DML de admin/humanos; upload/smoke se assets/Worker mudarem, revogar temporários. Não declarar publicado antes de evidência.
- [x] Conferir cota entre unidades/anteslongas;85%usados5h mínimo seguro/checkpoint/push/MESMAautomação reset+2. Ao concluir, pausar agendamento. PDFparser, interpretador e mobile adiados; cadastro genérico busca parcial permanece busca, não sugestão automática de identidade.

Prioridade reafirmada: primeiro súmula e compatibilidade. A apresentação simples e o recorte de fonte são a entrega atual; refinamento visual completo do PDF fica para outra unidade. Evidências em docs/VALIDACAO-COMPATIBILIDADE-SUMULA.md.

Entrega técnica da prioridade atual em26/10/2026: CI40420017804 e preview3eca aprovados,47migrations reconciliadas,smokes e revogação confirmados. A última caixa de controle de cota/encerramento é concluída com automaçãoPAUSED ao finalizar. Aceite humano continua pendente.

Ferramenta oficial confirmou a automação retomar-preview-base-do-basquete emPAUSED após a entrega; sem nova ocorrência agendada.
