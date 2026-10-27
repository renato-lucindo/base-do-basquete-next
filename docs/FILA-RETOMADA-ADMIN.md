# Fila adicional autorizada — 26/10/2026

O responsável pediu ampliar a fila para continuar trabalhando nas próximas janelas caso as tarefas prioritárias terminem. Esta fila complementa o plano de administração compacta; não altera as dependências de validação humana.

## Ordem de execução

1. Concluir locais, diálogo de atleta e piloto compacto de Jogos/Equipes conforme plano aprovado; testes focais, gate/CI estáveis e preview protegido. Apresentar comparação visual para validação.
2. Enquanto aguarda o aceite visual, revisar e corrigir defeitos comprovados nos fluxos desktop de cadastro/vínculo: homônimos, tentativa após cadastro salvo e vínculo falho, ACK perdido, reautenticação, duas abas, cancelamento e foco. Cobrir apenas lacunas reais; reutilizar provas existentes.
3. Medir e corrigir desperdícios das buscas/listas administrativas afetadas: consultas vazias desnecessárias, respostas antigas substituindo a busca atual, resultados sem limite, paginação e expansão involuntária. Usar dados fictícios próprios, sem simular prova de carga em produção; nenhuma alteração de matching sem caso RED que a justifique.
4. Retomar a entrega já iniciada de remoção de inscrição vazia (branch `codex/ciclo-inscricoes`, PR25). Ler seu plano e validação via Git antes de portar o código para branch sequencial baseada na aplicação atual; a migration45 já existe no banco e NÃO deve ser reaplicada. Preservar catálogo/diálogo/súmula atuais; adaptar API/UI e comprovar elegibilidade autoritativa, dependências, versões, ACK/replay e confirmação explícita. Nunca excluir registros humanos por ferramentas; testes só com fixtures próprias e rollback. Gate/CI/preview apenas após estabilização da composição, sem ressuscitar código obsoleto. Esta entrega não equivale ao ciclo de vida A26 completo.
5. Atualizar uma matriz concisa do escopo inicial: entregue, tecnicamente disponível sem aceite, pendente independente e bloqueado por decisão humana. Registrar próximos passos concretos sem declarar aprovação ausente.

## Limites e continuidade

- Aplicar a identidade piloto às demais telas somente após a validação visual exigida no plano. Aguardar essa validação não impede os itens independentes acima.
- Público, mobile, PDF, interpretador e novas regras de publicação de agenda/inscritos continuam adiados. Não inferir decisões humanas pendentes nem repetir perguntas já adiadas.
- Não repetir gates/suítes por troca de janela nem inventar trabalho para consumir cota. Corrigir apenas problemas demonstrados dentro do escopo.
- Ao atingir 85% usados na janela de cinco horas: checkpoint, push seguro e atualizar a MESMA automação para dois minutos após o reset real seguinte. A segunda janela mencionada pelo responsável, aproximadamente05h53, deve ser confirmada pela ferramenta; não presumir horário exato nem criar agendamento duplicado.
- A automação só termina ao esgotar a fila independente autorizada ou em cancelamento. Se restarem apenas decisões/aceites humanos, registrar isso e pausar em vez de tentar repetidamente.
