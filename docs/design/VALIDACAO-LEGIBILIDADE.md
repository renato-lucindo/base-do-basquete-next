# Legibilidade ampliada — validação

Unidade autorizada06/11/2026, [PR66](https://github.com/renato-lucindo/base-do-basquete-next/pull/66), base a3cd974. [Plano](../superpowers/plans/2026-11-06-legibilidade-rotulos-interface.md). Fonte final/CI/serviço serão registrados na PR ao concluir; não confundir WIP com liberação.

## Implementação

Escala raiz150%a partir640CSSpx,100%até639; oito entradas reais compartilham a regra. Declarações dimensionais convertidas para rem, preservando breakpoints e bordas1px. Navegador continua100%, zoom adicional funciona. Uma só denominação publicada por inscrição, aliases/históricos nos dados e na pesquisa, nomes com barra preservados. PP%/5F usam os nomes curtos compartilhados. Títulos redundantes permanecem semânticos; foco retorna ao contêiner visível.

Menu de colunas fora da tela após redução da tabela: RED x=-116; corrigido posicionamento ancorado, limite da viewport e abertura acima/abaixo. Segmentos de fase quebram linha com ampliação. Controles de cadastro e diálogo mantêm medidas proporcionais; salvar/cancelar permanecem acessíveis com ações fixas durante rolagem. Expansão de arbitragem acompanha sua área de edição.

## Provas e limites

TDD: rótulo de equipe mais recente antes do filtro de fase, fonte intacta e pesquisa pelo nome global; desempate estável, duas inscrições homônimas e IVV/Cetaf.161unitários focais PASS/33arquivos na composição inicial.12browsers novos de legibilidade, incluindo desktop/mobile, nomes, cabeçalhos e axe, passaram inicialmente. Provas finais de composição pertencem ao gate/CI da PR.

Regressão inicial ampla790cenários:232PASS/20FAIL/3interrompidos/535nãoexecutados por limite diagnóstico; não foi aprovação integral. CI42238486121 passou checks/design/WebKit e falhou nos browsers. Expectativas antigas de13/14px e dimensões compactas foram reconciliadas com a escala aprovada; não houve aumento de timeout/retry nem novos skips. Regressão completa da composição corrigida em execução no momento deste registro.

Arbitragem: axe não apontou cor inválida, mas contraste indecidível em textos parcialmente cortados nas bordas da área rolável. O teste conserva a análise integral de violações e reinspeciona cada nó indecidível em área visível; cada reinspeção exige zero violações e zero indecidíveis. Focal corrigido PASS. Não foram removidas regras axe. Fonte das diretrizes Web Interface Guidelines consultada em06/11/2026; revisão autoral conforme padrões do projeto, sem alegar revisão humana independente ou teste físico de celular.

Capturas e logs ignorados `.preview-artifacts/readability-*`, `.readability-*.log`. Conferir1920/1366/390/320, limite639/640, menus/diálogos e zoom adicional150/200; conjunto completo cobre as rotas reais, navegação, teclado e recuperação. Protótipos históricos conservam fontes originais e a comparação de fidelidade aplica o fator aprovado somente às rotas reais.

Sem migration, DDL/DML, alteração do formato das APIs ou publicação de jogos. PreviewUIUX só após CI PR/integrada, preservando principal/Access/bindings/segredos/DO. Serviço ainda não alterado por esta unidade.
