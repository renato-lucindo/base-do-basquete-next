import { describe, expect, it } from "vitest";
import {
  gameVisibilityStateSchema,
  saveGameVisibilitySchema,
  gameVisibilityResultSchema,
} from "./visibility-contract";

const gameId = "62d99b70-21c9-495f-b0d7-44c0f53b4380";
const disputeId = "b5433b13-a8f9-4baa-b4d9-08066ebf3e96";
const commandId = "2c2f447e-27ef-4a52-a959-67edfe7c2a78";

describe("game draft visibility", () => {
  it("uses explicit publication state independent of a finished game", () => {
    expect(
      gameVisibilityStateSchema.parse({
        gameId,
        disputeId,
        version: 0,
        gameVersion: 3,
        publicationVersion: 1,
        visibility: "published",
        reason: null,
        savedAt: null,
      }).visibility,
    ).toBe("published");
    expect(
      gameVisibilityStateSchema.parse({
        gameId,
        disputeId,
        version: 1,
        gameVersion: 3,
        publicationVersion: 1,
        visibility: "draft",
        reason: "Awaiting qualification",
        savedAt: "2026-11-09T14:00:00Z",
      }).visibility,
    ).toBe("draft");
  });
  it("requires a reason, stable versions and a distinct idempotency key", () => {
    const payload = {
      commandId,
      gameId,
      expectedVersion: 0,
      expectedGameVersion: 3,
      expectedPublicationVersion: 1,
      visibility: "draft",
      reason: "Before classification is finished",
    };
    expect(saveGameVisibilitySchema.safeParse(payload).success).toBe(true);
    expect(saveGameVisibilitySchema.safeParse({ ...payload, reason: "  " }).success).toBe(false);
    expect(saveGameVisibilitySchema.safeParse({ ...payload, expectedGameVersion: 0 }).success).toBe(false);
    expect(saveGameVisibilitySchema.safeParse({ ...payload, visibility: "cancelled" }).success).toBe(false);
    expect(saveGameVisibilitySchema.safeParse({ ...payload, actorId: commandId }).success).toBe(false);
    expect(gameVisibilityResultSchema.safeParse({
      commandId, gameId, version: 1, visibility: "draft", savedAt: "2026-11-09T14:00:00Z",
    }).success).toBe(true);
  });
});
