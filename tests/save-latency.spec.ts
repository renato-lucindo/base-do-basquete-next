import { test, expect } from "@playwright/test";
import { textImportFixture, openTextImport } from "./fixtures/text-import";
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

for (const partialFailure of [false, true])
  test(`reconsulta o elenco ao terminar o lote${partialFailure ? " com sucesso parcial" : ""}, sem disputar a fila entre atletas`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Recorte de desempenho desktop.",
    );
    const f = await textImportFixture(page);
    if (partialFailure) f.failedNames.add("Carla Souza");
    await openTextImport(page);
    await page
      .getByLabel("Texto do elenco", { exact: true })
      .fill(
        "10 - Beatriz Costa\n11 - Carla Souza\n12 - Daniela Ramos\n13 - Elisa Dias",
      );
    await page
      .getByRole("button", { name: "Interpretar texto", exact: true })
      .click();
    const confirm = page.getByRole("button", {
      name: "Confirmar selecionados",
      exact: true,
    });
    await expect(confirm).toBeEnabled();
    let rosterReads = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/roster") rosterReads++;
    });
    let confirmations = 0;
    const second = deferred();
    const release = deferred();
    await page.route("**/api/text-import/confirm", async (route) => {
      if (++confirmations === 2) {
        second.resolve();
        await release.promise;
      }
      await route.fallback();
    });
    await confirm.click();
    await second.promise;
    await expect(page.getByText(/1 confirmado ·/)).toBeVisible();
    // Flush effects after the first committed row while the second response is held.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    try {
      expect(rosterReads).toBe(0);
    } finally {
      release.resolve();
    }
    await expect(
      page.getByText(partialFailure ? /3 confirmados ·/ : /4 confirmados ·/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Buscar correspondências",
        exact: true,
      }),
    ).toBeEnabled();
    await expect.poll(() => rosterReads).toBe(1);
    expect(f.members.size).toBe(partialFailure ? 5 : 6);
    await page
      .getByRole("button", { name: "Voltar ao elenco", exact: true })
      .click();
    await expect(
      page.getByText("Beatriz Costa", { exact: true }),
    ).toBeVisible();
    await expect.poll(() => rosterReads).toBe(2);
  });
