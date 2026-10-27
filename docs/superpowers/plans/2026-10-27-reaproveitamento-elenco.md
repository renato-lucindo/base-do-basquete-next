# Reaproveitar elenco da mesma equipe — correção prioritária

Autorização27/10/2026: responsável relatou reinserção manual ao inscrever a mesma equipe em outra categoria/disputa e priorizou esse fluxo. Auditoria anterior concluída e commitada em `cc02882`, antes desta implementação: `docs/AUDITORIA-REUSO-BASE-ANTERIOR.md`.

## Experiência e limites

- Na inscrição de equipe global existente, oferecer “Aproveitar elenco” de outra inscrição da mesma equipe no mesmo campeonato/temporada. A ação também deve existir no elenco de uma inscrição já criada. Uma única origem pode ser sugerida; múltiplas origens exigem escolha identificada, sem mesclar A/B.
- Diálogo compacto: origem, seleção dos atletas, camisa editável e motivo de cada bloqueio. Selecionar os compatíveis novos como sugestão, manter os já incluídos identificados e não alterar seus vínculos/camisas. Confirmar explicitamente antes de escrever. Não criar equipes/pessoas/inscrições para aproveitar um destino existente.
- Identidades porUUID, source/target distintos, mesmo teamId/seasonId/championshipId. Mesma pessoa pode participar de duas disputas; vínculo ativo em outra inscrição da disputa destino bloqueia inclusão. Elenco de origem/histórico não é alterado. Naipes incompatíveis e histórico de destino que exige transferência são bloqueios; não inferir idade por nome da categoria.
- Camisas0/00/null distintas. Conflitos de camisa visíveis/editáveis; não escolher outra numeração automaticamente. Não copiar titulares, capitão, participação ou técnico-capitão, nem publicar resultados/perfis.
- Máximo200 atletas por confirmação, reaproveitando o limite de revisão C4; consultas completas limitadas explicitamente, paginação visível20. Não truncar silenciosamente nem inventar capacidade de carga. Detalhes de transporte serão fechados no adapter.

## Unidades

1. R1 contrato de contexto e prévia puros: validação fechada, origem/destino, candidatos, já incluídos e conflitos; casosRED→GREEN e sem alterações de produto/serviço remotas.
2. R2 banco: consulta administrativa de origens/contexto derivada porIDs; writer próprio curto reutilizando as guardas/primitivas C3 de vínculo, sem forjar texto nem rodar matching. Fonte e destino revalidados, versão/fingerprint, authfresh antes do replay, recibos, lockatleta→raiz, atualização atômica e retorno por atleta. Testes reais PostgreSQLzero/upgrade/TS×SQL/rollback antes de migration remota; migrations anteriores imutáveis. RLS/grants/privacidade e dados do responsável preservados.
3. R3 provider/Worker/rotas de mesma origem e corpo limitado, UI contextual no ato de salvar inscrição e ao abrir elenco. Atualizar somente destino, comando congelado, ACK/retry/reauth/409 e foco. Integrar à importação sem duplicar equipes/pessoas. Backend recebe intenções/IDs, nunca elegibilidade derivada do browser.
4. R4 focais desktop1366/1920 e composição de cadastro/importação/súmula, gate/CI quando estável e preview protegido. A mudança visual018050a está preservada e deve ser composta/revisável sem repetir provas imutáveis. Não iniciar trabalho de PDF/parser/mobile/público.

## Continuidade e revisão

Branch `codex/reaproveitar-elenco` sobre auditoria `cc02882`, checkout sequencial sem escritor paralelo; `.agents/` e `skills-lock.json` humanos preservados. Projeto anterior sóleitura/referência; nenhuma execução ou alteração de seus15arquivos modificados. Novo Supabase apenas vínculo/projeto járegistrados, sem importar schema/dados antigos. Sem novas bibliotecas.

`docs/PROGRESSO.md` e este plano são o ledger. Revisor independente indisponível nas ferramentas atuais; não inventar revisão ou testes. Conferir quota real entre unidades/antes de longas. Limite humano85%usados5h prevalece; semanal também compartilhado. Automação `retomar-administra-o-compacta` estáPAUSED enquanto trabalho após reset; somente reagendar resetREAL+2 se necessário, com novo checkpoint.

## Ledger

- Preflight: C4 exige texto original/linhas coerentes; não gerar texto artificial para IDs conhecidos. Reaproveitar C3 para vínculos com writer de origem tipada. Writer histórico C3 de jersey obrigatório foi substituído em20261023172909; ler definição vigente, não alterar migration aplicada.
- R1 local: sete casos de prévia aprovados, incluindo11atletas/disputas distintas, destino já preenchido,0/00/null, bloqueios, correção de camisa e seleção201→200 sem truncamento. Composição com matching/transferência43PASS. Ainda sem banco/API/UI de reaproveitamento.
- Feedback adicional do responsável: pré-selecionar jogadores com compatibilidade alta, especialmente nome e registro federativo idênticos. Implementação independente no importador atual priorizada antes de R2. O índice único do registro existe desde20261023172909; não exige DDL. Seleção de identidade não aprova alteração de cadastro global nem grava vínculos antes da confirmação do conjunto.
- Critérios de pré-seleção adotados: registro federativo exato/único; ou nome completo normalizado exato e único, sem lista truncada; ou grafia com similaridade≥0,95 e data completa coincidente, sem concorrente. Primeiro nome isolado, homônimo sem chave, diferenças de registro/nascimento, naipe incompatível e vínculo em outra inscrição ficam pendentes. Não usar camisa como prova de identidade nem aumentar o conjunto de candidatos por substring.
- Manter escolhas existentes, criação explicitamente confirmada como homônimo e linhas desmarcadas. O backend continua revalidando versão, vínculo, identidade e autorização ao confirmar. Nenhuma fusão de pessoas nem atualização global automática.
- Próximo após estabilizar esta correção vertical: R2 reader/contexto e writer transacional porIDs, com RED real PostgreSQL antes de migration nova. Auditoria e material visual preservados.
