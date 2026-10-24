import { DurableObject } from "cloudflare:workers";
import { extractSupportedPdf } from "../../src/boxscore/extract.ts";
// Local runtime proof only. This fixture has no credentials or remote bindings.
export class PdfProbe extends DurableObject {
  async parse(bytes, filename) {
    return extractSupportedPdf(
      new Uint8Array(bytes),
      filename,
      "application/pdf",
    );
  }
}
export default {
  async fetch(request, env) {
    try {
      const result = await env.PARSER.getByName("local-proof").parse(
        await request.arrayBuffer(),
        decodeURIComponent(request.headers.get("x-filename")),
      );
      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "failed" },
        { status: 400 },
      );
    }
  },
};
