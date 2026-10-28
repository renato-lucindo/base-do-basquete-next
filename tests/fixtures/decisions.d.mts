import type { RegulationState } from "../../src/regulation/persistence-contract";
export function decisionBackend(
  regulation: RegulationState,
  options: Record<string, boolean | number | undefined>,
): (request: Request) => Promise<Pick<Response, "status" | "json"> | undefined>;
