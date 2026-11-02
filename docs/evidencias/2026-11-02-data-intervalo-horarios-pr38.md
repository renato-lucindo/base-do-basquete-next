# Data separada do intervalo de horários — PR #38

Complemento solicitado pelo responsável em 02/11/2026, na mesma unidade `codex/reaproveitar-elenco-banco`. Entrada remota conferida: `bcfaabaaeeef6714473a3ec704a5f996d9201d51`; PR #46 e main sem mudanças. Trabalho continua no worktree isolado da implementação, preservando os checkpoints locais de publicação.

## Problema e comportamento

O editor de jogos agendados já separava data e horários. O trecho específico dos jogos encerrados usava dois `datetime-local`, exigindo repetir a data para início e fim. Agora há um Date Picker para a data real e dois Time Pickers para início/fim. Por padrão ambos usam o mesmo dia. Fim anterior ao início marca a opção visível **Termina no dia seguinte**; o usuário pode conferir e alterar essa opção. A duração continua sujeita ao contrato vigente: positiva e no máximo 24 horas, inclusive intervalos.

A data real já registrada tem precedência; sem horários reais, a data da agenda é somente uma sugestão e nenhum horário agendado é convertido em início real. A agenda do jogo encerrado permanece imutável. API, schema, migrations, regras esportivas e publicação não mudam. O rascunho dos campos é separado do comando persistido para preservar entradas incompletas, guardas de saída e erro associado aos controles. Resposta incerta reutiliza o mesmo comando; conflito exige recarga explícita.

## Provas

- RED: o teste atualizado de jogo v1 confirmado foi executado contra a release limpa `bcfaaba` na porta local 5174. Falhou por encontrar dois `datetime-local` quando esperava zero, reproduzindo exatamente o problema.
- Seis testes novos do adaptador cobrem mesmo dia, agenda preservada, ausência, início sem fim, rascunho incompleto, erro de duração, limite de 24h e viradas de mês/ano/ano bissexto. Junto aos três testes anteriores de horários: nove PASS.
- Browser confirmado v1: um date e dois time, início/fim ausentes, virada 23:15→00:47, duração de 92 minutos, salvamento/recarga, arbitragem e camisa com motivo; desktop e mobile PASS.
- Browser novo: mesmo dia 20:12→21:45, data real distinta da agenda sem alterar a agenda, erro por início ausente sem POST, intervalo acima de 24h rejeitado, resposta perdida/reenvio com mesmo commandId, recarga e conflito com recuperação explícita; desktop e mobile PASS. Capturas em `.preview-artifacts/actual-time-range-after-{1366,1920,390}.png`, disponíveis no artefato de UI da CI.
- O conjunto inicial Jogos/Arbitragem/Legado teve 35 PASS/15 SKIP e duas falhas no teste novo por nomes de botão/mensagem incorretos na asserção. Corrigidas somente essas asserções; o caso novo passou em ambos os projetos. Nenhum timeout foi ampliado nem teste removido. A CI do SHA final consolida o conjunto completo.
- Revisão do autor com ui-ux-pro-max (rótulos persistentes, tipos nativos, datas locais) e [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultadas nesta alteração. Inspeção em 1366×768, 1920×1080 e 390×844: campos em linha no desktop, empilhados no celular, texto auxiliar na largura completa, alvo da opção com 44px, foco/erros associados e sem overflow da página. Axe sem violações no fluxo novo. Não equivale a certificação WCAG ou revisão independente.

Gate, SHA/CI conclusivos e versão efetivamente publicada ficam no registro atualizado da PR e no checkpoint, sem antecipar resultado. Testes utilizam fixtures e banco descartável; não editar dados humanos para comprovar salvamento. O preview permanece na versão anterior até novo deploy explicitamente registrado. Nenhuma nova migration é necessária; a correspondência do ledger da operação anterior continua documentada na [publicação isolada](2026-11-02-preview-isolado-pr38.md).
