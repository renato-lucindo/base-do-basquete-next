import { expect, type Page, type Route } from "@playwright/test";
import { transferBrowserFixture } from "./transfer-browser";
import { emptyPerson } from "../../src/people/contract";
import type { PublicPlayerProfile } from "../../src/player-profile/contract";
import { tid } from "./text-import";
export async function profileBrowserFixture(page: Page) {
  const f = await transferBrowserFixture(page),
    pid = f.context.personId;
  const { athlete, coach, ...person } = emptyPerson(pid);
  void athlete;
  void coach;
  person.name = "Ana Silva";
  let personVersion = 1,
    version = 0,
    published: PublicPlayerProfile | null = null,
    failRead = false,
    lose = false,
    expire = false;
  let confirmedPersonVersion: number | null = null;
  const history: {
    version: number;
    personVersion: number;
    confirmedAt: string;
    actorId: string;
    reason: string;
  }[] = [];
  const attempts: string[] = [],
    receipts = new Map<string, { payload: string; ack: unknown }>(),
    snapshots = new Map<number, PublicPlayerProfile>();
  function confirm(reason: string) {
    version++;
    confirmedPersonVersion = personVersion;
    history.unshift({
      version,
      personVersion,
      confirmedAt: "2026-10-25T12:00:00Z",
      actorId: tid(98),
      reason,
    });
    published = {
      kind: "confirmed-player-profile-v1",
      personId: pid,
      version,
      confirmedAt: "2026-10-25T12:00:00Z",
      person: { ...person },
    };
    snapshots.set(version, structuredClone(published));
  }
  const handler = async (route: Route) => {
    const req = route.request();
    if (req.method() === "GET") {
      const url = new URL(req.url()),
        detail = url.pathname.match(/\/versions\/(\d+)$/);
      if (detail) {
        const n = Number(detail[1]),
          header = history.find((h) => h.version === n);
        return route.fulfill({
          json: { ...header, personId: pid, snapshot: snapshots.get(n) },
        });
      }
      if (failRead && version)
        return route.fulfill({
          status: 503,
          json: { error: { message: "Leitura temporariamente indisponível." } },
        });
      return route.fulfill({
        json: {
          proposal: { personId: pid, personVersion, person },
          state: {
            personId: pid,
            personVersion,
            version,
            confirmedPersonVersion,
            sourceChanged: version
              ? personVersion !== confirmedPersonVersion
              : false,
            published,
            history: history.slice(
              Number(url.searchParams.get("offset") ?? 0),
              Number(url.searchParams.get("offset") ?? 0) + 20,
            ),
            hasMore:
              history.length > Number(url.searchParams.get("offset") ?? 0) + 20,
          },
        },
      });
    }
    const payload = req.postData()!;
    attempts.push(payload);
    const c = JSON.parse(payload);
    if (expire) {
      expire = false;
      return route.fulfill({
        status: 401,
        json: { error: { message: "Entre novamente." } },
      });
    }
    const old = receipts.get(c.commandId);
    if (old) return route.fulfill({ json: old.ack });
    if (
      c.expectedPersonVersion !== personVersion ||
      c.expectedPublicationVersion !== version
    )
      return route.fulfill({
        status: 409,
        json: {
          error: { message: "O cadastro mudou. Atualize para conferir." },
        },
      });
    confirm(c.reason);
    const ack = {
      commandId: c.commandId,
      personId: pid,
      version,
      personVersion,
      confirmedAt: published!.confirmedAt,
    };
    receipts.set(c.commandId, { payload, ack });
    if (lose) {
      lose = false;
      return route.fulfill({
        status: 503,
        json: { error: { message: "Envio não confirmado." } },
      });
    }
    return route.fulfill({ json: ack });
  };
  await page.route("**/api/people/**/profile**", handler);
  return {
    attempts,
    receipts,
    pid,
    attach: async (other: Page) => {
      await transferBrowserFixture(other);
      await other.route("**/api/people/**/profile**", handler);
    },
    seedHistory: (count: number) => {
      for (let i = 1; i <= count; i++) {
        personVersion++;
        person.biography = `Biografia confirmada ${i}`;
        confirm(i === 1 ? "" : "Histórico sintético");
      }
    },
    uncertain: () => {
      lose = true;
    },
    failRead: (value: boolean) => {
      failRead = value;
    },
    expire: () => {
      expire = true;
    },
    changeSource: () => {
      personVersion++;
      person.name = "Nome atualizado";
    },
  };
}
export async function openProfilePublication(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
  );
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Perfil público de Ana Silva", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Publicação do perfil", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conferir publicação", exact: true }),
  ).toBeEnabled();
}
export async function conferProfile(page: Page) {
  await page
    .getByLabel("Motivo da publicação", { exact: true })
    .fill("Dados públicos conferidos");
  await page
    .getByRole("button", { name: "Conferir publicação", exact: true })
    .click();
  await expect(
    page.getByLabel("Conferi os dados públicos apresentados", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Conferi os dados públicos apresentados", { exact: true })
    .check();
}
