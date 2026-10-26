import type { Page } from "@playwright/test";
import {
  emptyImportPlayer,
  normalizeName,
  saveTextReviewSchema,
  confirmTextRowSchema,
  prepareTextTargetSchema,
  type TextReviewSnapshot,
  type ImportPlayer,
} from "../../src/text-import/contract";
export const tid = (n: number) =>
  `e1000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const savedAt = "2026-10-23T18:00:00Z";
type Person = { id: string; version: number; data: ImportPlayer };
type Member = {
  id: string;
  personId: string;
  registrationId: string;
  jersey: string | null;
  version: number;
};
export async function textImportFixture(page: Page) {
  const persons = new Map<string, Person>(),
    members = new Map<string, Member>(),
    reviews = new Map<string, TextReviewSnapshot>(),
    receipts = new Map<string, { fingerprint: string; result: unknown }>();
  const attempts: string[] = [];
  let authenticated = true,
    expireNext = false,
    uncertain = false,
    conflict = false;
  const failedNames = new Set<string>();
  const team = {
    id: tid(4),
    name: "Lobos Clube",
    abbreviation: "LOB",
    version: 1,
    savedAt,
  };
  const registrations = [
    { id: tid(5), name: "Lobos" },
    { id: tid(6), name: "Lobos B" },
  ].map((r) => ({
    ...r,
    teamId: team.id,
    team,
    disputeId: tid(3),
    version: 1,
    savedAt,
  }));
  function person(n: number, name: string, patch: Partial<ImportPlayer> = {}) {
    const p = {
      id: tid(n),
      version: 1,
      data: { ...emptyImportPlayer(), name, ...patch },
    };
    persons.set(p.id, p);
    return p;
  }
  person(10, "Ana Silva", {
    nickname: "Aninha",
    dominantHand: "left",
    birthYear: 1990,
    federationRegistration: "001234",
    positions: ["Armador"],
  });
  person(11, "Joao Silva", {
    birthYear: 1999,
    federationRegistration: "000111",
  });
  person(12, "Joao Silva", {
    birthYear: 2001,
    federationRegistration: "000222",
  });
  person(13, "Luka Silva");
  person(14, "Ausente");
  members.set(tid(20), {
    id: tid(20),
    personId: tid(10),
    registrationId: tid(5),
    jersey: "5",
    version: 1,
  });
  members.set(tid(21), {
    id: tid(21),
    personId: tid(14),
    registrationId: tid(5),
    jersey: "8",
    version: 1,
  });
  const candidate = (p: Person, registrationId: string | null) => ({
    id: p.id,
    version: p.version,
    data: {
      ...p.data,
      jersey:
        [...members.values()].find(
          (m) => m.personId === p.id && m.registrationId === registrationId,
        )?.jersey ?? null,
    },
    sex: "female",
    hasAthlete: true,
    contexts: [...members.values()]
      .filter((m) => m.personId === p.id)
      .map((m) => ({
        registrationId: m.registrationId,
        teamName: registrations.find((r) => r.id === m.registrationId)!.name,
        year: 2026,
        gender: "feminino",
        category: "Adulto",
        division: null,
        active: true,
      })),
    roster: (() => {
      const m = [...members.values()].find(
        (m) => m.personId === p.id && m.registrationId === registrationId,
      );
      return m ? { id: m.id, version: m.version, jersey: m.jersey } : null;
    })(),
    activeRegistrationId:
      [...members.values()].find((m) => m.personId === p.id)?.registrationId ??
      null,
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
              id: tid(1),
              name: "Liga de teste",
              version: 1,
              savedAt,
              seasons: [
                {
                  id: tid(2),
                  year: 2026,
                  disputes: [
                    {
                      id: tid(3),
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
  await page.route("**/api/registrations**", (route) => {
    const url = new URL(route.request().url()),
      id = url.pathname.split("/")[3];
    return route.fulfill({
      json: id
        ? registrations.find((r) => r.id === id)
        : { items: registrations, hasMore: false },
    });
  });
  await page.route("**/api/teams**", (route) =>
    route.fulfill({ json: { items: [team], hasMore: false } }),
  );
  await page.route(/\/api\/(roster|staff)(\?|$)/, (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: {
        items:
          url.pathname === "/api/staff"
            ? []
            : [...members.values()]
                .filter(
                  (m) =>
                    m.registrationId === url.searchParams.get("registrationId"),
                )
                .sort((a, b) =>
                  a.jersey === null
                    ? 1
                    : b.jersey === null
                      ? -1
                      : Number(a.jersey) - Number(b.jersey) ||
                        a.jersey.length - b.jersey.length,
                )
                .map((m) => ({
                  ...m,
                  disputeId: tid(3),
                  active: true,
                  startedAt: savedAt,
                  endedAt: null,
                  savedAt,
                  person: {
                    id: m.personId,
                    name: persons.get(m.personId)!.data.name,
                    nickname: persons.get(m.personId)!.data.nickname,
                    publicBirthYear: null,
                  },
                })),
        hasMore: false,
      },
    });
  });
  await page.route(/\/api\/text-import(\/|\?|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      tail = url.pathname.slice("/api/text-import".length);
    const error = (status: number, code: string, message: string) =>
      route.fulfill({ status, json: { error: { code, message } } });
    if (expireNext && request.method() === "POST" && tail !== "/match") {
      authenticated = false;
      expireNext = false;
    }
    if (!authenticated)
      return error(401, "invalid_session", "Entre novamente.");
    if (request.method() === "GET") {
      if (!tail)
        return route.fulfill({
          json: {
            items: [...reviews.values()].map((r) => ({
              id: r.id,
              disputeId: r.disputeId,
              registrationId:
                r.target.kind === "registration"
                  ? r.target.registrationId
                  : null,
              teamName: r.teamName,
              version: r.version,
              savedAt: r.savedAt,
              totalRows: r.rows.length,
              confirmedRows: r.results.length,
            })),
            hasMore: false,
          },
        });
      if (tail.startsWith("/people/")) {
        const p = persons.get(tail.split("/")[2]);
        return p
          ? route.fulfill({
              json: candidate(p, url.searchParams.get("registrationId")),
            })
          : error(404, "context_not_found", "Pessoa ausente.");
      }
      const r = reviews.get(tail.slice(1));
      return r
        ? route.fulfill({ json: r })
        : error(404, "context_not_found", "Conferência ausente.");
    }
    if (tail === "/match") {
      const query = request.postDataJSON() as {
        registrationId: string | null;
        players: {
          rowId: string;
          name: string;
          birthYear: number | null;
          federationRegistration: string | null;
        }[];
      };
      return route.fulfill({
        json: {
          items: query.players.map((row) => {
            const reg = [...persons.values()].filter(
              (p) =>
                row.federationRegistration &&
                p.data.federationRegistration === row.federationRegistration,
            );
            const exact = [...persons.values()].filter(
              (p) => normalizeName(p.data.name) === normalizeName(row.name),
            );
            const similar = [...persons.values()].filter(
              (p) =>
                normalizeName(p.data.name).slice(0, 3) ===
                normalizeName(row.name).slice(0, 3),
            );
            const matches = reg.length ? reg : exact.length ? exact : similar;
            matches.sort(
              (a, b) =>
                Number(b.data.birthYear === row.birthYear) -
                Number(a.data.birthYear === row.birthYear),
            );
            return {
              rowId: row.rowId,
              status: reg.length
                ? "registration"
                : exact.length > 1
                  ? "ambiguous"
                  : exact.length
                    ? "name"
                    : matches.length
                      ? "suggestion"
                      : "new",
              candidates: matches
                .slice(0, 5)
                .map((p) => candidate(p, query.registrationId)),
              hasMore: matches.length > 5,
            };
          }),
        },
      });
    }
    const raw = request.postDataJSON() as { commandId: string },
      fingerprint = JSON.stringify(raw),
      receipt = receipts.get(raw.commandId);
    if (tail === "/confirm") attempts.push(raw.commandId);
    if (receipt)
      return receipt.fingerprint === fingerprint
        ? route.fulfill({ json: receipt.result })
        : error(409, "idempotency_conflict", "Envio diferente.");
    if (!tail) {
      const command = saveTextReviewSchema.parse(raw),
        old = reviews.get(command.review.id);
      if (conflict && old) {
        conflict = false;
        old.version++;
        old.rows[0].data.name = "Alterada noutra sessão";
        return error(
          409,
          "version_conflict",
          "A conferência foi alterada em outra sessão.",
        );
      }
      if ((old?.version ?? 0) !== command.expectedVersion)
        return error(409, "version_conflict", "Versão alterada.");
      const snapshot = {
        ...structuredClone(command.review),
        version: command.expectedVersion + 1,
        savedAt,
        results: old?.results ?? [],
      };
      reviews.set(snapshot.id, snapshot);
      const result = { id: snapshot.id, version: snapshot.version };
      receipts.set(raw.commandId, { fingerprint, result });
      return route.fulfill({ json: result });
    }
    if (tail === "/prepare") {
      const command = prepareTextTargetSchema.parse(raw),
        r = reviews.get(command.reviewId)!;
      if (r.version !== command.expectedVersion)
        return error(409, "version_conflict", "Versão alterada.");
      if (r.target.kind !== "registration") {
        const target = r.target,
          newTeam =
            target.kind === "newTeam"
              ? { ...team, id: target.teamId, name: target.teamName }
              : team;
        registrations.push({
          id: target.registrationId,
          name: target.registrationName,
          teamId: target.teamId,
          team: newTeam,
          disputeId: tid(3),
          version: 1,
          savedAt,
        });
        r.target = {
          kind: "registration",
          registrationId: target.registrationId,
          version: 1,
        };
        r.version++;
      }
      const result = {
        id: r.id,
        version: r.version,
        registrationId: r.target.registrationId,
        registrationVersion: r.target.version,
      };
      receipts.set(raw.commandId, { fingerprint, result });
      return route.fulfill({ json: result });
    }
    const command = confirmTextRowSchema.parse(raw),
      r = reviews.get(command.reviewId)!;
    if (r.version !== command.expectedVersion)
      return error(409, "version_conflict", "Versão alterada.");
    const row = r.rows.find((row) => row.id === command.rowId)!,
      decision = row.decision!;
    if (failedNames.has(row.data.name))
      return error(
        400,
        "invalid_input",
        "Falha nesta linha. Corrija antes de repetir.",
      );
    const registrationId = r.target.registrationId;
    const existing = members.get(row.rosterId);
    const jersey =
      row.provided.includes("jersey") || !existing
        ? row.data.jersey
        : existing.jersey;
    if (
      [...members.values()].some(
        (m) =>
          m.id !== row.rosterId &&
          (m.personId === decision.personId ||
            (m.registrationId === registrationId &&
              jersey !== null &&
              m.jersey === jersey)),
      )
    )
      return error(400, "invalid_input", "Vínculo ou camisa repetida.");
    if (
      decision.kind === "new" &&
      !decision.confirmHomonym &&
      [...persons.values()].some(
        (p) => normalizeName(p.data.name) === normalizeName(row.data.name),
      )
    )
      return error(
        409,
        "identity_confirmation_required",
        "Confirme outra identidade.",
      );
    if (decision.kind === "new")
      persons.set(decision.personId, {
        id: decision.personId,
        version: 1,
        data: structuredClone(row.data),
      });
    else if (decision.approveChanges) {
      const p = persons.get(decision.personId)!;
      for (const key of row.provided)
        if (key !== "jersey")
          Object.assign(p.data, { [key]: structuredClone(row.data[key]) });
      p.version++;
    }
    const member = {
      id: row.rosterId,
      registrationId,
      personId: decision.personId,
      jersey,
      version: row.rosterVersion + 1,
    };
    members.set(member.id, member);
    const result = {
      rowId: row.id,
      entityId: member.id,
      entityVersion: member.version,
    };
    r.results.push(result);
    r.version++;
    const reply = { id: r.id, version: r.version, result };
    receipts.set(raw.commandId, { fingerprint, result: reply });
    if (uncertain) {
      uncertain = false;
      return error(
        503,
        "access_unavailable",
        "Não foi possível confirmar a resposta.",
      );
    }
    return route.fulfill({ json: reply });
  });
  return {
    registrations,
    persons,
    members,
    reviews,
    attempts,
    failedNames,
    expire: () => {
      expireNext = true;
    },
    uncertain: () => {
      uncertain = true;
      attempts.length = 0;
    },
    conflict: () => {
      conflict = true;
    },
  };
}
export async function openTextImport(page: Page) {
  await page.goto(
    `http://127.0.0.1:5174/foundation.html#campeonato/${tid(1)}/${tid(3)}/equipes`,
  );
  await page
    .getByRole("button", { name: "Expandir Lobos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Importar elenco", exact: true })
    .click();
}
