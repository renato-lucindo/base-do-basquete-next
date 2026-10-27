import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  emptyPerson,
  type PersonSnapshot,
  type SavePerson,
} from "../src/people/contract";
import type { SaveRoster } from "../src/people/roster-contract";
import type { SaveStaff } from "../src/people/staff-contract";
const id = (n: number) =>
  `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const timestamp = "2026-10-23T16:00:00Z";
async function fixture(page: Page) {
  const persons = new Map<string, PersonSnapshot>();
  const roster = new Map<string, SaveRoster["entry"] & { version: number }>();
  const staff = new Map<string, SaveStaff["entry"] & { version: number }>();
  const receipts = new Map<string, { id: string; version: number }>();
  const attempts: string[] = [];
  let authenticated = true,
    expireOnWrite = false,
    mode: "normal" | "uncertain" | "conflict" = "normal";
  const team = {
    id: id(4),
    name: "Lobos Clube",
    abbreviation: "LOB",
    version: 1,
    savedAt: timestamp,
  };
  const registrations = [
    { id: id(5), name: "Lobos" },
    { id: id(6), name: "Lobos B" },
  ].map((r) => ({
    ...r,
    disputeId: id(3),
    teamId: team.id,
    team,
    version: 1,
    savedAt: timestamp,
  }));
  const summary = (p: PersonSnapshot) => ({
    id: p.id,
    name: p.name,
    nickname: p.nickname,
    publicBirthYear: p.publicBirthYear,
  });
  const snapshot = (
    r: SaveRoster["entry"] | SaveStaff["entry"],
    version: number,
  ) => ({
    ...r,
    version,
    savedAt: timestamp,
    startedAt: timestamp,
    endedAt: r.active ? null : timestamp,
    person: summary(persons.get(r.personId)!),
    ...("jersey" in r ? { disputeId: id(3) } : {}),
  });
  await page.route("**/api/session", (route) => {
    const method = route.request().method();
    if (method === "POST") authenticated = true;
    if (method === "DELETE") {
      authenticated = false;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({
      status: authenticated ? 200 : 401,
      json: { authenticated },
    });
  });
  await page.route("**/api/competitions**", (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === "/api/competitions"
          ? { items: [], recents: [], hasMore: false }
          : {
              id: id(1),
              name: "Liga C3",
              version: 1,
              savedAt: timestamp,
              seasons: [
                {
                  id: id(2),
                  year: 2026,
                  disputes: [
                    {
                      id: id(3),
                      gender: "feminino",
                      category: "Adulto",
                      division: null,
                    },
                  ],
                },
              ],
            },
    }),
  );
  await page.route("**/api/registrations**", (route) =>
    route.fulfill({ json: { items: registrations, hasMore: false } }),
  );
  await page.route(/\/api\/(people|roster|staff)(\/|\?|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      resource = url.pathname.split("/")[2],
      itemId = url.pathname.split("/")[3];
    const error = (status: number, code: string, message: string) =>
      route.fulfill({ status, json: { error: { code, message } } });
    if (expireOnWrite && request.method() === "POST") {
      authenticated = false;
      expireOnWrite = false;
    }
    if (!authenticated)
      return error(401, "invalid_session", "Entre novamente.");
    if (request.method() === "POST") {
      const command = request.postDataJSON() as
        SavePerson | SaveRoster | SaveStaff;
      attempts.push(command.commandId);
      if (mode === "conflict") {
        mode = "normal";
        if ("person" in command) {
          const p = persons.get(command.person.id);
          if (p)
            persons.set(p.id, {
              ...p,
              name: "Outra sessão",
              version: p.version + 1,
            });
        } else if ("jersey" in command.entry) {
          const r = roster.get(command.entry.id);
          if (r)
            roster.set(r.id, { ...r, jersey: "7", version: r.version + 1 });
        }
        return error(
          409,
          "version_conflict",
          "Cadastro alterado em outra sessão. Recarregue antes de salvar.",
        );
      }
      if (!receipts.has(command.commandId)) {
        if ("person" in command) {
          const key = (name: string) =>
            name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/gu, "")
              .trim()
              .toLowerCase();
          if (
            !persons.has(command.person.id) &&
            !command.confirmHomonym &&
            [...persons.values()].some(
              (p) => key(p.name) === key(command.person.name),
            )
          )
            return error(
              409,
              "identity_confirmation_required",
              "Já existe pessoa com este nome. Confirme outra identidade.",
            );
          const p = {
            ...command.person,
            version: command.expectedVersion + 1,
            savedAt: timestamp,
          };
          persons.set(p.id, p);
          receipts.set(command.commandId, { id: p.id, version: p.version });
        } else if ("jersey" in command.entry) {
          const entry = command.entry;
          if (
            entry.active &&
            [...roster.values()].some(
              (r) =>
                r.id !== entry.id &&
                r.active &&
                (r.personId === entry.personId ||
                  (r.registrationId === entry.registrationId &&
                    entry.jersey !== null &&
                    r.jersey === entry.jersey)),
            )
          )
            return error(
              400,
              "invalid_input",
              "Atleta já possui vínculo ativo nesta disputa ou camisa repetida.",
            );
          const value = { ...entry, version: command.expectedVersion + 1 };
          roster.set(entry.id, value);
          receipts.set(command.commandId, {
            id: entry.id,
            version: value.version,
          });
        } else {
          const entry = command.entry;
          const value = { ...entry, version: command.expectedVersion + 1 };
          staff.set(entry.id, value);
          receipts.set(command.commandId, {
            id: entry.id,
            version: value.version,
          });
        }
      }
      if (mode === "uncertain") {
        mode = "normal";
        return error(
          503,
          "access_unavailable",
          "Não foi possível confirmar a resposta.",
        );
      }
      return route.fulfill({ json: receipts.get(command.commandId) });
    }
    if (resource === "people") {
      if (itemId) return route.fulfill({ json: persons.get(itemId) });
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const items = [...persons.values()]
        .filter((p) => p.name.toLowerCase().includes(q))
        .map((p) => ({
          ...summary(p),
          athlete: !!p.athlete,
          coach: p.coach,
          contexts: [...roster.values(), ...staff.values()]
            .filter((r) => r.personId === p.id)
            .filter(
              (r, i, all) =>
                all.findIndex((v) => v.registrationId === r.registrationId) ===
                i,
            )
            .map((r) => ({
              registrationId: r.registrationId,
              teamName: registrations.find((x) => x.id === r.registrationId)!
                .name,
              year: 2026,
              gender: "feminino",
              category: "Adulto",
              division: null,
              active: [...roster.values(), ...staff.values()].some(
                (v) =>
                  v.personId === p.id &&
                  v.registrationId === r.registrationId &&
                  v.active,
              ),
            })),
        }));
      const offset = Number(url.searchParams.get("offset") ?? "0");
      return route.fulfill({
        json: {
          items: items.slice(offset, offset + 20),
          hasMore: items.length > offset + 20,
        },
      });
    }
    const values =
      resource === "roster" ? [...roster.values()] : [...staff.values()];
    if (itemId) {
      const r = values.find((v) => v.id === itemId)!;
      return route.fulfill({ json: snapshot(r, r.version) });
    }
    const activeOnly = url.searchParams.get("activeOnly") !== "0";
    const items = values
      .filter(
        (r) =>
          r.registrationId === url.searchParams.get("registrationId") &&
          (!activeOnly || r.active),
      )
      .sort((a, b) =>
        "jersey" in a && "jersey" in b
          ? a.jersey === null
            ? 1
            : b.jersey === null
              ? -1
              : Number(a.jersey) - Number(b.jersey) ||
                a.jersey.length - b.jersey.length
          : 0,
      )
      .map((r) => snapshot(r, r.version));
    return route.fulfill({ json: { items, hasMore: false } });
  });
  return {
    persons,
    roster,
    staff,
    attempts,
    setMode: (v: typeof mode) => {
      mode = v;
      attempts.length = 0;
    },
    expire: () => {
      expireOnWrite = true;
    },
  };
}
async function open(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${id(1)}/${id(3)}/equipes`,
  );
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Elenco de Lobos", exact: true }),
  ).toBeVisible();
}
async function newAthlete(page: Page, name: string, jersey: string) {
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /^(Criar nova pessoa|Cadastrar novo atleta)$/,
      exact: true,
    })
    .click();
  await page.getByLabel("Nome da pessoa", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await page.getByLabel("Camisa", { exact: true }).fill(jersey);
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(page.getByText("Vínculo salvo.", { exact: true })).toBeVisible();
}

test("adicionar atleta usa diálogo compacto, busca explícita e seleção por teclado", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
  const f = await fixture(page);
  f.persons.set(id(10), {
    ...emptyPerson(id(10)),
    coach: true,
    name: "Ana Silva",
    nickname: "Aninha",
    publicBirthYear: 2000,
    athlete: { sex: "female", birthDate: null, federationRegistration: null },
    version: 1,
    savedAt: timestamp,
  });
  const queries: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/people")
      queries.push(url.searchParams.get("q") ?? "");
  });
  await open(page);
  const before = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Adicionar atleta · Lobos",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole("combobox", {
    name: "Buscar pessoa",
    exact: true,
  });
  await expect(search).toBeFocused();
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await search.fill("A");
  await expect(
    dialog.getByText("Digite pelo menos 2 caracteres para buscar.", {
      exact: true,
    }),
  ).toBeVisible();
  await search.fill("An");
  await expect(dialog.getByRole("option", { name: /Ana Silva/ })).toBeVisible();
  expect(queries.every((q) => q.trim().length >= 2)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    before,
  );
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(dialog.getByLabel("Camisa", { exact: true })).toBeVisible();
  await dialog.getByLabel("Camisa", { exact: true }).fill("00");
  await dialog
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Adicionar atleta", exact: true }),
  ).toBeFocused();
  expect(f.persons.size).toBe(1);
  await expect(page.getByTestId("roster-row")).toContainText("Ana Silva");
});

test("cadastro novo permanece acessível com resultados abertos e preserva nome digitado", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
  const f = await fixture(page);
  f.persons.set(id(10), {
    ...emptyPerson(id(10)),
    coach: true,
    name: "Ana Silva",
    version: 1,
    savedAt: timestamp,
  });
  await open(page);
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Buscar pessoa", exact: true })
    .fill("Ana");
  await expect(dialog.getByRole("option", { name: /Ana Silva/ })).toBeVisible();
  await page.screenshot({
    path: ".preview-artifacts/member-dialog-before-overlay.png",
  });
  await dialog
    .getByRole("button", { name: "Cadastrar novo atleta", exact: true })
    .click({ timeout: 3000 });
  await expect(
    dialog.getByLabel("Nome da pessoa", { exact: true }),
  ).toHaveValue("Ana");
  await expect(dialog.getByLabel("Apelido", { exact: true })).toBeVisible();
});

test("busca de atleta pagina, mantém foco e apresenta dropdown acessível por mouse", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
  const f = await fixture(page);
  for (let n = 10; n < 35; n++)
    f.persons.set(id(n), {
      ...emptyPerson(id(n)),
      coach: true,
      name: `Ana ${String(n).padStart(2, "0")}`,
      version: 1,
      savedAt: timestamp,
    });
  await page.setViewportSize({ width: 1366, height: 768 });
  await open(page);
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const search = dialog.getByRole("combobox", {
    name: "Buscar pessoa",
    exact: true,
  });
  await search.fill("Ana");
  await expect(dialog.getByRole("option")).toHaveCount(20);
  const scroll = await page.evaluate(() => scrollY);
  await search.press("ArrowDown");
  for (let n = 0; n < 19; n++) await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", /19$/);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await dialog
    .getByRole("button", { name: "Próxima página", exact: true })
    .click();
  await expect(dialog.getByRole("option")).toHaveCount(5);
  const popup = await dialog.locator(".person-picker-options").boundingBox();
  expect(popup!.y).toBeGreaterThanOrEqual(0);
  expect(popup!.y + popup!.height).toBeLessThanOrEqual(768);
  const report = await new AxeBuilder({ page })
    .include("dialog[open]")
    .analyze();
  expect(report.violations).toEqual([]);
  await info.attach("dialog-axe", {
    body: JSON.stringify({
      violations: report.violations,
      incomplete: report.incomplete,
    }),
    contentType: "application/json",
  });
  await page.screenshot({
    path: ".preview-artifacts/member-dialog-search-desktop.png",
  });
  await dialog.getByRole("option", { name: /^Ana 30/ }).click();
  await expect(
    dialog.getByLabel("Nome da pessoa", { exact: true }),
  ).toHaveValue("Ana 30");
});

test("busca de pessoa falha e permite tentar novamente dentro do diálogo", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
  const f = await fixture(page);
  f.persons.set(id(10), {
    ...emptyPerson(id(10)),
    coach: true,
    name: "Ana Silva",
    version: 1,
    savedAt: timestamp,
  });
  let fail = true;
  await page.route(/\/api\/people\?/, (route) => {
    if (fail) {
      fail = false;
      return route.fulfill({
        status: 503,
        json: {
          error: { code: "access_unavailable", message: "Busca indisponível" },
        },
      });
    }
    return route.fallback();
  });
  await open(page);
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const search = dialog.getByRole("combobox", {
    name: "Buscar pessoa",
    exact: true,
  });
  await search.fill("Ana");
  await expect(dialog.getByRole("alert")).toContainText("Busca indisponível");
  await dialog
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click({ timeout: 3000 });
  await expect(dialog.getByRole("option", { name: /Ana Silva/ })).toBeVisible();
  await expect(search).toBeFocused();
});

test("ACK de pessoa seguido de GET falho retoma apenas leitura e não cadastra novamente", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop aprovado");
  const f = await fixture(page);
  let reads = 0,
    posts = 0;
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname === "/api/people" &&
      request.method() === "POST"
    )
      posts++;
  });
  await page.route(/\/api\/people\/[0-9a-f-]+$/, (route) => {
    reads++;
    return reads === 1
      ? route.fulfill({
          status: 503,
          json: {
            error: {
              code: "access_unavailable",
              message: "Leitura indisponível",
            },
          },
        })
      : route.fallback();
  });
  await open(page);
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cadastrar novo atleta", exact: true })
    .click();
  await page.getByLabel("Nome da pessoa", { exact: true }).fill("Ana Nova");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(
    page.getByText("Envio não confirmado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByLabel("Camisa", { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  expect(reads).toBe(2);
  expect(f.persons.size).toBe(1);
});
test("elenco ordenado, técnico na mesma pessoa, assistente e retomada", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "00");
  await newAthlete(page, "Bia Souza", "0");
  const rows = page.getByTestId("roster-row");
  await expect(rows.first()).toContainText("Bia Souza");
  await expect(rows.nth(1)).toContainText("Ana Silva");
  await page
    .getByRole("button", { name: "Adicionar técnico", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar pessoa", exact: true })
    .fill("Ana Silva");
  await page.getByRole("option", { name: /Ana Silva/ }).click();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveValue(
    "Ana Silva",
  );
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  expect(f.persons.size).toBe(2);
  expect(
    [...f.persons.values()].find((p) => p.name === "Ana Silva"),
  ).toMatchObject({ coach: true, athlete: { sex: "female" } });
  await page
    .getByRole("button", { name: "Adicionar assistente", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /^(Criar nova pessoa|Cadastrar novo atleta)$/,
      exact: true,
    })
    .click();
  await page
    .getByLabel("Nome da pessoa", { exact: true })
    .fill("Carla Técnica");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  expect(f.staff.size).toBe(2);
  await page.reload();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await expect(page.getByText("Carla Técnica", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await expect(
    page.getByText("Nenhum atleta neste elenco.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Buscar pessoa", exact: true })
    .fill("Ana Silva");
  await page.getByRole("option", { name: /Ana Silva/ }).click();
  await page.getByLabel("Camisa", { exact: true }).fill("12");
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("vínculo ativo");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Elenco de Lobos", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("roster-row")).toHaveCount(2);
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/pessoas-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Encerrar vínculo de Bia Souza", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(page.getByTestId("roster-row")).toHaveCount(1);
  await page.getByLabel("Mostrar vínculos encerrados", { exact: true }).check();
  await expect(
    page.getByTestId("roster-row").filter({ hasText: "Bia Souza" }),
  ).toContainText("Encerrado");
  await page
    .getByRole("button", { name: "Encerrar assistente", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Adicionar assistente", exact: true }),
  ).toBeEnabled();
  expect([...f.staff.values()].filter((s) => !s.active)).toHaveLength(1);
});
test("homônimos exigem nova identidade explícita sem renomear", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "1");
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /^(Criar nova pessoa|Cadastrar novo atleta)$/,
      exact: true,
    })
    .click();
  await page.getByLabel("Nome da pessoa", { exact: true }).fill("Ana Silva");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Confirme outra identidade",
  );
  await page
    .getByLabel("Confirmo que é outra pessoa com o mesmo nome", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await page.getByLabel("Camisa", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  expect([...f.persons.values()].map((p) => p.name)).toEqual([
    "Ana Silva",
    "Ana Silva",
  ]);
  expect(new Set([...f.roster.values()].map((r) => r.personId)).size).toBe(2);
});

test("vários atletas podem ficar sem camisa e números informados vêm primeiro", async ({
  page,
}) => {
  await fixture(page);
  await open(page);
  await newAthlete(page, "Ana sem número", "");
  await newAthlete(page, "Bia sem número", "");
  await newAthlete(page, "Carla com zero", "0");
  const rows = page.getByTestId("roster-row");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Carla com zero");
  await expect(rows.filter({ hasText: "Sem camisa" })).toHaveCount(2);
});
for (const width of [1366, 1920])
  test(`pessoa e camisa em formulário aberto e compacto ${width}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop", "Recorte desktop");
    const f = await fixture(page);
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    await open(page);
    await newAthlete(page, "Ana Silva", "00");
    const originalRoster = [...f.roster.values()][0];
    f.roster.set(id(900), {
      ...originalRoster,
      id: id(900),
      active: false,
      jersey: "23",
    });
    await expect(
      page.getByRole("button", {
        name: "Editar camisa de Ana Silva",
        exact: true,
      }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    for (const label of [
      "Apelido",
      "Altura (cm)",
      "Peso (kg)",
      "Data completa de nascimento",
      "Registro federativo",
      "Camisa",
    ])
      await expect(dialog.getByLabel(label, { exact: true })).toBeVisible();
    await expect(dialog.locator("details")).toHaveCount(0);
    const height = await dialog
      .getByLabel("Altura (cm)", { exact: true })
      .boundingBox();
    const weight = await dialog
      .getByLabel("Peso (kg)", { exact: true })
      .boundingBox();
    expect(height!.width).toBeLessThan(200);
    expect(Math.abs(height!.y - weight!.y)).toBeLessThan(2);
    await dialog.getByLabel("Altura (cm)", { exact: true }).fill("180.5");
    await dialog.getByLabel("Camisa", { exact: true }).fill("0");
    const saveBox = await dialog
      .getByRole("button", { name: "Salvar pessoa", exact: true })
      .boundingBox();
    expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(
      width === 1366 ? 744 : 1056,
    );
    const cancelBox = await dialog
      .getByRole("button", { name: "Cancelar edição", exact: true })
      .boundingBox();
    expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(
      width === 1366 ? 744 : 1056,
    );
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({
      path: `.preview-artifacts/person-compact-${width}.png`,
      fullPage: true,
    });
    await dialog
      .getByRole("button", { name: "Salvar pessoa", exact: true })
      .click();
    await expect(
      page.getByRole("row").filter({ hasText: "Ana Silva" }),
    ).toContainText("0");
    expect([...f.persons.values()][0].heightCm).toBe(180.5);
    expect([...f.roster.values()][0].jersey).toBe("0");
    expect(f.roster.get(id(900))!.jersey).toBe("23");
  });

test("pessoa e camisa retomam falha parcial sem repetir POSTs já confirmados", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop");
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "00");
  await page
    .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
    .click();
  await page.getByLabel("Altura (cm)", { exact: true }).fill("182");
  await page.getByLabel("Camisa", { exact: true }).fill("12");
  let rosterPosts = 0,
    personPosts = 0,
    failRead = true;
  const ids: string[] = [];
  await page.route("**/api/people", async (route) => {
    if (route.request().method() === "POST") personPosts++;
    await route.fallback();
  });
  await page.route("**/api/roster", async (route) => {
    if (route.request().method() === "POST") {
      rosterPosts++;
      ids.push(route.request().postDataJSON().commandId);
      if (rosterPosts === 1)
        return route.fulfill({
          status: 503,
          json: {
            error: {
              code: "access_unavailable",
              message: "Falha transitória da camisa",
            },
          },
        });
    }
    return route.fallback();
  });
  await page.route("**/api/roster/*", async (route) => {
    if (rosterPosts === 2 && failRead) {
      failRead = false;
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Leitura temporariamente indisponível",
          },
        },
      });
    }
    return route.fallback();
  });
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "dados globais da pessoa já foram salvos",
  );
  await expect(
    page.getByLabel("Nome da pessoa", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Leitura temporariamente indisponível",
  );
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByText("Pessoa salva.", { exact: true })).toBeVisible();
  expect(personPosts).toBe(1);
  expect(rosterPosts).toBe(2);
  expect(ids[0]).toBe(ids[1]);
  expect([...f.persons.values()][0].heightCm).toBe(182);
  expect([...f.roster.values()][0].jersey).toBe("12");
});

test("camisa duplicada preserva pessoa salva e recarrega para corrigir sem recadastro", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop");
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "00");
  await newAthlete(page, "Bia Silva", "1");
  await page
    .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
    .click();
  await page.getByLabel("Altura (cm)", { exact: true }).fill("183");
  await page.getByLabel("Camisa", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "dados globais da pessoa já foram salvos",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar cadastro", exact: true })
    .click();
  await expect(page.getByLabel("Altura (cm)", { exact: true })).toHaveValue(
    "183",
  );
  await expect(page.getByLabel("Camisa", { exact: true })).toHaveValue("00");
  await page.getByLabel("Camisa", { exact: true }).fill("0");
  const version = [...f.persons.values()].find(
    (p) => p.name === "Ana Silva",
  )!.version;
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByText("Pessoa salva.", { exact: true })).toBeVisible();
  expect(
    [...f.persons.values()].find((p) => p.name === "Ana Silva")!.version,
  ).toBe(version);
});

test("reautenticação entre pessoa e camisa preserva a etapa pendente", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "Recorte desktop");
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "00");
  await page
    .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
    .click();
  await page.getByLabel("Altura (cm)", { exact: true }).fill("185");
  await page.getByLabel("Camisa", { exact: true }).fill("8");
  let personPosts = 0,
    rosterPosts = 0;
  const attempts: string[] = [];
  await page.route("**/api/people", async (r) => {
    if (r.request().method() === "POST") personPosts++;
    return r.fallback();
  });
  await page.route("**/api/roster", async (r) => {
    if (r.request().method() === "POST") {
      rosterPosts++;
      attempts.push(r.request().postDataJSON().commandId);
      if (rosterPosts === 1) f.expire();
    }
    return r.fallback();
  });
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Acesso administrativo", exact: true }),
  ).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Camisa", { exact: true })).toHaveValue("8");
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByText("Pessoa salva.", { exact: true })).toBeVisible();
  expect(personPosts).toBe(1);
  expect(rosterPosts).toBe(2);
  expect(attempts[0]).toBe(attempts[1]);
});

test("envio incerto e conflito mantêm edição e comandos corretos", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "00");
  await page
    .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
    .click();
  await page.getByLabel("Camisa", { exact: true }).fill("7");
  f.setMode("uncertain");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(
    page.getByText("Envio não confirmado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByText("Pessoa salva.", { exact: true })).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  await page
    .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
    .click();
  await page.getByLabel("Camisa", { exact: true }).fill("8");
  f.setMode("conflict");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByLabel("Camisa", { exact: true })).toHaveValue("8");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar cadastro", exact: true })
    .click();
  await expect(page.getByLabel("Camisa", { exact: true })).toHaveValue("7");
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar pessoa Ana Silva", exact: true })
    .click();
  await page
    .getByLabel("Nome da pessoa", { exact: true })
    .fill("Minha correção");
  f.setMode("conflict");
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveValue(
    "Minha correção",
  );
  await expect(
    page.getByRole("button", { name: "Salvar pessoa", exact: true }),
  ).toBeDisabled();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar cadastro", exact: true })
    .click();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveValue(
    "Outra sessão",
  );
});
test("guardas e reautenticação preservam cadastro contextual", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await page.getByRole("button", { name: "Informações", exact: true }).click();
  await page
    .getByLabel("Naipe da disputa 1.1", { exact: true })
    .selectOption("masculino");
  await page
    .getByRole("button", { name: "Equipes e elencos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar atleta", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /^(Criar nova pessoa|Cadastrar novo atleta)$/,
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Sexo privado", { exact: true })).toHaveValue(
    "female",
  );
  await expect(
    page.getByRole("checkbox", { name: "Atleta", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Nome da pessoa", { exact: true })
    .fill("Trabalho pendente");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Fechar diálogo", exact: true })
    .click();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveValue(
    "Trabalho pendente",
  );
  f.expire();
  await page
    .getByRole("button", { name: "Salvar pessoa", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByLabel("Nome da pessoa", { exact: true })).toHaveValue(
    "Trabalho pendente",
  );
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByLabel("Camisa", { exact: true })).toBeVisible();
  expect(f.persons.size).toBe(1);
});
