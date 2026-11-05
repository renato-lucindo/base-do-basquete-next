# Verificação proporcional

Decisão do responsável em05/11/2026: otimizar verificações de alterações simples sem retirar a CI obrigatória do SHA integrado. Implementação em `scripts/ci-plan.mjs`, `.github/workflows/ci.yml` e testes `tests/ci-plan.test.mjs`.

## Matriz

| Alteração real                                                                                                                                     | PR                                                                                                                           | Push na main       |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Somente Markdown/capturas nos caminhos documentais, README, AGENTS, CONTRIBUTING ou template da PR                                                 | Formato, scanner e regressão do scanner/política                                                                             | Mesmo recorte leve |
| Somente arquivos de apresentação explicitamente mapeados de Estatísticas, Equipes e navegação pública                                              | Lint, formato, tipos, builds público/admin, fronteira cliente, segredos e browsers dos consumidores; WebKit quando aplicável | Regressão completa |
| Cálculos, contratos, rotas, banco, segurança, configuração, dependências, scripts, testes fora das telas alteradas ou qualquer caminho não mapeado | Gate, design e browsers completos                                                                                            | Regressão completa |
| Diff vazio, base inválida/ausente ou execução manual                                                                                               | Regressão completa                                                                                                           | Regressão completa |

O seletor reduz somente uma lista conhecida, não presume que todo `.tsx` ou CSS é seguro. Mudanças combinadas herdam o escopo mais abrangente. Renomeações são lidas como remoção + adição. Uma tooltip em componente compartilhado inclui os browsers dos consumidores, inclusive Equipes e perfil. Adicionar uma área à lista exige mapear consumidores, testar a seleção e revisar o seletor; enquanto isso permanece completa.

Testes de navegador das telas mapeadas podem acompanhar a mudança de apresentação no mesmo recorte: continuam sendo executados integralmente nessas suítes. Mudança somente em testes, fixtures compartilhadas, testes fora dos consumidores mapeados ou remoção de uma suíte exige regressão completa.

`npm run gate:ui` é o comando local para apresentação mapeada. `npm run gate` continua disponível e obrigatório nos demais casos. `npm run test:ci` verifica classificação, fallback e agregação. Não é preciso repetir provas locais de artefatos materialmente idênticos por checkpoint, sessão ou documentação.

## Organização da execução

- `scope` identifica e publica o plano; testa a política antes de selecionar os jobs.
- `checks` roda documentação, apresentação ou o gate completo.
- `browsers` executa todos os cenários desktop/mobile escolhidos. Na regressão completa, dois shards disjuntos executam a coleção inteira; em apresentação, um shard executa as suítes afetadas.
- `design` valida os protótipos na regressão completa. Não é repetido por uma mudança isolada na apresentação real.
- `webkit-boundaries` conserva os cenários de WebKit/macOS quando a área afetada exige ou quando a regressão é completa.
- `validate` sempre executa após os anteriores e exige sucesso de cada job necessário; só aceita `skipped` nos jobs dispensados pelo plano. Falhas, cancelamentos e skips inesperados bloqueiam a aprovação.

Gate, design e browsers agora usam runners separados. Não se aumentou o limite de30min nem os timeouts de testes; não há novos retries ou skips de cenários. A divisão reduz o tempo de parede, mas pode aumentar minutos de runner na regressão completa. Não há promessa de tempo fixo: filas e downloads continuam externos. Instalação das dependências de sistema é preservada; não se confia em um cache de binários para substituir bibliotecas do sistema.

## Problema observado e limites

Na PR59, tentativa1 da CI42071357279, o job sequencial excedeu30min: instalação de Chromium/dependências levou10min14s, com retries e downloads lentos do mirror Ubuntu, depois de gate aprovado. Browsers foram interrompidos, sem resultado final. Esse cancelamento não equivale a aprovação nem prova um defeito na aplicação. A tentativa do job foi repetida sem alterações de produto ou limites.

Esta unidade altera somente ferramentas de validação e documentação. Não altera proteções da branch, testes de produto, permissões do workflow, API, cálculos, banco, Access, preview ou deploy. A PR de otimização exige regressão completa por modificar o próprio workflow; sua CI e a CI integrada devem ser conferidas antes de declarar conclusão. A PR59 e seu preview permanecem uma entrega separada, sem dependência empilhada.

Referências: [dependências e jobs agregadores](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-jobs), [sharding do Playwright](https://playwright.dev/docs/test-sharding), [CI e dependências dos browsers](https://playwright.dev/docs/ci).

## Evidências desta unidade

- Política e agregação: RED → GREEN; versão final11 testes PASS, incluindo CLI com diff Git real e rejeição de jobs cancelados/ausentes.
- Actionlint1.7.12 oficial, download conferido pelo SHA256 publicado: workflow PASS; YAML parseado sem erro.
- Enumeração do Playwright nesta base85ae37e:738 cenários; shards369 +369, união idêntica à coleção e interseção vazia. Isso comprova seleção, não execução dos browsers. Runner focal também enumerado com sucesso.
- Gate local exit0:704 unitários/146 arquivos, transporte11, banco isolado13, Worker/HTTP30 e PDF1, além de lint/formato/tipos/build/fronteira/segredos. Após os últimos ajustes de seleção e documentação, política11PASS e lint/formato/segredos/diff focais PASS; não se repetiram as suítes de domínio inalteradas. Logs locais ignorados em `.preview-artifacts/ci-gate.log`, `ci-policy-final.log` e `shard-proof.json`.
- Revisão do autor; sem parecer independente declarado. CI da PR e do merge ainda pendentes no momento desta redação; consultar os checks reais. Sem deploy.
