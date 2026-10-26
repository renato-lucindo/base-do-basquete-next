import { test, expect } from "@playwright/test";
import { pdfFixture, pdfPath } from "./fixtures/pdf";
import { tid } from "./fixtures/text-import";
import { readFile } from "node:fs/promises";
import { scanAccessibility as scan } from "./fixtures/accessibility";
async function openReview(page: import("@playwright/test").Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await page
    .getByLabel("Selecionar PDFs", { exact: true })
    .setInputFiles(pdfPath);
  await page
    .getByRole("button", { name: "Revisar Boxscore-site.pdf", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão do PDF", exact: true }),
  ).toBeVisible();
}
test("axe seleção e revisão de PDF no contexto da disputa", async ({
  page,
}, info) => {
  await pdfFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await expect(
    page.getByLabel("Selecionar PDFs", { exact: true }),
  ).toBeVisible();
  await scan(page, info, "admin-pdf-upload");
  await openReview(page);
  await scan(page, info, "admin-pdf-review");
});

test("lote isola arquivo inválido e retoma revisão salva sem reenviar PDF", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos`,
  );
  await page
    .getByRole("button", { name: "Importar PDFs", exact: true })
    .click();
  await page.getByLabel("Selecionar PDFs", { exact: true }).setInputFiles([
    {
      name: "invalid.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-invalid"),
    },
    {
      name: "Boxscore-site.pdf",
      mimeType: "application/pdf",
      buffer: await readFile(pdfPath),
    },
  ]);
  await expect(page.getByText("PDF inválido.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar Boxscore-site.pdf", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revisão do PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Basketball Site · 2 páginas", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/não informa quartos, titulares, capitão ou DNP/),
  ).toBeVisible();
  await page
    .getByLabel("Jogo de destino", { exact: true })
    .selectOption(tid(8));
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Conferir os nomes abreviados");
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  const attempts = f.uploads.length;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Revisão do PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Observações da revisão", { exact: true }),
  ).toHaveValue("Conferir os nomes abreviados");
  expect(f.uploads).toHaveLength(attempts);
  await page
    .getByLabel("Destino da revisão", { exact: true })
    .selectOption(tid(30));
  await expect(page.getByLabel("Jogo de destino", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  expect(f.uploads).toHaveLength(attempts);
  expect([...f.reviews.values()][0].document.disputeId).toBe(tid(30));
});
test("preserva filtro do lote ao recarregar sem guardar bytes ou rascunho no storage do browser", async ({
  page,
}) => {
  await pdfFixture(page);
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await page
    .getByLabel("Destino padrão dos PDFs", { exact: true })
    .selectOption(tid(30));
  await page.reload();
  await expect(
    page.getByLabel("Destino padrão dos PDFs", { exact: true }),
  ).toHaveValue(tid(30));
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});
test("arquivo duplicado em outro destino oferece retomada explícita do documento existente", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  await openReview(page);
  const original = [...f.sources.keys()][0];
  await page
    .getByLabel("Destino da revisão", { exact: true })
    .selectOption(tid(30));
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar aos documentos", exact: true })
    .click();
  await page
    .getByLabel("Selecionar PDFs", { exact: true })
    .setInputFiles(pdfPath);
  await page
    .getByRole("button", {
      name: "Retomar documento existente de Boxscore-site.pdf",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Destino da revisão", { exact: true }),
  ).toHaveValue(tid(30));
  expect(f.sources.size).toBe(1);
  expect([...f.reviews.keys()]).toEqual([original]);
});
test("troca para outro campeonato sem reupload e retoma destino e seleção após reload", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  await openReview(page);
  const savedAt = "2026-10-24T03:00:00Z",
    other = {
      id: tid(40),
      name: "Outra liga",
      version: 1,
      savedAt,
      seasons: [
        {
          id: tid(41),
          year: 2027,
          disputes: [
            {
              id: tid(42),
              gender: "masculino",
              category: "Adulto",
              division: null,
            },
          ],
        },
      ],
    };
  await page.route("**/api/competitions?**", (route) =>
    route.fulfill({
      json: {
        items: [
          { id: other.id, name: other.name, version: 1, savedAt, contexts: [] },
        ],
        recents: [],
        hasMore: false,
      },
    }),
  );
  await page.route(`**/api/competitions/${other.id}`, (route) =>
    route.fulfill({ json: other }),
  );
  const group = page.getByRole("group", {
    name: "Destino da revisão",
    exact: true,
  });
  await group
    .getByText("Buscar destino em outro campeonato", { exact: true })
    .click();
  await group
    .getByRole("button", {
      name: "Carregar destinos de Outra liga",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Destino da revisão", { exact: true })
    .selectOption(tid(42));
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  const count = f.uploads.length;
  await page.reload();
  await expect(
    page.getByLabel("Destino da revisão", { exact: true }),
  ).toHaveValue(tid(42));
  expect(f.uploads).toHaveLength(count);
  await expect(
    page.getByRole("button", {
      name: "Criar ou editar jogo aqui",
      exact: true,
    }),
  ).toBeEnabled();
});
test("lista fontes em páginas e conserva a página ao abrir e fechar revisão", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  await openReview(page);
  const sample = [...f.sources.values()][0];
  for (let n = 0; n < 21; n++)
    f.sources.set(tid(500 + n), {
      ...sample,
      id: tid(500 + n),
      filename: `arquivo-${n}.pdf`,
      sha256: n.toString(16).padStart(64, "0"),
    });
  await page
    .getByRole("button", { name: "Voltar aos documentos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Atualizar documentos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mais documentos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar arquivo-20.pdf", exact: true })
    .click();
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Página conservada");
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar aos documentos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Revisar arquivo-20.pdf", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Documentos anteriores", exact: true }),
  ).toBeEnabled();
});
test("cadastro auxiliar mantém o rascunho, retorna foco e permite escolher o jogo criado", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  await openReview(page);
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Notas preservadas durante cadastro");
  const trigger = page.getByRole("button", {
    name: "Criar ou editar jogo aqui",
    exact: true,
  });
  await trigger.click();
  await page.getByRole("button", { name: "Novo jogo", exact: true }).click();
  await page
    .getByLabel("Inscrição mandante", { exact: true })
    .selectOption(tid(5));
  await page
    .getByLabel("Inscrição visitante", { exact: true })
    .selectOption(tid(6));
  await page.getByLabel("Local", { exact: true }).fill("Ginásio criado aqui");
  await page.getByRole("button", { name: "Salvar jogo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Jogo salvo" }),
  ).toBeVisible();
  const created = [...f.games.values()].find((g) => g.id !== tid(8))!;
  await page
    .getByRole("button", { name: "Voltar à revisão do PDF", exact: true })
    .click();
  await expect(trigger).toBeFocused();
  await expect(
    page.getByLabel("Observações da revisão", { exact: true }),
  ).toHaveValue("Notas preservadas durante cadastro");
  await page
    .getByLabel("Jogo de destino", { exact: true })
    .selectOption(created.id);
  await expect(
    page.getByRole("button", {
      name: "Cadastrar ou editar elenco de Lobos",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Cadastrar ou editar elenco de Lobos",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Voltar à revisão do PDF", exact: true })
    .click();
  await expect(page.getByLabel("Jogo de destino", { exact: true })).toHaveValue(
    created.id,
  );
  await expect(
    page.getByLabel("Observações da revisão", { exact: true }),
  ).toHaveValue("Notas preservadas durante cadastro");
});
test("associação explícita conserva UUID e inversão limpa escolhas incompatíveis", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  await openReview(page);
  const source = [...f.sources.values()][0],
    team = source.parsed.teams[0],
    p = team.players[0],
    savedAt = "2026-10-24T03:00:00Z";
  const rows = [200, 201].map((n, i) => ({
    id: tid(n),
    personId: tid(n + 100),
    registrationId: tid(5),
    disputeId: tid(3),
    jersey: String(i + 1),
    active: true,
    version: 1,
    savedAt,
    startedAt: savedAt,
    endedAt: null,
    person: {
      id: tid(n + 100),
      name: p.name,
      nickname: null,
      publicBirthYear: null,
    },
  }));
  await page.route(/\/api\/roster\?/, (r) =>
    r.fulfill({
      json: {
        items:
          new URL(r.request().url()).searchParams.get("registrationId") ===
          tid(5)
            ? rows
            : [],
        hasMore: false,
      },
    }),
  );
  await page
    .getByLabel("Jogo de destino", { exact: true })
    .selectOption(tid(8));
  const select = page.getByLabel(`Atleta ${team.name} linha 1`, {
    exact: true,
  });
  await expect(select.locator("option")).toHaveCount(3);
  await expect(select).toHaveValue("");
  await select.selectOption(tid(201));
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  expect([...f.reviews.values()][0].document.mappings[0].rosterEntryId).toBe(
    tid(201),
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByLabel("Inverter lados do PDF em relação ao jogo", { exact: true })
    .check();
  await expect(select).toHaveValue("");
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  expect(
    [...f.reviews.values()][0].document.mappings.every(
      (m) => m.rosterEntryId === null,
    ),
  ).toBe(true);
});
test("reauth preserva revisão e guarda mudança de disputa;320px não corta controles", async ({
  page,
}, info) => {
  const f = await pdfFixture(page);
  await openReview(page);
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Texto antes de reautenticar");
  f.pdfExpire();
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Observações da revisão", { exact: true }),
  ).toHaveValue("Texto antes de reautenticar");
  await page
    .getByRole("button", { name: "Repetir salvamento da revisão", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Revisão salva" }),
  ).toBeVisible();
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Não descartar");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByLabel("Disputa de trabalho", { exact: true })
    .selectOption(tid(30));
  await expect(
    page.getByLabel("Disputa de trabalho", { exact: true }),
  ).toHaveValue(tid(3));
  await page.setViewportSize({ width: 320, height: 780 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/pdf-review-320-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("heading", { name: "Revisão do PDF", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.preview-artifacts/pdf-review-top-${info.project.name}.png`,
  });
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.preview-artifacts/pdf-review-bottom-${info.project.name}.png`,
  });
});
test("trocar destino durante carregamento de elenco libera a revisão sem dados antigos", async ({
  page,
}) => {
  await pdfFixture(page);
  await openReview(page);
  await page.route(`**/api/games/${tid(8)}`, async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route
      .fulfill({
        status: 404,
        json: { error: { code: "context_not_found", message: "cancelado" } },
      })
      .catch(() => undefined);
  });
  await page
    .getByLabel("Jogo de destino", { exact: true })
    .selectOption(tid(8));
  await expect(
    page.getByRole("status").filter({ hasText: "Carregando atletas do jogo…" }),
  ).toBeVisible();
  await page
    .getByLabel("Destino da revisão", { exact: true })
    .selectOption(tid(30));
  await expect(
    page.getByRole("status").filter({ hasText: "Carregando atletas do jogo…" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Jogo de destino", { exact: true })).toHaveValue(
    "",
  );
});
test("retry conserva intenção e revisão em conflito exige recarga explícita", async ({
  page,
}) => {
  const f = await pdfFixture(page);
  f.pdfUncertain();
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/jogos/pdfs`,
  );
  await page
    .getByLabel("Selecionar PDFs", { exact: true })
    .setInputFiles(pdfPath);
  await page
    .getByRole("button", {
      name: "Repetir envio de Boxscore-site.pdf",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Revisar Boxscore-site.pdf", exact: true })
    .click();
  expect(f.uploads).toHaveLength(2);
  expect(new Set(f.uploads).size).toBe(1);
  f.pdfConflict();
  await page
    .getByLabel("Observações da revisão", { exact: true })
    .fill("Rascunho preservado");
  await page
    .getByRole("button", { name: "Salvar revisão", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: /revisão mudou/ }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Observações da revisão", { exact: true }),
  ).toHaveValue("Rascunho preservado");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar revisão", exact: true })
    .click();
  await expect(
    page.getByLabel("Observações da revisão", { exact: true }),
  ).toHaveValue("");
});
