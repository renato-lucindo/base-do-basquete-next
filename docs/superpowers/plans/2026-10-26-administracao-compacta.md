# Administração compacta — plano aprovado

Autorização: implementar o plano apresentado nesta conversa em 26/10/2026. Desktop primeiro; consulta pública, mobile, PDF e interpretador ficam fora deste recorte.

## Unidades

1. Catálogo global de locais: migração aditiva, reaproveitamento dos nomes já salvos sem reescrever jogos, coleta transacional após gravação efetiva, consulta administrativa paginada, combobox com busca e novo nome no formulário de jogo. Contrato de salvamento continua recebendo `venue` como texto opcional.
2. Adicionar atleta: diálogo compacto, nenhuma busca vazia, resultados sobrepostos após dois caracteres, teclado e páginas; criação/vínculo no mesmo diálogo, opcionais recolhidos, preservação de homônimos, ACK, reautenticação, versões e foco. Não criar outra pessoa quando só o vínculo falhou.
3. Composição piloto: Jogos e Equipes e elencos com identidade do primeiro protótipo, cabeçalho curto, contexto e ações junto aos dados, formulários em colunas e tabelas compactas. Apresentar comparação antes/depois em 1366×768 e 1920×1080 para validação visual antes de expandir o padrão às demais áreas administrativas.
4. Depois da validação visual: aplicar o padrão às demais telas administrativas. Preservar motor, teclas e duas equipes lado a lado na súmula.

## Validação e entrega

Testes focais RED→GREEN de PostgreSQL real (zero/upgrade, RLS/grants, autorização fresca, deduplicação, transação/replay/rollback), contratos/adapter/Worker e browsers desktop dos fluxos afetados. Gate/CI quando a unidade vertical estiver estável; reutilizar evidências inalteradas. Preview protegido com smokes novos; nenhum dado humano apagado ou substituído.

## Decisões de implementação

- Catálogo privado global, sem publicação implícita de agenda ou locais; API só para administrador ativo. Normalização preserva caracteres Unicode, ignorando acentos combinantes, caixa e espaços repetidos; não colapsa nomes não latinos em chave vazia.
- Guardar o nome no jogo preserva o contrato e o histórico. O catálogo não fornece renomeação/remoção nesta unidade.
- Manter o checkout sequencial em branch `codex/admin-compacta` sobre `a9c7e0e`; nenhum escritor paralelo. `.agents/` e `skills-lock.json` foram adicionados pelo responsável e permanecem fora dos commits desta unidade.
- Acesso remoto ao protótipo pediu Cloudflare Access; versão local preservada foi inspecionada. Não declarar auditoria visual autenticada da aplicação real.

## Ledger

- Início: 47 migrations remotas até `20261026232327`, 5 jogos/2 nomes de local/64 pessoas observados em consulta somente leitura. Dados humanos continuam mudando; preservar novidades. Preview permanece na fonte `3eca459`.
- V1: iniciar teste PostgreSQL de catálogo com jogos preexistentes e salvamento real; ainda sem DDL remota.
- V1 banco/API concluídos: commits `31b4b47`/`b72fcf8`; migração remota `20261027001504` reconciliada sem mudar bytes. Contratos PostgreSQL/Supabase/adapter/workerd aprovados, detalhes em `docs/VALIDACAO-ADMIN-COMPACTA.md`.
- V1 interface WIP: combobox e primeiro browser implementados. Falha de referências no pai corrigida e typecheck aprovado; browser ainda pendente. Pausa ao atingir cota real 85% em cinco horas. Não iniciar gate/novo bloco agora.
- Retomada27/10: V1/V2 e piloto desktop implementados.551unitários/6transportes/13PG/22workerd/4PDFs em gate localPASS, composição27browsers e9focais finais aprovados, evidências na validação. Próximo: CI integral e preview protegido; sódepois apresentar piloto para validação visual. Não expandir outras áreas sem essa validação; continuar fila independente autorizada.
