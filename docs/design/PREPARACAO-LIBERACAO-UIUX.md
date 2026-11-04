# Reforma UI/UX — validação final e preparação de liberação

04/11/2026. A sequência autorizada está implementada nas PRs51–54 e o piloto foi aceito. Esta entrega prepara o pacote e o procedimento de liberação; **não executa deploy nem publica dados**. Estado Git/CI documental e continuidade em [PROGRESSO.md](../PROGRESSO.md).

## Fonte validada e cobertura

Fonte do pacote: **3ed808b6060b1b15cac9f6c9092ec3da9327feb4**, merge da [PR54](https://github.com/renato-lucindo/base-do-basquete-next/pull/54). [CI integrada41928948150](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/41928948150) **SUCCESS**, incluindo gate/design/e2e/finalização, conferida nesta unidade. Browsers **605PASS/109skips prévios**, sem skip novo. A CI do HEAD administrativo41925745265 também passou. Provas de código inalterado foram reutilizadas, sem repetir gate local completo apenas por documentação.

| Percurso                | Resultado e prova                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perfil e jogo           | Perfil contínuo começa pela carreira completa: identificação/conquistas, resumo, três recentes, campeonatos e painéis secundários. Súmula vigente preservada, sem modelo reprovado adicional. [PR51/piloto](VALIDACAO-REFORMA-UIUX.md). |
| Público real            | Cabeçalho/busca visível, tabelas por conteúdo, controles compactos, equipes por checkboxes, agenda e retorno de contexto. [Provas e capturas](VALIDACAO-PUBLICO-UIUX.md).                                                               |
| Busca servidor          | Normalização de caixa/acentos/Unicode antes dos limites, base publicada inteira, grupos/participações, debounce/cancelamento/teclado/erro. [Contrato e provas](VALIDACAO-BUSCA-PUBLICA.md), ADR020.                                     |
| Administração           | Ordenação da coleção de jogos antes da paginação, campos proporcionais e painéis30/70. Guardas/ACK/reautenticação e retorno preservados, inclusive inscrição renomeada fora do filtro. [Provas e capturas](VALIDACAO-ADMIN-UIUX.md).    |
| Responsividade e acesso | Capturas320/390/1366/1920, nomes longos, texto200%, teclado/foco/axe nos relatórios. Não representa WCAG integral, leitor de tela ou aceite humano de cada percurso real.                                                               |

Gate local do código da PR54:699unitários/145arquivos, transporte7,banco13,Workerd30,PDF1, lint/formato/tipos/build/fronteira cliente/segredos PASS. Última correção: equipes/layout/guardas27PASS/1skip prévio e teclado/axe2PASS sem skips. Fontes incompatíveis, zero/ausência, camisas0/00 e vínculos explícitos continuam nos contratos/testes; não foram substituídos por fixtures na aplicação real.

## Pacote local

Compilado novamente em worktree separado, limpo e detached no SHA3ed808b, com Node24.18.0 e lockfile existente. `npm ci --ignore-scripts --prefer-offline`, `npm run build`, `npm run build:foundation`, `npm run build:worker`, fronteira cliente, `prepare-foundation.mjs` e segredos **PASS**. `build:worker` foi somente dry-run. Nenhum upload executado.

Artefato: `.preview-artifacts/uiux-release-3ed808b.zip` no worktree da reforma, **1.303.680bytes**. Inclui payload gzip/base64, manifesto de32 arquivos estáticos, quatro módulos, checksums, instruções, prova local e proposta de rollback. É pacote de publicação, não um HTML autônomo nem dados do banco. Não foi criado GitHub Release.

| Artefato                 | SHA-256                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| ZIP                      | `153098ff111a14df45d44884d2f923fcf58a94744b6db28d07bb1224f259105b` |
| foundation-upload.b64    | `e30a285c91d31ebbfb173e767cf672d04a796e6d1156e9436da76e705d1400c1` |
| foundation-manifest.json | `9c2fec355e86e9c0ac2831a2fbe2ca7a451d4f1ae066be99ccfdc3467d239bd0` |
| worker.js compilado      | `0b9f7b0ccbc2b70d2a9e8d19d2825a10af2e4ee06168f6df5c8464a7577828b9` |

Verificação: descompactar payload, conferir SHA da fonte/alvo e todos os hashes/tamanhos contra os arquivos recém-compilados; quatro módulos exatos e referências HTML presentes no manifesto. Depois executar o próprio pacote no workerd local: **32 arquivos com conteúdo/hash e X-Bdb-Source corretos,3 aliases públicos/admin,3 leituras privadas negadas,health200 e worker.js404; zero requisições externas**. Arquivo `verify-release.mjs` no ZIP reproduz a prova com dependências do checkout3ed808b: `node <pasta-do-pacote>/verify-release.mjs <pasta-do-pacote>`.

A primeira configuração exploratória do verificador carregava apenas index.mjs e não encontrava worker.js. Corrigida a configuração local para fornecer explicitamente os quatro ESModules do payload; o pacote e o código do produto não precisaram de alteração. Prova final em `.preview-artifacts/release-runtime-final.log`, no worktree limpo de empacotamento. Nenhum timeout ampliado.

`npm audit --omit=dev --json`: **zero vulnerabilidades reportadas nas dependências de produção** nesta consulta. O install completo sinalizou9 moderadas no conjunto com ferramentas de desenvolvimento, também já observado na CI; não foram feitas atualizações de dependências ou `audit fix`. Isso não substitui revisão de segurança nem garante ausência de vulnerabilidades futuras.

## Estado remoto observado — somente leitura

Cloudflare, conta16b4a5e0a99a031d28051ebadb4811cc, Worker **base-do-basquete-next-preview**. Consulta de deployments/versão/Access nesta unidade, sem alterar configuração:

- Publicado: deployment **09e26c1c-4e0e-46ea-8026-5d5c8a721d59**, versão35 **35f5b882-70b1-48f7-8bb3-fda632bd458e**,100%, fonte anotada **eff36fe0eda76962e6babbc4a9464a98c3dad478**. **Não é a reforma recém-integrada.**
- APP_ORIGIN `https://basedobasquete.com.br`, backend `nizmasjddyrhmevvfviz`, namespace de sessões **0411ac931ca54d289d270606c7e87ef7**, limiter e nomes dos dois bindings secretos presentes. Valores secretos não lidos nem rotacionados.
- App Access **556be918-42ad-44e5-a85f-c2783f65b2ba** conserva o hostname workers.dev do preview e a policy **30cc3ab4-9331-4df6-8d13-d840c2652210**, uma regra allow por email; sem exclude/require. Lista completa:5 apps, nenhum para o domínio canônico, conforme decisão anterior de domínio público. Outros previews preservados. O uploader ainda exige a identidade específica do responsável antes de escrever.
- Migrations de busca **20261104171445** e ordenação **20261104185633** já aplicadas no desenvolvimento com autorizações e hashes registrados. Não reaplicar nem desfazer automaticamente. RLS/RPC legada/grants e negativas reais já verificados nos relatórios.

A inspeção do plano de controle não comprova navegação HTTP ou login humano no serviço publicado. Nenhum smoke remoto com POST/Auth ou alteração de dados foi executado nesta preparação; nenhuma restrição de rede foi contornada.

## Liberação proposta — operação futura autorizada separadamente

1. Conferir autorização específica para publicar este SHA/pacote no Worker e no domínio identificados. Revalidar versão ativa, hashes, Access, bindings e namespace; se outro operador publicou uma versão nova, atualizar a referência de rollback antes de prosseguir.
2. Decodificar o payload e usar **scripts/cloudflare-foundation-upload.mjs** no sandbox Cloudflare autenticado. O adaptador valida alvo/tag/proteção do preview, conserva bindings secretos e usa o namespace existente. Não executar migrations de DO ou banco em um redeploy comum; não alterar Access, dados publicados ou credenciais.
3. Registrar deployment/versão/fonte e conferir metadados posteriores. A configuração canônica e os aliases `/`, `/admin`, `/admin/` devem permanecer. Não tratar sucesso do upload como aceite dos percursos.
4. Em acesso permitido, conferir GETs dos assets e X-Bdb-Source3ed808b, health, raiz pública, login administrativo e APIs privadas anônimas negadas. Percorrer busca→perfil de carreira→jogo→retorno com dados já publicados. Admin autenticado: conferir lista/ordenação e abertura/retorno, sem salvar nem publicar dados humanos como teste.
5. Separar testes que escrevem: **smoke-foundation.mjs faz POSTs de negativa e tentativa Auth inválida real**; não executá-lo sob rótulo de inspeção somente leitura. Confirmação de escrita humana/produção e publicação de dados não fazem parte desta preparação. Registrar resultados/limites e obter o aceite aplicável.

## Rollback proposto

O ZIP contém `rollback-request.json`, **não executado**. Após revalidar a disponibilidade da versão anterior e a autorização da operação, a API Deployments do mesmo Worker pode direcionar100% à versão **35f5b882-70b1-48f7-8bb3-fda632bd458e**, estratégia percentage. Schema atual da API consultado nesta unidade; não enviar campos readonly de resposta.

Conferir novamente origem, aliases, namespace e Access. Não restaurar dados, apagar funções novas, reduzir RLS, rotacionar chave de sessão ou reexecutar migrations como parte desse rollback. A RPC antiga foi preservada para compatibilidade. A reversão do código não desfaz edições/publicações humanas feitas depois da liberação; qualquer correção de dados exige decisão própria.

## Limites e encerramento

O pacote corresponde ao SHA de produto3ed808b; a PR documental posterior não altera seu código. Piloto aceito e provas locais/CI estão consolidados. Não foram medidos volume real, concorrência PostgreSQL multissessão, SLA ou cobertura integral de tecnologias assistivas. Autocomplete real em dados humanos, login do responsável e aceite visual de produção continuam como verificações de liberação.

Com esta unidade integrada e sua CI conferida, a sequência **implementação → validação → preparação de liberação** fica concluída. Publicação remota permanece uma operação distinta. Sem boxscore, comparação de jogadores, recordes novos ou ampliação de escopo.
