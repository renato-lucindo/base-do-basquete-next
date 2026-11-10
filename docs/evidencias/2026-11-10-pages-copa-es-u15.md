# Copa ES U15 em Pages

Decisão do responsável em10/11/2026: aplicar o azul da coluna PTS ao placar, concluir a PR77 por merge após os gates, atualizar seu Worker e publicar a consulta pública completa da Copa ES U15 em Pages, para evitar o identificador pessoal no endereço entregue. Esta autorização substitui as restrições anteriores de merge/deploy somente nessa unidade. Sem alteração no banco ou deploy no serviço principal.

## Implementação

`scripts/copa-public-proxy.mjs` atende o Pages por Service Binding ao Worker da PR77. Mantém a interface real e as APIs públicas de catálogo, descoberta/busca, classificação, jogos, estatísticas, equipes, perfis e conquistas. A raiz abre a disputa da Copa; a navegação pública continua disponível. Não injeta controles que removem links nem substitui o cabeçalho real.

O hostname interno é variável exclusiva do servidor. HTML/JS/CSS, chamadas do navegador e redirecionamento inicial usam o domínio Pages. O proxy descarta cookies/credenciais, não encaminha rotas administrativas nem arquivos internos do Pages e devolve somente cabeçalhos públicos selecionados. Redirects/falhas do backend são encerrados com mensagem genérica, sem revelar o destino interno. POST é permitido somente para a consulta pública de equipes com pageSize=all, mantendo validação de origem e streaming. Sem seeds, DML, DDL, login de teste ou novas publicações.

O Pages depende da disponibilidade e manutenção do Worker da PR77, que deve permanecer após o merge; fechar a PR não o apaga. Nenhum backend novo ou credencial duplicada. O Worker antigo copa-es-sub15 é preservado, sem redirecionamento para domínio pessoal.

## Verificação e execução

- Proxy:5testes Node PASS, cobrindo as seis páginas públicas, todos os grupos de APIs existentes, assets, POST/origem, HEAD, remoção de credenciais, bloqueio administrativo/fontes internas, falhas e redirecionamentos. A primeira verificação apontou a exigência duplex do Request com stream no Node; o encaminhamento foi ajustado e passou.
- Browser:28cenários da lista e página de jogo PASS, incluindo320/390/1366/1920px e reflow200% conforme provas anteriores. Infraestrutura entra no gate completo e na CI da mesma PR, sem ampliar escopo funcional.
- Estado de CI, fontes e publicação efetiva são registrados no checkpoint e na descrição da PR; esta preparação não declara um deploy concluído.

## Reproduzir a publicação

Usar Wrangler4.152.0 local. Em diretório ignorado de release, copiar o proxy como `site/_worker.js`, criar404.html sem dados e configurar `pages_build_output_dir=./site`, Service Binding SOURCE para o Worker da PR77 e as variáveis de servidor PUBLIC_BACKEND_ORIGIN e PUBLIC_DISPUTE_ID. Publicar somente o projeto copa-es-u15, branch Pages main, registrando o SHA validado com `--commit-hash`. A configuração de servidor não vai no diretório público. Nenhum arquivo com segredo ou source map é publicado. Conferir no remoto a navegação e a ausência do identificador nos arquivos, headers e requests públicos antes de entregar.
