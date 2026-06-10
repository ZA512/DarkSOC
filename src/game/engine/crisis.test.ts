import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import {
  applyCrisisTick,
  canExecuteCrisisAction,
  evaluateCrisisState,
  executeCrisisAction,
  getCrisisCauses,
  synchronizeCrisisState,
} from './crisis';
import { processBusinessTurn } from './business';

describe('evaluateCrisisState', () => {
  it('returns none for the initial state', () => {
    expect(evaluateCrisisState(createInitialGameState()).level).toBe('none');
  });

  it('returns watch when trust is low', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 7,
      }),
    };

    expect(evaluateCrisisState(state).level).toBe('watch');
  });

  it('returns active when a major incident is active', () => {
    const state = {
      ...createInitialGameState(),
      activeIncidentIds: ['ransomware_minor'],
    };

    expect(evaluateCrisisState(state).level).toBe('active');
  });

  it('returns severe when trust collapses completely', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 0,
      }),
    };

    expect(evaluateCrisisState(state).level).toBe('severe');
  });
});

describe('getCrisisCauses', () => {
  it('returns trust_collapse for very low trust', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 5,
      }),
    };

    expect(getCrisisCauses(state)).toContain('trust_collapse');
  });

  it('returns team_exhaustion, major_incident and budget_collapse when relevant', () => {
    const state = {
      ...createInitialGameState(),
      turn: 120,
      businessStageId: 'visible_pme' as const,
      activeIncidentIds: ['ransomware_minor'],
      resources: normalizeResources({
        ...createInitialGameState().resources,
        fatigue: 95,
        budget: 0,
      }),
    };

    expect(getCrisisCauses(state)).toEqual(
      expect.arrayContaining(['team_exhaustion', 'major_incident', 'budget_collapse']),
    );
  });
});

describe('applyCrisisTick', () => {
  it('applies passive crisis effects each tick', () => {
    const state = synchronizeCrisisState({
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 7,
      }),
    });

    const nextState = applyCrisisTick(state, 1000);

    expect(nextState.resources.fatigue).toBeCloseTo(0.02);
    expect(nextState.businessMomentum).toBeCloseTo(0);
  });
});

describe('executeCrisisAction', () => {
  it('executes a crisis action and increases recovery progress', () => {
    const state = synchronizeCrisisState({
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 7,
        proofs: 30,
      }),
    });

    expect(canExecuteCrisisAction(state, 'activate_crisis_cell')).toBe(true);

    const nextState = executeCrisisAction(state, 'activate_crisis_cell');

    expect(nextState.resources.proofs).toBe(10);
    expect(nextState.resources.trust).toBe(10);
    expect(nextState.crisis.recoveryProgress).toBe(20);
  });

  it('moves to recovery once progress reaches 100 and can resolve back to none', () => {
    const baseState = synchronizeCrisisState({
      ...createInitialGameState(),
      activeIncidentIds: ['ransomware_minor'],
      resources: normalizeResources({
        ...createInitialGameState().resources,
        proofs: 200,
        findings: 100,
        trust: 3,
      }),
      crisis: {
        level: 'active',
        causes: ['major_incident'],
        startedAtTurn: 10,
        lastEscalationTurn: 10,
        recoveryProgress: 85,
      },
    });

    const recoveredState = synchronizeCrisisState(executeCrisisAction(baseState, 'emergency_comex_briefing'));

    expect(recoveredState.crisis.level).toBe('recovery');

    const resolvedState = synchronizeCrisisState({
      ...recoveredState,
      activeIncidentIds: [],
      resources: normalizeResources({
        ...recoveredState.resources,
        trust: 20,
        fatigue: 20,
      }),
    });

    expect(resolvedState.crisis.level).toBe('none');
  });
});

describe('business events during crisis', () => {
  it('does not trigger a business event during active crisis', () => {
    const state = {
      ...createInitialGameState(),
      turn: 140,
      businessStageId: 'visible_pme' as const,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 18,
        exposure: 25,
      }),
      crisis: {
        level: 'active' as const,
        causes: ['major_incident' as const],
        startedAtTurn: 140,
        lastEscalationTurn: 140,
        recoveryProgress: 0,
      },
    };

    const nextState = processBusinessTurn(state);

    expect(nextState.pendingBusinessEventId).toBeUndefined();
  });
});