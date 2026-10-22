# 001 — protótipo local antes da fundação

Estado: adotada para o marco 1; composição visual ainda aguarda responsável.

Contexto: o pacote determina protótipo fictício anterior a banco/autenticação/integração. O workspace só continha o ZIP, sem Git. Framework e diretórios são decisões reversíveis do implementador.

Decisão: React/TypeScript estrito com Vite para o protótipo, usando as versões de React e Zod do harness e dependências de desenvolvimento fixadas em lockfile. Um adaptador local identificado como simulação demonstra rascunhos, versões e resultados de lote. Reutilizar o motor puro de súmula, preservando sua origem; manter pacote íntegro. Criar repositório GitHub privado novo, `base-do-basquete-next`, e branch `feat/prototipos-fluxos`. Sem deploy público nem criação de banco nesta etapa.

Consequências: a apresentação é executável e avaliável sem serviços pagos. Login, extração real de PDFs, publicação transacional, segurança, RLS e integração Cloudflare/Supabase continuam pendentes das etapas 2–4. O armazenamento local não é uma implementação de servidor nem prova de integração. A arquitetura definitiva continua o monólito modular full-stack definido no pacote; Vite é a ferramenta desta apresentação e não impõe o framework de servidor.
