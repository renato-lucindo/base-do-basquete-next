# Padrões de UI/UX — Interface administrativa

Complementa [`PADROES.md`](PADROES.md) (padrões comuns) e [`ADMIN.md`](ADMIN.md) (percursos e aceite). Leia também [`README.md`](README.md) para o fluxo de agentes e a hierarquia de decisões.

Este documento cobre: seleção de componentes, fluxos CRUD, formulários, tabelas, filtros, combobox, modais, feedback, estados de erro, preservação de contexto e densidade de informação na área administrativa.

---

## 1. Princípio geral: percurso antes da tela

Antes de projetar qualquer tela ou componente administrativo, especifique:

```
entrada → edição → validação → confirmação/feedback → retorno
```

Inclua cancelamento, erro, falha de salvamento e conflito de versão. Só então escolha componentes. Não adapte o percurso ao componente; adapte o componente ao percurso.

---

## 2. Formulários

### Composição e largura

- Campos essenciais **sempre visíveis**; não ocultar atrás de acordeão sem ganho concreto de legibilidade.
- Larguras proporcionais ao conteúdo esperado: nome ocupa mais espaço que altura, camisa ou ano.
- Campos curtos (altura, peso, camisa, ano) ficam em linha com outros campos curtos — não em linha inteira.
- Grade em duas colunas quando houver simetria natural (nome e sigla, nome e e-mail, data e local).
- Rótulos persistentes acima do campo; nunca somente placeholder.
- Erro associado ao campo afetado, não apenas no topo do formulário.

### Campos opcionais

- Identificar claramente com "(opcional)" ou equivalente em português.
- Expandir detalhes secundários somente quando reduzir a carga cognitiva inicial for demonstrável.
- Nunca obrigar múltiplas etapas para dados que caberiam em uma página.

### Salvamento parcial e falha

- Mostrar estado: salvando / salvo / erro — sem transformar cada gravação em um diálogo de confirmação.
- Falha parcial em lote: indicar quais itens falharam, manter os bem-sucedidos e permitir nova tentativa seletiva.
- Conflito de versão: exigir recarga explícita antes de sobrescrever; nunca silenciosa.
- Sair com edição pendente: avisar e oferecer salvar, descartar ou cancelar.

---

## 3. Tabelas administrativas

### Estrutura e densidade

- Identificação (nome, número, sigla) é a coluna prioritária; sempre visível, não truncada em desktop.
- Cabeçalhos curtos; não repetir contexto já visível no breadcrumb ou título de página.
- Alinhamento consistente: texto à esquerda, números à direita, status centralizado quando ícone.
- Ordenação por coluna com indicador visual (seta); apenas a coluna ativa exibe a seta.
- Aproveitar a largura disponível no desktop — sem espaços brancos excessivos.

### Filtros e busca

- Filtros e busca próximos dos dados, não no topo remoto da página.
- Busca com pesquisa incremental; não exigir Enter para iniciar a filtragem quando o resultado é instantâneo.
- Estado vazio com mensagem útil ("Nenhuma equipe encontrada para 'Fênix'") e ação de limpar filtro.
- Filtros múltiplos: exibir quais estão ativos; permitir remover individualmente.
- Preservar filtros e posição na lista ao retornar de um detalhe (via URL quando sem dados privados).

### Ações na tabela

- Ações frequentes (editar, ver elenco, publicar) visíveis e focáveis na linha, sem depender de hover.
- Ações destrutivas (excluir, arquivar) com confirmação contextual; não esconder em menu de três pontos quando forem frequentes.
- Ação de lote (selecionar todos, exportar): toolbar secundária aparece ao selecionar, não ocupa espaço fixo.

---

## 4. Combobox e seleção pesquisável

Usar combobox/autocomplete pesquisável sempre que o catálogo tiver mais de ~10 itens.

| Situação | Comportamento |
| --- | --- |
| Abrir sem digitar | Não exibir catálogo completo; mostrar campo de busca com placeholder |
| Iniciar busca | Mínimo 2 caracteres para iniciar consulta (ou imediatamente se local) |
| Estado vazio | "Nenhum resultado para 'X'" com opção de criar novo quando aplicável |
| Seleção | Nome completo no campo; estado visualmente claro (não apenas cor) |
| Limpar | Botão de limpar visível e focável quando há seleção; não apagar automaticamente a seleção com `Escape` |
| Teclado | Setas navegam; `Enter` seleciona; com a lista aberta, `Escape` fecha sem alterar a seleção e mantém o foco no campo |
| Múltipla seleção | Tags removíveis; limite de altura da lista; scroll interno |
| Criar novo | "Criar 'X'" como última opção; abre diálogo sem perder a seleção parcial |

**Nunca** listar o catálogo inteiro ao abrir. **Nunca** usar `<select>` nativo para listas longas com busca.

---

## 5. Diálogos (modais) e painéis

### Quando usar diálogo

- Formulário de criação/edição que caiba em uma tela sem rolagem excessiva.
- Confirmação de ação destrutiva ou irreversível com consequências explicadas.
- Seleção contextual (adicionar atleta, criar local) quando o fluxo retorna imediatamente ao ponto de origem.

### Quando não usar diálogo

- Formulário extenso com muitos campos ou anexos — preferir página dedicada.
- Fluxo multietapa complexo — preferir wizard em página própria.
- Exibição somente leitura de dados — preferir expansão inline ou página.

### Comportamento obrigatório

- **Foco inicial:** primeiro campo interativo ou botão de ação principal ao abrir.
- **Fechar:** `Escape`, botão "Cancelar" e clique no overlay quando não há edição pendente.
- **Retorno de foco:** ao fechar, foco volta ao elemento que abriu o diálogo.
- **Rolagem:** se o conteúdo não couber, rolagem interna ao diálogo — nunca a página inteira rola.
- **Ações:** sempre visíveis na parte inferior, sem rolar para encontrá-las.
- **Fundo:** inerte durante o diálogo (não focável, não rolável pela tecla Tab).

### Tamanho e título

- Título curto e descritivo: "Adicionar atleta", "Editar local", "Confirmar exclusão".
- Largura proporcional ao conteúdo: pequeno para confirmação, médio para formulários simples.
- Não maximizar diálogos para exibir tabelas; use painel lateral ou página.

---

## 6. Feedback e estados

### Salvamento

| Estado | Apresentação |
| --- | --- |
| Salvando | Indicador discreto (spinner no botão ou barra de progresso) |
| Salvo | Mensagem breve ou checkmark; desaparece após ~2 s sem ação do usuário |
| Erro de validação | No campo afetado + resumo no topo do formulário quando múltiplos |
| Erro de rede/servidor | Banner persistente com opção de nova tentativa; descreve o que falhou |
| Conflito de versão | Aviso persistente; exige recarga explícita antes de prosseguir |

### Toast (notificações complementares)

- Usar somente para confirmações secundárias ("Localidade salva") — nunca para erros que exigem ação.
- Posição consistente (geralmente canto inferior direito ou topo centralizado).
- Auto-dispensar após ~4 s; fornecer botão de fechar manualmente.
- Não bloquear conteúdo; não empilhar mais de 3 toasts simultaneamente.
- Erros persistentes **não** são toasts — ficam no contexto da ação ou em banner.

### Estados da página

Toda lista ou área de dados deve cobrir:

- **Carregando:** skeleton ou spinner discreto; não bloquear a navegação.
- **Vazio:** mensagem útil e ação primária ("Nenhum jogo cadastrado. [Criar jogo]").
- **Erro de carregamento:** mensagem + botão de recarregar; não exibir tela em branco.
- **Parcialmente disponível:** mostrar o que carregou; indicar o que falhou.

---

## 7. Identificação de contexto

O usuário deve sempre saber **onde está** e **o que está editando**:

- Breadcrumb ou identificação do contexto (campeonato / edição / disputa / equipe) visível, não só no título.
- Ao abrir um diálogo ou painel de edição, o título identifica o item sendo editado ("Editar Atlas Basketball").
- Preservar filtros e posição da lista ao retornar de diálogos.
- Ao mudar de disputa ou equipe, confirmar o novo contexto explicitamente — nunca inferir silenciosamente.

---

## 8. Densidade de informação

### Desktop (1366×768 e 1920×1080)

- Aproveitar a largura; reduzir rolagem vertical.
- Definir a meta de linhas visíveis conforme a tela e o conteúdo. Como referência em listas simples, buscar 12+ linhas quando couberem com legibilidade; em elencos, buscar 6+ atletas. Não impor essas metas a todas as tabelas ou sacrificar ações, contexto e acessibilidade.
- Evitar cards grandes para listagens; preferir tabelas densas com hierarquia tipográfica.
- Ações secundárias em menu contextual da linha, não em colunas fixas de ícones.

### Compactar sem sacrificar

- **Nunca** reduzir fonte de células a ponto de impedir leitura.
- **Nunca** esconder erros, contexto obrigatório ou ações frequentes em favor de espaço.
- **Nunca** impor altura fixa que trunque texto dinâmico.
- Preferir hierarquia por proximidade, tamanho, peso e contraste ao invés de separadores excessivos.

---

## 9. Preservação de estado

| Situação | Comportamento esperado |
| --- | --- |
| Retornar ao formulário após erro | Manter todos os valores preenchidos |
| Navegar de um diálogo para outro | Preservar os dados do diálogo de origem ao retornar |
| Recarregar a página | Rascunhos salvos devem ser recuperados; estado não salvo é perdido com aviso |
| Troca de equipe/disputa | Confirmar descarte de edição pendente antes de trocar |
| Filtros e ordenação | Preservar em URL quando não expõem dados privados |
| Desfazer/refazer | Disponível nas operações da súmula; escopo e limites documentados |

---

## 10. Referências de Skills

As skills `ui-ux-pro-max` e `web-design-guidelines` fornecem recomendações técnicas. Elas **não substituem**:

- A identidade visual do projeto (azul `#075FCA`, tema claro, tipografia Inter)
- As decisões aprovadas do responsável
- Os contratos de domínio e regras de negócio

Use as skills para pesquisar padrões de componentes, acessibilidade e hierarquia. Verifique pertinência antes de adotar. Registre versão/origem consultada e limite das recomendações — veja [`SKILLS.md`](SKILLS.md).

---

## Veja também

- [`PADROES.md`](PADROES.md): padrões comuns a ambas as áreas
- [`ADMIN.md`](ADMIN.md): percurso, aceite proporcional e tabela de componentes
- [`INTEGRACAO.md`](INTEGRACAO.md): comportamento específico de súmula e estatísticas
- [`SKILLS.md`](SKILLS.md): origem e uso das skills de UI/UX
