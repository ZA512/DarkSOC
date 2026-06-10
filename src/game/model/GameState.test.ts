import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';

describe('createInitialGameState', () => {
  it('creates the expected initial state with the first employee roster', () => {
    const state = createInitialGameState('test-seed');

    expect(state.turn).toBe(0);
    expect(state.randomSeed).toBe('test-seed');
    expect(typeof state.createdAt).toBe('string');
    expect(typeof state.updatedAt).toBe('string');
    expect(state.resources.logs).toBe(0);
    expect(state.resources.trust).toBe(10);
    expect(state.resources.visibility).toBe(1);
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0]?.id).toBe('unknown_server_1');
    expect(state.narrativeLog).toContainEqual({
      id: 'intro_dark_room',
      messageKey: 'events.intro.dark_room',
    });
    expect(state.availableTechnologyIds).toEqual([
      'asset_register',
      'incident_procedure_v0',
      'phishing_awareness_v0',
    ]);
    expect(state.unlockedTechnologyIds).toEqual([]);
    expect(state.employees).toHaveLength(5);
    expect(state.employees[0]).toMatchObject({
      id: 'admin_1',
      unlocked: true,
      fatigue: 0,
    });
    expect(state.employees.slice(1).every((employee) => employee.unlocked === false)).toBe(true);
    expect(state.activeIncidentIds).toEqual([]);
    expect(state.resolvedIncidentIds).toEqual([]);
    expect(state.businessStageId).toBe('small_company');
    expect(state.businessEventHistory).toEqual([]);
    expect(state.pendingBusinessEventId).toBeUndefined();
    expect(state.businessMomentum).toBe(0);
    expect(state.currentSeasonId).toBe('season_1_visibility');
    expect(state.completedSeasonIds).toEqual([]);
    expect(state.objectives.collect_first_logs).toBe('active');
    expect(state.objectives.create_asset_register).toBe('locked');
    expect(state.completedObjectiveIds).toEqual([]);
    expect(state.survivedIncidentCount).toBe(0);
    expect(state.resolvedCrisisCount).toBe(0);
    expect(state.showOnboarding).toBe(true);
    expect(state.showSeasonSummary).toBe(false);
    expect(state.crisis).toEqual({
      level: 'none',
      causes: [],
      recoveryProgress: 0,
    });
    expect(state.flags).toEqual({});
    expect(state.modified).toBe(false);
    expect(state.runningActions).toEqual([]);
  });
});
