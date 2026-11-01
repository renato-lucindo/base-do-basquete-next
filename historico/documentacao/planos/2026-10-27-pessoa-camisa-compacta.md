# Cadastro de pessoa compacto e camisa contextual

Execução inline com as skills de continuidade, escrita de plano, TDD e revisão web-design-guidelines. Pedido humano explícito: campos expostos, tamanhos proporcionais e camisa dentro de Editar pessoa. Decisões reversíveis já delegadas; não ampliar o piloto às demais áreas.

**Objetivo:** editar dados globais e camisa da inscrição ativa no mesmo diálogo, sem expansões desnecessárias e sem confundir camisa atual com histórico de jogo.

**Base:**3936e2b, branch sequencial `codex/pessoa-camisa-compacta`. `.agents/` e `skills-lock.json` são humanos e permanecem fora dos commits.

## Unidades e validação

- [x] RED desktop em `tests/people.spec.ts`: campos opcionais já visíveis, altura/peso/ano em colunas curtas, camisa no mesmo diálogo, ausência do botão Editar camisa. Capturas1366×768 e1920×1080.
- [ ] `src/people/person-fields.tsx`/CSS: grupos abertos, nome/apelido mais largos, números curtos, biografia compacta, rótulos/foco intactos. Reusar essa organização ao cadastrar pessoa/atleta/técnico no mesmo componente; sem redesenhar painéis públicos ou outros módulos.
- [ ] `src/people/workspace.tsx`: ao editar pessoa de vínculo ativo, incluir comando de camisa da inscrição. Validar ambos antes de escrever; preservar0/00/null, versão e contexto. Não alterar camisa histórica ou inscrição irmã; vínculo encerrado não ganha edição de camisa.
- [x] Salvamento usa contratos existentes, sem DDL/RPC nova: salvar somente as partes alteradas e recuperar ACK por comando. Dados globais e vínculo são operações separadas; em falha parcial informar o que já foi salvo, congelar intenção e retomar etapa pendente sem repetir POST confirmado. Conflito exige recarregar ambos; reautenticação conserva intenção.
- [x] Testes focais de recuperação, conflito, camisa duplicada, dados inalterados e cancelamento/foco. Adaptar teste antigo da camisa ao novo caminho sem remover asserções de domínio.
- [x] Gate/CI após estabilidade, PR draft e publicação no mesmo preview protegido com smokes/revogação. Reutilizar evidências de SQL/artefatos inalterados; não testar dados humanos por mutações.

## Limites

Desktop prioritário; mobile/PDF/parser/público adiados. Motor, contratos e histórico preservados. A aprovação visual geral continua pendente; este feedback autoriza o ajuste específico. Cota real entre unidades e antes de gates/deploy; aos85%usados5h, checkpoint/push e retomada oficial no reset real+2.
