# Limpeza das referências de design — 22/11/2026

## Problema e resultado

A documentação de design ainda promovia pilotos, capturas e pacotes antigos ao lado dos padrões atuais. Isso permitia copiar uma legenda recolhida ou uma navegação superada como se fossem decisões vigentes. A leitura atual começa no design system e no catálogo aprovado, seguida dos padrões comuns e da área.

Foram retirados de `docs/design/` os diretórios `prototipos/`, `evidencias/` e `referencias/`, além dos relatórios de implementação/validação e das instruções antigas de reforma e integração. Esses materiais foram preservados no histórico, com fontes e licenças; as entradas protegidas por hash não foram editadas.

## Conflitos encontrados

| Fonte anterior                              | Conflito                                                                                        | Tratamento                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Capturas do perfil real e piloto da reforma | “Siglas e cobertura” recolhido, notas técnicas e composição antiga do perfil                    | Retiradas das referências vigentes; uso restrito a prova histórica       |
| Fontes originais do pacote r6               | “Legenda das métricas” recolhível                                                               | Original imutável no histórico; sem autoridade sobre a interface atual   |
| Índice antigo de design                     | Indicava os pilotos como páginas “para implementação” e tratava integração já feita como futura | Substituído pelo índice de fontes vigentes                               |
| Tabela de tipografia do design system       | Descrevia a escala anterior do CSS sem distinguir o padrão aprovado                             | Substituída pela escala aprovada; diferença do código legado explicitada |
| Instruções antigas de reforma/integração    | Três recentes, navegação e composições posteriormente substituídas                              | Preservadas como relatório histórico, removidas das leituras normativas  |
| Comentários de proveniência e testes        | Caminhos antigos podiam sugerir modelo visual aprovado                                          | Caminhos atualizados e papel de regressão histórica explicitado          |

A legenda estatística agora está descrita expressamente como aberta, única e ao final do conteúdo ativo. A regra não se estende aos filtros ou conquistas que têm expansão própria aprovada.

## Limites e verificação

A limpeza não redesenha as telas de produção nem declara que toda a adoção tipográfica já ocorreu. Não modifica cálculos, contratos de domínio, migrations, dados ou serviços. Os runners continuam verificando as mesmas fixtures e as políticas de CI continuam exigindo gate completo para alterações executáveis, inclusive no histórico.

As verificações e o SHA real da unidade ficam em PROGRESSO.md e na PR. A prova da limpeza inclui ausência dos três diretórios antigos na árvore ativa, preservação dos hashes dos ZIPs e originais, revisão dos links alterados e execução dos consumidores afetados. Uma captura antiga não constitui aceite visual da entrega atual.

Resultados locais observados: 170 arquivos realocados; 104 capturas, ZIPs e fontes originais comparados byte a byte com a base, sem diferenças; alterações em `src/` limitadas a comentários de proveniência; 747 links conferidos inicialmente, sem novos links quebrados; `npm run design:verify` e dez testes Chromium de compatibilidade/controles/reflow aprovados. O gate completo e a CI ficam registrados no checkpoint e na PR conforme sua conclusão.
