import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { Response } from "miniflare";
export function playerProfileOutbound(options, actorId) {
  let source,
    profile = null,
    version = 0;
  const receipts = new Map();
  options.profileConfirmAttempts = [];
  const stamp = "2026-10-25T22:00:00Z";
  return async (request) => {
    const name = new URL(request.url).pathname.split("/").at(-1);
    if (
      ![
        "get_player_career_source",
        "get_player_profile_proposal",
        "get_player_profile_state",
        "get_player_profile_version",
        "confirm_player_profile",
      ].includes(name)
    )
      return null;
    source ??= JSON.parse(
      await readFile("tests/fixtures/player-career.json", "utf8"),
    );
    const args = await request.json();
    if (name === "get_player_career_source") {
      assert.equal(request.headers.get("authorization"), null);
      assert.equal(request.headers.get("cookie"), null);
      assert.deepEqual(Object.keys(args), ["p_person_id"]);
      return Response.json(
        args.p_person_id === source.personId ? { ...source, profile } : null,
      );
    }
    assert.equal(request.headers.get("authorization"), "Bearer fixture-access");
    const person = {
      id: source.personId,
      name: "Ana Silva",
      nickname: null,
      publicBirthYear: null,
      heightCm: null,
      weightKg: null,
      position: null,
      dominantHand: null,
      originCity: null,
      originState: null,
      biography: null,
    };
    const header = {
      version,
      personVersion: 1,
      confirmedAt: stamp,
      actorId,
      reason: "",
    };
    if (name !== "confirm_player_profile" && options.profileFailRead)
      return Response.json(
        { message: "controlled read failure" },
        { status: 503 },
      );
    if (name === "get_player_profile_proposal")
      return Response.json({
        personId: source.personId,
        personVersion: 1,
        person,
      });
    if (name === "get_player_profile_state")
      return Response.json({
        personId: source.personId,
        personVersion: 1,
        version,
        confirmedPersonVersion: version ? 1 : null,
        sourceChanged: false,
        published: profile,
        history: version ? [header] : [],
        hasMore: false,
      });
    if (name === "get_player_profile_version")
      return Response.json(
        args.p_version === version && version
          ? { personId: source.personId, ...header, snapshot: profile }
          : null,
      );
    const c = args.p_command;
    options.profileConfirmAttempts.push(JSON.stringify(c));
    const old = receipts.get(c.commandId);
    if (old)
      return Response.json(
        old.payload === JSON.stringify(c)
          ? old.ack
          : { message: "idempotency_conflict" },
        { status: old.payload === JSON.stringify(c) ? 200 : 409 },
      );
    if (c.expectedPublicationVersion !== version)
      return Response.json({ message: "version_conflict" }, { status: 409 });
    version++;
    profile = {
      kind: "confirmed-player-profile-v1",
      personId: source.personId,
      version,
      confirmedAt: stamp,
      person,
    };
    const ack = {
      commandId: c.commandId,
      personId: c.personId,
      version,
      personVersion: 1,
      confirmedAt: stamp,
    };
    receipts.set(c.commandId, { payload: JSON.stringify(c), ack });
    if (options.loseProfileAck) {
      options.loseProfileAck = false;
      return Response.json({ message: "controlled lost ACK" }, { status: 503 });
    }
    return Response.json(ack);
  };
}
