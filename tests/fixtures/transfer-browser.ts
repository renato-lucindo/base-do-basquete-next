import { expect, type Page } from "@playwright/test";
import { textImportFixture, tid } from "./text-import";
import { transferFixture, transferId } from "./transfers";
import { SupabaseTransfers } from "../../src/people/transfer-provider";
import { saveTransferSchema } from "../../src/people/transfer-contract";

export async function transferBrowserFixture(
  page: Page,
  shared?: {
    context: ReturnType<typeof transferFixture>["context"];
    receipts: Map<string, unknown>;
  },
) {
  const f = await textImportFixture(page);
  let raw = JSON.stringify(transferFixture().context);
  for (const [from, to] of [
    [90, 3],
    [1, 10],
    [2, 14],
    [10, 5],
    [11, 6],
    [20, 20],
    [21, 21],
    [80, 4],
  ])
    raw = raw.replaceAll(transferId(from), tid(to));
  const ctx =
    shared?.context ??
    (JSON.parse(raw) as ReturnType<typeof transferFixture>["context"]);
  ctx.registrations[0].name = "Lobos";
  ctx.registrations[1].name = "Lobos B";
  const attempts: string[] = [],
    receipts = shared?.receipts ?? new Map<string, unknown>();
  let lose = false,
    failGet = false,
    reject = false,
    expire = false;
  const snapshot = (id: string) => {
    const m = ctx.memberships.find((m) => m.id === id)!;
    const person = f.persons.get(m.personId)!;
    return {
      ...m,
      active: m.endedAt === null,
      savedAt: ctx.effectiveAt,
      person: {
        id: person.id,
        name: person.data.name,
        nickname: person.data.nickname,
        publicBirthYear: null,
      },
    };
  };
  const db = new SupabaseTransfers(
    { url: "https://db.example.test", key: "fixture" },
    async (url, init) => {
      if (url.endsWith("get_transfer_context")) return Response.json(ctx);
      const c = saveTransferSchema.parse(
          JSON.parse(init.body as string).p_command,
        ),
        old = receipts.get(c.commandId);
      if (old) return Response.json(old);
      if (reject || c.expectedContextFingerprint !== ctx.contextFingerprint) {
        reject = false;
        return Response.json(
          { message: "transfer_context_conflict" },
          { status: 409 },
        );
      }
      const source = ctx.memberships.find((m) => m.id === c.sourceEntryId)!;
      const returning = ctx.memberships.some(
        (m) =>
          m.personId === ctx.personId &&
          m.registrationId === c.destinationRegistrationId,
      );
      if (source.endedAt === null) {
        source.endedAt = ctx.effectiveAt;
        source.version++;
      }
      const ack = {
        commandId: c.commandId,
        disputeId: c.disputeId,
        personId: ctx.personId,
        sourceEntryId: c.sourceEntryId,
        sourceVersion: source.version,
        newEntryId: c.newEntryId,
        newEntryVersion: 1,
        destinationRegistrationId: c.destinationRegistrationId,
        effectiveAt: ctx.effectiveAt,
        kind: returning ? "return" : "transfer",
      };
      ctx.memberships.push({
        id: c.newEntryId,
        personId: ctx.personId,
        disputeId: c.disputeId,
        registrationId: c.destinationRegistrationId,
        jersey: c.jersey,
        version: 1,
        startedAt: ctx.effectiveAt,
        endedAt: null,
      });
      ctx.contextFingerprint = "b".repeat(64);
      receipts.set(c.commandId, ack);
      if (lose) {
        lose = false;
        return Response.json({}, { status: 503 });
      }
      return Response.json(ack);
    },
  );
  await page.route("**/api/roster**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      match = /^\/api\/roster\/([^/]+)\/transfer(\/preview)?$/.exec(
        url.pathname,
      );
    const error = (status: number, message: string) =>
      route.fulfill({ status, json: { error: { message } } });
    if (match) {
      if (req.method() === "POST" && !match[2]) attempts.push(req.postData()!);
      if (req.method() === "POST" && expire) {
        expire = false;
        return error(401, "Entre novamente.");
      }
      if (req.method() === "GET" && failGet && receipts.size)
        return error(503, "Atualização temporariamente indisponível.");
      try {
        if (req.method() === "GET")
          return route.fulfill({
            json: await db.getContext(
              "fixture",
              match[1],
              url.searchParams.get("destinationRegistrationId")!,
            ),
          });
        const c = req.postDataJSON();
        if (match[2])
          return route.fulfill({ json: await db.preview("fixture", c) });
        return route.fulfill({ json: await db.save("fixture", c) });
      } catch (e) {
        return error(
          (e as { status?: number }).status ?? 503,
          (e as Error).message,
        );
      }
    }
    if (req.method() !== "GET") return route.fallback();
    if (url.pathname === "/api/roster") {
      const items = ctx.memberships.filter(
        (m) =>
          m.registrationId === url.searchParams.get("registrationId") &&
          (url.searchParams.get("activeOnly") === "0" || m.endedAt === null),
      );
      return route.fulfill({
        json: { items: items.map((m) => snapshot(m.id)), hasMore: false },
      });
    }
    const id = url.pathname.split("/")[3];
    return route.fulfill({
      json: ctx.memberships.some((m) => m.id === id) ? snapshot(id) : null,
    });
  });
  return {
    context: ctx,
    attempts,
    receipts,
    uncertain: () => {
      lose = true;
    },
    failRead: (v: boolean) => {
      failGet = v;
    },
    conflict: () => {
      reject = true;
    },
    expire: () => {
      expire = true;
    },
  };
}
export async function openTransfer(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
  );
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Transferir Ana Silva", exact: true })
    .click();
  await expect(
    page.getByLabel("Inscrição de destino", { exact: true }),
  ).toBeEnabled();
}
export async function conferTransfer(page: Page) {
  await page
    .getByLabel("Inscrição de destino", { exact: true })
    .selectOption(tid(6));
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByLabel("Camisa no destino", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Camisa no destino", { exact: true }).fill("00");
  await page
    .getByLabel("Motivo da transferência ou retorno", { exact: true })
    .fill("Transferência conferida com o regulamento");
  await page
    .getByRole("button", { name: "Conferir transferência", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conferência da transferência",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Conferi destino, camisa e preservação do histórico", {
      exact: true,
    })
    .check();
}
