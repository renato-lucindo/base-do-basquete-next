# Origem dos insumos

O pacote original está preservado, com bytes conferidos pelo manifesto. Não é o schema do novo banco nem o scaffold da aplicação.

`src/domain/scoresheet.ts` é cópia do motor `modulos/source/app/modules/keyboard-scoresheet/domain.ts` do pacote. `src/domain/scoresheet.test.ts` preserva seus testes, com o caminho de importação ajustado. Mudanças de formatação da cópia não alteram o original. A suíte também roda sobre a cópia efetivamente usada pelo protótipo.

A cópia do motor recebeu metadados opcionais de capitão/comissão e validação da relação capitão-técnico, conforme solicitação posterior em `docs/AJUSTES-DE-EXPERIENCIA.md`. Fórmulas, códigos e regras de faltas do motor fornecido foram preservados. O pacote original continua imutável; testes novos cobrem a extensão e os testes originais continuam na suíte da aplicação. Documentos legados sem esses metadados são lidos sem reescrever o armazenamento; atleta-treinador legado identifica o capitão, e informação ausente continua pendente de seleção antes de publicar.

O importador textual, a UI administrativa e os adaptadores de simulação foram criados neste repositório conforme os contratos atuais. Os exemplos de pessoas/equipes e os tokens vêm do pacote. Nenhum código, dado de negócio ou referência de produto foi recuperado de outro repositório.

Os parsers/extratores PDF e os módulos estatísticos continuam disponíveis no pacote e serão integrados em entregas posteriores. A suíte original passou 126 testes e TypeScript em 22/10/2026; `docs/PROGRESSO.md` conserva a aplicabilidade dessa evidência. O protótipo de revisão PDF usa conteúdo fictício identificado na tela e não alega extrair os arquivos selecionados.
