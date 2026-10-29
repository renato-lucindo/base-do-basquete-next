import { test, expect, type Page } from "@playwright/test";
import { gamesFixture } from "./fixtures/games";
import { tid } from "./fixtures/text-import";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
});
async function open(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await page
    .getByLabel("Inscrição mandante", { exact: true })
    .selectOption(tid(5));
  await page
    .getByLabel("Inscrição visitante", { exact: true })
    .selectOption(tid(6));
}
test("arbitragem opcional fica em duas colunas e libera funções em sequência", async ({
  page,
}) => {
  await gamesFixture(page);
  await open(page);
  const court = page.getByRole("group", {
    name: "Oficiais de Quadra",
    exact: true,
  });
  const table = page.getByRole("group", {
    name: "Oficiais de Mesa",
    exact: true,
  });
  await expect(court).toBeVisible();
  await expect(table).toBeVisible();
  const a = await court.boundingBox(),
    b = await table.boundingBox();
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
  expect(b!.x).toBeGreaterThan(a!.x + a!.width);
  await expect(
    page.getByRole("combobox", { name: "Fiscal 1", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Cronometrista", exact: true }),
  ).toBeDisabled();
  const referee = page.getByRole("combobox", { name: "Árbitro", exact: true });
  await referee.fill("João");
  await page
    .getByRole("option", { name: "Usar novo oficial: João", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Fiscal 1", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: "Fiscal 2", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Cronometrista", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
});
test("fechar o diálogo sem salvar não cadastra oficiais", async ({ page }) => {
  const f = await gamesFixture(page);
  await open(page);
  await page
    .getByRole("combobox", { name: "Apontador", exact: true })
    .fill("Matheus");
  await page
    .getByRole("option", { name: "Usar novo oficial: Matheus", exact: true })
    .click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  expect(f.games.size).toBe(0);
  expect(f.officials.size).toBe(0);
});

async function chooseNew(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).fill(name);
  await page
    .getByRole("option", { name: `Usar novo oficial: ${name}`, exact: true })
    .click();
}
test("persiste escala, reutiliza o catálogo e exclui identidades já selecionadas", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await open(page);
  await chooseNew(page, "Árbitro", "João");
  await chooseNew(page, "Fiscal 1", "Paulo");
  await chooseNew(page, "Apontador", "Matheus");
  await chooseNew(page, "Cronometrista", "Cátia");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(f.officials.size).toBe(4);
  const saved = [...f.scales.values()][0];
  expect(saved.referee?.name).toBe("João");
  expect(saved.umpire2).toBeNull();
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Abrir jogo / })
    .first()
    .click();
  await expect(
    page.getByRole("combobox", { name: "Cronometrista", exact: true }),
  ).toHaveValue("Cátia");
  await page
    .getByRole("button", { name: "Voltar à lista de jogos", exact: true })
    .click();
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  const referee = page.getByRole("combobox", { name: "Árbitro", exact: true });
  await referee.fill("João");
  await page.getByRole("option", { name: "João", exact: true }).click();
  const scorer = page.getByRole("combobox", { name: "Apontador", exact: true });
  await scorer.fill("João");
  await expect(
    page.getByRole("option", { name: "Cadastrar homônimo: João", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "João", exact: true }),
  ).toHaveCount(0);
});
test("limpa dependentes só após confirmação e conserva o outro grupo", async ({
  page,
}) => {
  await gamesFixture(page);
  await open(page);
  await chooseNew(page, "Árbitro", "João");
  await chooseNew(page, "Fiscal 1", "Paulo");
  await chooseNew(page, "Fiscal 2", "Pedro");
  await chooseNew(page, "Apontador", "Matheus");
  await chooseNew(page, "Cronometrista", "Cátia");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Limpar Árbitro", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Fiscal 2", exact: true }),
  ).toHaveValue("Pedro");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Limpar Árbitro", exact: true })
    .click();
  for (const label of ["Árbitro", "Fiscal 1", "Fiscal 2"])
    await expect(
      page.getByRole("combobox", { name: label, exact: true }),
    ).toHaveValue("");
  await expect(
    page.getByRole("combobox", { name: "Cronometrista", exact: true }),
  ).toHaveValue("Cátia");
  await expect(
    page.getByRole("combobox", { name: "Operador de 24s", exact: true }),
  ).toBeEnabled();
});
test("novo homônimo exige confirmação e recebe identidade diferente", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  f.officials.set(tid(80), { id: tid(80), name: "João" });
  await open(page);
  await page
    .getByRole("combobox", { name: "Árbitro", exact: true })
    .fill("João");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("option", { name: "Cadastrar homônimo: João", exact: true })
    .click();
  expect(f.officials.size).toBe(1);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("option", { name: "Cadastrar homônimo: João", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(f.officials.size).toBe(2);
  expect([...f.scales.values()][0].referee?.id).not.toBe(tid(80));
});
test("ACK confirmado com leitura falha recupera somente GET sem novo cadastro", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await open(page);
  await chooseNew(page, "Árbitro", "João");
  f.failNextEditorRead();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Recuperar jogo salvo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Árbitro", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Recuperar jogo salvo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(1);
  expect(f.officials.size).toBe(1);
});
test("reauth e reenvio incerto conservam oficial e comando sem duplicação", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await open(page);
  await chooseNew(page, "Árbitro", "João");
  f.expire();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Árbitro", exact: true }),
  ).toHaveValue("João");
  f.uncertain();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Árbitro", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.officials.size).toBe(1);
});
test("dropdown pagina, fecha após seleção e responde a setas, Escape e Tab", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  for (let n = 1; n <= 21; n++)
    f.officials.set(tid(100 + n), {
      id: tid(100 + n),
      name: `Oficial ${String(n).padStart(2, "0")}`,
    });
  await open(page);
  const referee = page.getByRole("combobox", { name: "Árbitro", exact: true });
  await referee.focus();
  await expect(
    page.getByRole("option", { name: "Oficial 01", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mais oficiais", exact: true })
    .click();
  await page.getByRole("option", { name: "Oficial 21", exact: true }).click();
  await expect(referee).toHaveValue("Oficial 21");
  await expect(referee).toHaveAttribute("aria-expanded", "false");
  await referee.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Oficial 21", exact: true }),
  ).toBeVisible();
  await referee.press("Escape");
  await expect(referee).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("dialog", { name: "Novo jogo", exact: true }),
  ).toBeVisible();
  await referee.press("Tab");
  await expect(
    page.getByRole("button", { name: "Limpar Árbitro", exact: true }),
  ).toBeFocused();
});
test("nome ainda não selecionado não é salvo silenciosamente", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await open(page);
  await page
    .getByRole("combobox", { name: "Árbitro", exact: true })
    .fill("Sem seleção");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Selecione um oficial");
  expect(f.attempts).toHaveLength(0);
  expect(f.officials.size).toBe(0);
});
test("escala completa é salva e limpeza intermediária conserva demais funções", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await open(page);
  for (const [label, name] of [
    ["Árbitro", "João"],
    ["Fiscal 1", "Paulo"],
    ["Fiscal 2", "Pedro"],
    ["Apontador", "Matheus"],
    ["Cronometrista", "Cátia"],
    ["Operador de 24s", "Bruna"],
  ])
    await chooseNew(page, label, name);
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(Object.values([...f.scales.values()][0]).filter(Boolean)).toHaveLength(
    6,
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Limpar Fiscal 1", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Árbitro", exact: true }),
  ).toHaveValue("João");
  await expect(
    page.getByRole("combobox", { name: "Operador de 24s", exact: true }),
  ).toHaveValue("Bruna");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  expect(Object.values([...f.scales.values()][0]).filter(Boolean)).toHaveLength(
    4,
  );
  expect(f.officials.size).toBe(6);
});
test("409 conserva edição sem criar oficial e só recarga explícita substitui a escala", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  await open(page);
  await chooseNew(page, "Árbitro", "João");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  await chooseNew(page, "Árbitro", "Nova escolha");
  f.conflict();
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Árbitro", exact: true }),
  ).toHaveValue("Nova escolha");
  expect(f.officials.size).toBe(1);
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar jogo", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Árbitro", exact: true }),
  ).toHaveValue("João");
});
test("formulário e dropdown têm nomes acessíveis sem violações automatizadas", async ({
  page,
}) => {
  const f = await gamesFixture(page);
  f.officials.set(tid(80), { id: tid(80), name: "João" });
  await open(page);
  let result = await new AxeBuilder({ page })
    .include(".game-editor-dialog")
    .analyze();
  expect(result.violations).toEqual([]);
  expect(result.incomplete).toEqual([]);
  await page
    .getByRole("combobox", { name: "Árbitro", exact: true })
    .fill("João");
  await expect(
    page.getByRole("option", { name: "João", exact: true }),
  ).toBeVisible();
  result = await new AxeBuilder({ page })
    .include(".game-editor-dialog")
    .analyze();
  expect(result.violations).toEqual([]);
  expect(result.incomplete).toEqual([]);
});
test("carregamento e falha de busca mantêm semântica e permitem tentar novamente", async ({
  page,
}) => {
  await gamesFixture(page);
  const releases: (() => void)[] = [];
  let fail = true;
  await page.route(/\/api\/games\/officials(?:\?|$)/, async (route) => {
    await new Promise<void>((resolve) => {
      releases.push(resolve);
    });
    await route
      .fulfill(
        fail
          ? {
              status: 503,
              json: {
                error: {
                  code: "access_unavailable",
                  message: "Busca indisponível",
                },
              },
            }
          : { json: { items: [], hasMore: false } },
      )
      .catch(() => undefined);
  });
  await open(page);
  const field = page.getByRole("combobox", { name: "Árbitro", exact: true });
  await field.fill("Lento");
  await expect.poll(() => releases.length > 0).toBe(true);
  try {
    const scan = await new AxeBuilder({ page })
      .include(".game-editor-dialog")
      .analyze();
    expect(scan.violations).toEqual([]);
  } finally {
    releases.shift()?.();
  }
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível buscar oficiais",
  );
  fail = false;
  await field.press("Escape");
  await field.press("ArrowDown");
  await expect.poll(() => releases.length > 0).toBe(true);
  releases.shift()?.();
  await expect(
    page.getByRole("option", { name: "Usar novo oficial: Lento", exact: true }),
  ).toBeVisible();
});
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
])
  test(`layout compacto ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await gamesFixture(page);
    await open(page);
    const section = page.getByRole("group", {
      name: "Arbitragem",
      exact: true,
    });
    const metrics = await section.locator(":scope > legend").evaluate((e) => ({
      size: getComputedStyle(e).fontSize,
      weight: getComputedStyle(e).fontWeight,
    }));
    const other = await page
      .getByRole("group", { name: "Dados do jogo", exact: true })
      .locator(":scope > legend")
      .evaluate((e) => ({
        size: getComputedStyle(e).fontSize,
        weight: getComputedStyle(e).fontWeight,
      }));
    expect(metrics).toEqual(other);
    expect((await section.boundingBox())!.height).toBeLessThanOrEqual(220);
    await expect(
      page.getByRole("combobox", { name: "Operador de 24s", exact: true }),
    ).toBeInViewport();
    await page.screenshot({
      path: `.preview-artifacts/officiating-${width}.png`,
    });
  });
