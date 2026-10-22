# Apresentação do marco 1

Estado: pronto para avaliação do responsável; nenhum aceite humano foi presumido. Dados fictícios e armazenamento local. A implementação completa, o acesso real por senha e a integração dependem desta avaliação.

## Abrir

Com `npm run dev`, acessar http://127.0.0.1:5173/. Composições desktop/celular em http://127.0.0.1:5173/docs/evidencias/index.html; arquivos correspondentes neste diretório. Sem o servidor, seguir o README para iniciá-lo. As oito capturas são geradas por `node scripts/capture-prototype.mjs` a partir da mesma UI.

## Percursos a avaliar

- [ ] **Campeonato e elencos:** Novo campeonato → nome/ano e duas disputas numa página → Salvar e abrir equipes → Importar por texto → colar exemplos do pacote → Gerar prévia → corrigir camisa inválida/repetida e decidir identidade de Ana da Silva → Confirmar itens válidos → expandir equipe e editar elenco. Camisas 0 e 00 são distintas. A pendência permanece recuperável após recarga. Avaliar clareza do contexto, das quatro abas e da edição na lista.
- [ ] **PDFs:** na Copa Metropolitana, Jogos → Importar PDFs → Carregar lote de exemplo → revisar Estrelas x Aurora em destino distinto → decidir identidade → Confirmar associações → Revisar confirmação → Confirmar e publicar. A falha simulada de Estrelas não desfaz os dois sucessos; tentar novamente publica apenas o restante. Revisar duplicata e substituir arquivo inválido. Trocar destino conserva conteúdo e exige nova revisão. Avaliar tabela, seleção e revisão na mesma área.
- [ ] **Súmula e correção:** Jogos → Criar jogo/preencher súmula → conferir relacionados/camisas/atleta-treinador → marcar quem jogou sem ações → digitar camisa/código e Enter → desfazer/refazer → salvar/retomar → revisar e Confirmar e publicar → lançar correção → motivo → prévia de impacto → Salvar e republicar. O resultado anterior permanece no histórico. Em “Fonte do resultado”, demonstrar divergência e fallback com justificativa. Avaliar teclado, densidade e conferência.
- [ ] **Estados e retorno:** em “Cenários de avaliação”, provocar falha de gravação e repetir; simular outra aba e tentar salvar duas vezes sem recarga; ambas são rejeitadas até “Recarregar versão salva”. Demonstrar carregamento e vazio, sair com edição não salva e cancelar a saída. Conferir que visitas não mudam Recentes e que filtros retornam.
- [ ] **Composição:** avaliar os mesmos percursos em desktop e celular, incluindo tabelas com rolagem interna. Registrar neste issue/PR quais composições são aceitas e o que precisa mudar.

## Evidências técnicas locais — 22/10/2026

`npm run gate`: PASS — ESLint, Prettier, TypeScript estrito, 42 testes unitários (incluindo os testes do motor copiado), build e detecção de padrões de segredos em fontes/artefato. `npm run test:e2e`: PASS — 16 cenários, oito em desktop e oito em celular, incluindo dois contextos de aba, falha parcial, fallback, histórico e reflow com largura máxima real de 320 CSS px. Os testes exercitam o protótipo, não um backend real.

O pacote preservado passou em `python verificar-pacote.py` (67 arquivos), 126 testes e TypeScript no harness. Esses arquivos não mudaram; a evidência original é reaproveitada, sem executar novamente sua suíte inteira. O CI verifica integridade e a aplicação nova em Linux. O checkpoint registra o commit e a execução aplicáveis.

As falhas encontradas durante a iteração foram corrigidas: largura indevida por elementos ocultos e mínimo automático de coluna de elenco, acionamento móvel, link de pular conteúdo alterando a rota, preservação de filtros/rascunho de jogo e alinhamento da mensagem de revisão. O gate e os percursos finais passaram após as correções.

Foi feita revisão pelo próprio autor, com o roteiro da skill de revisão. Não há ferramenta de subagentes/revisor independente nesta sessão; não declarar revisão externa aprovada. Nenhum merge para main foi realizado. A revisão humana do PR continua pendente.

## Limites desta evidência

Protótipo de apresentação: extração real de PDFs, Auth, autorização, RLS, migrations, Storage, idempotência/transações no servidor, classificação/chave real, exploradores públicos e provisionamento pertencem aos próximos marcos. O domínio da súmula é real; persistência e publicações são demonstrativas. O localStorage não oferece garantias transacionais entre processos e não é candidato à persistência produtiva.

O upload selecionado verifica metadados/assinatura e informa que a extração não está conectada, sem inventar resultados. Não há conta administrativa nem campo de senha neste protótipo. Nenhum dado real deve ser inserido. Amostras textuais reais ainda precisam de validação antes do aceite do importador produtivo.

Acessibilidade já verificada: HTML/labels, foco inicial/atalho para conteúdo e Enter no lançamento, reflow e teclado nos cenários automatizados, além de inspeção visual das composições. Leitor de tela, zoom real de navegador a 200%, contraste de todas as combinações e percursos inteiramente por teclado continuam na avaliação manual; não há declaração de conformidade WCAG completa.

Supabase: organização conectada e plano Free confirmados; capacidade/custo de um projeto novo ainda não aferidos. O custo será consultado para a organização escolhida antes de criar o projeto, sem contratar plano pago automaticamente. Cloudflare: identidade conectada respondeu, mas a consulta efetiva de API falhou com OAuth `invalid_client: Client not found`; reconexão necessária antes da integração/deploy. Nenhum banco/Storage foi criado ou alterado, nem repositório anterior consultado.

`PROTOTIPO-E-APROVACAO.md`, citado em EXPERIENCIA, não existe no ZIP. Foi usada a seção explícita “Primeira entrega: protótipo navegável”; essa lacuna não impediu a apresentação.

## Feedback e aceite

Responsável, data e decisão: pendentes.

Registrar ajustes de composição/interação e aprovação individual dos três percursos no issue e PR deste marco. Depois do aceite, o próximo plano é a fundação full-stack, com novo projeto Supabase, acesso por senha e preview protegido conforme o pacote.
