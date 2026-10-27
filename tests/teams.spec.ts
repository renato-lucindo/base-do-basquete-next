import { test, expect, type Page } from "@playwright/test";
import type {
  TeamSnapshot,
  RegistrationSnapshot,
  SaveTeam,
  SaveRegistration,
} from "../src/teams/contract";
const root = "50000000-0000-4000-8000-000000000001";
const dispute = "50000000-0000-4000-8000-000000000003";
const other = "50000000-0000-4000-8000-000000000004";
const savedAt = "2026-10-23T12:00:00Z";
async function fixture(page: Page) {
  const teams = new Map<string, TeamSnapshot>();
  const registrations = new Map<string, RegistrationSnapshot>();
  const receipts = new Map<string, { id: string; version: number }>();
  let authenticated = true;
  let expireOnWrite = false;
  let mode: "normal" | "uncertain" | "conflict" = "normal";
  const attempts: string[] = [];
  await page.route(/\/api\/(roster|staff)(\?|$)/, (route) =>
    route.fulfill({ json: { items: [], hasMore: false } }),
  );
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
              id: root,
              name: "Liga de teste",
              version: 1,
              savedAt,
              seasons: [
                {
                  id: "50000000-0000-4000-8000-000000000002",
                  year: 2026,
                  disputes: [
                    {
                      id: dispute,
                      gender: "masculino",
                      category: "Adulto",
                      division: null,
                    },
                    {
                      id: other,
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
  await page.route(/\/api\/(teams|registrations)(\/|\?|$)/, async (route) => {
    if (expireOnWrite && route.request().method() === "POST") {
      authenticated = false;
      expireOnWrite = false;
    }
    if (!authenticated)
      return route.fulfill({
        status: 401,
        json: { error: { message: "Entre novamente." } },
      });
    const request = route.request(),
      url = new URL(request.url()),
      global = url.pathname.startsWith("/api/teams");
    if (request.method() === "POST") {
      const body = request.postDataJSON() as SaveTeam | SaveRegistration;
      attempts.push(body.commandId);
      if (mode === "conflict") {
        mode = "normal";
        return route.fulfill({
          status: 409,
          json: {
            error: {
              message:
                "Cadastro alterado em outra sessão. Recarregue antes de salvar.",
            },
          },
        });
      }
      if (!receipts.has(body.commandId)) {
        if ("team" in body) {
          const team = {
            ...body.team,
            version: body.expectedVersion + 1,
            savedAt,
          };
          teams.set(team.id, team);
          receipts.set(body.commandId, { id: team.id, version: team.version });
        } else {
          const reg = {
            ...body.registration,
            version: body.expectedVersion + 1,
            savedAt,
            team: teams.get(body.registration.teamId)!,
          };
          registrations.set(reg.id, reg);
          receipts.set(body.commandId, { id: reg.id, version: reg.version });
        }
      }
      if (mode === "uncertain") {
        mode = "normal";
        return route.fulfill({
          status: 503,
          json: { error: { message: "Resposta não confirmada." } },
        });
      }
      return route.fulfill({ json: receipts.get(body.commandId) });
    }
    const id = url.pathname.split("/")[3];
    if (id) {
      const value = global ? teams.get(id) : registrations.get(id);
      return route.fulfill({
        status: value ? 200 : 404,
        json: value ?? { error: { message: "Não encontrado" } },
      });
    }
    const query = (url.searchParams.get("q") ?? "").toLowerCase(),
      offset = Number(url.searchParams.get("offset") ?? 0);
    const items = global
      ? [...teams.values()]
      : [...registrations.values()]
          .filter((r) => r.disputeId === url.searchParams.get("disputeId"))
          .map((r) => ({ ...r, team: teams.get(r.teamId)! }));
    const matches = items
      .filter((r) => r.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
    return route.fulfill({
      json: {
        items: matches.slice(offset, offset + 20),
        hasMore: matches.length > offset + 20,
      },
    });
  });
  return {
    teams,
    registrations,
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
    `http://127.0.0.1:5174/foundation.html#campeonato/${root}/${dispute}/equipes`,
  );
  await expect(
    page.getByRole("heading", { name: "Equipes e elencos", exact: true }),
  ).toBeVisible();
}
async function addGlobal(page: Page) {
  await page
    .getByRole("button", { name: "Adicionar inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Criar equipe global", exact: true })
    .click();
  await page
    .getByLabel("Nome da equipe global", { exact: true })
    .fill("Lobos Clube");
  await page.getByLabel("Sigla (opcional)").fill("LOB");
  await page
    .getByRole("button", { name: "Salvar equipe global", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome público da inscrição", { exact: true }),
  ).toHaveValue("Lobos Clube");
}
test("duas inscrições usam uma equipe global, retomam e isolam disputa", async ({
  page,
}, info) => {
  const f = await fixture(page);
  await open(page);
  await addGlobal(page);
  await page
    .getByLabel("Nome público da inscrição", { exact: true })
    .fill("Lobos");
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Inscrição salva" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adicionar inscrição", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Adicionar inscrição", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Selecionar Lobos Clube", exact: true })
    .click();
  await page
    .getByLabel("Nome público da inscrição", { exact: true })
    .fill("Lobos B");
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expandir Lobos B", exact: true }),
  ).toBeVisible();
  expect(f.teams.size).toBe(1);
  expect(f.registrations.size).toBe(2);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir Lobos B", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar equipe global", exact: true })
    .click();
  await page
    .getByLabel("Nome da equipe global", { exact: true })
    .fill("Lobos Renomeados");
  await page
    .getByRole("button", { name: "Salvar equipe global", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recolher Lobos B", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Lobos Renomeados", { exact: false }).first(),
  ).toBeVisible();
  expect([...f.registrations.values()].map((r) => r.name)).toEqual([
    "Lobos",
    "Lobos B",
  ]);
  await page
    .getByLabel("Disputa de trabalho", { exact: true })
    .selectOption(other);
  await expect(
    page.getByText("Nenhuma inscrição nesta disputa.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Disputa de trabalho", { exact: true })
    .selectOption(dispute);
  await expect(
    page.getByRole("button", { name: "Expandir Lobos B", exact: true }),
  ).toBeVisible();
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.preview-artifacts/equipes-${info.project.name}.png`,
    fullPage: true,
  });
});
test("envio incerto repete comando e conflito conserva edição", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await addGlobal(page);
  await page
    .getByLabel("Nome público da inscrição", { exact: true })
    .fill("Lobos B");
  f.setMode("uncertain");
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(
    page.getByText("Envio não confirmado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Nome público da inscrição", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expandir Lobos B", exact: true }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.registrations.size).toBe(1);
  await page
    .getByRole("button", { name: "Expandir Lobos B", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Editar inscrição", exact: true })
    .click();
  await page
    .getByLabel("Nome público da inscrição", { exact: true })
    .fill("Minha edição");
  f.setMode("conflict");
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome público da inscrição", { exact: true }),
  ).toHaveValue("Minha edição");
  await expect(
    page.getByRole("button", { name: "Salvar inscrição", exact: true }),
  ).toBeDisabled();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Fechar diálogo", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome público da inscrição", { exact: true }),
  ).toHaveValue("Minha edição");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Recarregar cadastro", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome público da inscrição", { exact: true }),
  ).toHaveValue("Lobos B");
});
test("rascunho sobrevive à reautenticação e confirma troca de destino", async ({
  page,
}) => {
  const f = await fixture(page);
  await open(page);
  await addGlobal(page);
  await page
    .getByLabel("Nome público da inscrição", { exact: true })
    .fill("Trabalho pendente");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Fechar diálogo", exact: true })
    .click();
  await expect(
    page.getByLabel("Disputa de trabalho", { exact: true }),
  ).toHaveValue(dispute);
  f.expire();
  await page
    .getByRole("button", { name: "Salvar inscrição", exact: true })
    .click();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  await page.getByLabel("E-mail", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByLabel("Nome público da inscrição", { exact: true }),
  ).toHaveValue("Trabalho pendente");
  await page
    .getByRole("button", { name: "Repetir o mesmo envio", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Expandir Trabalho pendente",
      exact: true,
    }),
  ).toBeVisible();
});
