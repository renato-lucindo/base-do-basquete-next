# 001 — protótipo local antes da fundação

**Vigência (01/11/2026):** decisão preservada para o protótipo fictício. A exclusividade desta etapa foi superada pela fundação dos ADRs [003](003-autorizacao-e-migrations.md)/[004](004-sessao-no-servidor.md) e pelo GitHub Flow de CONTRIBUTING. As pendências e a criação de repositório/branch abaixo são contexto histórico, não próximos passos atuais.

Estado: adotada para o marco 1; composição visual ainda aguarda responsável.

Contexto: o pacote determina protótipo fictício anterior a banco/autenticação/integração. O workspace só continha o ZIP, sem Git. Framework e diretórios são decisões reversíveis do implementador.

Decisão: React/TypeScript estrito com Vite para o protótipo, usando as versões de React e Zod do harness e dependências de desenvolvimento fixadas em lockfile. Um adaptador local identificado como simulação demonstra rascunhos, versões e resultados de lote. Reutilizar o motor puro de súmula, preservando sua origem; manter pacote íntegro. Criar repositório GitHub privado novo, `base-do-basquete-next`, e branch `feat/prototipos-fluxos`. Sem deploy público nem criação de banco nesta etapa.

Consequências: a apresentação é executável e avaliável sem serviços pagos. Login, extração real de PDFs, publicação transacional, segurança, RLS e integração Cloudflare/Supabase continuam pendentes das etapas 2–4. O armazenamento local não é uma implementação de servidor nem prova de integração. A arquitetura definitiva continua o monólito modular full-stack definido no pacote; Vite é a ferramenta desta apresentação e não impõe o framework de servidor.
