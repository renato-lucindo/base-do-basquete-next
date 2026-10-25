import assert from "node:assert/strict";
import { Response } from "miniflare";
import { achievementBackendFixture } from "./achievement-backend.ts";
// Transport/UX fixture only; PostgreSQL proofs cover eligibility and atomicity.
export function achievementOutbound(
  options = {},
  fixture = achievementBackendFixture(),
) {
  const f = fixture,
    workspace = structuredClone(f.workspace),
    saves = new Map(),
    confirmations = new Map(),
    drafts = new Map(),
    publications = new Map();
  let published = null;
  return async (request) => {
    const name = new URL(request.url).pathname.split("/").at(-1);
    if (
      ![
        "get_achievement_workspace",
        "get_achievement_context",
        "list_achievement_athletes",
        "save_achievement_draft",
        "confirm_achievements",
        "get_achievement_draft_version",
        "get_achievement_publication_version",
        "get_public_achievements",
      ].includes(name)
    )
      return null;
    if (name !== "get_public_achievements")
      assert.equal(
        request.headers.get("authorization"),
        "Bearer fixture-access",
      );
    else assert.equal(request.headers.get("authorization"), null);
    const args = await request.json();
    if (name === "get_achievement_context") return Response.json(f.source);
    if (name === "get_achievement_workspace") {
      const value = structuredClone(workspace),
        draftOffset = args.p_draft_offset ?? 0,
        pubOffset = args.p_publication_offset ?? 0;
      value.draft.history = workspace.draft.history.slice(
        draftOffset,
        draftOffset + 20,
      );
      value.draft.hasMore = workspace.draft.history.length > draftOffset + 20;
      value.publication.history = workspace.publication.history.slice(
        pubOffset,
        pubOffset + 20,
      );
      value.publication.hasMore =
        workspace.publication.history.length > pubOffset + 20;
      return Response.json(value);
    }
    if (name === "get_public_achievements") return Response.json(published);
    if (name === "list_achievement_athletes")
      return Response.json({
        disputeId: f.source.disputeId,
        items: args.p_offset
          ? []
          : [
              {
                personId: f.id(500),
                version: 1,
                name: "Atleta",
                nickname: null,
                publicBirthYear: null,
                registrationIds: [f.id(1)],
              },
            ],
        hasMore: false,
      });
    if (name === "get_achievement_draft_version")
      return Response.json(drafts.get(args.p_version) ?? null);
    if (name === "get_achievement_publication_version")
      return Response.json(publications.get(args.p_version) ?? null);
    const c = args.p_command,
      save = name === "save_achievement_draft",
      receipts = save ? saves : confirmations,
      receipt = receipts.get(c.commandId);
    if (receipt) {
      assert.deepEqual(c, receipt.command);
      return Response.json(receipt.ack);
    }
    const conflict = () =>
      Response.json(
        { message: "version_conflict", details: "private SQL" },
        { status: 409 },
      );
    if (c.expectedContextFingerprint !== f.fp) return conflict();
    if (save) {
      if (c.expectedVersion !== workspace.draft.version) return conflict();
      const nv = c.expectedVersion + 1,
        ack = {
          commandId: c.commandId,
          disputeId: f.source.disputeId,
          version: nv,
          savedAt: f.stamp,
          contextFingerprint: f.fp,
        };
      workspace.draft = {
        ...workspace.draft,
        version: nv,
        draft: c.draft,
        source: c.source,
        savedAt: f.stamp,
        savedContextFingerprint: f.fp,
        needsReview: false,
        history: [
          { version: nv, savedAt: f.stamp, actorId: f.id(900) },
          ...workspace.draft.history,
        ],
      };
      const ids = new Set(c.draft.honors.flatMap((h) => h.personIds));
      workspace.selectedPeople = ids.has(f.id(500))
        ? [
            {
              personId: f.id(500),
              version: 1,
              name: "Atleta",
              nickname: null,
              publicBirthYear: null,
            },
          ]
        : [];
      workspace.publication.draftVersion = nv;
      workspace.publication.draftChanged =
        workspace.publication.version > 0 &&
        workspace.publication.confirmedDraftVersion !== nv;
      drafts.set(nv, {
        disputeId: f.source.disputeId,
        version: nv,
        draft: c.draft,
        source: c.source,
        contextSnapshot: f.source,
        contextFingerprint: f.fp,
        actorId: f.id(900),
        savedAt: f.stamp,
      });
      saves.set(c.commandId, { command: structuredClone(c), ack });
      options.achievementSaves = (options.achievementSaves ?? 0) + 1;
      if (options.loseAchievementSaveAck) {
        options.loseAchievementSaveAck = false;
        return Response.json({ details: "private SQL" }, { status: 503 });
      }
      return Response.json(ack);
    }
    if (
      c.expectedPublicationVersion !== workspace.publication.version ||
      c.expectedDraftVersion !== workspace.draft.version
    )
      return conflict();
    const nv = c.expectedPublicationVersion + 1,
      d = workspace.draft.draft,
      ack = {
        commandId: c.commandId,
        disputeId: f.source.disputeId,
        version: nv,
        draftVersion: c.expectedDraftVersion,
        confirmedAt: f.stamp,
      };
    published = {
      ...f.publicValue,
      version: nv,
      placements: d.placements.map((g) => ({
        position: g.position,
        registrations: g.registrationIds.map((id) => {
          const r = f.source.registrations.find((v) => v.id === id);
          return { registrationId: id, teamId: r.teamId, name: r.name };
        }),
      })),
      honors: d.honors.map((h) => ({
        id: h.id,
        title: h.title,
        athletes: h.personIds.map((personId) => ({
          personId,
          name: "Atleta",
          nickname: null,
          publicBirthYear: null,
        })),
      })),
    };
    const header = {
      version: nv,
      draftVersion: c.expectedDraftVersion,
      confirmedAt: f.stamp,
      actorId: f.id(900),
      reason: c.reason,
    };
    workspace.publication = {
      ...workspace.publication,
      version: nv,
      confirmedDraftVersion: c.expectedDraftVersion,
      confirmedContextFingerprint: f.fp,
      sourceChanged: false,
      draftChanged: false,
      history: [header, ...workspace.publication.history],
    };
    publications.set(nv, {
      ...header,
      disputeId: f.source.disputeId,
      contextFingerprint: f.fp,
      snapshot: published,
    });
    confirmations.set(c.commandId, { command: structuredClone(c), ack });
    options.achievementConfirmations =
      (options.achievementConfirmations ?? 0) + 1;
    if (options.loseAchievementConfirmAck) {
      options.loseAchievementConfirmAck = false;
      return Response.json({ details: "private SQL" }, { status: 503 });
    }
    return Response.json(ack);
  };
}
