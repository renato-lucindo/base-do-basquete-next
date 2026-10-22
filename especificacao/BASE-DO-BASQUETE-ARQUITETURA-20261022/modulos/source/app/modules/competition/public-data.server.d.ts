// Compatibility DTO extracted from the source contract; no old loaders.
import type { CompetitionContext, GenderDivision } from "./context";

export interface PublicAchievement {
  context?: CompetitionContext;
  competitionId: number;
  competitionDisplayName: string;
  seriesName: string;
  seriesSlug: string;
  year: number;
  categoryName: string;
  categorySlug: string;
  genderDivision: GenderDivision | null;
  placement: number;
  resultLabel: string | null;
  teamName?: string;
  teamSlug?: string;
}
