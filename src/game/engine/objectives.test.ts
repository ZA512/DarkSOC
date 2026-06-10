import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import { evaluateObjective, evaluateObjectives, getObjectiveDefinition } from './objectives';

describe('evaluateObjective', () => {
  it('completes a resource_at_least objective when the threshold is reached', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        logs: 30,
      }),
    };

    expect(evaluateObjective(state, getObjectiveDefinition('collect_first_logs')!)).toBe(true);
  });

  it('completes a technology_unlocked objective once the technology is unlocked', () => {
    const initialState = createInitialGameState();
    const state = {
      ...initialState,
      unlockedTechnologyIds: ['asset_register'],
      objectives: {
        ...initialState.objectives,
        create_asset_register: 'active' as const,
      },
    };

    expect(evaluateObjective(state, getObjectiveDefinition('create_asset_register')!)).toBe(true);
  });

  it('completes an incident_survived objective when the counter reaches the target', () => {
    const state = {
      ...createInitialGameState(),
      survivedIncidentCount: 1,
    };

    expect(evaluateObjective(state, getObjectiveDefinition('survive_one_incident')!)).toBe(true);
  });

  it('does not complete a locked objective even if its condition is already met', () => {
    const state = {
      ...createInitialGameState(),
      unlockedTechnologyIds: ['asset_register'],
    };

    expect(evaluateObjective(state, getObjectiveDefinition('create_asset_register')!)).toBe(false);
  });
});

describe('evaluateObjectives', () => {
  it('completes collect_first_logs, applies its reward and unlocks create_asset_register', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        logs: 30,
      }),
    };

    const nextState = evaluateObjectives(state);

    expect(nextState.objectives.collect_first_logs).toBe('completed');
    expect(nextState.completedObjectiveIds).toContain('collect_first_logs');
    expect(nextState.objectives.create_asset_register).toBe('active');
    expect(nextState.resources.proofs).toBe(5);
  });

  it('does not apply the same objective reward twice', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        logs: 30,
      }),
    };

    const nextState = evaluateObjectives(state);
    const repeatedState = evaluateObjectives(nextState);

    expect(nextState.resources.proofs).toBe(5);
    expect(repeatedState.resources.proofs).toBe(5);
    expect(repeatedState.completedObjectiveIds).toEqual(nextState.completedObjectiveIds);
    expect(repeatedState.narrativeLog).toHaveLength(nextState.narrativeLog.length);
  });
});