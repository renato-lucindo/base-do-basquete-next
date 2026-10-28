# 017 — Perfil confirmado independe do cadastro e da participação

25/10/2026. CONTRATOS§Perfil público: identidade estável, nome obrigatório, demais campos públicos opcionais. Ter participação publicada não torna públicos os campos opcionais do cadastro. Confirmar um perfil sem jogos não cria estatísticas, equipe atual, camisa ou placar.

P1 usa snapshots próprios de metadados, somente para identidades de atleta, com publicação atual e histórico privado imutável. Comando recebe referências/versões e confirmação explícita; servidor lê os campos permitidos sob lock. Sexo, nascimento completo e registro federativo não entram na projeção pública. Ano público não é derivado da data privada. Editar cadastro não republica perfil nem jogos.

Autoridade fresca e lock de comando precedem pessoa/atleta; recibo conhecido retorna ACK original após autorização, mesmo depois de uma revisão. Leituras de proposta/estado usam o mesmo lock de identidade para manter pessoa, versão e publicação consistentes; isso não prova corrida PostgreSQL multiconexão. Recentes de campeonatos com vínculos conhecidos são tocados após locks de identidade e competição em ordem determinística, somente na confirmação nova.

Metadados e motivos têm limites explícitos em unidades UTF16 nos contratos novos e no SQL; motivos de revisão exigem ao menos3pontos Unicode. O runtime instalado conta max de strings por pontos Unicode, portanto o contrato do perfil verifica também string.length para manter essa decisão. Isso não altera os contratos anteriores. Caracteres não representáveis em PostgreSQL são recusados no contrato antes da operação.

Sem fotos, visibilidade por campo, autorização por user_metadata ou publicação implícita de agenda/inscritos. Fontes de participações, carreira, honrarias e UI pertencem a P2–P4; P1 não as antecipa.
