# 016 — Estatísticas preservam domínios e cobertura confirmados

25/10/2026. ESCOPO§8/CONTRATOS§Estatísticas e módulos portáveis do ZIP exigem cobertura por métrica, percentuais ponderados, amostra mínima e identidade contextual. Os snapshots G4 já distinguem origem do placar, arremessos/minutos avançados e faltas recebidas; a camada estatística deve preservar essas fronteiras.

Primeira unidade é somente adaptação pura de publicResultSchema, sem consulta/banco/rota nova. A linha conserva pessoa, inscrição, equipe, camisa, jogo e versão da publicação. Nome de exibição e camisa vêm da ocasião confirmada; vínculo ativo e cadastro privado atual não reescrevem histórico. Relacionado que não jogou continua identificável, mas não fornece observação estatística nem denominador; quem jogou sem ações possui zero conhecido nos domínios efetivamente cobertos.

Pontos/cestas oficiais permanecem separados dos arremessos/pontos avançados. Em fallback manual, por30 e percentuais usarão apenas as métricas avançadas/minutos cobertos, sem incorporar pontos oficiais de outra origem. Súmula não fornece tentativas/minutos/rebotes por suposição. PDF sem um domínio selecionado não fornece cobertura dele; Site não ganha faltas recebidas ou plus/minus zero por ausência. Estado disciplinar sóé conhecido quando a fonte o confirmou, sem dedução a partir de faltas ou minutos.

G4 ainda não carrega fase confirmada no DTO do jogo nem mínimo estatístico congelado. Portanto S1 não inventa fase ou metadado de publicação estatística: fase desconhecida énull e o mínimo600 será persistido/versionado com a fonte estatística em S2. Fase de um regulamento privado não se torna pública incidentalmente. A definição pendente de agenda futura/inscritos continua bloqueando somente sua exposição, não a modelagem independente dos fatos já confirmados.

Identidade externa continuaUUID. Módulos de referência que esperam IDs numéricos podem receber uma bijeção interna fechada por contexto, como o comparador já adaptado; não reutilizar seus nomes de tabelas/queries nem trocar identidade pública por posição numa lista. Nenhuma escolha definitiva de URL/consulta numérica é implementada nesta unidade.

Campos opcionais do perfil exigem fonte confirmada própria. Ter publicado nome/apelido num jogo não autoriza buscar e expor automaticamente a biografia/altura/peso editados depois no cadastro privado. A modelagem posterior deve manter versões/linhagem de publicação desses campos antes do perfil público completo.
