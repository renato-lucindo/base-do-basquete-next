# Classificação pública — evidências por unidade

## P1 — fonte fechada e cálculo, 24/10/2026

Branch codex/classificacao-publica, base58b6f0c; plano/decisão013 em19ebf41. Implementação pura em src/regulation/public-contract.ts e public.ts; nenhuma rota, migration, exposição de dados ou deploy novo.

Fonte já confirmada é precondição do cálculo, não autorização do browser. O contrato exige exatamente inscrições selecionadas e jogos atribuídos, disputa/oponentes coerentes, efeitos no conjunto, versões e agenda válidas. Objetos fechados recusam sexo, nascimento completo, ator, motivo, histórico e flags de rascunho. Não retornar regulation_context privado.

O adaptador reutiliza o domínio existente. A exigência interna de motivo recebe uma constante neutra apenas na memória; a projeção final é construída campo a campo, excluindo jogos internos com decisões completas. O DTO valida referências de fases/grupos/séries, cobertura sem duplicação, versões de linhagem, contexto e resultados. Map/Set evitam buscas repetidas por jogo nessa fronteira. Resultado desconhecido não vira zero; efeito sem placar mantém score null, sem estatística individual fabricada. Estado provisional, sem confirmação de colocação/honraria.

RED inicial: public.test.ts falhou por public-contract ausente. Primeira implementação recusou corretamente projection.games interno; corrigida a seleção explícita, sem afrouxar strict. version.min(0) preservava min1; substituído por intervalo0–2147483647 próprio. Novos testes mostraram falta de conferência da linhagem/cobertura/referência no DTO, acrescentada antes de GREEN. Duas expectativas corrigidas após ler o núcleo: inverter mandos da mesma dupla é válido, então o conflito passou a trocar um adversário; empate com resultados usa posição compartilhada1/tied, bloqueando classificação sem inventar posição exclusiva.

GREEN final: **17 novos cenários e52 focais de composição em5arquivos PASS**. Cinco formatos de série, grupo→semifinais→final/perdedores, correçãoG4/conflitos preservando jogos, empate/cobertura parcial, W.O.sem placar, desistência/resultados novos, fonte/efeitos alheios recusados, campos privados e DTO adulterado. Cenário sintético com1000inscrições/10000jogos preserva cobertura/linhagem e recusa jogo adicional. Prova funcional local em Node, não carga/edge/latência/SLA.

Log ignorado .preview-artifacts/public-standings-p1-focal.log, SHA256 **b32c1661a9d5189730c95affdedfbae43258068395f3027d1e60e496ee0196ef**. Tipos app/Worker, ESLint focal e Prettier PASS; segredos457arquivos PASS antes da documentação. PreviewO4/CI40152251192 mantêm evidências para artefatos inalterados. Sem gate completo/CI/deploy deP1; consolidar quando a vertical tiver integração estável.

## Pendências explícitas

O responsável informou que não consegue fazer testes/verificações manuais hoje. Avaliação humana de regulamento/decisões/desistência/G4 e pilotoHTTPStorage continuam pendentes; não repetir solicitações hoje. A mesma resposta veio para a pergunta sobre publicar agenda/inscritos futuros, sem definir a regra: **elegibilidade pública continua sem resposta**. Não atribuir aceite nem expor esses dados. P2 escritor/leitorSQL eP3 dependem dessa definição; P1 não publica nada.

Sem revisão independente, corrida PostgreSQL multi-conexão, carga real ou WCAG completa comprovadas. Etapas4/5 abertas; trabalho independente autorizado pode avançar preservando preview/evidências.
