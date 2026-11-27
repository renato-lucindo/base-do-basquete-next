# Correção compacta — 25/11/2026

Capturas com fixtures fictícias, inspeção autoral, viewport1366px. Fonte: commit que acrescenta este diretório na PR89. Não constituem aceite humano.

- [Jogadores da equipe](compact-team-players.png):15colunas/862,906px, métricas compactas; Total/Por jogo conservam limites medidos pela suíte.
- [Campanhas](compact-campaigns.png): tabela/região/scrollWidth930px; círculos originais verde/vermelho, traço branco e anel. Teste repete ausência de rolagem em1920px.

Comandos, resultados e limites: [validação](../../VALIDACAO-PERFIS-EQUIPES.md#correção-compacta--25112026). Evidências adicionais ficam anexadas à CI do SHA, sem substituir estas capturas nem a inspeção das páginas reais.

## Serviço publicado

Fonte039d78add45fd05753a2a4d58d06cc0840d69e86, consulta remota somente de leitura. Capturas inspecionadas:

- [Campanhas reais](live-campanhas-1366.png): tabela/cliente/rolagem930px em1366px e1100px em1920px; verde original e traço SVG branco.
- [Jogadores reais](live-jogadores-1366.png):853,703px; diferença máxima0px entre limites dos modos após aguardar resposta e confirmar2P45/5,0.
- [Geral/estatísticas](live-equipe-1366.png): Participação e siglas centrais, valores direitos, filtros com identificação interna.
- [Disputa](live-disputa-1366.png): resultados originais, AVG após SLD com duas casas e controles acima das tabelas.

Smoke dos dois Workers confirmou200/fonte correta, APIs privadas401admin/403preview e12assets idênticos ao build por SHA256. Login real mantém E-mail/Senha visíveis. Testes autenticados usam fixtures; nenhum dado humano foi editado.
