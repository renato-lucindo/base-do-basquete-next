# Design — índice e fluxo de agentes

## Leitura por tarefa

- [PADROES.md](PADROES.md): hierarquia, acessibilidade, formulários, navegação, responsividade.
- [PADROES-ADMIN.md](PADROES-ADMIN.md): componentes, CRUD, formulários, tabelas, filtros, combobox, modais, feedback e preservação de contexto (admin).
- [PUBLICO.md](PUBLICO.md): descoberta, classificação, jogos, equipes, jogadores e estatísticas.
- [ADMIN.md](ADMIN.md): percursos administrativos e aceite proporcional; componentes e comportamentos ficam em PADROES-ADMIN.
- [INTEGRACAO.md](INTEGRACAO.md): contratos dos protótipos de súmula/estatísticas.
- Evidência histórica, somente se necessária: [VALIDACAO-DESIGN-PUBLICO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md), com evidências e limites dos protótipos.

## Hierarquia de decisões

A fonte única da hierarquia documental e dos critérios de resolução de conflitos é a [seção 8 de docs/INDICE.md](../INDICE.md#8-hierarquia-de-decis%C3%B5es). As regras de Git, CI, autorização e checkpoints permanecem em `AGENTS.md` e `CONTRIBUTING.md`.

Em UI/UX, compare o protótipo aprovado para a tela com os padrões comuns e da área e com os dados efetivamente disponíveis. Resolva divergências conforme o índice, sem inventar cobertura nem alterar domínio ou publicação por conveniência visual.

## Fluxo de trabalho dos agentes

1. **Entender:** identificar a tarefa e o primeiro dado útil, ler o padrão da área, consultar o estado real no Next e limitar o escopo ao MVP.
2. **Projetar:** usar `ui-ux-pro-max` para pesquisar recomendações específicas de fluxo, componentes e hierarquia; preservar identidade, decisões e componentes já existentes.
3. **Implementar:** cuidar desde o início de teclado, leitor de tela, foco, erro, carregamento, vazio, densidade e zoom.
4. **Revisar:** usar `web-design-guidelines` sobre arquivos de UI alterados, buscar diretrizes atualizadas da fonte indicada pela skill antes da revisão e registrar achados por arquivo/linha. Executar também a conferência obrigatória abaixo; repetir um padrão antigo na implementação não dispensa compará-lo com a regra vigente.
5. **Verificar:** revisão **proporcional** à mudança (texto, componente ou fluxo), com tamanhos de tela/estados afetados, testes pertinentes, capturas quando necessário e evidência de SHA/resultado/limites. Axe não substitui inspeção manual nem comprova WCAG integral.

**Skills e instalação híbrida:** consulte [SKILLS.md](SKILLS.md) para origem, licença, versão, hashes e execução. `ui-ux-pro-max` está versionada com catálogos e scripts; `web-design-guidelines` continua por instalação local ou consulta à fonte, pois não foi comprovada licença de redistribuição da coleção. Preservar instalações pessoais e `skills-lock.json` de outros checkouts, sem alegar revisão não executada.

### Conferência obrigatória de textos e tabelas

Antes de entregar qualquer tela nova ou alterada, pública ou administrativa, conferir os [padrões de apresentação](PADROES.md#textos-de-apresentação) e registrar o resultado na revisão/evidência da PR. Os itens são critérios de entrega do agente, sem acrescentar confirmações ao percurso do usuário.

- [ ] Textos auxiliares comunicam somente ações necessárias ou estados concretos; não há avisos genéricos, repetições ou explicações do funcionamento normal.
- [ ] Cabeçalhos completos não têm tooltip nem botão exclusivamente de ajuda; nas abreviações, o tooltip contém apenas o significado aprovado, consistente com os demais controles.
- [ ] Tooltips de registros/ícones usam somente o conteúdo aprovado para sua finalidade, sem ampliar explicações por iniciativa da implementação.
- [ ] Existe no máximo uma legenda estatística, no final do conteúdo ativo, depois de tabelas/rankings/paginação e antes do rodapé. Usa a apresentação existente e somente abreviações visíveis, sem parágrafos técnicos ou estilo próprio.
- [ ] Os textos de cada sigla no cabeçalho/tooltip, seletor e legenda são idênticos aos nomes curtos do catálogo compartilhado; não têm complementos locais, inclusive para J, totais, médias, cobertura ou ausência.
- [ ] Foi lido o conteúdo efetivo de todas as legendas, tooltips e notas da tela, inclusive nos estados de foco/toque e em abas/expansões. A evidência registra ao menos um exemplo real de par sigla/significado e a posição final da legenda; passar geometria, axe ou testes de cálculo não substitui esta revisão textual.
- [ ] Recursos herdados de um template não ampliam o escopo. No perfil do atleta, Evolução está fora do escopo do protótipo solicitado em 11/11/2026; não aparece em navegação, painéis ou gráficos.
- [ ] Alinhamentos seguem o padrão da tela; teclado, foco, toque, nomes acessíveis e apresentação responsiva foram conferidos nos estados/tamanhos afetados.

Registrar evidências proporcionais ao que mudou e indicar os itens não aplicáveis. Mudança exclusivamente documental pede revisão do texto, links e conflitos; não declarar uma conferência visual ou de interação que não foi executada. Novas decisões substituem os trechos conflitantes nos documentos de referência; pendências de implementação ficam no plano da unidade e no checkpoint, separadas do padrão aprovado.

---

## Reforma de UI/UX — piloto de 03/11/2026

Direção aprovada: **público primeiro no celular, administração no desktop**, tema claro e azul, tabelas e formulários compactos. As decisões e os limites estão em [REFORMA-UIUX.md](REFORMA-UIUX.md).

- [Abrir o piloto navegável](prototipos/reforma-uiux/Piloto%20UIUX.html): jogadores, busca global, perfil contínuo de carreira com conquistas/resumo/três recentes/campeonatos, súmula com a composição atual e parciais/elencos/faltas, Jogos, Informações e equipes/elenco lado a lado. Dados fictícios; nenhum acesso ao banco.
- Para servir localmente: `node docs/design/prototipos/reforma-uiux/server.cjs`, depois abrir [o piloto local](http://127.0.0.1:4189/).
- Fontes compartilhadas em `src/ui-system/`; a tabela passou a ser utilizada também no perfil real após autorização de 04/11. Build e verificação do piloto incluídos em `npm run design:build` e `npm run design:verify`.
- Em 04/11 o responsável autorizou implementar na mesma PR #51 o último plano de perfil/jogo. Perfil integrado à rota real e súmula vigente preservada; o piloto foi aceito e o responsável autorizou a sequência público real → busca no servidor → administração → preparação da liberação. Estado de cada unidade e CI no checkpoint, sem inferir deploy/DDL. Uma unidade/PR por vez, sem pilha dependente.

## Protótipos públicos para implementação

Esta unidade reúne duas referências navegáveis com dados fictícios: a súmula pública revisada e a página de estatísticas r6 enviada pelo responsável, com cabeçalho e controles compactados. A implementação nas rotas reais será uma unidade posterior.

## Abrir

- [Súmula do jogo](prototipos/sumula/Sumula%20do%20jogo%20publicado.html).
- [Estatísticas de atletas](prototipos/estatisticas/Estatisticas%20de%20atletas.html).

Baixe e abra os HTMLs no navegador; ambos são autocontidos. O GitHub exibe o código, não executa esses arquivos. Não há dependência de API, conta, banco ou conexão de rede.

Para servir a súmula localmente: `node docs/design/prototipos/sumula/server.cjs`, depois abra http://127.0.0.1:4187/. O servidor só responde no loopback e serve uma lista explícita de arquivos.

## Fontes e validação

Na raiz do repositório, com Node24+:

```powershell
npm ci --ignore-scripts
npx playwright install chromium
npm run design:build
npm run design:verify
```

As dependências vêm do lockfile do projeto. O build da súmula incorpora HTML, CSS, fixtures e renderer em um arquivo. O build de estatísticas usa React e os componentes adaptados do pacote r6, confere hashes de seis fontes originais e gera seu HTML. `esbuild` usa a versão já presente no lockfile do projeto.

Os verificadores cobrem cálculos, ausência versus zero, filtros/ordenação, quartos, faltas, painéis, teclado, toque, rolagem interna e axe. A verificação de hierarquia mede a primeira linha útil e as linhas visíveis nas duas larguras. A CI executa esse conjunto junto com o gate existente quando houver alterações executáveis.

As capturas e os relatórios de cada execução são gerados localmente; as provas selecionadas desta entrega estão em [VALIDACAO.md](../../historico/documentacao/validacoes/VALIDACAO-DESIGN-PUBLICO.md).

## Origem e adaptações

O [ZIP r6 original](referencias/pagina-estatisticas-react-r6.zip) foi preservado byte a byte. SHA256: `3ad8e05c9244dda6b879363a26b11f9e743e9356208573a8ad20440439709878`. As instruções internas foram tratadas como referência técnica, sem substituir o pedido do responsável.

A cópia extraída contém as fontes necessárias à reprodução, o arquivo legado de fixtures usado pelo gerador, licenças e a referência de componentes. Os scripts de build/tipagem/verificação foram ajustados para caminhos portáveis e dependências do repositório. As fontes próprias foram formatadas; os seis arquivos em `upstream/` continuam intactos. A interface de estatísticas recebeu apenas a revisão de hierarquia descrita acima, preservando o comportamento r6. O pacote original também preserva sua documentação e capturas históricas.

Em estatísticas, `react-prototype/prepare.cjs` regenera os adaptadores a partir de `upstream/` e das fixtures legadas. Caso esses componentes sejam alterados, atualize o gerador correspondente e formate o resultado. O build normal usa os adaptadores já versionados.

Consulte [os padrões permanentes](PADROES.md) e [o contrato de integração](INTEGRACAO.md) antes de implementar.

## Administração real e preparação da liberação

O padrão aceito foi incorporado às rotas reais: Jogos com ordenação no servidor antes da paginação, Informações com campos proporcionais e equipes/elencos em dois painéis, preservando os componentes de edição existentes. [Provas, capturas e limites](VALIDACAO-ADMIN-UIUX.md). Estado da PR/CI e autorização da migration em [PROGRESSO.md](../PROGRESSO.md); implementação local não representa aplicação de banco ou deploy.

[Validação final, pacote local e plano de liberação/rollback](PREPARACAO-LIBERACAO-UIUX.md). A preparação não executa deploy nem publicação de dados; fonte do pacote, evidências e limites estão identificados no relatório.
