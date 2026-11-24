# Progresso atual

Atualizado em24/11/2026. [Histórico anterior](../historico/progresso/2026-11-24-antes-consistencia-publica.md).

## Unidade e autorizações

- Uma unidade, branch codex/perfis-equipes, [PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), base original824a3d5, merge explícito de origin/main0af33e3/PR88 por d6c70e0. Trabalho visual b326134 e correções finais locais. Sem merge para main autorizado. Alterações humanas do checkout original preservadas.
- Plano de consistência aprovado em24/11: [plano](PLAN-CONSISTENCIA-PUBLICA.md). Perfil conforme HTML aceito e restauração Formato/classificação da PR75 mantidos. PTS após Equipe; AVG=PP/PC após SLD/duas casas; fonte ausente/divisor zero usa travessão; sem alteração de desempates.

## Implementação e evidências atuais

- Tabela de jogadores preservada durante ordenação na mesma identidade, inclusive altura da página, foco/rolagem; mudanças de inscrição/disputa limpam dados. Ordem compartilhada com Jogadores da disputa, seletor com checkbox/texto na mesma linha, contornos pelo conteúdo, classificação/jogadores centralizados e coletivos à esquerda.
- Destaque equivalente negrito/fundo suave, sem faixa lateral; nomes de equipes clicáveis com cor normal/sem sublinhado permanente. Placares alinhados em área estável entre nomes. Vazio específico da eliminatória sem apagar confrontos definidos; título de aba apenas semântico.
- Breadcrumb campeonato/ano/naipe/categoria/divisão e status abaixo, com seleção contextual pública. Rodapé marca+Base do Basquete/Dados a partir de2026. Aumento anterior de2px completado em estilos públicos, sem acumular nas regras já corrigidas nem mudar formulários administrativos. Capturas locais desktop/mobile conferidas: filtros14px/cabeçalho16px/título30px desktop e27px celular; seletor, reflow e contornos confirmados.
- PADROES/README/PUBLICO/DESIGN-SYSTEM/PERFIS-EQUIPES atualizados com exemplos explícitos de títulos redundantes e checklist/testes do consumidor. Guia Navegação/Estados/Dados/Tipografia aplicado. PR88 incorporada sem restaurar referências obsoletas; conflito somente no checkpoint, estado da main arquivado em historico/progresso/2026-11-24-main-pr88.md.
- gate:ui PASS (lint/formato/tipagem/builds/fronteira/segredos);36unitários PASS. Rodada ampliada118browsers:114PASS e4falhas por títulos antigos esperados nos testes; consumidores corrigidos para exigir título semântico sr-only. Rechecagem42browsers PASS (inclui os quatro casos), seguida6PASS do layout com geometria/links/altura da página. Sem skips novos, aumento de timeouts ou simulação de PASS. Primeira tentativa do gate parou por formato do checkpoint, corrigido. Provas inalteradas reutilizadas.

## Serviços e próximo passo

- Publicados ainda no SHA596a848: admin versão6f61e6e7-0d8a-49d4-93b3-67cd3f30acd9/deployment172f8d26-5f2c-4f73-a21b-ebb69cf20603; preview versão7ebcb853-72c9-487f-80f3-7415cc97bb98/deploymentc9fc8053-c2d8-4f6c-a2f4-521c03068c84. CI45183064931 PASS nos7checks; não valida esta composição nova.
- Somente admin/preview ativos nos nomes curtos workers.dev; demais10e URLs de versões fechados. Namespace597c612fd69c447e81547f16d5dcca41 e segredos preservados; preview sem Access e só leitura. Sem DML/migrations/publicação de rascunhos. Domínios próprios permanecem aliases; bloqueio corporativo já confirmado, não repetir testes. Raiz/www fora do escopo.
- Próximo: commit/push das correções finais na mesma PR89, CI do SHA novo e publicação admin/preview autorizada. Conferir bindings/fontes, assets e telas remotas. Sem merge para main. Nenhuma automação ativa antes desta publicação.

## Publicação e correção responsiva final

- Fonte db4123e publicada: admin versão544ed29e-021f-4324-92ff-1a8134bf5ace/deployment16a613bb-1169-4835-a90a-658602ca9259; preview versão1a82deb6-1bba-4f99-8260-bc61ffd95d37/deployment00021a60-68f2-4fb7-b08d-5703d003f923. Conector inicialmente pediu reautenticação, fallback Wrangler autorizado; responsável reconectou depois e consulta via conector confirmou versões100%. Smoke200/headerdb4123e/11assets idênticos ao build, admin metadado true/API401 e preview403. Navegador real: breadcrumb, status, rodapé, ordem canônica, título Jogadores sr-only, contorno916,5px/tabela914,5px e sem alertas/transbordamento.
- CI45436642809 encontrou desalinhamento em390px após fontes maiores: controles de fase+modo somavam cerca de350px numa área de346px. Reproduzido em Chromium/WebKit; padding horizontal mobile0,4rem→0,35rem corrige sem reduzir fonte ou alvo44px. Focais2Chromium+2WebKit PASS. Build final repetido. Rodada WebKit Windows completa:37PASS/7falhas antes da correção (duas de alinhamento corrigidas e cinco ligadas a overscroll não suportado no Windows); não declarar PASS completo local. CI macOS tinha42PASS/2falhas de alinhamento; novo SHA deve validar composição inteira.
- Próximo: commit/push dessa correção, substituir CI anterior e publicar mesmo SHA nos dois Workers pelo conector reconectado. Sem merge para main. Automação conferir-ci-da-consist-ncia-p-blica ACTIVE deverá acompanhar o novo SHA/run, registrar resultado real e ser excluída ao concluir; sem polling aguardando aceite humano.
