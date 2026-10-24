import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { extractSupportedPdf } from "../../src/boxscore/extract";
import {
  parsedBoxscoreSchema,
  savePdfReviewSchema,
  type PdfSource,
  type PdfReviewSnapshot,
} from "../../src/boxscore/source-contract";
import { gamesFixture } from "./games";
import { tid } from "./text-import";
export const pdfPath =
  "especificacao/BASE-DO-BASQUETE-ARQUITETURA-20261022/modulos/source/docs/plan/referencias/modelos-boxscore/Boxscore-site.pdf";
export async function pdfFixture(page: Page) {
  const games = await gamesFixture(page),
    bytes = new Uint8Array(await readFile(pdfPath)),
    extracted = await extractSupportedPdf(
      bytes,
      "sample.pdf",
      "application/pdf",
    ),
    parsed = parsedBoxscoreSchema.parse(extracted.parsed),
    savedAt = "2026-10-24T03:00:00Z";
  const comp = {
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
          {
            id: tid(30),
            gender: "masculino",
            category: "Juvenil",
            division: null,
          },
        ],
      },
    ],
  };
  await page.route("**/api/competitions**", (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === "/api/competitions"
          ? { items: [], recents: [], hasMore: false }
          : comp,
    }),
  );
  games.games.set(tid(8), {
    id: tid(8),
    disputeId: tid(3),
    homeRegistrationId: tid(5),
    awayRegistrationId: tid(6),
    date: "2026-10-24",
    time: null,
    venue: null,
    number: null,
    version: 1,
    savedAt,
    state: "scheduled",
    timeZone: "America/Sao_Paulo",
    scheduledAt: null,
    home: games.registrations.get(tid(5))!,
    away: games.registrations.get(tid(6))!,
  });
  const sources = new Map<string, PdfSource>(),
    reviews = new Map<string, PdfReviewSnapshot>(),
    receipts = new Map<string, unknown>(),
    uploads: string[] = [];
  let uncertain = false,
    expire = false,
    conflict = false;
  const snapshot = (source: PdfSource): PdfReviewSnapshot =>
    reviews.get(source.id) ?? {
      source,
      version: 0,
      savedAt: null,
      document: {
        disputeId: source.disputeId,
        gameId: null,
        invertSides: false,
        mappings: source.parsed.teams.flatMap((t, side) =>
          t.players.map((p, index) => ({
            sourceSide: side as 0 | 1,
            sourceIndex: index,
            rosterEntryId: null,
            jersey: p.jerseyNumber,
          })),
        ),
        notes: "",
      },
    };
  await page.route(/\/api\/pdf-sources(\?|\/|$)/, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      id = url.pathname.split("/")[3],
      isReview = url.pathname.endsWith("/review");
    if (expire && request.method() === "POST") {
      expire = false;
      return route.fulfill({
        status: 401,
        json: {
          error: { code: "invalid_session", message: "Entre novamente." },
        },
      });
    }
    if (request.method() === "GET") {
      if (id) {
        const source = sources.get(id);
        return route.fulfill({
          status: source ? 200 : 404,
          json: source
            ? isReview
              ? snapshot(source)
              : source
            : {
                error: {
                  code: "context_not_found",
                  message: "Documento não encontrado.",
                },
              },
        });
      }
      const rows = [...sources.values()].filter(
          (s) =>
            snapshot(s).document.disputeId ===
            url.searchParams.get("disputeId"),
        ),
        offset = Number(url.searchParams.get("offset") ?? 0);
      return route.fulfill({
        json: {
          items: rows.slice(offset, offset + 20),
          hasMore: rows.length > offset + 20,
        },
      });
    }
    if (isReview) {
      const command = savePdfReviewSchema.parse(request.postDataJSON()),
        source = sources.get(id)!;
      if (receipts.has(command.commandId))
        return route.fulfill({ json: receipts.get(command.commandId) });
      if (conflict) {
        conflict = false;
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: "version_conflict",
              message: "A revisão mudou. Recarregue.",
            },
          },
        });
      }
      const r = {
        source,
        document: command.document,
        version: command.expectedVersion + 1,
        savedAt,
      };
      reviews.set(id, r);
      const result = { id, version: r.version };
      receipts.set(command.commandId, result);
      return route.fulfill({ json: result });
    }
    const commandId = url.searchParams.get("commandId")!,
      sourceId = url.searchParams.get("sourceId")!,
      filename = url.searchParams.get("filename")!;
    uploads.push(commandId);
    if (filename === "invalid.pdf")
      return route.fulfill({
        status: 400,
        json: { error: { code: "invalid_input", message: "PDF inválido." } },
      });
    const duplicateSource = [...sources.values()].find(
      (s) => s.sha256 === extracted.sha256,
    );
    if (!sources.has(sourceId) && !duplicateSource)
      sources.set(sourceId, {
        id: sourceId,
        disputeId: url.searchParams.get("disputeId")!,
        filename,
        sha256: extracted.sha256,
        byteSize: bytes.length,
        pageCount: extracted.pageCount,
        parsed,
        ready: true,
        version: 2,
        savedAt,
      });
    const uploadResult = receipts.get(commandId) ?? {
      id: duplicateSource?.id ?? sourceId,
      version: 2,
      duplicate: !!duplicateSource,
    };
    receipts.set(commandId, uploadResult);
    if (uncertain) {
      uncertain = false;
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "access_unavailable",
            message: "Resposta não confirmada.",
          },
        },
      });
    }
    return route.fulfill({
      json: uploadResult,
    });
  });
  return {
    ...games,
    sources,
    reviews,
    uploads,
    pdfUncertain: () => {
      uncertain = true;
    },
    pdfExpire: () => {
      expire = true;
    },
    pdfConflict: () => {
      conflict = true;
    },
  };
}
