# Formato restaurado e colunas da classificação

Autorizado pelo responsável em23/11/2026 na PR89 existente. Restaurar o percurso da PR75 e atualizar admin/preview, sem merge. PTS após Equipe; AVG por divisão PP/PC, por confirmação explícita, logo após SLD e antes de Últimos jogos. Preservar SLD e critérios de desempate. AVG com duas casas decimais; cobertura ausente ou divisor zero aparece como travessão. PTS usa os pontos de classificação calculados pelas regras da disputa, inclusive W.O.

## Execução e conferência

- Ativar FLEXIBLE_COMPETITION nos dois Workers existentes, preservando sessão, segredos, aliases e preview sem Access.
- Reutilizar tabela pública também no perfil e adicionar as métricas à conferência administrativa. Reutilizar legenda/tooltips aprovados: PTS=Pontos de classificação; AVG=Cesta average.
- Verificar cálculo, pontuação personalizada, estados sem resultados/cobertura, ordem de colunas, responsividade e consumidores existentes. Aplicar guia visual nas seções Navegação, Formulários, Dados e Estados; sem redesenho da tela aprovada.
- Atualizar a mesma PR89, executar CI do SHA e publicar versões dos Workers pelo conector Cloudflare. Smoke remoto somente leitura; sem DML, migrations ou publicação de dados.

Atualização de23/11/2026: situação da disputa junto à identificação, em selo discreto com indicador e tokens de situação aprovados. Retirar o texto solto próximo às abas. Preservar navegação, acessibilidade e quebra no celular.
