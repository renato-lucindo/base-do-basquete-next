# Acessibilidade das consultas confirmadas

## Preview protegido — 26/10/2026 06:21UTC-03

**CI40297505322/job121487036221 SUCCESS515unitários/104arquivos/352browsersLinux** sobre **bbcda6a27d3cc921b370a954278e41eac9943e7d**; log accessibility-ci-40297505322.log SHA256 **0a3c8b1421873cf99680f3bc34490af289495c239405e209bf007eb91f469c23**. Pacote deHEAD limpo dessa fonte,24assets/manifestoSHA **e9b85a67f5ec8c9b441c6ea5639cd60168fac810cd7b4b31896fd1eccc6d95ce**. WorkerSHA **840514f603ac4f998bd88a7a3bf87783623352aab7460fb408c2fe209e50990c** idêntico ao da capacidade; novas evidências não alteram contratos SQL nem substituem provas válidas deles.

Somente Worker existente base-do-basquete-next-preview atualizado pelo pluginCloudflare, fontebbcda6a, **deploymentb8b61002-25e1-4770-b62f-1ed881eb140e/versão198c0264-762c-4ae8-a230-ae016effcfa8100%**. Access app/política de proprietário, previewsOFF, namespace/rate/cofre preservados. Smoke PASS24assets/hash/Xsource,38GETs privados/12POSTs/6leituras públicas/5HTMLs/duas browsers/health/Authinválido/backend404. Tokens/políticas efêmeros criados sópara o smoke: **753bdc9c-01ea-43d0-a6e1-2208a835959b/7cdb4aa7-9d98-45e6-90f9-82b6d59d718a revogados, ausência reconferida**, chave privada apenasRAM/processo encerrado, anônimo302→Access em raiz/perfil/equipes/API. Relatório accessibility-preview-smoke-bbcda6a.json SHA256 **83b7fef7bb64c69491a14589c637cc1b3b7cd1e45076bf40ecf23931df54506e**.

Entrega técnica da unidade concluída/PRdraft22 sobre21, sem merge/produção. Resultado automático/histórico de deficiências e incomplete permanecem abaixo. ownerLoginPending sinaliza teste humano da versão ainda pendente; avaliações adiadas não foram solicitadas novamente nem inferidas como aceite. Nenhuma migration/dado humano/fixture remota alterados.

## Gate consolidado local — 26/10/2026

**PASS515unitários/104arquivos,5transportes,13PostgreSQL,22workerd,quatroPDFs no runtime, builds/tipos/lint/formato/fronteira/segredos653** sobre a árvore de produto que gerou o commit desta entrega. Log accessibility-gate.log SHA256 **f27f2542a7ceeb3f553bc28b0dbe16b8d81b8c62e30b721387713d3601c0d5ba**. Compatibilidade do overrideUndici comprovada pelos transportes/workerd existentes, sem falhas ou repetição automática de gate.76browsers de composição PASS incluem14cenários novos/32varreduras, texto200% com tamanho computado dobrado, foco/ArrowRight e links/navegação/contextos anteriores. Captura viewport320 inspecionada SHA256 **bda775dfa8aec9253ec87e2bb0b333dcdeddb5057609d98a2e6e2a53c9faf154**.

Nenhuma migration/dado/serviço alterado nesta unidade. CI/preview novos ainda pendentes; evidências de SQL e integrações inalteradas mantêm validade. Os parágrafos seguintes registram a sequência e suas limitações; pendências históricas não substituem esse resultado do gate.

## A1/A2 — auditoria e correções focais, 26/10/2026

Branch codex/acessibilidade-consultas, base a58270b/PR21, plano2026-10-26-acessibilidade-consultas.md. Critérios vêm de EXPERIENCIA§Acessibilidade/VALIDACAO do ZIP preservado. Testes exclusivamente locais com fixtures conhecidas, sem dados/serviços humanos ou novaDDL. Previewc2e8734 preservado enquanto esta unidade é verificada.

Ferramenta dev @axe-core/playwright4.14.0 + axe-core4.14.0, MPL-2.0, versões/integridades em lockfile. Não entra no bundle do produto. Referência de uso: [Playwright](https://playwright.dev/docs/accessibility-testing). Escopo inicial: resultado manual/Site, estatísticas/colunas, cinco seções do perfil, tabela longa de equipes/seleção/detalhes. TagsWCAG2A/AA,2.1A/AA e2.2AA; capturas antes da análise, sem exclude/disableRules/supressões. Resultado automático não certifica WCAG integral.

### RED observado e causa

- Desktop:2casos falharam/4passaram; mobile:2falharam/4passaram. Oito botões de ordenação tinham siglas visíveis comoPTS/MIN/REB/AST, mas o nome acessível sótrazia o nome extenso. Regra label-content-name-mismatch, impacto serious. Corrigido o nome para incluir a sigla e sua descrição, conservando título/ação/consulta.
- Vinte links de resultado, no detalhe Jogos da equipe, tinham altura21px e proximidade20px aos links das equipes abaixo. Regra target-size, serious. Links das linhas agora têm mínimo24×24CSSpx e alinhamento interno; links e fatos continuam os mesmos. Ações principais jáusam44px; não inflar todos os dados da tabela para44px.
- O scanner também marcou incomplete em aria-label de div genérica da paginação do perfil. Inspeção confirmou ausência de papel de navegação; teste novo observouRED por0landmarks onde esperava1. Wrapper passou a nav com o mesmo rótulo/classe e botões; Jogos e Histórico agora têm paginação nomeada.

Logs iniciais public-a11y-initial.log SHA256 **06e4a7ffed2a5cffeb2f2e0f1b8ade204c646cf2d14113d31596713ece257803** e public-a11y-mobile-red.log **7deaed008f43d67bca2e1bdd802aced52adceb0a18a6ea8287470d1b5fd70be0**; JSONs/capturas anteriores preservados em .preview-artifacts/a11y-before-20261026. Os relatórios atuais usam nomes equivalentes após corrigir; não interpretar o JSON posterior como captura do RED.

### GREEN e limites

**76browsers de composição PASS** (14novos+62percursos existentes de resultado/estatísticas/perfil/equipes), desktop/mobile. Log public-a11y-composition.log SHA256 **cf08f01d498f45feb201d4c9c2aea25cd7d3feb4ee7d5c68b37d7a7b825c33b7**.32varreduras de estado sem violations; dados de passes/incomplete ficam nos JSONs e anexos, sem ocultar resultados. Tipos/lint focais PASS. Gate/CI/preview novos ainda pendentes nesta seção.

Teste adicional320px com preferência de movimento reduzido e fonte raiz200%: tamanho computado do botão dobra de fato, documento não ganha overflow horizontal; tabelas mantêm rolagem própria, região recebe foco e ArrowRight move scrollLeft; link focado segue acessível. Captura viewport a11y-team-focus-320-mobile.png inspecionada, foco visível e conteúdo extenso rolável. Isso é ampliação de texto porCSS testada, **não** ensaio de zoom nativo/tecnologia assistiva.

Incomplete residual: motor não resolve automaticamente siglaJ e símbolo+/- em label-content-name-mismatch. Teste adicional verifica o nome acessível computado contra cada rótulo visível; nomes incluem explicitamente J(Jogos) e+/-(Saldo em quadra). Há também color-contrast inconclusivo em células fora da janela horizontal nas varreduras320px/texto200%; varreduras normais não apontaram violação. Registros preservados para avaliação visual/assistiva; sem declarar todos os pares/contornos/estados ou processos aprovados.

### Dependência de teste corrigida

npm audit real acusou3alertas (1high/2moderate) na cadeia dev Wrangler/Miniflare→undici7.29.1, não no axe nem no artefato do produto. [Advisory oficial do Undici](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) identifica7.30.1 como versão corrigida. Override restrito miniflare.undici=7.30.1 preserva as versões diretas fixadas de Wrangler/Miniflare; audit posterior **0vulnerabilidades**, relatório accessibility-audit-dependencies-after.json SHA256 **84ee8580dbe0d03bd7ecaf14180b9db4b3ff6d5a657faf5d25df78b076f7eda1**. Não foi executado auditfix--force/downgrade. Compatibilidade completa do runtime local será comprovada no gate desta unidade, não inferida pelo audit.

Leitor de tela real, fala, zoom nativo, revisão independente e avaliação humana dos processos permanecem pendentes. Não repetir pedidos de teste adiados. Sem produção/merge nem alteração da política pública de rascunhos/agenda.
