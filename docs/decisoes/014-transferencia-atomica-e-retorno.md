# 014 — Transferência atômica e retorno com novo vínculo

24/10/2026, etapa5. ESCOPO§5, ARQUITETURA§vínculos e CONTRATOS§operações: um vínculo ativo por pessoa/disputa; transferência depende do regulamento; preservar participação/histórico. Decisão técnica reversível delegada, sem serviço ou contratação.

O cadastro comum já impede vínculo ativo duplo e alteração da identidade de um vínculo encerrado. Ainda permite encerrar e depois inserir outro vínculo sem operação de transferência: a integração deverá fechar esse desvio, não apenas acrescentar um botão. Primeira inscrição e edição de camisa/inativação continuam comandos específicos; pessoa com histórico na disputa usa transferência/retorno para novo período.

Permissão ausente no regulamento significa pendência, não autorização. Preparar contrato finito transfers=allowed/forbidden/null, ancorado na versão do regulamento; sem inventar limites de quantidade ou fórmulas. O armazenamento/editor dessa configuração será implementado no T2, compatível com versões anteriores cuja permissão permanece null. Não há decisão do responsável atribuída a essa escolha técnica.

Vigência inicial é o instante real da execução no servidor, com precisão de PostgreSQL; não agendar nem retroagir nessa primeira operação. Contexto/relógio não vêm do browser. Encerrar origem ativa e abrir destino ocorre na mesma transação, no mesmo instante, sem lacuna imposta ou dois ativos. Origem já encerrada permite novo período apenas se não houver vínculo atual e for a última origem conhecida. Retorno à inscrição anterior cria ID e período novos, nunca reativa/reescreve a linha histórica. Duas inscrições da mesma equipe global são destinos distintos e válidos.

Prévia privada inclui pessoa/origem/destino/camisa, regra, versões e consequências. Nova camisa conflita somente com ocupação ativa no destino;0 e00 são diferentes. Identidade/sexo/naipe e pertença serão verificados pelo banco. Publicações, participantes e estatísticas não são entradas nem alvos da operação. Não trocar a inscrição de fatos antigos pelo vínculo atual.

Escrita futura usa autorização fresca, recibo, locks existentes na ordem atleta→raiz do campeonato→vínculos; não inverter a ordem do cadastro global. Conferir permissão/versões/contexto/lista integral sob lock, motivo e confirmação; rollback atômico de fechamento/abertura/histórico/recibo/Recentes. Replay não muda vigência/Recentes. Nada disso é provado apenas pelo núcleo TypeScript; exige SQL descartável zero/upgrade, RLS/grants e prova real no projeto novo.

Este bloco é independente da elegibilidade pública pendente na decisão013. A avaliação manual permanece adiada pelo responsável; não solicitar testes hoje nem considerar a ausência de teste como aceite.
