# Equipes e inscrições — C2

Preview protegido: https://base-do-basquete-next-preview.renato-lucindo-jr.workers.dev/. Fonte `22fbf9c82aa194ab5560ec2077a5ec08d27aff4c`, publicada em 23/10/2026 09:13:26 America/Sao_Paulo (12:13:26 UTC). Deployment `3cca73ae-3307-42e5-a132-ad222e5bad60`, versão `535f1105-b1ea-452b-8754-50c79a36a142` a 100%. Servidor SHA-256 `2946a6302d1adda9be0da415d80c22fbb57d7a6ab75ee87e3c6eaa26028a6c9b`.

## Evidências

- Gate local PASS: 90 unitários/14 arquivos, cinco transportes, três cenários PostgreSQL, cinco workerd/DO, lint/formatação/tipos/builds/fronteira/segredos. Após pequeno ajuste de foco, typecheck/lint/build e regressão específica RED→GREEN aprovados.
- Seis cenários C2 em navegador desktop/celular aprovados: equipe global com duas inscrições, edição global sem renomear inscrições, retomada/isolamento, resposta incerta/idempotência, conflito, guardas e reautenticação. Dez regressões de C1/acesso aprovadas; cenário de expiração da fixture estabilizado e repetido seis vezes com sucesso. Capturas com fixtures em `.preview-artifacts/equipes-desktop.png` e `equipes-mobile.png` inspecionadas, reflow 320 sem transbordar página.
- Contrato compartilhado PostgreSQL PASS do zero, upgrade e preservação de contexto C1. Contrato C2 no Supabase real PASS com rollback: autorização atual, acesso indevido, negação de escrita de tabela, pais, versões, repetição, rollback e Recentes. Dados reais do responsável preservados; não repetir bootstrap/contratos antigos contra banco com dados.
- Smoke remoto PASS: três arquivos por hash/source, health 200; sessão e seis rotas de contexto/equipes/inscrições recusadas com 401 sem cookie da aplicação após Access. `worker.js` 404, senha inválida recusada no Auth real sem cookie. Duas telas de login sem erros/storage em browser. Não usou senha nem sessão do responsável.
- Token temporário `36721800-7ce7-4260-9291-a603e5298c0f` e política `b03f5d03-be13-4df2-a7a9-82cbb989bf35` revogados com sucesso. Credenciais transmitidas somente cifradas para chave efêmera em memória. Depois: seis caminhos anônimos 302 Access sem conteúdo/source da aplicação; única política permanente do responsável reconfirmada. Previews de versão desabilitados e cofre/namespace preservados.
- [CI 39951616663](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39951616663), job `120407174609`: gate PASS observado, navegador ainda em preparação em 09:15. Não declarar conclusão total antes de ler resultado final. [PR draft #5](https://github.com/renato-lucindo/base-do-basquete-next/pull/5) sobre C1/#4, sem merge.

| Artefato                          |  Bytes | SHA-256                                                            |
| --------------------------------- | -----: | ------------------------------------------------------------------ |
| `/foundation.html`                |    480 | `bdb5b9775a159d9dbf327d325ddff079fb6e2d338e97390c1608c8df53bc7ab4` |
| `/assets/foundation-C3WJXtFs.css` |   4973 | `0d521bcc39082f29406a919064a39cd59bdf4710aaf1a32348e855287e05179f` |
| `/assets/foundation-DkthFaow.js`  | 331747 | `38e11aa78d246045d007ea2f6fa8507a30082c12b89c72a0b2acffc039ff5431` |

## Avaliação humana e limites

Roteiro enviado ao responsável: abrir disputa → Equipes e elencos → criar equipe global → salvar duas inscrições com nomes diferentes para essa identidade → recarregar e reabrir. Resposta ainda pendente. Não equivale a aceite humano nem de produção. Dados criados durante a avaliação pertencem ao responsável e devem ser preservados.

Revisão pelo autor, independente pendente; teste de corrida real multi-conexão/escala e auditoria completa WCAG não realizados. Advisor remanescente de senha vazada/Pro já documentado, sem mudar plano. Elencos/pessoas/treinadores são C3, texto é C4. Evidências imutáveis do protótipo/harness continuam válidas. Rollback de código mantém Access/cofre/namespace e dados/migrations; versão C1 consta no checkpoint histórico.
