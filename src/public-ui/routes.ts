import { z } from "zod";
import { HttpError, jsonResponse } from "../server/http";
import { PublicCatalog } from "./catalog-provider";
import { discoveryQuerySchema } from "./search-contract";
import { PublicSearch } from "./search-provider";
const uuid = z.uuid();
export async function publicSearchRoute(request: Request, env: Env, url: URL) {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  const p = url.searchParams;
  if (
    url.search.length > 1600 ||
    [...p.keys()].some(
      (k) =>
        !["q", "type", "page", "entityId"].includes(k) ||
        p.getAll(k).length !== 1,
    )
  )
    throw new HttpError(400, "invalid_input", "Confira a busca pública.");
  const q = discoveryQuerySchema.safeParse({
    q: p.get("q") ?? "",
    type: p.get("type") ?? "all",
    page: p.has("page") ? Number(p.get("page")) : 1,
    entityId: p.get("entityId"),
  });
  if (!q.success || (p.has("page") && !/^[1-9][0-9]*$/u.test(p.get("page")!)))
    throw new HttpError(
      400,
      "invalid_input",
      "Informe de 2 a 120 caracteres e confira os filtros.",
    );
  return jsonResponse(
    await new PublicSearch({
      url: env.SUPABASE_URL,
      key: env.SUPABASE_PUBLISHABLE_KEY,
    }).search(q.data, request.signal),
  );
}
export async function publicCatalogRoute(request: Request, env: Env, url: URL) {
  if (request.method !== "GET")
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  const search = url.pathname === "/api/public/search";
  const allowed = search ? ["q"] : ["after", "disputeId"];
  if (
    url.search.length > 1000 ||
    [...url.searchParams.keys()].some(
      (k) => !allowed.includes(k) || url.searchParams.getAll(k).length !== 1,
    )
  )
    throw new HttpError(400, "invalid_input", "Confira a consulta pública.");
  const provider = new PublicCatalog({
    url: env.SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY,
  });
  if (search) {
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2 || q.length > 120)
      throw new HttpError(
        400,
        "invalid_input",
        "Informe de 2 a 120 caracteres.",
      );
    return jsonResponse(await provider.players(q));
  }
  const id = url.searchParams.get("disputeId"),
    after = url.searchParams.get("after");
  if ([id, after].some((v) => v !== null && !uuid.safeParse(v).success))
    throw new HttpError(400, "invalid_input", "Disputa inválida.");
  return jsonResponse(
    await provider.page(
      id?.toLowerCase() ?? null,
      after?.toLowerCase() ?? null,
    ),
  );
}
