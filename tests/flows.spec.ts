import { expect, test } from "@playwright/test";

test("campeonato, disputas, texto com pendências e elenco na própria lista", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "+ Novo campeonato", exact: true })
    .click();
  await page.getByLabel("Nome do campeonato *").fill("Copa de Avaliação");
  await page
    .getByRole("button", { name: "+ Adicionar categoria ou divisão" })
    .click();
  await page.getByLabel("Categoria *", { exact: true }).nth(1).fill("Sub-18");
  await page.getByRole("button", { name: "Salvar e abrir equipes" }).click();
  await expect(
    page.getByRole("heading", { name: "Equipes e elencos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Importar por texto", exact: true })
    .click();
  await page
    .getByLabel("Cole sua lista")
    .fill(
      "Equipe: Estrelas\n0 - Joana Santos\n00 - Maria Lima\n100 - Luiza Costa\n8 - Ana da Silva",
    );
  await page.getByRole("button", { name: "Gerar prévia" }).click();
  await expect(
    page.getByText("Camisa inválida: use 0, 00 ou 1–99."),
  ).toBeVisible();
  await page.getByLabel("Identidade linha 5").selectOption("new");
  await page
    .getByRole("button", { name: "Confirmar itens válidos (3)", exact: true })
    .click();
  await expect(
    page.getByText("3 itens confirmados.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Camisa linha 4")).toHaveValue("100");
  await page
    .locator("details.roster summary")
    .filter({ hasText: "Estrelas" })
    .click();
  await expect(
    page.getByRole("rowheader", { name: "Joana Santos" }),
  ).toBeVisible();
  await expect(page.getByLabel("Camisa de Joana Santos")).toHaveValue("0");
  await expect(page.getByLabel("Camisa de Maria Lima")).toHaveValue("00");
  await page.reload();
  await expect(page.getByLabel("Camisa linha 4")).toHaveValue("100");
  await page
    .getByRole("button", { name: "Campeonatos", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Copa de Avaliação", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recentes" })).toBeVisible();
});

test("PDFs com destinos distintos, identidade, falha parcial e retomada sem duplicação", async ({
  page,
}) => {
  await page.goto("/#/importar");
  await page.getByRole("button", { name: "Carregar lote de exemplo" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Estrelas x Aurora.pdf" })
    .getByRole("button", { name: "Revisar", exact: true })
    .click();
  await page.getByLabel("Identidade de J. Silva").selectOption("new");
  await page
    .getByRole("button", { name: "Confirmar associações deste jogo" })
    .click();
  await page.getByRole("button", { name: "Revisar confirmação" }).click();
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByText("2 jogos publicados na simulação.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Falha ao publicar este jogo. Tente novamente."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Falha ao publicar este jogo. Tente novamente."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revisar confirmação" }).click();
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByText("3 jogos publicados na simulação.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consulta pública" }).click();
  await expect(page.locator(".publication-list article")).toHaveCount(3);
});

test("súmula por teclado, participação sem ações, desfazer/refazer e republicação", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  await page.getByLabel("Beatriz Costa jogou").check();
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await expect(page.locator(".score")).toHaveText("2×0");
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.locator(".score")).toHaveText("0×0");
  await page.getByRole("button", { name: "Refazer" }).click();
  await page.getByRole("button", { name: "Revisar resultado" }).click();
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByText("Jogo confirmado e publicado na simulação."),
  ).toBeVisible();
  await page.getByLabel("Código", { exact: true }).fill("3");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Revisar resultado" }).click();
  await expect(
    page.getByText(
      "Informe um motivo de revisão com pelo menos 10 caracteres.",
    ),
  ).toBeVisible();
  await page
    .getByLabel("Motivo da revisão *")
    .fill("Correção de cesta no primeiro período.");
  await page.getByRole("button", { name: "Revisar resultado" }).click();
  await expect(page.getByText("Placar: 2 × 0 → 5 × 0")).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar e republicar", exact: true })
    .click();
  await expect(
    page.getByText("Resultado republicado na simulação.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Versão 1 · 2 × 0", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Camisa de Beatriz Costa")).toBeDisabled();
  await expect(page.getByLabel("Beatriz Costa jogou")).toBeChecked();
});

test("falha mantém trabalho e duas tentativas antigas exigem recarga explícita", async ({
  page,
  context,
}) => {
  await page.goto("/#/sumula");
  await page.getByText("Cenários de avaliação", { exact: true }).click();
  await page.getByLabel("Falhar na próxima gravação").check();
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByText("Falha ao salvar.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".score")).toHaveText("2×0");
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await expect(
    page.getByText("Salvo neste navegador.", { exact: true }),
  ).toBeVisible();
  const second = await context.newPage();
  await second.goto("/#/sumula");
  await page.getByLabel("Código", { exact: true }).fill("3");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  for (let i = 0; i < 2; i++) {
    await second
      .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
      .click();
    await expect(
      second.getByText("Este trabalho foi alterado em outra aba.", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(second.locator(".score")).toHaveText("2×0");
  }
  await second
    .getByRole("button", { name: "Recarregar versão salva", exact: true })
    .click();
  await expect(second.locator(".score")).toHaveText("5×0");
  await second.close();
});

test("trocar destino preserva conteúdo e invalida associações", async ({
  page,
}) => {
  await page.goto("/#/importar");
  await page.getByRole("button", { name: "Carregar lote de exemplo" }).click();
  await page
    .getByLabel("Destino de Lobos x Águias.pdf", { exact: true })
    .selectOption("m-sub18");
  await expect(
    page.getByText("Destino alterado: revise as associações.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Equipe A / inscrição")).toHaveValue("Lobos");
  await expect(
    page.getByRole("button", { name: "Confirmar associações deste jogo" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Selecionar Lobos x Águias.pdf", { exact: true }),
  ).toBeDisabled();
});

test("reflow a 320px, foco por teclado e aviso de saída não salva", async ({
  page,
}) => {
  page.on("dialog", (dialog) => void dialog.dismiss());
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para o conteúdo" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 1, name: "Campeonatos", exact: true }),
  ).toBeVisible();
  for (const route of [
    "/campeonatos",
    "/competicao",
    "/equipes",
    "/importar",
    "/sumula",
  ]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= 320),
    ).toBe(true);
  }
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page.getByRole("button", { name: "Voltar aos jogos" }).click();
  await expect(page).toHaveURL(/#\/sumula/);
  await expect(page.locator(".score")).toHaveText("2×0");
});

test("fallback exige decisão e motivo antes da confirmação", async ({
  page,
}) => {
  await page.goto("/#/sumula");
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page
    .getByText("Fonte do resultado e revisão de divergência", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Demonstrar divergência com PDF de exemplo" })
    .click();
  await page.getByRole("button", { name: "Revisar resultado" }).click();
  await expect(
    page.getByText("Resolva a divergência de fontes", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Justificativa do fallback *")
    .fill("Documento de origem conferido; usar a transcrição corrigida.");
  await page.getByRole("button", { name: "Usar súmula como fallback" }).click();
  await page.getByRole("button", { name: "Revisar resultado" }).click();
  await page
    .getByRole("button", { name: "Confirmar e publicar", exact: true })
    .click();
  await expect(
    page.getByText("Jogo confirmado e publicado na simulação."),
  ).toBeVisible();
});

test("novo confronto preserva o rascunho anterior e filtros voltam no retorno", async ({
  page,
}) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/#/sumula");
  await page.getByLabel("Código", { exact: true }).fill("2");
  await page.getByLabel("Código", { exact: true }).press("Enter");
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await page
    .getByText("Selecionar ou criar confronto nesta área", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar este confronto", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar rascunho da súmula", exact: true })
    .click();
  await page.getByRole("button", { name: "Voltar aos jogos" }).click();
  await expect(
    page.getByRole("button", { name: "Retomar súmula" }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Retomar súmula" }).nth(1).click();
  await expect(page.locator(".score")).toHaveText("2×0");
  await page.goto("/#/equipes");
  await page.getByLabel("Buscar equipe inscrita").fill("Lobos");
  await page.getByRole("link", { name: "Jogos", exact: true }).click();
  await page
    .getByRole("link", { name: "Equipes e elencos", exact: true })
    .click();
  await expect(page.getByLabel("Buscar equipe inscrita")).toHaveValue("Lobos");
});
