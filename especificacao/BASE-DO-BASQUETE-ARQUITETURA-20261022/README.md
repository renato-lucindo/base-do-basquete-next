# Base do Basquete

Especificação de produto e insumos de domínio para construção de uma aplicação web. Edição de 22/10/2026. O pacote não é uma aplicação pronta.

## Como começar

Leia este README e docs/ESCOPO.md. Para a primeira entrega, consulte docs/EXPERIENCIA.md e construa os três percursos de protótipo definidos ali. A arquitetura é descrita em docs/ARQUITETURA.md; leia a seção do domínio em docs/CONTRATOS.md ao trabalhar nele. A ordem de implementação e os critérios de conclusão estão em docs/VALIDACAO.md.

| Documento | Responsabilidade |
| --- | --- |
| docs/ESCOPO.md | Requisitos, vocabulário e limites do produto |
| docs/EXPERIENCIA.md | Fluxos, preferências visuais e avaliação do protótipo |
| docs/ARQUITETURA.md | Módulos, dependências, segurança e especificação lógica do banco novo |
| docs/CONTRATOS.md | Fórmulas, formatos de entrada, regras esportivas e interfaces dos módulos |
| docs/VALIDACAO.md | Entregas, cenários de aceite, testes e publicação |

Cada assunto tem uma fonte de definição. O escopo define o produto; os demais documentos o detalham. Código e exemplos são insumos verificáveis e não substituem os requisitos. Uma decisão posterior do responsável deve atualizar o documento pertinente.

## Infraestrutura e arquitetura

Repositório novo, monólito modular full-stack em TypeScript estrito e Cloudflare Workers. Criar um projeto Supabase independente, com banco e Storage inicialmente vazios. Não há migração de cadastros, resultados ou PDFs de produção. Os quatro PDFs incluídos são fixtures obrigatórias dos parsers. Nenhum acesso a outro repositório é necessário.

Arquitetura organiza responsabilidades e dependências. O implementador escolhe framework e organização física compatíveis com os princípios descritos; o diretório modulos/ não é um scaffold obrigatório.

## Insumos e verificação

modulos/source/ contém cálculos, parsers, matching, motor da súmula, componentes selecionados e testes. As consultas *.server.ts e database.generated.ts descrevem interfaces de referência do harness; não são DDL nem determinam tabelas/colunas do novo banco. As fronteiras de integração estão em docs/CONTRATOS.md.

referencias/ contém exemplos sintéticos, casos estatísticos portáveis e uma amostra visual de tokens. As composições de telas e o protótipo ainda precisam de avaliação. Os quatro PDFs ficam em modulos/source/docs/plan/referencias/modelos-boxscore/.

Para conferir o conteúdo extraído: `python verificar-pacote.py`. Para executar o harness dos módulos, com Node 24 ou superior: entrar em modulos/ e executar `npm ci --ignore-scripts`, `npm test` e `npm run typecheck`. O lockfile vale para esse harness, não para todas as dependências futuras do produto.

manifesto e verificações ficam em MANIFEST.json e verificacao.json. Não há credenciais, registros de negócio ou scripts de alteração do ambiente em operação.

## Desenvolvimento no novo repositório

Use README para instalação/execução, issues para trabalho e bugs, PRs para revisão e CI para verificações. Registre decisões arquiteturais significativas em ADRs curtos quando ocorrerem; alterações rotineiras não exigem um documento adicional. A organização do desenvolvimento deve ser compreensível por uma pessoa sem ferramentas de agentes.
