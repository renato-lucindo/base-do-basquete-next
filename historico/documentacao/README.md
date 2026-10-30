# Documentação histórica de UI/UX

Material preservado fora de **docs/** para separar feedbacks, planos e handoffs encerrados dos padrões vigentes. **Histórico não cria obrigação nova de produto**; verifique a data, o SHA, a PR e decisões posteriores antes de reaproveitar qualquer orientação.

As escolhas do responsável que ainda não tenham sido absorvidas por contratos ou padrões permanecem registradas nestes arquivos; não presuma que foram revogadas apenas pela mudança de pasta. Em caso de conflito, reconcilie com a decisão posterior e a implementação atual.

| Documento arquivado                                              | Conteúdo e destino                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AJUSTES-DE-EXPERIENCIA.md](AJUSTES-DE-EXPERIENCIA.md)           | Feedback sucessivo de protótipo e instruções pontuais de 22–27/10; regras permanentes aplicáveis foram avaliadas em docs/design e nos contratos atuais. |
| [PLANO-PROTOTIPO.md](PLANO-PROTOTIPO.md)                         | Plano da primeira apresentação navegável e marcos antigos.                                                                                              |
| [HANDOFF-UI-UX-ETAPA2.md](HANDOFF-UI-UX-ETAPA2.md)               | Contexto de transferência de UI/UX da etapa 2.                                                                                                          |
| [HANDOFF-UI-UX-RESULTADO.md](HANDOFF-UI-UX-RESULTADO.md)         | Relato da entrega/validação de uma etapa anterior.                                                                                                      |
| [HANDOFF-UIUX-DESKTOP-ETAPA3.md](HANDOFF-UIUX-DESKTOP-ETAPA3.md) | Transferência da etapa desktop posterior.                                                                                                               |

O arquivo HANDOFF-UI-UX-OUTRO-AGENTE.md aparece em outra branch de trabalho, mas **não existe em origin/main nesta base**, por isso não foi movido ou alterado. Sua eventual incorporação exige verificar o estado da PR de origem.

## O que permanece ativo

- [Índice ativo](../../docs/README.md), [padrões comuns](../../docs/design/PADROES.md), [Público](../../docs/design/PUBLICO.md) e [Administração](../../docs/design/ADMIN.md).
- [Integração](../../docs/design/INTEGRACAO.md) e scripts/protótipos sob docs/design: referências operacionais ainda utilizadas.
- [PROGRESSO](../../docs/PROGRESSO.md), [MATRIZ-ESCOPO](../../docs/MATRIZ-ESCOPO.md), decisões e relatórios VALIDACAO: rastreabilidade de execução, contratos e provas. Não removê-los por aparência de antiguidade enquanto tiverem consumidores.

## Migração seguinte, se necessária

Qualquer outro documento candidato a arquivo deve ser classificado como contrato vigente, evidência em uso, plano já encerrado ou relato histórico. Conferir referências de entrada, scripts, PRs e caminhos Markdown, preservar conteúdo e corrigir links antes de mover. Não mover em massa as provas técnicas ou o checkpoint por conveniência estética.

Os caminhos citados em texto nos documentos históricos geralmente partem da raiz do repositório; após a movimentação, consulte a localização atual pelos índices acima.
