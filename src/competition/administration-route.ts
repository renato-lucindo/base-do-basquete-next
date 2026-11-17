import { z } from "zod";
import { sessionName } from "../access/cookie";
import { HttpError, jsonResponse, readMutationJson } from "../server/http";
import {
  disputeAdministrationCommandSchema,
  saveCompetitionAdministrationSchema,
} from "./administration-contract";

export async function competitionAdministrationRoute(
  request: Request,
  env: Env,
  url: URL,
) {
  const name = await sessionName(request, env.SESSION_ENCRYPTION_KEY);
  if (!name)
    throw new HttpError(
      401,
      "invalid_session",
      "Entre para acessar a área administrativa.",
    );
  if (url.search)
    throw new HttpError(400, "invalid_input", "Confira o contexto.");
  const session = env.SESSIONS.getByName(name);
  const part = url.pathname.slice("/api/competition-administration/".length);
  const id = z.uuid().safeParse(part);
  const options = { origin: env.APP_ORIGIN, maxBytes: 262144 };
  const result =
    request.method === "GET" && id.success
      ? await session.getDisputeAdministration(id.data)
      : request.method === "POST" && part === "competition"
        ? await session.saveCompetitionAdministration(
            await readMutationJson(
              request,
              saveCompetitionAdministrationSchema,
              options,
            ),
          )
        : request.method === "POST" && part === "dispute"
          ? await session.saveDisputeAdministration(
              await readMutationJson(
                request,
                disputeAdministrationCommandSchema,
                options,
              ),
            )
          : null;
  if (!result)
    throw new HttpError(405, "invalid_method", "Método não permitido.");
  if (!result.ok)
    throw new HttpError(result.status, result.code, result.message);
  return jsonResponse(result.value);
}
