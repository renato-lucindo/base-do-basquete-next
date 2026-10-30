# UI/UX público — decisões do MVP

Decisões da conversa de 29/10/2026 para orientar **implementação futura**; não constituem prova de que o fluxo esteja implantado ou aceito. Consulte [MATRIZ-ESCOPO.md](../MATRIZ-ESCOPO.md) e [PROGRESSO.md](../PROGRESSO.md) para o estado real.

## Encontrar e abrir uma disputa

1. A página inicial lista as **competições**, com busca no topo. A busca global cobre competições, disputas, equipes e jogadores; **não** busca jogos no MVP.
2. O percurso é **Competição → Ano → Naipe → Categoria/Divisão**. A ordem Categoria/Divisão é configurável por edição; não inventar níveis ausentes no domínio.
3. No desktop, árvores de navegação **Masculino** e **Feminino** ficam **lado a lado** quando existirem ambos. Com apenas um naipe, não criar coluna vazia. No celular, a árvore se adapta verticalmente.
4. A seleção rápida combina **árvore expansível** e **busca pesquisável**; sem obrigar uma série de páginas intermediárias.
5. Abrir uma disputa leva diretamente à **Classificação**. O menu contextual contém **Classificação, Jogos, Equipes, Jogadores**, com indicação da disputa e retorno previsível à seleção.

```text
[ Buscar competições, equipes ou jogadores... ]

▼ Copa ES
  ▼ 2026
    MASCULINO           FEMININO
    Sub-14              Sub-14
    Sub-16              Sub-17
    Adulto              Sub-19
      Série Ouro
      Série Prata
      Série Bronze
```

Exemplo ilustrativo; respeitar dados reais de cada edição.

## Páginas da disputa

| Página        | Regra de experiência                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Classificação | Tabelas por grupo e abas de fase quando aplicável. Se indisponível/não publicada, explicar e manter as demais páginas acessíveis. |
| Jogos         | Lista **única e compacta, ordenada por data**; rodadas não são obrigatórias. Acesso ao detalhe com contexto preservado.           |
| Equipes       | Listagem/tabela de desempenho e entrada no perfil da equipe.                                                                      |
| Jogadores     | Tabela pesquisável de estatísticas individuais e acesso ao perfil do atleta.                                                      |

## Estatísticas e publicação

- **Jogo de súmula:** indicadores existentes no Next; **jogo de boxscore:** indicadores elegíveis do `renato-lucindo/base-do-basquete` anterior, adaptados à arquitetura Next. Nunca juntar métricas incompatíveis nem exibir zero para dado ausente.
- Expor cobertura, unidade e fonte dos indicadores quando necessário. Atletas podem ter vínculos com equipes diferentes; nomes sozinhos não identificam pessoa ou participação.
- Reaproveitar a navegação pública bem resolvida do projeto anterior de modo seletivo, sem importar regras de publicação, contratos ou dependências antigas.
- Para as referências de súmula e estatísticas, seguir [INTEGRACAO.md](INTEGRACAO.md) e [VALIDACAO.md](VALIDACAO.md).
- A publicação respeita confirmação explícita e fontes públicas do Next. **Não** expor automaticamente inscrições, classificação ou agenda futura por mera existência de rascunho ou regulamento. A decisão sobre elegibilidade pública desses dados continua sem aceite, conforme [decisão 013](../decisoes/013-classificacao-publica-confirmada.md).

**Recomendações ainda sem aceite expresso:** preservar a estrutura atual dos perfis do Next e acrescentar melhorias pontuais do projeto anterior; equipes com identificação, estatísticas, elenco e jogos; jogadores com identificação, equipe, estatísticas e jogos. A validação responsiva é obrigatória para alterações afetadas pelos [padrões comuns](PADROES.md), mesmo sem aprovação específica dessas composições.
