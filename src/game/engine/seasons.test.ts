import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { getSeasonDefinition, evaluateSeasonCompletion, isSeasonCompleted } from './seasons';

describe('isSeasonCompleted', () => {
  it('returns false when a required objective is missing', () => {
    const state = {
      ...createInitialGameState(),
      completedObjectiveIds: [
        'reach_visibility_30',
        'reach_trust_30',
        'unlock_four_technologies',
        'survive_one_incident',
      ],
    };

    expect(isSeasonCompleted(state, getSeasonDefinition('season_1_visibility')!)).toBe(false);
  });

  it('completes the season once all required objectives are done and only does it once', () => {
    const initialState = createInitialGameState();
    const completedObjectiveIds = [
      'reach_visibility_30',
      'reach_trust_30',
      'unlock_four_technologies',
      'survive_one_incident',
      'reach_resilience_10',
    ];
    const state = {
      ...initialState,
      completedObjectiveIds,
      objectives: {
        ...initialState.objectives,
        reach_visibility_30: 'completed' as const,
        reach_trust_30: 'completed' as const,
        unlock_four_technologies: 'completed' as const,
        survive_one_incident: 'completed' as const,
        reach_resilience_10: 'completed' as const,
      },
    };

    const nextState = evaluateSeasonCompletion(state);
    const repeatedState = evaluateSeasonCompletion(nextState);

    expect(isSeasonCompleted(state, getSeasonDefinition('season_1_visibility')!)).toBe(true);
    expect(nextState.completedSeasonIds).toEqual(['season_1_visibility']);
    expect(nextState.showSeasonSummary).toBe(true);
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe('events.season.season_1_visibility.completed');
    expect(repeatedState.completedSeasonIds).toEqual(['season_1_visibility']);
    expect(repeatedState.narrativeLog).toHaveLength(nextState.narrativeLog.length);
  });
});