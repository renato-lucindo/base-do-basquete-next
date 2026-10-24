# 011 — Publicação por jogo com projeção mínima

Data:24/10/2026. Estado: implementação parcial G4P1a/P1b.

Confirmar uma súmula cria uma versão pública por jogo. A mesma transação valida o fechamento e identidades, confirma a fonte, grava histórico privado imutável com referências por IDs, atualiza projeção mínima, estado da agenda e recibo do comando. Falha preserva a publicação anterior integralmente. Fresh admin é verificado antes de replay; locks seguem comando da publicação, comando da fonte, raiz e jogo.

O público recebe somente whitelist de contexto, nomes esportivos, camisas, comissão e fatos cobertos. Documento original, nascimento, sexo, registro, notas, autor, motivo e paths permanecem privados. Histórico e leitura administrativa têm funções específicas; RLS permite anônimo somente na projeção atual. Helpers não têm grants API incidentais.

Após confirmação, identidades relacionadas e camisas ficam fixas. Correção da participação é permitida com motivo e nova versão da fonte; salvar não republica. Revisar resultado exige motivo10–500 caracteres. Se houver revisão PDF pronta associada, publicação manual requer decisão explícita de fallback e motivo. Não mistura métricas silenciosamente.

P1 implementa fonte manual. Autoridade por domínio/PDF, API/UI de confirmação e consulta mínima serão adicionadas em P2/P3 preservando o histórico manual e a integridade referencial. Não declarar etapa4 concluída. Evidências e limitações em VALIDACAO-PUBLICACAO.md.

Registro tipado de origem (P2c2): private.publication_sources liga (kind,id) a FK real da súmula ou PDF e a um único jogo. A migration cria registros para origens manuais existentes sem reescrever versões imutáveis; trigger registra fontes das versões novas. Histórico aponta por FK composta (tipo,id,jogo). Registros também são imutáveis, com RLS e nenhum grant direto. Essa estrutura permite ampliar para PDF sem abandonar integridade referencial ou alterar o passado. Índice cobre a nova FK.
