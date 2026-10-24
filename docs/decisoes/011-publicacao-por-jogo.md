# 011 — Publicação por jogo com projeção mínima

Data:24/10/2026. Estado: implementação parcial G4P1a/P1b.

Confirmar uma súmula cria uma versão pública por jogo. A mesma transação valida o fechamento e identidades, confirma a fonte, grava histórico privado imutável com referências por IDs, atualiza projeção mínima, estado da agenda e recibo do comando. Falha preserva a publicação anterior integralmente. Fresh admin é verificado antes de replay; locks seguem comando da publicação, comando da fonte, raiz e jogo.

O público recebe somente whitelist de contexto, nomes esportivos, camisas, comissão e fatos cobertos. Documento original, nascimento, sexo, registro, notas, autor, motivo e paths permanecem privados. Histórico e leitura administrativa têm funções específicas; RLS permite anônimo somente na projeção atual. Helpers não têm grants API incidentais.

Após confirmação, identidades relacionadas e camisas ficam fixas. Correção da participação é permitida com motivo e nova versão da fonte; salvar não republica. Revisar resultado exige motivo10–500 caracteres. Se houver revisão PDF pronta associada, publicação manual requer decisão explícita de fallback e motivo. Não mistura métricas silenciosamente.

P1 implementa fonte manual. Autoridade por domínio/PDF, API/UI de confirmação e consulta mínima serão adicionadas em P2/P3 preservando o histórico manual e a integridade referencial. Não declarar etapa4 concluída. Evidências e limitações em VALIDACAO-PUBLICACAO.md.

Registro tipado de origem (P2c2): private.publication_sources liga (kind,id) a FK real da súmula ou PDF e a um único jogo. A migration cria registros para origens manuais existentes sem reescrever versões imutáveis; trigger registra fontes das versões novas. Histórico aponta por FK composta (tipo,id,jogo). Registros também são imutáveis, com RLS e nenhum grant direto. Essa estrutura permite ampliar para PDF sem abandonar integridade referencial ou alterar o passado. Índice cobre a nova FK.

Combinação PDF/manual (P2c3): a versão publicada congela a revisão PDF, suplemento, autoridade e documento/versão manual efetivamente usados. Uma referência secundária tipada por FK mantém o vínculo à súmula quando esta fornece placar ou períodos e o PDF fornece avançados. O próximo rascunho manual não substitui o documento histórico. A projeção pública possui DTO PDF próprio e union com a projeção manual; IDs de origem e campos de associação ficam administrativos. Após publicação, a revisão pode mudar com motivo mas não transferir o original para outro jogo. Mudança de número informado exige aceite explícito e motivo.

Consulta mínima: resultado.html#UUID é uma entrada React própria servida pelos mesmos assets/Worker. Evita que navegar para o resultado substitua o hash e contorne guardas de rascunho da administração; links administrativos abrirão nova aba. Não exige sessão interna, mas a apresentação de desenvolvimento permanece integralmente atrás do Access. A consulta usa apenas get_public_game e DTO estrito; nenhum reader administrativo é compartilhado com ela.
