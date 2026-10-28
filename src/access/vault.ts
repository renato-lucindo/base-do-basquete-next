import { z } from "zod";
import { HttpError } from "../server/http";
import type { Tokens } from "./provider";

const contentsSchema = z.object({
  actorId: z.uuid(),
  tokens: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresAt: z.number().finite().positive(),
  }),
});
export type SessionContents = { actorId: string; tokens: Tokens };

export async function seal(
  contents: SessionContents,
  secret: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(secret),
    new TextEncoder().encode(JSON.stringify(contents)),
  );
  return `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}

export async function open(
  sealed: string,
  secret: string,
): Promise<SessionContents> {
  try {
    if (sealed.length > 65536) throw invalidSession();
    const [version, iv, encrypted, extra] = sealed.split(".");
    if (version !== "v1" || !iv || !encrypted || extra !== undefined)
      throw invalidSession();
    const bytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(iv) },
      await key(secret),
      decode(encrypted),
    );
    return contentsSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw invalidSession();
  }
}

async function key(secret: string) {
  const bytes = decode(secret);
  if (bytes.length !== 32)
    throw new TypeError("Invalid session key configuration");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function decode(encoded: string) {
  return Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
}

export function invalidSession() {
  return new HttpError(
    401,
    "invalid_session",
    "Sua sessão terminou. Entre novamente.",
  );
}
