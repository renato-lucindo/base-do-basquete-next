# Origem dos insumos

O pacote original está preservado, com bytes conferidos pelo manifesto. Não é o schema do novo banco nem o scaffold da aplicação.

`src/domain/scoresheet.ts` é cópia do motor `modulos/source/app/modules/keyboard-scoresheet/domain.ts` do pacote. `src/domain/scoresheet.test.ts` preserva seus testes, com o caminho de importação ajustado. Mudanças de formatação da cópia não alteram o original. A suíte também roda sobre a cópia efetivamente usada pelo protótipo.

O importador textual, a UI administrativa e os adaptadores de simulação foram criados neste repositório conforme os contratos atuais. Os exemplos de pessoas/equipes e os tokens vêm do pacote. Nenhum código, dado de negócio ou referência de produto foi recuperado de outro repositório.

Os parsers/extratores PDF e os módulos estatísticos continuam disponíveis no pacote e serão integrados em entregas posteriores. A suíte original passou 126 testes e TypeScript em 22/10/2026; `docs/PROGRESSO.md` conserva a aplicabilidade dessa evidência. O protótipo de revisão PDF usa conteúdo fictício identificado na tela e não alega extrair os arquivos selecionados.
