import seasonsData from '../../data/gameplay/seasons.json';
import type { GameState } from '../model/GameState';
import type { Season } from '../model/Season';

export const SEASONS = seasonsData as Season[];

const seasonsById = new Map(SEASONS.map((season) => [season.id, season]));

function appendNarrativeEntry(state: GameState, messageKey: string, key: string): GameState {
  return {
    ...state,
    narrativeLog: [
      ...state.narrativeLog,
      {
        id: `${key}_${state.turn}_${state.narrativeLog.length}`,
        messageKey,
      },
    ],
  };
}

export function getSeasonDefinition(seasonId: string): Season | undefined {
  return seasonsById.get(seasonId);
}

export function isSeasonCompleted(state: GameState, season: Season): boolean {
  return season.requiredObjectiveIds.every((objectiveId) => state.completedObjectiveIds.includes(objectiveId));
}

export function evaluateSeasonCompletion(state: GameState): GameState {
  const season = getSeasonDefinition(state.currentSeasonId);

  if (!season || state.completedSeasonIds.includes(season.id) || !isSeasonCompleted(state, season)) {
    return state;
  }

  return appendNarrativeEntry(
    {
      ...state,
      completedSeasonIds: [...new Set([...state.completedSeasonIds, season.id])],
      showSeasonSummary: true,
    },
    `events.season.${season.id}.completed`,
    `season_${season.id}_completed`,
  );
}