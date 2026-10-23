import { test, expect, type Page } from "@playwright/test";
import { type PersonSnapshot, type SavePerson } from "../src/people/contract";
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
      return route.fulfill({ json: { items, hasMore: false } });
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
          ? Number(a.jersey) - Number(b.jersey) ||
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
    .getByRole("button", { name: "Criar nova pessoa", exact: true })
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
    .getByRole("button", { name: "Usar Ana Silva", exact: true })
    .click();
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
    .getByRole("button", { name: "Criar nova pessoa", exact: true })
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
    .getByRole("button", { name: "Usar Ana Silva", exact: true })
    .click();
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
    .getByRole("button", { name: "Criar nova pessoa", exact: true })
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
test("envio incerto e conflito mantêm edição e comandos corretos", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await newAthlete(page, "Ana Silva", "00");
  await page
    .getByRole("button", { name: "Editar camisa de Ana Silva", exact: true })
    .click();
  await page.getByLabel("Camisa", { exact: true }).fill("7");
  f.setMode("uncertain");
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
    .click();
  await expect(
    page.getByText("Envio não confirmado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(page.getByText("Vínculo salvo.", { exact: true })).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  await page
    .getByRole("button", { name: "Editar camisa de Ana Silva", exact: true })
    .click();
  await page.getByLabel("Camisa", { exact: true }).fill("8");
  f.setMode("conflict");
  await page
    .getByRole("button", { name: "Salvar vínculo", exact: true })
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
    .getByRole("button", { name: "Criar nova pessoa", exact: true })
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
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
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
