import { z } from "zod";
import { forbidden, providerJson, unavailable } from "../access/provider";
import { invalidSession } from "../access/vault";
import { HttpError } from "../server/http";
import { preparePdfResultSchema } from "./source-contract";
type Intent = z.infer<typeof preparePdfResultSchema>;

/** Only immutable originals in the dedicated bucket. No privileged key or public URL. */
export class SupabasePdfOriginals {
  constructor(
    private readonly config: { url: string; key: string },
    private readonly send: (
      url: string,
      init: RequestInit,
    ) => Promise<Response> = (url, init) => fetch(url, init),
  ) {}
  async put(token: string, input: Intent, bytes: Uint8Array) {
    const parsed = preparePdfResultSchema.safeParse(input);
    if (
      !parsed.success ||
      input.storagePath !== `sources/${input.id}.pdf` ||
      bytes.byteLength !== input.byteSize ||
      (await digest(bytes)) !== input.sha256
    )
      throw new HttpError(
        400,
        "invalid_input",
        "O arquivo não corresponde à intenção de envio.",
      );
    const path = `/storage/v1/object/boxscore-sources/${input.storagePath}`;
    const response = await this.request(path, token, {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "x-upsert": "false",
        "Cache-Control": "no-store",
      },
      body: Uint8Array.from(bytes).buffer,
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        await response.body?.cancel();
        throw response.status === 401 ? invalidSession() : forbidden();
      }
      if (![400, 409].includes(response.status)) {
        await response.body?.cancel();
        throw unavailable();
      }
      const body = z
        .object({ code: z.string().optional(), error: z.string().optional() })
        .safeParse(await providerJson(response, 8192));
      if (
        !body.success ||
        ![
          "ResourceAlreadyExists",
          "KeyAlreadyExists",
          "already_exists",
          "Duplicate",
        ].includes(body.data.code ?? body.data.error ?? "")
      )
        throw unavailable();
    } else await response.body?.cancel();
    const original = await this.request(
      `/storage/v1/object/authenticated/boxscore-sources/${input.storagePath}`,
      token,
      { method: "GET", headers: { "Cache-Control": "no-cache, no-store" } },
    );
    if (!original.ok) {
      await original.body?.cancel();
      if (original.status === 401) throw invalidSession();
      if (original.status === 403) throw forbidden();
      throw unavailable();
    }
    if (
      original.headers
        .get("content-type")
        ?.split(";", 1)[0]
        .trim()
        .toLowerCase() !== "application/pdf"
    ) {
      await original.body?.cancel();
      throw unavailable();
    }
    const length = original.headers.get("content-length");
    if (
      length !== null &&
      (!/^\d+$/u.test(length) || Number(length) !== input.byteSize)
    ) {
      await original.body?.cancel();
      throw unavailable();
    }
    const reader = original.body?.getReader();
    if (!reader) throw unavailable();
    const received = new Uint8Array(input.byteSize);
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > input.byteSize) throw unavailable();
        received.set(value, size - value.byteLength);
      }
      if (size !== input.byteSize || (await digest(received)) !== input.sha256)
        throw unavailable();
    } catch {
      throw unavailable();
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
  private async request(path: string, token: string, init: RequestInit) {
    try {
      return await this.send(this.config.url + path, {
        ...init,
        headers: {
          apikey: this.config.key,
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw unavailable();
    }
  }
}
async function digest(bytes: Uint8Array) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
