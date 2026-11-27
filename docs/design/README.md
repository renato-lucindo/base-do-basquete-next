# Design — índice e fluxo de agentes

## Leitura por tarefa

- [Design system](DESIGN-SYSTEM.md) — regras de adoção do [guia visual aprovado em 18/11/2026](catalogo/guia-completo-autonomo.html) e referências aos componentes do produto.
- [PADROES.md](PADROES.md): hierarquia, acessibilidade, formulários, navegação, responsividade.
- [PADROES-ADMIN.md](PADROES-ADMIN.md): componentes, CRUD, formulários, tabelas, filtros, combobox, modais, feedback e preservação de contexto (admin).
- [PUBLICO.md](PUBLICO.md): descoberta, classificação, jogos, equipes, jogadores e estatísticas.
- [ADMIN.md](ADMIN.md): percursos administrativos e aceite proporcional; componentes e comportamentos ficam em PADROES-ADMIN.
- Evidência histórica, somente se necessária: [VALIDACAO-DESIGN-PUBLICO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md), com evidências e limites dos protótipos.

## Hierarquia de decisões

A fonte única da hierarquia documental e dos critérios de resolução de conflitos é a [seção 8 de docs/INDICE.md](../INDICE.md#8-hierarquia-de-decis%C3%B5es). As regras de Git, CI, autorização e checkpoints permanecem em `AGENTS.md` e `CONTRIBUTING.md`.

Em UI/UX, compare a tela com o guia aprovado, os padrões comuns e da área e os dados efetivamente disponíveis. Código existente, capturas e protótipos históricos não são uma referência visual alternativa. Resolva divergências conforme o índice, sem inventar cobertura nem alterar domínio ou publicação por conveniência visual.

## Fluxo de trabalho dos agentes

1. **Consultar a regra e a tela atual.** Identificar a tarefa e o primeiro dado útil; ler a seção aplicável do guia aprovado e o padrão da área. Antes de editar, registrar no plano da unidade uma matriz curta: comportamento, classificação da decisão, referência com seção, componente, consumidores e critério observável de aceite. Não criar um relatório por sessão.
2. **Localizar e reutilizar.** Conferir o token ou componente real nos consumidores. Classificar cada escolha como **padrão existente**, **novo padrão aprovado** ou **exceção aprovada**, seguindo a [hierarquia e consulta ao responsável](../INDICE.md#8-hierarquia-de-decisões). Uma variação não pode ser justificada somente depois de implementada. Usar `ui-ux-pro-max` para pesquisas específicas, sem substituir a identidade aprovada.
3. **Implementar:** cuidar desde o início de teclado, leitor de tela, foco, erro, carregamento, vazio, densidade e zoom.
4. **Revisar:** usar `web-design-guidelines` sobre arquivos de UI alterados, buscar diretrizes atualizadas da fonte indicada pela skill antes da revisão e registrar achados por arquivo/linha. Executar também a conferência obrigatória abaixo; repetir um padrão antigo na implementação não dispensa compará-lo com a regra vigente.
5. **Comparar e registrar.** Comparar a interface renderizada com o pedido e as referências da matriz. Conferir textos, controles, estados e tamanhos em todos os consumidores afetados. No perfil da equipe, conferir as cinco abas gerais e as três da disputa, vazios e seletores abertos; não extrapolar a prova de uma variante para outra. Registrar na PR seção aplicada, componente, decisão, resultado observável, capturas e testes vinculados ao SHA. Usar axe como apoio à inspeção manual.

**Critério de entrega:** divergência conhecida ou conferência aplicável sem evidência mantém a entrega pendente. Separar testes automatizados, inspeção visual efetivamente executada e aceite humano. O catálogo comprova suas amostras; não comprova que o consumidor real adotou o padrão. Para regras de layout/interação suscetíveis a regressão, ampliar as suítes existentes com asserções sobre a página renderizada, sem testes que apenas procurem texto nos documentos. Preservar leitura seletiva e provas válidas de código inalterado.

**Skills e instalação híbrida:** consulte [SKILLS.md](SKILLS.md) para origem, licença, versão, hashes e execução. `ui-ux-pro-max` está versionada com catálogos e scripts; `web-design-guidelines` continua por instalação local ou consulta à fonte, pois não foi comprovada licença de redistribuição da coleção. Preservar instalações pessoais e `skills-lock.json` de outros checkouts, sem alegar revisão não executada.

### Conferência obrigatória de textos e tabelas

Antes de entregar qualquer tela nova ou alterada, pública ou administrativa, conferir os [padrões de apresentação](PADROES.md#textos-de-apresentação) e registrar o resultado na revisão/evidência da PR. Os itens são critérios de entrega do agente, sem acrescentar confirmações ao percurso do usuário.

- [ ] Nenhum título visível repete a aba ativa (por exemplo, Jogadores/Jogadores na disputa ou Jogos/Jogos da equipe). Títulos semânticos não reservam altura; conferir também Competições, Elencos e Estatísticas. Testes cobrem as abas alteradas.
- [ ] Textos auxiliares comunicam somente ações necessárias ou estados concretos; não há avisos genéricos, repetições ou explicações do funcionamento normal.
- [ ] Cabeçalhos completos não têm tooltip nem botão exclusivamente de ajuda; nas abreviações, o tooltip contém apenas o significado aprovado, consistente com os demais controles.
- [ ] Tooltips de registros/ícones usam somente o conteúdo aprovado para sua finalidade, sem ampliar explicações por iniciativa da implementação.
- [ ] Existe no máximo uma legenda estatística, no final do conteúdo ativo, depois de tabelas/rankings/paginação e antes do rodapé. Usa a apresentação existente e somente abreviações visíveis, sem parágrafos técnicos ou estilo próprio.
- [ ] A legenda usa colunas invisíveis de siglas e significados alinhados; nomes longos quebram dentro da coluna, sem desalinhar as linhas seguintes. Conferidos geral, disputa e Elencos quando aplicáveis.
- [ ] Os textos de cada sigla no cabeçalho/tooltip, seletor e legenda são idênticos aos nomes curtos do catálogo compartilhado; não têm complementos locais, inclusive para J, totais, médias, cobertura ou ausência.
- [ ] Foi lido o conteúdo efetivo de todas as legendas, tooltips e notas da tela, inclusive nos estados de foco/toque e em abas/expansões. A evidência registra ao menos um exemplo real de par sigla/significado e a posição final da legenda; passar geometria, axe ou testes de cálculo não substitui esta revisão textual.
- [ ] Recursos herdados de um template não ampliam o escopo. No perfil do atleta, Evolução está fora do escopo do protótipo solicitado em 11/11/2026; não aparece em navegação, painéis ou gráficos.
- [ ] A largura da tabela e das colunas atende à tarefa e se alinha aos blocos relacionados. Ícones, cores, hierarquia dos botões, alinhamentos, teclado, foco, toque, nomes acessíveis e reflow foram comparados com o guia na tela renderizada.
- [ ] Contornos chegam à última coluna; alinhamentos seguem a regra específica; filtros/modos ficam junto da tabela. Abrir seletores não desloca o conteúdo quando o padrão exige sobreposição. Ano e abas foram conferidos com pouco espaço.

Registrar evidências proporcionais ao que mudou e indicar os itens não aplicáveis. Mudança exclusivamente documental pede revisão do texto, links e conflitos; não declarar uma conferência visual ou de interação que não foi executada. Novas decisões substituem os trechos conflitantes nos documentos de referência; pendências de implementação ficam no plano da unidade e no checkpoint, separadas do padrão aprovado.

## Referências visuais

Use somente o design system, o catálogo aprovado e os padrões vigentes. Capturas antigas e os guias de reforma/integração superados foram excluídos. Fontes de protótipos, ZIPs e fixtures exigidos pelos testes permanecem nos caminhos originais exclusivamente para uso técnico; não orientam telas novas.

Para consultar o catálogo atual, execute `node docs/design/catalogo/build.cjs` e abra `docs/design/.preview-artifacts/catalogo/guia-completo-autonomo.html`.
