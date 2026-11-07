# Regulamento simplificado — plano autorizado em 06/11/2026

Unidade: `codex/regulamento-fiba`, base `39ed1c42975c44d775460517c15ff66211a9f7ac`.

## Resultado e limites

A aba Regulamento passa a reunir participantes, grupos/formato e revisão/publicação numa tela. Novas configurações recebem pontuação e desempates FIBA 2026: vitória 2, derrota 1, W.O. 0 e 20–0. Exceções ficam recolhidas, identificadas como personalizadas e justificadas. Grupos têm um ou dois turnos e usam jogos já cadastrados. Publicar antes do primeiro resultado é permitido, sem exigir agenda completa.

Empate não resolvido não bloqueia salvar/publicar. O administrador pode definir a ordem/quem avançou e registrar comentário privado; guardar autor, data e contexto da decisão, sinalizando revisão quando os fatos relevantes mudarem. Não exigir ou implementar sorteio.

Fora: insuficiência de jogadores, reincidência de W.O., geração de jogos, cópia entre edições, automação de cruzamentos, comparação entre grupos e alterações no mata-mata. Sem deploy, DDL/DML remoto ou publicação de dados reais nesta autorização.

## Execução e interfaces

1. Domínio: política de cálculo opcional e versionada; ausência conserva algoritmo legado. Padrão FIBA reinicia critérios no subconjunto ainda empatado. Testar exemplos oficiais nos motores de fatos e de ocorrências.
2. Persistência: estender contratos privados/públicos e validação SQL por migration nova; turnos e decisões manuais auditadas. Comentários privados nunca entram no snapshot público. Decisão manual vale apenas para o empate e contexto revisados, sem posições fictícias quando pendente.
3. Interface: padrões automáticos, adoção explícita em regulamentos antigos, participantes/grupos/jogos por nomes, regras avançadas recolhidas, justificativas e resolução manual; manter guardas de sessão, conflito e confirmação incerta. Rascunho incompleto precisa persistência própria, sem enfraquecer a definição oficial.
4. Verificação: testes de domínio/SQL/contratos, percurso administrativo e consulta pública antes/depois de publicar; teclado, mobile e desktops previstos; gate completo e CI. Revisão autoral separada se não houver ferramenta de revisor independente.

## Fontes e decisões

- Fonte normativa: https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-1.pdf (art. 20 e D.1; demais regras excluídas pelo responsável).
- Prevalece o plano final desta conversa, não o plano amplo anterior.
- Checkpoint vigente em `docs/PROGRESSO.md`; evidências e próximos passos serão atualizados na mesma unidade/PR.
