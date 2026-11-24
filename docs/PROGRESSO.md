# Progresso atual

Atualizado em23/11/2026. [Histórico anterior](../historico/progresso/2026-11-23-antes-status-avg.md).

## Unidade e autorizações

- Branch codex/perfis-equipes, base824a3d5, [PR89](https://github.com/renato-lucindo/base-do-basquete-next/pull/89), HEAD596a8480493f7d6fc0d5c7da98a68d92154d7b54. Uma unidade; sem merge autorizado. Alterações humanas do checkout original preservadas; PR88 integrada separadamente.
- Perfis geral/contextual conforme HTML aceito; conquistas, campanhas, cinco recentes, classificação/coletivos completos, jogadores por inscrição e legendas. [Requisitos](design/PERFIS-EQUIPES.md) e [validação](design/VALIDACAO-PERFIS-EQUIPES.md).
- Responsável autorizou restaurar Formato e classificação da PR75, atualizar mesma PR e Workers. FLEXIBLE_COMPETITION=true em admin/preview. Classificação da CopaES/Sub15 voltou a ter seis equipes/uma fase pela configuração existente, sem escrita de dados.
- PTS após Equipe. AVG=PP/PC, SLD/desempates preservados; divisor zero/cobertura ausente usa travessão. Legenda única preserva os significados distintos de PTS em classificação e coletivos.

## Serviços publicados

- [Admin](https://admin.renato-lucindo-jr.workers.dev/): versãof760368e-3988-40e3-aac6-fc7163e4b559, deployment6deadb23-9936-42ed-ac62-8b514896cc55.
- [Preview](https://preview.renato-lucindo-jr.workers.dev/): versão0b0ba9fd-9bc9-4171-98cc-f3c1eada60f4, deployment0a93c30a-713e-443a-a3d6-13a95978a07e.
- Fonte326fd19 confirmada nos dois serviços (admin X-Bdb-Source, preview X-Preview-Source), health/root200, admin com metadado true, API privada401sem sessão/403no preview.11assets de entrada idênticos ao build por SHA256. LUSB9J/6V/3D/15PTS/575PP/439PC; legenda real com ambos significados de PTS e sem alertas.
- Somente admin/preview ativos; demais10Workers e URLs de versões fechados. Namespace de sessão597c612fd69c447e81547f16d5dcca41 e segredos preservados. Sem Access no preview, sem migrations/DML/merge. Domínios admin/preview.basedobasquete.com.br seguem como aliases; bloqueio corporativo já confirmado, não repetir testes de rede. Raiz/www não publicados.
- [CI326fd19/45178312096](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45178312096) PASS nos sete checks, incluindo validate. Automação anterior excluída após conclusão. Provas detalhadas no histórico.

## Ajuste atual — status e AVG

- Pedido de23/11: aproximar Em andamento da identificação da disputa; mover AVG para após SLD, antes de Últimos jogos; usar duas casas decimais. PTS permanece após Equipe.
- Implementação local: selo textual/indicador junto ao contexto, com tokens de situação aprovados; formatador compartilhado de AVG com duas casas na classificação pública/embutida e administrativa. [Plano atualizado](PLAN-CLASSIFICACAO-PTS-AVG.md), guia nas seções Navegação/Estados/Dados; componentes existentes reaproveitados.
- Teste da precisão reproduzido RED e corrigido;2unitários PASS. gate:ui PASS (lint/formato/tipagem/builds/fronteira/segredos). Browsers:55PASS na rodada de56; um caso falhou somente no fechamento por ENOSPC ao gravar trace e passou na repetição isolada sem trace, sem alteração de asserções. Capturas desktop/mobile conferidas; reflow320/390/1366/1920px e zoom200% incluídos. Não repetir provas de fontes inalteradas.
- Publicação final596a848 confirmada nos dois Workers. Admin versão6f61e6e7-0d8a-49d4-93b3-67cd3f30acd9/deployment172f8d26-5f2c-4f73-a21b-ebb69cf20603; preview versão7ebcb853-72c9-487f-80f3-7415cc97bb98/deploymentc9fc8053-c2d8-4f6c-a2f4-521c03068c84. Smoke200/fonte596a848/11assets iguais ao build por hash, admin metadado true/API401 e preview API403; sem migração/DML/Access. Navegador conferiu status contextual e AVG após SLD em duas casas. PR89 atualizada.
- [CI45183064931](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/45183064931) **PASS nos sete checks, incluindo validate**, no SHA596a8480493f7d6fc0d5c7da98a68d92154d7b54, conferida em23/11 às10h41 de Brasília. PR89 atualizada; automação oficial conferir-ci-de-status-e-avg excluída após conclusão. Aguardar aceite visual do responsável; nenhum merge autorizado. Sem suítes repetidas nesta conferência documental. Checkpoint final local para evitar SHA apenas de polling.

## Consistência pública —24/11/2026

- Plano autorizado pelo responsável: [consistência pública](PLAN-CONSISTENCIA-PUBLICA.md), mesma PR89. Correções locais concluídas de retenção da tabela ao ordenar, ordem compartilhada com jogadores da disputa, popup, contornos, seleção, links de equipes, placar central, estados vazios, títulos redundantes, breadcrumb, rodapé e adoção restante de2px nas fontes públicas. Administrativo sem aumento.
- Documentos PADROES/PUBLICO/DESIGN-SYSTEM/README/PERFIS-EQUIPES atualizados: exemplos explícitos Jogadores/Jogadores na disputa e Jogos/Jogos da equipe, títulos semânticos sem altura e teste obrigatório do consumidor. Guia Navegação/Estados/Dados/Tipografia aplicado.
- Tipagem app/Worker PASS;6novos testes browser desktop/mobile PASS após RED→GREEN. Rodada inicial de60 teve52PASS/8falhas de seletores antigos e destaque reproduzido/corrigido; rodada seguinte20PASS/2falhas por fixture com jogo knockout corrigida para cenário realmente vazio. Sem skips novos nem timeouts elevados. Próximo: incorporar main/PR88 por merge, gate consolidado, consumidores públicos, capturas e publicação nos dois Workers autorizados. Nenhum DML, migration, Access ou merge para main autorizado.

- Main/PR88 incorporada por merge explícito à branch da PR89; conflito somente no checkpoint, resolvido preservando esta unidade e arquivando o estado da main em historico/progresso/2026-11-24-main-pr88.md. Exclusões de referências obsoletas da main preservadas; nenhuma alteração de produto alheia sobrescrita.
