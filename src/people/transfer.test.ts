import { describe, expect, it } from "vitest";
import {
  transferFixture as fixture,
  transferId as id,
} from "../../tests/fixtures/transfers";
import { previewTransfer } from "./transfer";
import {
  saveTransferSchema,
  transferContextSchema,
  transferPreviewSchema,
} from "./transfer-contract";

describe("transferência e retorno sem reatribuição histórica", () => {
  it("fecha origem e abre outra inscrição da mesma equipe no mesmo instante do servidor", () => {
    const s = fixture(),
      before = structuredClone(s),
      p = previewTransfer(s.command, s.context);
    expect(p).toMatchObject({
      ready: true,
      needs: null,
      kind: "transfer",
      personId: id(1),
      plan: {
        close: {
          id: id(20),
          expectedVersion: 3,
          endedAt: s.context.effectiveAt,
        },
        open: {
          id: id(30),
          registrationId: id(11),
          personId: id(1),
          jersey: "00",
          startedAt: s.context.effectiveAt,
          endedAt: null,
          version: 1,
        },
      },
    });
    expect(transferPreviewSchema.safeParse(p).success).toBe(true);
    expect(s).toEqual(before);
    expect(p).not.toHaveProperty("games");
    expect(p).not.toHaveProperty("statistics");
  });
  it("retorna com novo ID e período sem reativar a linha encerrada", () => {
    const s = fixture(),
      old = {
        ...s.context.memberships[0],
        id: id(19),
        registrationId: id(11),
        startedAt: "2026-10-20T12:00:00Z",
        endedAt: "2026-10-22T12:00:00Z",
      };
    s.context.memberships.push(old);
    expect(previewTransfer(s.command, s.context)).toMatchObject({
      ready: true,
      kind: "return",
      plan: { open: { id: id(30), registrationId: id(11) } },
    });
    expect(s.context.memberships.find((m) => m.id === id(19))).toEqual(old);
  });
  it("origem encerrada pode retornar sem novo fechamento e aceita camisa histórica ocupada", () => {
    const s = fixture();
    s.context.memberships[0].endedAt = "2026-10-24T12:00:00Z";
    s.command.destinationRegistrationId = id(10);
    s.command.jersey = "12";
    expect(previewTransfer(s.command, s.context)).toMatchObject({
      ready: true,
      kind: "return",
      plan: {
        close: null,
        open: { id: id(30), registrationId: id(10), jersey: "12" },
      },
    });
  });
  it.each([null, "forbidden"] as const)(
    "regra %s bloqueia sem tratar ausência como permissão",
    (transfers) => {
      const s = fixture();
      s.context.regulation.transfers = transfers;
      expect(previewTransfer(s.command, s.context)).toMatchObject({
        ready: false,
        needs: transfers === null ? "rule_required" : "transfer_forbidden",
        plan: null,
      });
    },
  );
  it("regulamento ainda ausente não impede mostrar a pendência", () => {
    const s = fixture();
    s.context.regulation = { version: 0, transfers: null };
    s.command.expectedRegulationVersion = 0;
    expect(previewTransfer(s.command, s.context).needs).toBe("rule_required");
    expect(
      transferContextSchema.safeParse({
        ...s.context,
        regulation: { version: 0, transfers: "allowed" },
      }).success,
    ).toBe(false);
  });
  it.each(["source", "destination", "regulation", "context"] as const)(
    "mudança de %s exige nova conferência",
    (target) => {
      const s = fixture();
      if (target === "source") s.context.memberships[0].version += 1;
      if (target === "destination") s.context.registrations[1].version += 1;
      if (target === "regulation") s.context.regulation.version += 1;
      if (target === "context") s.context.contextFingerprint = "b".repeat(64);
      expect(previewTransfer(s.command, s.context)).toMatchObject({
        ready: false,
        needs: `${target}_changed`,
        plan: null,
      });
    },
  );
  it("camisa 0 ocupada não bloqueia 00, mas exige resolver 0 explicitamente", () => {
    const s = fixture();
    expect(previewTransfer(s.command, s.context).ready).toBe(true);
    s.command.jersey = "0";
    expect(previewTransfer(s.command, s.context).needs).toBe("jersey_in_use");
    s.command.jersey = null;
    expect(previewTransfer(s.command, s.context).ready).toBe(true);
  });
  it("origem ativa no mesmo destino usa edição comum, sem outro período", () => {
    const s = fixture();
    s.command.destinationRegistrationId = id(10);
    expect(previewTransfer(s.command, s.context)).toMatchObject({
      ready: false,
      needs: "same_registration",
      plan: null,
    });
  });
  it("não usa origem histórica ultrapassada nem ignora o vínculo ativo", () => {
    const s = fixture(),
      old = {
        ...s.context.memberships[0],
        id: id(19),
        startedAt: "2026-10-20T12:00:00Z",
        endedAt: "2026-10-22T12:00:00Z",
      };
    s.context.memberships.push(old);
    s.command.sourceEntryId = id(19);
    expect(previewTransfer(s.command, s.context).needs).toBe("source_changed");
    s.context.memberships[0].endedAt = "2026-10-24T12:00:00Z";
    expect(previewTransfer(s.command, s.context).needs).toBe("source_changed");
  });
  it("recusa novo ID já usado e origem de outra pessoa", () => {
    const s = fixture();
    s.command.newEntryId = id(21);
    expect(previewTransfer(s.command, s.context).needs).toBe("entry_id_used");
    s.command.newEntryId = id(30);
    s.command.sourceEntryId = id(21);
    expect(previewTransfer(s.command, s.context).needs).toBe("source_changed");
  });
  it("não aceita contexto trocado, dois ativos ou períodos sobrepostos", () => {
    const s = fixture();
    const invalid = [
      {
        ...s.context,
        memberships: [{ ...s.context.memberships[0], disputeId: id(999) }],
      },
      {
        ...s.context,
        memberships: [
          ...s.context.memberships,
          {
            ...s.context.memberships[0],
            id: id(22),
            registrationId: id(11),
            jersey: "77",
          },
        ],
      },
      {
        ...s.context,
        memberships: [
          ...s.context.memberships,
          {
            ...s.context.memberships[0],
            id: id(22),
            registrationId: id(11),
            startedAt: "2026-10-22T12:00:00Z",
            endedAt: "2026-10-24T12:00:00Z",
          },
        ],
      },
    ];
    for (const context of invalid) {
      expect(transferContextSchema.safeParse(context).success).toBe(false);
      expect(() => previewTransfer(s.command, context)).toThrow();
    }
    s.command.disputeId = id(999);
    expect(previewTransfer(s.command, s.context).needs).toBe("context_changed");
  });
  it("limites de período usam microssegundos e fuso, sem arredondar sobreposição", () => {
    const s = fixture();
    s.context.memberships[0].startedAt = "2026-10-25T02:30:00.123456Z";
    s.context.memberships.push({
      ...s.context.memberships[0],
      id: id(19),
      registrationId: id(11),
      startedAt: "2026-10-20T12:00:00Z",
      endedAt: "2026-10-24T23:30:00.123456-03:00",
    });
    expect(previewTransfer(s.command, s.context).ready).toBe(true);
    s.context.memberships[2].endedAt = "2026-10-25T02:30:00.123457Z";
    expect(transferContextSchema.safeParse(s.context).success).toBe(false);
    s.context.memberships.pop();
    s.context.effectiveAt = "2026-10-25T02:30:00.123455Z";
    expect(previewTransfer(s.command, s.context).needs).toBe(
      "invalid_effective_time",
    );
  });
  it("comando fechado recusa fonte/tempo/ator/fatos do browser", () => {
    const { command } = fixture();
    for (const extra of [
      { personId: id(2) },
      { effectiveAt: "1997-01-01T00:00:00Z" },
      { actorId: id(2) },
      { games: [] },
      { transfers: "allowed" },
    ])
      expect(
        saveTransferSchema.safeParse({ ...command, ...extra }).success,
      ).toBe(false);
    expect(
      saveTransferSchema.safeParse({
        ...command,
        newEntryId: command.sourceEntryId,
      }).success,
    ).toBe(false);
    expect(
      saveTransferSchema.safeParse({ ...command, jersey: "01" }).success,
    ).toBe(false);
    expect(
      saveTransferSchema.safeParse({ ...command, reason: "  " }).success,
    ).toBe(false);
  });

  it("recusa camisa ativa repetida entre pessoas e período invertido, sem arredondar", () => {
    const s = fixture();
    s.context.memberships.push({
      ...s.context.memberships[1],
      id: id(22),
      personId: id(3),
    });
    expect(transferContextSchema.safeParse(s.context).success).toBe(false);
    s.context.memberships.pop();
    s.context.memberships[0].startedAt = "2026-10-25T02:30:00.123457Z";
    s.context.memberships[0].endedAt = "2026-10-25T02:30:00.123456Z";
    expect(transferContextSchema.safeParse(s.context).success).toBe(false);
    s.context.memberships[0].startedAt = "invalid";
    expect(transferContextSchema.safeParse(s.context).success).toBe(false);
  });

  it("DTO adulterado não pode fechar outra pessoa nem reativar período histórico", () => {
    const s = fixture(),
      p = previewTransfer(s.command, s.context);
    expect(
      transferPreviewSchema.safeParse({
        ...p,
        plan: {
          ...p.plan,
          open: { ...p.plan!.open, id: s.command.sourceEntryId },
        },
      }).success,
    ).toBe(false);
    expect(
      transferPreviewSchema.safeParse({
        ...p,
        plan: { ...p.plan, close: { ...p.plan!.close, id: id(21) } },
      }).success,
    ).toBe(false);
    expect(
      transferPreviewSchema.safeParse({ ...p, ready: false }).success,
    ).toBe(false);
  });
});
