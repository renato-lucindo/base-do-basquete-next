# Progresso atual

Atualizado em24/11/2026. [Checkpoint anterior](../historico/progresso/2026-11-24-antes-conformidade-design.md). Histórico de reflow anterior preservado em historico/progresso/2026-11-24-antes-reflow-jogador.md.

## Unidade e resultado

- Mesma branch codex/perfis-equipes/[PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), fonte executável39fe76c2b145d1c1c06cc0c63e1fc7fd6827b1c3. Base original824a3d5; main/PR88 incorporada emd6c70e0. Sem merge autorizado. Checkout humano original e alterações preexistentes preservados; nenhuma PR empilhada.
- Plano consolidado de conformidade aceito e implementado, com [matriz anterior à edição](PLAN-CONSISTENCIA-PUBLICA.md) e [provas/limites](design/VALIDACAO-PERFIS-EQUIPES.md#conformidade-de-design--24112026). Fluxo/índice/AGENTS/modelo PR exigem classificação das decisões e consulta somente para novas lacunas/conflitos. Guia e catálogo reconciliados. Novos padrões de ano nas abas e Participação central limitados ao perfil; rótulos laterais são piloto.
- Geral e disputa: legendas em grade, confronto compartilhado com jogador, ano compacto fora tablist, modos junto da tabela, contornos, classificação à esquerda, status textual com anel e seleção por nível sobreposta. PTS após Equipe/AVG após SLD com duas casas, ordem/estabilidade das estatísticas, seleção e títulos sem redundância preservados. Sem mudanças de APIs/regras esportivas/banco.

## Verificação

- Gate completo PASS:182arquivos/857unitários; transporte/banco local/builds/Workers/fronteira/segredos PASS. Design:verify completo e catálogo Chromium/WebKit PASS. Matriz20PASS nas oito abas e seis larguras/zoom200%; navegação/perfis28PASS; regressão final jogador/axe50PASS.102casos inalterados da rodada ampliada reaproveitados; duas expectativas antigas de deslocamento corrigidas e duas falhas de artefato concorrente repetidas com saída isolada. Sem novos skips ou timeout maior.
- Timeout de conquistas reproduzido com quatro workers (856PASS/1fail, prova fria31,756s). Concorrência limitada a dois; suíte857PASS em338,33s. Prova10000/10001 e limite30s preservados. CI antiga45444517462 era **workflow_dispatch**, não push, e passou; pull_request45444529563 falhou. Não confundir resultados/eventos.
- Inspeção visual autoral de geral/Elencos/disputa e estatísticas em390/1366, nomes longos, foco/teclado/toque/vazios. Provas do catálogo não extrapoladas para consumidores; sem revisão independente ou aceite humano alegado.

## Publicação

- Fonte39fe76c ativa nos mesmos admin/preview. Admin versão86bf8a3a-2e30-4b14-b4c4-a81e9737c8d1/deployment9da50d48-736f-463e-97d2-f0bd86b2f082; preview versão4f516000-a1d0-4244-9824-da1b0db9f50f/deploymenta64b253b-eed1-4ac4-a27e-7728c9360c28,100% cada. Upload Wrangler, ativação pelo conector reconectado.
- Smoke200/header correto, APIs privadas401admin/403preview e11assets públicos iguais por SHA256. Navegador real confirma ano77,78px, Participação central, legenda grid, status14px sem borda e popover sem deslocamento. LUSB AVG1,31/15PTS preservados. URLs admin.renato-lucindo-jr.workers.dev e preview.renato-lucindo-jr.workers.dev.
- Namespace597c612fd69c447e81547f16d5dcca41/sessões/segredos preservados; preview sem Access, demais10Workers/versionURLs fechados. Sem DML/DDL/migrations, rascunhos publicados ou alterações de domínio/raiz/www. Bloqueio corporativo já confirmado, não repetir diagnóstico.

## Próximo passo

- CI45457833267 iniciou na fonte39fe76c (scopePASS, demais jobs pendentes na última leitura). Atualização final somente documental registra estas provas; conferir HEAD/run reais após push. Código publicado permanece39fe76c e suas provas não são invalidadas por documentação.
- Retomada por cota retomar-conformidade-de-design excluída na retomada manual após ferramenta real mostrar99% disponível; sem crédito/reset consumido pelo agente. Ao aguardar CI final, manter uma única checagem oficial, registrar ID/run/SHA e excluir quando terminar; não acompanhar esperando aceite.
- PR89 deve permanecer aberta para avaliação visual do Worker. Sem merge para main autorizado. Próxima ação: confirmar CI do HEAD final e corrigir falhas no mesmo escopo, se houver.
