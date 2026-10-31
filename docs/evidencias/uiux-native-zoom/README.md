# Zoom nativo desktop da súmula

Prova automatizada separada da suíte padrão, com fixtures locais e perfil temporário isolado do Chromium fornecido pelo Playwright. Não usa conta, perfil pessoal, preview remoto ou banco real.

```powershell
npx playwright test --config docs/evidencias/uiux-native-zoom/playwright.config.ts
```

O runner carrega uma extensão local ManifestV3 somente no perfil descartável para chamar `chrome.tabs.setZoom(2)` e conferir `getZoom()`. Não usa `page.setViewportSize`, CSSzoom ou pinch como substituto do zoom. Mede área útil eDPR antes/depois. O tamanho passado na inicialização é da janela; área útil menor por bordas/controles é registrada nosJSONs.

Referências oficiais consultadas: [extensões no Playwright](https://playwright.dev/docs/chrome-extensions) e [Tabs API do Chromium](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom).

Verifica preparação e lançamento, empilhamento das duas equipes, overflow local, rolagem por teclado quando necessária e abertura/Escape/retorno do foco do diálogo de edição. Perfis são fechados no `finally`. Artefatos ficam em `.preview-artifacts/native-zoom200-*`; só dados sintéticos. A extensão não é instalada no navegador do responsável ou incluída no build do produto.

As capturas usam CDP da viewport após rolar até as tabelas. A primeira tentativa com screenshot do elemento sob zoom recortava a região errada; não é usada como evidência visual final. Conferir imagens eJSONs, não apenas código de saída.

Resultado em28/10/2026: **2PASS/11,5s**, fonte da composição5f9a683 (mesmo frontend1e73ae0), Windows/Chromium headless, janelas1366×768 e1920×1080. Área útil1350×673→675×336 e1904×985→952×492; DPR1→2, `getZoom=2`. Log `.preview-artifacts/native-zoom-reproducible.log`. Prova do mecanismo nativo em automação; não equivale a aceite visual humano, leitor de tela, zoom do sistema operacional ou auditoriaWCAG completa.
