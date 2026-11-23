import worker from "./worker";
import { publicPreviewResponse } from "./public-preview";

export default {
  async fetch(
    request: Request,
    env: Env & { BDB_SOURCE?: string; ADMIN_ORIGIN?: string },
  ) {
    return publicPreviewResponse(request, env, (r) => worker.fetch(r, env));
  },
};
