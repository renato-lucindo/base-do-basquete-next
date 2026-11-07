import { expect, it } from "vitest";
import {
  draftDocumentSchema,
  saveRegulationDraftSchema,
  definitionKey,
} from "./draft-contract";
import { createDefaultDefinition, createFibaRules } from "./defaults";
import { regulationDefinitionSchema } from "./persistence-contract";
import { SupabaseRegulations } from "./provider";
const id = (n: number) =>
  `f2800000-0000-4000-8000-${String(n).padStart(12, "0")}`;
it("recognizes the same saved draft after JSON object keys are reordered", () => {
  const d = createDefaultDefinition(),
    reordered = Object.fromEntries(Object.entries(d).reverse());
  expect(definitionKey(d)).toBe(definitionKey(reordered));
  expect(definitionKey(d)).not.toBe(
    definitionKey({ ...d, registrationIds: [id(1)] }),
  );
});
it("accepts unfinished names and null numeric draft fields without weakening official validation", () => {
  const definition = {
    ...createDefaultDefinition(),
    groupPhases: [
      {
        phaseId: id(1),
        name: "",
        rules: { ...createFibaRules(), points: { win: null, loss: 1 } },
        groups: [],
      },
    ],
  };
  const d = draftDocumentSchema.parse({ definition });
  expect(Number.isNaN(d.definition.groupPhases[0].rules.points.win)).toBe(true);
  expect(regulationDefinitionSchema.safeParse(d.definition).success).toBe(
    false,
  );
  for (const bad of [
    null,
    {},
    { definition: [] },
    { definition: { ...definition, groupPhases: [{}] } },
    { definition, leak: "x" },
  ])
    expect(draftDocumentSchema.safeParse(bad).success).toBe(false);
});
it("scopes draft RPCs to the authenticated token and rejects a mismatched receipt", async () => {
  const c = {
    commandId: id(3),
    disputeId: id(90),
    expectedVersion: 0,
    baseRegulationVersion: 0,
    document: { definition: createDefaultDefinition() },
  };
  let calls = 0;
  const db = new SupabaseRegulations(
    { url: "https://db.example.test", key: "fixture" },
    async (url, init) => {
      calls++;
      expect(init.headers).toMatchObject({
        Authorization: "Bearer fixture-token",
      });
      expect(url).toContain("/save_regulation_draft");
      expect(JSON.parse(String(init.body))).toEqual({ p_command: c });
      return Response.json({
        commandId: c.commandId,
        disputeId: c.disputeId,
        version: 2,
        baseRegulationVersion: 0,
        savedAt: "2026-11-07T00:00:00Z",
      });
    },
  );
  expect(saveRegulationDraftSchema.safeParse(c).success).toBe(true);
  await expect(db.saveDraft("fixture-token", c)).rejects.toMatchObject({
    status: 503,
  });
  expect(calls).toBe(1);
});
it("does not return another dispute's private draft", async () => {
  const db = new SupabaseRegulations(
    { url: "https://db.example.test", key: "fixture" },
    async () =>
      Response.json({
        disputeId: id(91),
        version: 1,
        baseRegulationVersion: 0,
        document: { definition: createDefaultDefinition() },
        savedAt: "2026-11-07T00:00:00Z",
        actorId: id(99),
      }),
  );
  await expect(db.getDraft("fixture-token", id(90))).rejects.toMatchObject({
    status: 503,
  });
});
