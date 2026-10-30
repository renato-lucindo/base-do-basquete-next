# Design — índice e fluxo de agentes

## Leitura obrigatória por tarefa

- [PADROES.md](PADROES.md): hierarquia, acessibilidade, formulários, navegação, responsividade.
- [PUBLICO.md](PUBLICO.md): descoberta, classificação, jogos, equipes, jogadores e estatísticas.
- [ADMIN.md](ADMIN.md): fluxos, cadastros, tabelas, combobox, diálogos e feedback.
- [INTEGRACAO.md](INTEGRACAO.md): contratos dos protótipos de súmula/estatísticas.
- [VALIDACAO.md](VALIDACAO.md): evidência e limites dos protótipos.

## Hierarquia de decisões

Decisões explícitas do responsável > segurança, privacidade e contratos do domínio aplicáveis > padrões vigentes (comuns + área) > protótipos aprovados para a tela > recomendações de skills. As regras de Git, CI, autorização e checkpoints permanecem em `AGENTS.md` e `CONTRIBUTING.md`. Registre e resolva divergências sem mudar publicação, segurança ou domínio por conveniência visual.

## Fluxo de trabalho dos agentes

1. **Entender:** identificar a tarefa e o primeiro dado útil, ler o padrão da área, consultar o estado real no Next e limitar o escopo ao MVP.
2. **Projetar:** usar `ui-ux-pro-max` para pesquisar recomendações específicas de fluxo, componentes e hierarquia; preservar identidade, decisões e componentes já existentes.
3. **Implementar:** cuidar desde o início de teclado, leitor de tela, foco, erro, carregamento, vazio, densidade e zoom.
4. **Revisar:** usar `web-design-guidelines` sobre arquivos de UI alterados, buscar diretrizes atualizadas da fonte indicada pela skill antes da revisão e registrar achados por arquivo/linha.
5. **Verificar:** revisão **proporcional** à mudança (texto, componente ou fluxo), com tamanhos de tela/estados afetados, testes pertinentes, capturas quando necessário e evidência de SHA/resultado/limites. Axe não substitui inspeção manual nem comprova WCAG integral.

**Skills e instalação híbrida:** consulte [SKILLS.md](SKILLS.md) para origem, licença, versão, hashes e execução. `ui-ux-pro-max` está versionada com catálogos e scripts; `web-design-guidelines` continua por instalação local ou consulta à fonte, pois não foi comprovada licença de redistribuição da coleção. Preservar instalações pessoais e `skills-lock.json` de outros checkouts, sem alegar revisão não executada.

---

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

As capturas e os relatórios de cada execução são gerados localmente; as provas selecionadas desta entrega estão em [VALIDACAO.md](VALIDACAO.md).

## Origem e adaptações

O [ZIP r6 original](referencias/pagina-estatisticas-react-r6.zip) foi preservado byte a byte. SHA256: `3ad8e05c9244dda6b879363a26b11f9e743e9356208573a8ad20440439709878`. As instruções internas foram tratadas como referência técnica, sem substituir o pedido do responsável.

A cópia extraída contém as fontes necessárias à reprodução, o arquivo legado de fixtures usado pelo gerador, licenças e a referência de componentes. Os scripts de build/tipagem/verificação foram ajustados para caminhos portáveis e dependências do repositório. As fontes próprias foram formatadas; os seis arquivos em `upstream/` continuam intactos. A interface de estatísticas recebeu apenas a revisão de hierarquia descrita acima, preservando o comportamento r6. O pacote original também preserva sua documentação e capturas históricas.

Em estatísticas, `react-prototype/prepare.cjs` regenera os adaptadores a partir de `upstream/` e das fixtures legadas. Caso esses componentes sejam alterados, atualize o gerador correspondente e formate o resultado. O build normal usa os adaptadores já versionados.

Consulte [os padrões permanentes](PADROES.md) e [o contrato de integração](INTEGRACAO.md) antes de implementar.
