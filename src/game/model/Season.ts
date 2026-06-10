export const SEASON_STATUSES = ['active', 'completed'] as const;

export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export type Season = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  completionMessageKey: string;
  requiredObjectiveIds: string[];
};