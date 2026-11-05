import { z } from "zod";
import {
  parseTeamsListQuery,
  serializeTeamsListQuery,
  type TeamsListQuery,
} from "./list-query";
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const references = new Map<string, string>();
export function serializeTeamsListRoute(
  id: string,
  q: TeamsListQuery,
  storage: Storage = sessionStorage,
) {
  const search = serializeTeamsListQuery(q);
  if (search.length <= 1800) return `#${id}?${search}`;
  const key = `${id}:${search}`;
  let ref = references.get(key);
  if (!ref) {
    ref = crypto.randomUUID();
    references.set(key, ref);
  }
  try {
    storage.setItem(
      `team-list:${ref}`,
      JSON.stringify({ disputeId: id, query: search }),
    );
  } catch {
    throw Error(
      "Não foi possível guardar esta seleção no navegador. Mantenha esta página aberta.",
    );
  }
  return `#${id}?pageSize=all&stateRef=${ref}`;
}
export function readTeamsListRoute(
  hash: string,
  storage: Storage = sessionStorage,
) {
  const [raw, search = ""] = hash.replace(/^#/u, "").split("?", 2),
    id = z.uuid().parse(raw).toLowerCase(),
    p = new URLSearchParams(search);
  if (p.has("stateRef")) {
    const ref = z.uuid().parse(p.get("stateRef"));
    const raw = storage.getItem(`team-list:${ref}`);
    if (!raw)
      throw Error(
        "Esta seleção está guardada no navegador de origem e não está integralmente representada no link. Abra a lista original ou escolha novamente as equipes.",
      );
    const stored = z
      .object({ disputeId: z.literal(id), query: z.string().max(65536) })
      .strict()
      .parse(JSON.parse(raw));
    return {
      disputeId: id,
      query: parseTeamsListQuery(new URLSearchParams(stored.query)),
      local: true,
    };
  }
  return { disputeId: id, query: parseTeamsListQuery(p), local: false };
}
