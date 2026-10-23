import type { z } from "zod";
export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function isSessionFailure(error: unknown) {
  return (
    error instanceof ApiFailure &&
    (error.status === 401 || error.status === 403)
  );
}
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  command?: object,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: command ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
      : AbortSignal.timeout(45000),
    ...(command
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        }
      : {}),
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiFailure(
      503,
      "Não foi possível confirmar a resposta. Tente novamente.",
    );
  }
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      body.error &&
      typeof body.error === "object" &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message.slice(0, 500)
        : "Não foi possível concluir a operação. Tente novamente.";
    throw new ApiFailure(response.status, message);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiFailure(
      503,
      "Não foi possível confirmar a resposta. Tente novamente.",
    );
  return parsed.data;
}
