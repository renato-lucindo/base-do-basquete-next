# Apresentação do marco 1

Estado: pronto para avaliação do responsável; nenhum aceite humano foi presumido. Dados fictícios e armazenamento local. A implementação completa, o acesso real por senha e a integração dependem desta avaliação.

## Abrir

Remoto: [protótipo protegido](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/) e [composições desktop/celular](https://base-do-basquete-prototipo.renato-lucindo-jr.workers.dev/docs/evidencias/). Usar `renato.lucindo.jr@gmail.com` no Cloudflare Access e o código recebido por e-mail. Só essa identidade é autorizada; login humano ainda precisa de conferência pelo responsável. Rascunhos ficam neste navegador, sem sincronização entre máquinas.

Local: com `npm run dev`, acessar http://127.0.0.1:5173/. Composições em http://127.0.0.1:5173/docs/evidencias/index.html. As oito capturas são geradas por `node scripts/capture-prototype.mjs` a partir da mesma UI.

## Percursos a avaliar

- [ ] **Campeonato e elencos:** Novo campeonato → nome/ano e duas disputas numa página → Salvar e abrir equipes → Importar por texto → colar exemplos do pacote → Gerar prévia → corrigir camisa inválida/repetida e decidir identidade de Ana da Silva → Confirmar itens válidos → expandir equipe e editar elenco. Camisas 0 e 00 são distintas. A pendência permanece recuperável após recarga. Avaliar clareza do contexto, das quatro abas e da edição na lista.
- [ ] **PDFs:** na Copa Metropolitana, Jogos → Importar PDFs → Carregar lote de exemplo → revisar Estrelas x Aurora em destino distinto → decidir identidade → Confirmar associações → Revisar confirmação → Confirmar e publicar. A falha simulada de Estrelas não desfaz os dois sucessos; tentar novamente publica apenas o restante. Revisar duplicata e substituir arquivo inválido. Trocar destino conserva conteúdo e exige nova revisão. Avaliar tabela, seleção e revisão na mesma área.
- [ ] **Súmula e correção:** Jogos → Criar jogo/preencher súmula → conferir relacionados/camisas/atleta-treinador → marcar quem jogou sem ações → digitar camisa/código e Enter → desfazer/refazer → salvar/retomar → revisar e Confirmar e publicar → lançar correção → motivo → prévia de impacto → Salvar e republicar. O resultado anterior permanece no histórico. Em “Fonte do resultado”, demonstrar divergência e fallback com justificativa. Avaliar teclado, densidade e conferência.
- [ ] **Estados e retorno:** em “Cenários de avaliação”, provocar falha de gravação e repetir; simular outra aba e tentar salvar duas vezes sem recarga; ambas são rejeitadas até “Recarregar versão salva”. Demonstrar carregamento e vazio, sair com edição não salva e cancelar a saída. Conferir que visitas não mudam Recentes e que filtros retornam.
- [ ] **Composição:** avaliar os mesmos percursos em desktop e celular, incluindo tabelas com rolagem interna. Registrar neste issue/PR quais composições são aceitas e o que precisa mudar.

## Evidências técnicas locais — 22/10/2026

`npm run gate`: PASS — ESLint, Prettier, TypeScript estrito, 42 testes unitários (incluindo os testes do motor copiado), build e detecção de padrões de segredos em fontes/artefato. `npm run test:e2e`: PASS — 16 cenários, oito em desktop e oito em celular, incluindo dois contextos de aba, falha parcial, fallback, histórico e reflow com largura máxima real de 320 CSS px. Os testes exercitam o protótipo, não um backend real.

O pacote preservado passou em `python verificar-pacote.py` (67 arquivos), 126 testes e TypeScript no harness. Esses arquivos não mudaram; a evidência original é reaproveitada, sem executar novamente sua suíte inteira. O CI verifica integridade e a aplicação nova em Linux. O checkpoint registra o commit e a execução aplicáveis.

CI remoto **aprovado** após o responsável tornar o repositório público. A execução [39864863368](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39864863368), no transporte `f6073be`, terminou com sucesso em 22/10/2026. Inclui gate, integridade dos insumos, três testes do transporte e 16 cenários de navegador em Linux. Nenhuma configuração financeira foi alterada. Evidências de aplicação e capturas inalteradas são reaproveitadas; alterações apenas documentais não disparam a suíte.

Preview publicado pelo plugin Cloudflare com Access configurado antes de habilitar o hostname. Comparados os hashes SHA-256 dos 13 arquivos remotos com o pacote local: todos iguais. Smoke autenticado de abertura/interação dos três fluxos em desktop (1440 px) e celular (390 px), galeria e ausência de erros de página: PASS. Esse smoke verifica transporte; não repete nem substitui o aceite dos percursos completos. Sete consultas finais anônimas/com cabeçalhos de identidade falsificados: HTTP 302 para Access, sem conteúdo da aplicação. Tokens de teste e políticas temporárias foram removidos; permanece somente a regra individual por e-mail. URLs de versões alternativas desabilitadas.

Feedback: [issue #1](https://github.com/renato-lucindo/base-do-basquete-next/issues/1). Código em revisão: [PR draft #2](https://github.com/renato-lucindo/base-do-basquete-next/pull/2).

As falhas encontradas durante a iteração foram corrigidas: largura indevida por elementos ocultos e mínimo automático de coluna de elenco, acionamento móvel, link de pular conteúdo alterando a rota, preservação de filtros/rascunho de jogo e alinhamento da mensagem de revisão. O gate e os percursos finais passaram após as correções.

Foi feita revisão pelo próprio autor, com o roteiro da skill de revisão. Não há ferramenta de subagentes/revisor independente nesta sessão; não declarar revisão externa aprovada. Nenhum merge para main foi realizado. A revisão humana do PR continua pendente.

## Limites desta evidência

Protótipo de apresentação: extração real de PDFs, Auth, autorização, RLS, migrations, Storage, idempotência/transações no servidor, classificação/chave real, exploradores públicos e provisionamento pertencem aos próximos marcos. O domínio da súmula é real; persistência e publicações são demonstrativas. O localStorage não oferece garantias transacionais entre processos e não é candidato à persistência produtiva.

O upload selecionado verifica metadados/assinatura e informa que a extração não está conectada, sem inventar resultados. Não há conta administrativa nem campo de senha neste protótipo. Nenhum dado real deve ser inserido. Amostras textuais reais ainda precisam de validação antes do aceite do importador produtivo.

Acessibilidade já verificada: HTML/labels, foco inicial/atalho para conteúdo e Enter no lançamento, reflow e teclado nos cenários automatizados, além de inspeção visual das composições. Leitor de tela, zoom real de navegador a 200%, contraste de todas as combinações e percursos inteiramente por teclado continuam na avaliação manual; não há declaração de conformidade WCAG completa.

Supabase: organização conectada e plano Free confirmados; capacidade/custo de um projeto novo ainda não aferidos. Consultar antes de criar, sem contratar plano pago automaticamente. Cloudflare: leitura e escrita pelo plugin funcionam; Billing retorna 403 por falta de escopo OAuth, sem inferência de custos ou alteração de assinatura. O upload de Static Assets recebeu HTTP 401 no envio com JWT transitório do conector; o preview usa módulos estáticos do Worker conforme decisão 002. Nenhum banco/Storage ou serviço anterior foi alterado, nem repositório anterior consultado.

`PROTOTIPO-E-APROVACAO.md`, citado em EXPERIENCIA, não existe no ZIP. Foi usada a seção explícita “Primeira entrega: protótipo navegável”; essa lacuna não impediu a apresentação.

## Feedback e aceite

Solicitação de capitão/comissão aplicada: selecionar capitão por equipe, marcar “Sem técnico: capitão assume” e conferir “Técnico” preenchido automaticamente, sem “Ass. Técnico”. Desmarcar permite técnico próprio/assistente, mantendo o capitão separado. Conferir recuperação do rascunho e desfazer da troca; faltas de atleta/técnico combinam somente quando o capitão assume. Alteração incompatível com ações posteriores deve ser recusada sem perda. Gate desta unidade PASS: 51 testes unitários/três de transporte; navegador PASS **28 cenários**, incluindo quatro novas execuções desktop/celular. Dois screenshots da súmula atualizados; demais composições e evidência do harness imutável reaproveitadas.

Preview atual: aplicação `0f40ac1`, transporte `d5b09b0`, 13 hashes remotos conferidos. Smoke autenticado dos três fluxos, teclado, revisão de ações e comissão técnica aprovado em dois tamanhos; credencial/política transitórias revogadas e seis consultas anônimas finais redirecionadas ao Access. CI [39874315721](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39874315721), job `prototype`, aprovado com gate e 28 cenários Linux. Registros anteriores abaixo permanecem como histórico.

Feedback de 22/10 aplicado à súmula conforme `docs/AJUSTES-DE-EXPERIENCIA.md`: cores suaves por quarto, ordenação alternativa e edição/exclusão individual. Conferir: lançar fora de ordem → selecionar “Por quarto” → editar uma ação anterior → conferir recálculo → excluir outra com confirmação → desfazer/refazer → salvar e recarregar. Em resultado publicado, conferir motivo e preservação da versão anterior. As ações anteriores às últimas trinta também ficam acessíveis.

Verificação desta unidade: gate consolidado PASS (46 testes unitários, três de transporte, lint, formatação, TypeScript, build e segredos); navegador PASS 20/20, incluindo as quatro novas execuções desktop/celular para correção individual e acesso a ações antigas. Duas capturas da súmula renovadas; seis composições dos fluxos inalterados reutilizadas. Não foi repetido o harness dos insumos imutáveis.

Publicado no mesmo preview protegido: aplicação `f8b6663`, transporte `7e8d4f5`, com 13 hashes remotos conferidos e smoke dos ajustes em desktop/celular aprovado. Credencial/política temporária revogadas e seis consultas anônimas finais bloqueadas pelo Access. CI [39870512378](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39870512378), job `prototype`, aprovado com gate e 20 cenários Linux. A apresentação inicial acima conserva a identificação da evidência anterior; esta atualização é a versão atual.

Responsável, data e decisão: pendentes.

Solicitação adicional de teclado aplicada: `camisa → Enter → ação → Enter`, retorno à camisa selecionada, Alt+A/B para equipe, Alt+1–4 para quarto e Alt+Q para selecionar período/OT. Conferir a sequência enviada pelo responsável, sem mouse depois de preparar os relacionados; erros devem manter valores e foco para correção, sem lançar ações. Gate atualizado aprovado com 46 testes unitários/três de transporte e **24 cenários de navegador**, incluindo quatro novas execuções desktop/celular do ciclo e dos atalhos. O mesmo teste cobre 0/00 e repetição de camisa. Detalhes em `docs/AJUSTES-DE-EXPERIENCIA.md`.

Versão atual publicada: aplicação `971eab0`, transporte `22468bb`; 13 hashes remotos conferidos, smoke de teclado/atalhos e dos ajustes anteriores aprovado em dois tamanhos, e seis consultas anônimas finais bloqueadas após revogar a credencial transitória. CI [39871462417](https://github.com/renato-lucindo/base-do-basquete-next/actions/runs/39871462417), job `prototype`, aprovado com gate e 24 cenários Linux. Os registros anteriores desta página permanecem como histórico das evidências.

Registrar ajustes de composição/interação e aprovação individual dos três percursos no issue e PR deste marco. Depois do aceite, o próximo plano é a fundação full-stack, com novo projeto Supabase, acesso por senha e preview protegido conforme o pacote.
