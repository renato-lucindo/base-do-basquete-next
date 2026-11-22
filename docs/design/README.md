# Design — fontes vigentes

## Leitura por tarefa

1. [Design system](DESIGN-SYSTEM.md): referência visual, escala aprovada e componentes reais. Consulte a seção pertinente do [catálogo aprovado em 18/11/2026](catalogo/guia-completo-autonomo.html).
2. [Padrões comuns](PADROES.md): hierarquia, textos, legendas, tabelas, acessibilidade e responsividade.
3. [Público](PUBLICO.md) ou [Administração](ADMIN.md), conforme a área. Para componentes administrativos, consulte [PADROES-ADMIN.md](PADROES-ADMIN.md).
4. Implementação real em `src/`, para localizar o consumidor e o componente existente. Código antigo não substitui uma decisão visual vigente.

A hierarquia documental está na [seção 8 do índice](../INDICE.md#8-hierarquia-de-decisões). Regras de Git, CI e serviços continuam em [CONTRIBUTING.md](../../CONTRIBUTING.md). Estado de execução fica em [PROGRESSO.md](../PROGRESSO.md).

## Referências retiradas

Capturas antigas, pilotos, ZIPs recebidos, fontes originais e relatórios da reforma anterior foram retirados deste conjunto de referências. Permanecem no [histórico de design](../../historico/documentacao/design/README.md) para rastreabilidade e reprodução técnica. Não orientar telas, textos, navegação, cores, tipografia ou legendas por esses materiais. Não usá-los como fallback quando o catálogo não cobrir um componente.

Os runners históricos continuam executados pela CI para preservar verificações de cálculos, contratos e regressão. Sua execução não devolve autoridade visual aos exemplos antigos. Novas telas e protótipos usam as fontes vigentes listadas acima.

## Fluxo de trabalho dos agentes

1. **Entender:** identificar a tarefa, o primeiro dado útil e a decisão vigente da área.
2. **Projetar:** consultar o catálogo aprovado, localizar o componente real e reutilizar tokens e padrões pertinentes. Pesquisas de skills são auxiliares e não substituem decisões do projeto; origem e uso ficam em [SKILLS.md](SKILLS.md).
3. **Implementar:** tratar teclado, foco, toque, leitor de tela, erro, vazio, carregamento e reflow desde o início.
4. **Revisar:** conferir a interface renderizada contra o pedido, o catálogo e os padrões. Usar `web-design-guidelines` quando disponível, consultando sua fonte atual antes da revisão.
5. **Verificar:** executar provas proporcionais à mudança, registrar ambiente/SHA/resultado/limites e atualizar o checkpoint. Axe apoia a revisão; não comprova conformidade integral nem aceite humano.

## Conferência obrigatória de textos e tabelas

- Textos auxiliares comunicam ações necessárias ou estados concretos, sem explicações permanentes sobre funcionamento normal.
- Cabeçalhos completos não recebem tooltip exclusivamente de ajuda. Abreviações usam somente o significado curto aprovado no catálogo de métricas, igual no cabeçalho, seletor e legenda.
- Existe no máximo uma **Legenda permanentemente aberta**, ao final de todo o conteúdo da aba ativa, depois da paginação e antes do rodapé. Não usar `details`/`summary` ou um botão de expansão para a legenda estatística.
- A legenda contém somente as abreviações visíveis e seus significados. `J` significa **Jogos**, sem complementos sobre participação, totais, médias ou cobertura.
- Expansões de filtros, conquistas e recordes seguem seus próprios contratos; não são exemplo para recolher a legenda.
- A revisão lê o conteúdo real de tooltips e notas, inclusive em foco/toque. Registra um par sigla/significado, a posição da legenda e as larguras/estados verificados.
- Tabelas e colunas têm largura proporcional ao conteúdo; rolagem horizontal fica na região da tabela. Conferir tipografia, cores, ícones, botões, teclado e reflow contra o guia.
- Recursos herdados não ampliam escopo. Evolução do perfil não deve reaparecer por existir em um template antigo.

## Catálogo e verificação

Com Node 24+ e as dependências do lockfile:

```powershell
npm ci --ignore-scripts
node docs/design/catalogo/build.cjs
node docs/design/catalogo/verify.cjs
```

Abra `docs/design/.preview-artifacts/catalogo/guia-completo-autonomo.html` para o guia aprovado e `index.html` para as amostras dos componentes reais. O catálogo complementar de disputas usa fixtures e não comprova estado de serviços.

`npm run design:build` e `npm run design:verify` também reproduzem os artefatos históricos. Capturas dessas suítes são provas técnicas, sem autoridade para decisões novas. Mudança somente documental requer revisão de texto, links e conflitos; mudanças executáveis seguem os gates de contribuição.
