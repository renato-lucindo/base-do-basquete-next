# Consistência da área pública —24/11/2026

Plano aceito pelo responsável nesta conversa: corrigir perfil usando a página de jogadores da disputa como referência; breadcrumb campeonato/ano/naipe/categoria com seleção contextual e status abaixo em todas as páginas da disputa; completar o +2px anterior na área pública sem duplicar tamanhos já corrigidos; rodapé com marca e Dados a partir de2026.

Manter tabela durante ordenação, limitar retenção à mesma disputa/inscrição, compartilhar ordem de métricas, corrigir seletor/contornos, centralizar somente classificação/jogadores, unificar seleção em negrito/fundo suave, nomes navegáveis sem aparência permanente de hyperlink e placares alinhados independentemente dos nomes. Mensagem específica para eliminatórias vazias; preservar confrontos definidos. Títulos que repetem abas apenas semânticos, com exemplos e checklist documentados/testados.

Mesma branch/PR89, sem merge automático. Sem contratos novos de API, banco ou migrations. Dados de teste somente fixtures. Rodar testes focais de atraso na ordenação, colunas/seletor, breadcrumb/retorno, vazios, destaque, links/placares, fonte, reflow e acessibilidade; gate proporcional e CI do SHA atual. Publicar nos Workers admin/preview existentes, preservando identidades, sessões, segredos e preview sem Access, com smoke de leitura. Aguardar aceite humano para integração.
