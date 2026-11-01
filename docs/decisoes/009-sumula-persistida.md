# 009 — súmula persistida e identidade contextual

**Vigência (01/11/2026):** identidade, rascunho e recibos permanecem vigentes. A restrição G2 `confirm=false` e as frases que tratam confirmação/publicação como futuras foram superadas por [011](011-publicacao-por-jogo.md). Comissão e motor v2 da PR #38 ainda não substituem o contrato da main nesta base.

O motor da especificação, já exercitado no protótipo, continua responsável pelas regras da súmula. Seus identificadores numéricos são apenas chaves locais: um adaptador transforma relacionados com UUID em slots1–24 e capitão em slot da mesma equipe. Nenhum UUID é truncado/convertido em número ou confundido com identidade global. Persistência mantém UUID do vínculo, inscrição/pessoa e camisa da ocasião; nomes vêm do servidor, nunca do comando do browser.

Um documento por jogo guarda relacionados, participação/titulares explícitos, comissão e ações. Comissão referencia vínculos existentes: técnico próprio da inscrição ou capitão escolhido; assistente só com técnico próprio. Não cadastrar o capitão como comissão global por inferência. Rascunho pode ser incompleto e não publica nada; ações exigem relacionados válidos. Cinco titulares, capitão e fechamento são obrigatórios para confirmar/publicar na unidadeG4. Histórico confirmado conserva relacionados/camisas; snapshots públicos futuros não conterão dados privados.

Comandos usam requestId/baseVersion/document/confirm/reason do contrato fornecido, mais gameId/gameVersion para correlacionar agenda/contexto. A gravação G2 aceita apenas confirm=false; G4 substituirá a confirmação por uma transação explícita de publicação. Retry usa o mesmo comando, conflito exige recarga explícita; reautenticação conserva rascunho em memória. Nenhum JWT/segredo no browser ou armazenamento local de dados privados.

Banco aplica autorização fresca, RLS/grants, IDs/pais/naipe, comissão, limites e versão/idempotência; Worker revalida documento no motor antes do escritor específico. Bloquear troca de adversários depois de existir súmula evita reatribuir relacionados. Locks respeitam campeonato→jogo e não acrescentam locks de atleta depois do campeonato. Vínculos previamente salvos podem permanecer como históricos quando inativados; novo relacionado exige vínculo ativo. Regras de transferências retroativas ficam na etapa5.

Execução G2: contrato/adaptador e testes; SQL próprio e contratos reais de identidade/acesso/versão/upgrade; API específica e testes de fronteira; editor persistido e recuperação/teclado; gate quando unidade estável. Cloudflare requer reconexão humana; desenvolver G2 não autoriza alegar G1 publicada.

As regras de ações/exclusão também são verificadas no escritor SQL, para não depender exclusivamente do adaptador Worker. Testes cruzam o motor fornecido e PostgreSQL em335 sequências/casos; não equivalem a prova exaustiva ou teste de concorrência. Confirmação/fechamento/publicação continuam na unidadeG4. Naipe da disputa também fica protegido contra reatribuição depois de existir documento.

## Proveniência e prevenção de regressões

`src/domain/scoresheet.ts` deriva do motor `modulos/source/app/modules/keyboard-scoresheet/domain.ts` do pacote imutável; a cópia de testes adapta o import. Metadados de capitão/comissão/titularidade foram estendidos na cópia local, preservando fórmulas e códigos originais, conforme o [feedback preservado](../../historico/documentacao/AJUSTES-DE-EXPERIENCIA.md) e a [proveniência completa](../../historico/documentacao/analises/ORIGEM-DOS-MODULOS.md). Documentos legados são lidos sem reescrever armazenamento e sem fabricar titulares/capitão. O sufixo de `U2` indica lances livres: conta uma falta U, não duas. Referências antigas não substituem o motor e seus testes atuais.
