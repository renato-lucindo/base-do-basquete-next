# Evidências PDF/fontes — G3

## Extração G3a

Source2840db5: parsers/types do ZIP preservados como referência e cópias locais com formatação; unpdf1.8.1. Quatro fixtures renderizadas/inspecionadas (FIBA1p×3;Site2p), extraídas e reconciliadas. Sete focais de extração/limites PASS;135 unitários/29arquivos e9 workerd da aplicação PASS após Zod4.6.7. Prova real local workerd/SQLiteDO extrai4 PDFs sem rede externa PASS; não é prova de plano/CPU remoto/Storage HTTP.

Adaptador lê texto em stream por página, limita10MiB/4páginas/20.000itens/250.000caracteres e fecha reader/loadingTask em falha. Site mantém totais sem criar quartos/indicadores ausentes. npm audit inicial identificou advisory Zod; atualização pontual4.6.7, auditoria zerada; ZIP/harness inalterados. Gate inclui test:pdf-runtime para a unidade vertical estável futura.

## Fonte privada G3b1

Migration **20261023233646_pdf_sources** aplicada apenas em nizmasjddyrhmevvfviz, após RED dos contratos e preflight de Storage vazio/colunas/grants/triggers. CLI gerou233223, reconciliada com histórico real233646. Bucket novo boxscore-sources privado,10MiB/PDF, zero objetos. Metadados imutáveis por API, prepared/ready, hash único com duplicidade explícita, receipts de preparar/finalizar, autorização fresca antes de replay. INSERT apenas em caminho gerado de intenção pendente; UPDATE/DELETE do bucket negados, inclusive sob políticas permissivas futuras. Não alterar grants/buckets/políticas alheias nem contornar protect_delete da plataforma.

Três testesTS de contrato/cruzamento PASS (dois contratos +um cruzamento com os quatro arquivos reais), nove cenários PostgreSQL de criação/upgrade/políticas PASS. Validador SQL aceita os quatro resultados reais e rejeita soma/contagens/períodos inconsistentes. Contrato **pdf_sources.sql real Supabase com rollback PASS**: roles/RLS/grants, fluxo pendente→metadados recebidos→ready, retry/duplicidade/intenção divergente, ator revogado, caminho isolado e original protegido. O teste usa SOMENTE metadados de objeto temporários em rollback; não afirma upload de bytes no serviço Storage. Prova HTTP/binary ficará na integração do provider/endpoint e no smoke remoto.

Tipos gerados/typecheck/lint/formatação/segredos focais PASS. Advisor apenas aviso conhecido de senha vazada/Pro; nenhum novo aviso de RLS. Contagens pós-rollback: fontes/recibosPDF/objetos0,pessoas1,inscrições2,revisões6,Auth1. Sem gate consolidado G3/API/UI/upload humano/fixture persistida. Revisão durável e matching ainda pendentes, publicação/correções/fonte autoritativa emG4.

## Estado da entrega

Cloudflare OAuth requer reconexão humana já solicitada; preview segue importador22529ea, Access/cofre/namespace preservados. G2CI40039451161/job120706809738 SUCCESS no sourceb316394, com gate e browsers Linux. G3 não publicado e sem CI nova até estabilizar unidade vertical. Sem revisão independente, carga, concorrência real multi-conexão ou auditoria WCAG completa comprovadas.

## Revisão durável G3b2

Migration20261023234404_pdf_reviews aplicada/reconciliada no projeto novo após RED; CLI gerou234220 e histórico real234404. Documento por fonte pronta, versão/receipt próprios e destino alterável sem reupload; sourceSide/index define a linha de origem e UUID define vínculo/pessoa. Mapeamento revalida inscrição, naipe, atividade/histórico e identidade; inversão de lados é decisão explícita. Listagem retoma no contexto atual da revisão, conservando origem/hash do arquivo. Reader projeta versão0 inicial sem criar entidades. Contexto do jogo/naipe é protegido enquanto referenciado; não há publicação implícita.

Dez cenários PostgreSQL criação/upgrade/políticas PASS. Contrato **pdf_review.sql real Supabase com rollback PASS**, incluindo retarget para outro campeonato, replay/conflito, ator revogado, função de leitura sem escrita, vínculo/equipe/naipe e arquivo/hash inalterados. Tipos gerados/typecheck PASS. Guardas usam locks de recurso→raízes ordenadas→jogo, e leem naipe após adquirir roots. Isto não equivale a corrida real multi-conexão. Camisa duplicada por lado barrada também no DTO após RED→GREEN.

Pós-rollback: jogos/fontes/revisõesPDF/recibosPDF/objetos0; pessoas1,inscrições2,revisõesTexto6,Auth1 preservados. Advisor só WARN conhecido senha vazada/Pro. Nenhum arquivo humano ou byte de Storage foi criado pelos testes SQL. Transporte HTTP/binary, matching/UI de PDFs e publicaçãoG4 ainda pendentes.

Gate consolidado da fundação G3 PASS:138 unitários/31arquivos,5 transportes,10 cenários PostgreSQL,9 workerd da aplicação e1 prova workerd/DO com4PDFs, tipos/lint/formatação/builds/fronteira/segredos. CI será disparada pelo commit estável, ainda sem resultado correspondente. Primeiro início parou no lint de bundle local gerado em caminho antigo, sem executar suítes. Limpeza desse bundle foi rejeitada automaticamente; arquivos preservados e exclusão consistente de .preview-artifacts adicionada a ESLint/Prettier, sem ocultar código-fonte.

Provider de leitura em b9ee7f13d1de24d824bbbb6505e36783211f615b (WIP sem rotas):2 testes RED→GREEN para RPCs fixos, schemas/erros sanitizados e headers de servidor; types/lint/format/segredos focais PASS. Gate138 refere-se à fundação3edcc11; CI40041674631 em andamento ao checkpoint de cota. Nenhum novo deploy/smoke remoto.

## Reconciliação 24/10/2026

CI40041674631/job120713952602 SUCCESS em3edcc11 (gate/browsersLinux). Cloudflare reconectado; preview source1161f1a contém G1/G2 e dependênciaZod corrigida, G3 permanece sem rotas/UI. Smoke/segurança da entrega em VALIDACAO-JOGOS; não afirma upload HTTP dePDFs. Próximo G3c provider/transporte autorizado.

## Transporte G3c — 24/10/2026

Provider fixed RPCs prepare/finish/list/saveReview, schemas e ACK/contexto correlacionados, conflitos explícitos e mensagens sanitizadas. Quatro novos provider RED→GREEN (seis no total). Quatro focais Storage verificam bytes/hash/MIME/tamanho, caminho gerado, nega overwrite, dupes atuais/legadas e cancelamento de stream. Três focais de leitura binária provam limite sem Content-Length e preservação dos bytes. Request transferido ao DO por RPC; runAuthorized executa antes de ler corpo/extrair, conforme [RPC Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/rpc/). Endpoints específicos /api/pdf-sources e /:id/review; até10MiB/4p, contexto/origem/query estritos, revisão16KiB.

Dois cenários workerd/SQLiteDO da aplicação RED→GREEN: extração real do Site/autorização, intention-before-blob, falha depois de upload, retry do mesmo comando com Duplicate→GET/hash antes de finish, metadados/revisão retomados; input/origem/limite/revogação negados. Fornecedor de Auth/Data API/Storage controlado pelo teste; não é prova HTTP de bytes no serviço real. SQL e políticas reais anteriores inalterados reutilizados. Nenhum upload real/DDL/dado humano modificado. Os formatos Storage foram conferidos em [uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads) e [erros](https://supabase.com/docs/guides/storage/debugging/error-codes); changelog inspecionado, TLS moderno do Worker sem ajuste legado.

Gate PASS151unitários/34arquivos,5transportes,10PostgreSQL,11workerd e1prova4PDFs; tipos/lint/formatação/builds/fronteira/segredos. Harness126 imutável reutilizado localmente. Ainda sem UI/matching, integração Storage real ou G4 publicação. Preview atual1161f1a permanece G1/G2, este gate não equivale a deploy da API.

## Sugestões por vínculo G3d1

matching-reference.ts é cópia apenas formatada do módulo fornecido. Adaptador UUID usa slots locais e devolve IDs completos; não seleciona/funde identidades. Três focais RED→GREEN PASS: abreviação única, homônimos,0/00,equipe/disputa/vínculo inativo e paginação incompleta sem afirmar exatidão. Types/lint/segredos focais PASS; banco/HTTP inalterados e gate151 anterior reutilizado. UI ainda não conectada; nenhuma promessa de matching automático global.

## Revisão contextual G3d — 24/10/2026

UI Jogos→Importar PDFs, Blob original com cookies de mesma origem (RED→GREEN), lote com estado/erro individual e retry da mesma intenção. Duplicidade entre destinos oferece retomada explícita do documento já existente. Fontes/revisões privadas retomadas; destino por documento/outra competição muda sem reupload e limpa associações incompatíveis. GamesWorkspace/MembersWorkspace reutilizados como auxiliares com guarda/foco/documento preservados. UUID completo, sugestões não automáticas, 0/00, elenco/paginação/histórico. Site apresenta ausência real de quartos/marcadores; não inventa DNP de minuto zero. Cache de navegação no history apenas IDs/filtros/contextos; notas, fatos, bytes e tokens não são persistidos no browser.

20 cenários PDF desktop/mobile PASS e58 regressões da composição C1–C4/G1/G2 PASS (78 no total). Bugs de carregamento preso ao cancelar busca de elenco, filtro perdido após reload e duplicado fora do filtro reproduzidos antes de correções focais. Capturas320/top/bottom inspecionadas sem corte; grade responsiva de atletas em desktop. Gate consolidado PASS155unitários/35arquivos,5transportes,10PostgreSQL,11workerd,1prova4PDFs e checks estáticos/build/segredos. SQL real/migrations e harness126 inalterados reutilizados. Sem prova de revisão independente/carga/WCAG completa.

CI transporte40060415546/job120772483885 SUCCESS no source66e4af7. UI será conferida em novaCI antes de deploy. Preview1161f1a ainda G1/G2, sem API/UI PDFs; smokescript ampliado com3GETs privadosPDF. Nenhum upload real/DDL/dado humano alterado. Piloto Storage HTTP autenticado continua pendente; não extrapolar prova de mocks outbound/metadados SQL. G4 confirmar/publicar/corrigir permanece pendente, UI não oferece controles falsos de publicação.

## Publicação do preview G3

Source **f2d634bbef005fed9daf91989e168b4bdbb9d916**, CI40061809309/job120776741403 SUCCESS. Deployment964bfe43-d5e5-4460-b1f6-b856e1bfce24, versão2d67e166-e560-4468-9b99-7f32cfb4cbc5,100%,24/10/2026 04:22:45UTC. Smoke remoto PASS3arquivos/hash/source,21GETs privados incluindo3PDF,health,Auth inválido semcookieapp,backend404 e2browsers. Token7f93ab81-efa8-4e8a-a73b-37ca9f7459ea/política617bcbac-8273-4fcd-973b-b6cfeae95096 revogados; Access só responsável,previewsOFF,anônimo302 semsource. Cofre/namespace preservados.

SHA256: Worker2c21af37e024c3e97d62659c887d20bc23333e28883a6ebb1ba241d438bb670e; HTML3fe4fba87f92fbfad162555e9bb0deaed2b47fc714a36692e8b4b7ca0fc6fb85; JSfoundation-25sEsgs3.js4fccc3c425eb268311406c536532f3672646ce8d2a3ffac3b58e0cad4c85fb0a; CSSfoundation-CHm98BJF.csse1b4d477c9afa26c1b3f0d39e6e0524f497f4acb257bad46769b2e8bcb772bf2. Manifesto local ignorado .worker-artifacts/foundation-manifest.json.

Piloto StorageHTTP autenticado/avaliação humana solicitados e pendentes. O smoke não envia arquivo nem usa a senha real; não alegar operação administrativa do owner comprovada. G4 ainda não implementado. Gate/smoke desta versão podem ser reutilizados se os artefatos permanecerem inalterados.
