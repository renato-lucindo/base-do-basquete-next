import { describe, expect, it } from "vitest";
import { SupabaseAccess } from "./provider";

const id = "10000000-0000-4000-8000-000000000001";
const tokens = {
  access_token: "fixture-access",
  refresh_token: "fixture-refresh",
  expires_in: 900,
};
const config = { url: "https://auth.example.test", key: "fixture-publishable" };

describe("server-only Supabase access", () => {
  it("sends password/refresh only to Auth and calculates expiry", async () => {
    const requests: Request[] = [];
    const provider = new SupabaseAccess(
      config,
      async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json(tokens);
      },
      () => 1000,
    );
    expect(
      await provider.signIn({
        email: "admin@example.test",
        password: "fixture-password",
      }),
    ).toEqual({
      accessToken: "fixture-access",
      refreshToken: "fixture-refresh",
      expiresAt: 901000,
    });
    await provider.refresh("fixture-refresh");
    expect(requests.map((r) => new URL(r.url).search)).toEqual([
      "?grant_type=password",
      "?grant_type=refresh_token",
    ]);
    expect(await requests[0].json()).toEqual({
      email: "admin@example.test",
      password: "fixture-password",
    });
    expect(requests[0].headers.get("apikey")).toBe("fixture-publishable");
  });

  it("verifies identity with Auth and checks fresh RLS using the user JWT", async () => {
    const requests: Request[] = [];
    const provider = new SupabaseAccess(config, async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return request.url.includes("/auth/v1/user")
        ? Response.json({
            id,
            is_anonymous: false,
            user_metadata: { admin: true },
          })
        : Response.json([{ user_id: id, enabled: true }]);
    });
    expect(await provider.authorize("fixture-access")).toEqual({ id });
    expect(requests).toHaveLength(2);
    expect(
      requests.every(
        (r) => r.headers.get("authorization") === "Bearer fixture-access",
      ),
    ).toBe(true);
    expect(new URL(requests[1].url).searchParams.get("select")).toBe(
      "user_id,enabled",
    );
  });

  it("does not accept user metadata or a different/disabled admin row", async () => {
    for (const row of [
      [],
      [{ user_id: id, enabled: false }],
      [{ user_id: "10000000-0000-4000-8000-000000000002", enabled: true }],
    ]) {
      const provider = new SupabaseAccess(config, async (input) =>
        Response.json(
          String(input).includes("/auth/v1/user")
            ? { id, user_metadata: { admin: true } }
            : row,
        ),
      );
      await expect(provider.authorize("fixture-access")).rejects.toMatchObject({
        status: 403,
        code: "not_authorized",
      });
    }
  });

  it("sanitizes provider failures and distinguishes credentials from outage", async () => {
    for (const [status, expected] of [
      [400, 401],
      [429, 429],
      [500, 503],
    ]) {
      const provider = new SupabaseAccess(config, async () =>
        Response.json(
          { message: "fixture-private-provider-value" },
          { status },
        ),
      );
      const error = await provider
        .signIn({ email: "admin@example.test", password: "fixture-password" })
        .catch((e: unknown) => e);
      expect(error).toMatchObject({ status: expected });
      expect(String(error)).not.toContain("fixture-private-provider-value");
    }
  });

  it("rejects anonymous identities and malformed or excessive provider responses", async () => {
    const anonymous = new SupabaseAccess(config, async () =>
      Response.json({ id, is_anonymous: true }),
    );
    await expect(anonymous.authorize("fixture-access")).rejects.toMatchObject({
      status: 403,
    });
    for (const response of [
      Response.json({ access_token: "partial" }),
      new Response("a".repeat(65537)),
    ]) {
      const provider = new SupabaseAccess(config, async () => response);
      await expect(provider.refresh("fixture-refresh")).rejects.toMatchObject({
        status: 503,
      });
    }
  });
});
