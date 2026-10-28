import type { achievementBackendFixture } from "./achievement-backend.ts";
export type AchievementOutboundOptions = {
  achievementSaves?: number;
  achievementConfirmations?: number;
  loseAchievementSaveAck?: boolean;
  loseAchievementConfirmAck?: boolean;
};
export function achievementOutbound(
  options?: AchievementOutboundOptions,
  fixture?: ReturnType<typeof achievementBackendFixture>,
): (request: Pick<Request, "url" | "headers" | "json">) => Promise<{
  status: number;
  headers: Iterable<[string, string]>;
  text(): Promise<string>;
} | null>;
