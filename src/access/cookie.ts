const NAME = "__Host-bdb-session";
const FLAGS = "Path=/; Secure; HttpOnly; SameSite=Strict";

export async function newSessionCookie(secret: string): Promise<string> {
  const nonce = encode(crypto.getRandomValues(new Uint8Array(32)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(nonce),
  );
  return `${nonce}.${encode(new Uint8Array(signature))}`;
}

export async function sessionName(
  request: Request,
  secret: string,
): Promise<string | undefined> {
  const matches = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${NAME}=`));
  if (matches.length !== 1) return;
  const value = matches[0].slice(NAME.length + 1);
  if (!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value)) return;
  const [nonce, signature] = value.split(".");
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(secret),
    decode(signature),
    new TextEncoder().encode(nonce),
  );
  if (!valid) return;
  return hashName(value);
}

export async function hashName(value: string): Promise<string> {
  return encode(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
}

export function cookieHeader(value: string) {
  return `${NAME}=${value}; ${FLAGS}; Max-Age=28800`;
}
export function clearCookieHeader() {
  return `${NAME}=; ${FLAGS}; Max-Age=0`;
}

async function signingKey(secret: string) {
  const root = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(secret), (char) => char.charCodeAt(0)),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode("base-basquete-cookie-v1"),
    },
    root,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign", "verify"],
  );
}
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function decode(value: string) {
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/") + "="),
    (char) => char.charCodeAt(0),
  );
}
