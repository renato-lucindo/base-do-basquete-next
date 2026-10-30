# Skills de UI/UX — origem e uso

As regras do produto estão em [PADROES](PADROES.md), [Público](PUBLICO.md) e [Administração](ADMIN.md). Skills recomendam técnicas; não substituem decisões, contratos ou autorização de publicação.

## ui-ux-pro-max — versão no Git

- Arquivos: [`.agents/skills/ui-ux-pro-max/`](../../.agents/skills/ui-ux-pro-max/SKILL.md), com `data/`, `references/`, `scripts/` e [licença MIT](../../.agents/skills/ui-ux-pro-max/LICENSE).
- Origem: `nextlevelbuilder/ui-ux-pro-max-skill` em `.claude/skills/ui-ux-pro-max/`.
- Commit de origem: `28b3b8dee8c976df4fa3e94aed4e092ad43fcb03`.
- SHA-256 do `SKILL.md` original: `88aadd21220542083a455e373bd162ffe7843266a71f06f4d837bb3b34f9c9c7`.
- SHA-256 do `SKILL.md` adaptado ao repositório: `c163d66640836e58d537a383b48a14c95fb515ecc4db675d1585b923d3ea0e27`.
- Adaptação local: os exemplos de comando usam `.agents/skills/ui-ux-pro-max/scripts/search.py` a partir da raiz do projeto, porque a variável `CLAUDE_PLUGIN_ROOT` não aponta para a cópia versionada. Os catálogos, scripts de consulta e a licença foram preservados. Testes upstream que dependiam de ferramentas de manutenção não distribuídas (atualização de catálogos e avaliação de relevância) foram retirados com suas fixtures exclusivas. Os testes de snapshots e dos caminhos documentados foram adaptados para este repositório; os demais testes permanecem. A CI executa `python3 -m unittest discover -s .agents/skills/ui-ux-pro-max/scripts/tests -q`. Pesquisas pontuais com Python 3:

```powershell
python .agents/skills/ui-ux-pro-max/scripts/search.py "keyboard focus accessible" --domain ux
```

Verifique a pertinência da recomendação antes de adotá-la. Atualizações exigem conferir nova origem, diferenças, licenças, dependências e hashes. Não modificar nem copiar automaticamente instalações pessoais.

## web-design-guidelines — instalação local

- Origem: `vercel-labs/agent-skills`, arquivo `skills/web-design-guidelines/SKILL.md`.
- Commit de referência consultado: `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`.
- Regras atuais: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`. A skill recomenda consultar a fonte a cada revisão.
- Não foi identificada licença de redistribuição no repositório `vercel-labs/agent-skills`; a skill não foi copiada para o Git. Agentes com instalação local podem usá-la. Sem instalação, consultar a fonte de diretrizes e informar a limitação, sem afirmar que executaram a skill.

O `skills-lock.json` e as instalações não rastreadas do checkout original pertencem ao responsável e não foram alterados. Uma versão instalada localmente pode diferir da vendorizada.

## Evidências

Registrar versão/origem consultada, arquivos e linhas revisados, problemas reproduzidos e limites. Recomendações das skills não comprovam WCAG, aceite humano nem o funcionamento de um percurso completo.
