import { expect, test, type Page } from "@playwright/test";
import { textImportFixture, tid } from "./fixtures/text-import";
import { applyRosterReuseSchema } from "../src/people/roster-reuse-contract";

const savedAt = "2026-10-29T14:00:00Z";
const registration = (id: string, disputeId: string, name: string) => ({
  id,
  disputeId,
  teamId: tid(4),
  seasonId: tid(2),
  championshipId: tid(1),
  name,
  category: "Adulto",
  gender: "feminino" as const,
  year: 2026,
  division: null,
  version: 1,
});

async function reuseFixture(page: Page, extraCandidates = 0) {
  const people = await textImportFixture(page);
  people.persons.get(tid(12))!.data.name = "Maria Silva";
  const source = registration(tid(7), tid(8), "Lobos · disputa anterior");
  const target = registration(tid(5), tid(3), "Lobos");
  const candidates = [
    {
      id: tid(30),
      personId: tid(11),
      name: "Joao Silva",
      jersey: "0",
      eligibility: "eligible",
    },
    {
      id: tid(31),
      personId: tid(12),
      name: "Maria Silva",
      jersey: "00",
      eligibility: "eligible",
    },
    {
      id: tid(32),
      personId: tid(10),
      name: "Ana Silva",
      jersey: "5",
      eligibility: "eligible",
    },
    {
      id: tid(33),
      personId: tid(13),
      name: "Luiza Silva",
      jersey: "17",
      eligibility: "gender_mismatch",
    },
    ...Array.from({ length: extraCandidates }, (_, i) => ({
      id: tid(100 + i),
      personId: tid(200 + i),
      name: `Atleta adicional ${i + 1}`,
      jersey: String(30 + i),
      eligibility: "eligible",
    })),
  ];
  let fingerprint = "a".repeat(64);
  let loseAcknowledgement = false;
  let forceConflict = false;
  const attempts: string[] = [];
  const receipts = new Map<string, unknown>();
  await page.route("**/api/roster/reuse**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const fail = (status: number, code: string, message: string) =>
      route.fulfill({ status, json: { error: { code, message } } });
    if (url.pathname === "/api/roster/reuse/sources") {
      return route.fulfill({
        json: {
          items: [{ ...source, athleteCount: candidates.length, savedAt }],
          hasMore: false,
        },
      });
    }
    if (url.pathname === "/api/roster/reuse/context") {
      return route.fulfill({
        json: {
          source,
          target,
          contextFingerprint: fingerprint,
          targetRoster: [
            { id: tid(20), personId: tid(10), jersey: "5", version: 1 },
            { id: tid(21), personId: tid(14), jersey: "8", version: 1 },
          ],
          candidates: candidates.map((c) => ({
            sourceEntryId: c.id,
            sourceVersion: 1,
            person: { id: c.personId, name: c.name, nickname: null },
            jersey: c.jersey,
            eligibility: c.eligibility,
          })),
        },
      });
    }
    if (url.pathname !== "/api/roster/reuse" || request.method() !== "POST")
      return fail(405, "invalid_method", "Método inválido.");
    const body = request.postData()!;
    attempts.push(body);
    const command = applyRosterReuseSchema.parse(JSON.parse(body));
    const receipt = receipts.get(command.commandId);
    if (receipt) return route.fulfill({ json: receipt });
    if (forceConflict || command.expectedContextFingerprint !== fingerprint) {
      forceConflict = false;
      fingerprint = "b".repeat(64);
      return fail(409, "version_conflict", "O elenco foi alterado.");
    }
    const result = {
      commandId: command.commandId,
      sourceRegistrationId: source.id,
      targetRegistrationId: target.id,
      items: command.items.map((item) => ({
        sourceEntryId: item.sourceEntryId,
        personId: candidates.find((c) => c.id === item.sourceEntryId)!.personId,
        newEntryId: item.newEntryId,
        version: 1 as const,
      })),
    };
    for (const item of command.items) {
      people.members.set(item.newEntryId, {
        id: item.newEntryId,
        personId: candidates.find((c) => c.id === item.sourceEntryId)!.personId,
        registrationId: target.id,
        jersey: item.jersey,
        version: 1,
      });
    }
    receipts.set(command.commandId, result);
    if (loseAcknowledgement) {
      loseAcknowledgement = false;
      return fail(503, "access_unavailable", "Resposta não confirmada.");
    }
    return route.fulfill({ json: result });
  });
  return {
    people,
    attempts,
    receipts,
    uncertain: () => {
      loseAcknowledgement = true;
    },
    conflict: () => {
      forceConflict = true;
    },
  };
}

async function openReuse(page: Page) {
  const origin = process.env.ROSTER_REUSE_BASE_URL ?? "http://127.0.0.1:5174";
  await page.goto(
    `${origin}/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
  );
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page.getByRole("button", { name: "Reaproveitar atletas" }).click();
  await page.getByLabel("Inscrição de origem").selectOption(tid(7));
  await expect(page.getByLabel("Incluir Joao Silva")).toBeVisible();
}

async function confirmReuse(page: Page) {
  await page.getByLabel(/Confirmo a inclusão dos/).check();
  await page
    .getByRole("button", { name: "Confirmar reaproveitamento" })
    .click();
}

for (const width of [1366, 1920]) {
  test(`desktop ${width}: seleção explícita, camisas 0/00 e roster atualizado`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 1080 });
    const f = await reuseFixture(page);
    await openReuse(page);
    await expect(page.getByLabel("Incluir Joao Silva")).not.toBeChecked();
    await expect(page.getByLabel("Incluir Maria Silva")).not.toBeChecked();
    await expect(page.getByLabel("Incluir Ana Silva")).toBeDisabled();
    await expect(page.getByLabel("Incluir Luiza Silva")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Confirmar reaproveitamento" }),
    ).toBeDisabled();
    await page.getByLabel("Incluir Joao Silva").check();
    await page.getByLabel("Incluir Maria Silva").check();
    await expect(page.getByLabel("Camisa de Joao Silva")).toHaveValue("0");
    await expect(page.getByLabel("Camisa de Maria Silva")).toHaveValue("00");
    await page.getByLabel("Camisa de Maria Silva").fill("0");
    await expect(page.getByText(/Corrija 2 camisa/)).toBeVisible();
    await page.getByLabel("Camisa de Maria Silva").fill("00");
    await expect(page.getByText(/Corrija 2 camisa/)).not.toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.preview-artifacts/roster-reuse-${width}.png`,
      fullPage: true,
    });
    await confirmReuse(page);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "2 atleta(s) reaproveitado(s)" }),
    ).toBeVisible();
    expect(f.receipts.size).toBe(1);
    expect(f.people.members.size).toBe(4);
    await page
      .getByRole("button", { name: "Retornar ao elenco atualizado" })
      .click();
    await expect(
      page.getByTestId("roster-row").filter({ hasText: "Joao Silva" }),
    ).toContainText("0");
    await expect(
      page.getByTestId("roster-row").filter({ hasText: "Maria Silva" }),
    ).toContainText("00");
  });
}

test("ACK perdido reenviado com bytes e IDs idênticos, sem duplicação", async ({
  page,
}) => {
  const f = await reuseFixture(page);
  await openReuse(page);
  await page.getByLabel("Incluir Joao Silva").check();
  f.uncertain();
  await confirmReuse(page);
  await expect(
    page.getByRole("button", { name: "Reenviar comando para confirmar" }),
  ).toBeVisible();
  await expect(page.getByLabel("Camisa de Joao Silva")).toBeDisabled();
  await page
    .getByRole("button", { name: "Reenviar comando para confirmar" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "1 atleta(s) reaproveitado(s)" }),
  ).toBeVisible();
  expect(f.attempts).toHaveLength(2);
  expect(f.attempts[0]).toBe(f.attempts[1]);
  expect(f.receipts.size).toBe(1);
  expect(f.people.members.size).toBe(3);
});

test("conflito exige atualização de contexto e nova confirmação", async ({
  page,
}) => {
  const f = await reuseFixture(page);
  await openReuse(page);
  await page.getByLabel("Incluir Joao Silva").check();
  f.conflict();
  await confirmReuse(page);
  await expect(
    page.getByRole("alert").filter({ hasText: "O elenco foi alterado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar reaproveitamento" }),
  ).toBeDisabled();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Atualizar prévia" }).click();
  await expect(page.getByLabel("Incluir Joao Silva")).not.toBeChecked();
  await page.getByLabel("Incluir Joao Silva").check();
  await confirmReuse(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "1 atleta(s) reaproveitado(s)" }),
  ).toBeVisible();
});

test("paginação de candidatos mantém a seleção e protege alterações na saída", async ({
  page,
}) => {
  await reuseFixture(page, 26);
  await openReuse(page);
  await page.getByLabel("Incluir Joao Silva").check();
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(
    page.getByText("Atletas da origem — página 2 de 2"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Página anterior" }).click();
  await expect(page.getByLabel("Incluir Joao Silva")).toBeChecked();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Voltar ao elenco" }).click();
  await expect(page.getByLabel("Incluir Joao Silva")).toBeChecked();
});
