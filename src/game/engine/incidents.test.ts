import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import { getAttackById } from './attacks';
import { applyAttackToState } from './incidents';

describe('applyAttackToState', () => {
  it('applies impacts, appends a narrative entry, updates lastAttackTurn and does not mutate the source state', () => {
    const attack = getAttackById('phishing_basic');
    const state = {
      ...createInitialGameState(),
      turn: 45,
      pendingWarningAttackId: 'phishing_basic',
      resources: normalizeResources({
        ...createInitialGameState().resources,
        budget: 10,
        fatigue: 90,
      }),
    };

    const nextState = applyAttackToState(state, attack!);

    expect(nextState).not.toBe(state);
    expect(nextState.lastAttackTurn).toBe(45);
    expect(nextState.narrativeLog.at(-1)?.messageKey.startsWith('events.attack.phishing_basic.')).toBe(true);
    expect(nextState.resources.budget).toBeGreaterThanOrEqual(0);
    expect(nextState.pendingWarningAttackId).toBeUndefined();
    expect(state.lastAttackTurn).toBeUndefined();
  });

  it('creates active incidents for partial or major outcomes', () => {
    const attack = getAttackById('ransomware_minor');
    const state = {
      ...createInitialGameState(),
      turn: 60,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        knownDebt: 45,
        unknownDebt: 100,
        fatigue: 35,
      }),
    };

    const nextState = applyAttackToState(state, attack!);

    expect(nextState.activeIncidentIds.length).toBeGreaterThan(0);
    expect(nextState.incidentUntilTurn).toBeGreaterThan(nextState.turn);
  });

  it('increments survivedIncidentCount for a partial attack outcome', () => {
    const attack = getAttackById('phishing_basic');
    const state = {
      ...createInitialGameState(),
      unlockedTechnologyIds: ['phishing_awareness_v0'],
      resources: normalizeResources({
        ...createInitialGameState().resources,
        visibility: 10,
      }),
    };

    const nextState = applyAttackToState(state, attack!);

    expect(nextState.survivedIncidentCount).toBe(1);
  });

  it('increments survivedIncidentCount for a major attack outcome', () => {
    const attack = getAttackById('ransomware_minor');
    const state = {
      ...createInitialGameState(),
      turn: 50,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        knownDebt: 40,
        unknownDebt: 120,
        fatigue: 30,
      }),
    };

    const nextState = applyAttackToState(state, attack!);

    expect(nextState.survivedIncidentCount).toBe(1);
  });

  it('does not increment survivedIncidentCount for a blocked attack outcome', () => {
    const attack = getAttackById('phishing_basic');
    const state = {
      ...createInitialGameState(),
      unlockedTechnologyIds: ['phishing_awareness_v0', 'minimal_siem'],
      resources: normalizeResources({
        ...createInitialGameState().resources,
        visibility: 40,
        resilience: 30,
      }),
    };

    const nextState = applyAttackToState(state, attack!);

    expect(nextState.survivedIncidentCount).toBe(0);
  });
});