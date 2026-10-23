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
