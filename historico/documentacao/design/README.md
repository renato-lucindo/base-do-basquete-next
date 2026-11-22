# Design histórico — sem autoridade visual

Estes materiais foram retirados das referências vigentes em 22/11/2026. Não usar seus layouts, legendas, tipografia, navegação, textos ou cores para orientar telas e protótipos novos. As fontes atuais ficam em [docs/design/README.md](../../../docs/design/README.md).

## Por que foram retirados

- O perfil anterior mostrava “Siglas e cobertura” recolhido, notas técnicas permanentes, navegação anterior e três jogos recentes. O padrão atual tem legenda aberta ao final do conteúdo e cinco recentes.
- O pacote original de estatísticas contém “Legenda das métricas” em `details`/`summary`. É entrada histórica preservada por hash, sem autoridade sobre a legenda atual.
- Capturas de validações anteriores registram escalas e composições anteriores às decisões vigentes. Ser prova de uma execução passada não as transforma em referência visual atual.
- Documentos de integração futura e reforma antiga misturavam regras já integradas com instruções para pilotos. As decisões atuais estão nos padrões da área e no design system.

## Conteúdo preservado

| Diretório | Finalidade técnica |
| --- | --- |
| `sumula/` | Fixtures, gerador e verificações da súmula anterior |
| `estatisticas/` | Fontes originais, licenças, adaptadores e verificações de estatísticas |
| `reforma-uiux/` | Piloto e cenários de regressão da reforma anterior |
| `referencias/` | ZIP original conferido por hash |
| `evidencias/` | Fotografias de execuções anteriores; não são modelos de tela |
| `relatorios/` | Contratos, planos e relatórios anteriores, com decisões e contexto únicos preservados |

`docs/design/build.cjs` e `docs/design/verify.cjs` apontam para estes caminhos. Os testes das telas reais consultam os tokens vigentes e a legenda aberta, sem comparar sua aparência com estes arquivos antigos. Os caminhos relativos de importação mantêm a profundidade anterior, e os arquivos originais protegidos por hash permanecem byte a byte. Execuções históricas documentadas continuam vinculadas ao SHA original; comandos antigos não comprovam execução nesta revisão.

Não existe retorno automático destes materiais ao conjunto de referências vigentes após passar uma suíte. Um novo padrão visual depende da decisão do responsável e da atualização das fontes atuais.
