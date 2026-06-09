import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import { getCyberMaturity, getThreatPressure, shouldTriggerAttack } from './threat';

describe('getCyberMaturity', () => {
  it('returns a value greater than or equal to zero', () => {
    expect(getCyberMaturity(createInitialGameState())).toBeGreaterThanOrEqual(0);
  });

  it('increases when defensive technologies are unlocked', () => {
    const state = createInitialGameState();
    const protectedState = {
      ...state,
      unlockedTechnologyIds: ['phishing_awareness_v0', 'incident_procedure_v0', 'minimal_siem'],
    };

    expect(getCyberMaturity(protectedState)).toBeGreaterThan(getCyberMaturity(state));
  });
});

describe('getThreatPressure', () => {
  it('increases when exposure and debt increase', () => {
    const state = createInitialGameState();
    const pressuredState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        exposure: 40,
        knownDebt: 25,
        unknownDebt: 100,
      }),
    };

    expect(getThreatPressure(pressuredState)).toBeGreaterThan(getThreatPressure(state));
  });
});

describe('shouldTriggerAttack', () => {
  it('does not trigger before the grace period', () => {
    expect(shouldTriggerAttack(createInitialGameState(), 0)).toBe(false);
  });

  it('does not trigger during the cooldown window', () => {
    const state = {
      ...createInitialGameState(),
      turn: 50,
      lastAttackTurn: 40,
    };

    expect(shouldTriggerAttack(state, 0)).toBe(false);
  });

  it('can trigger when the random value is below the computed chance', () => {
    const state = {
      ...createInitialGameState(),
      turn: 60,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        exposure: 80,
        knownDebt: 40,
        unknownDebt: 100,
      }),
    };

    expect(shouldTriggerAttack(state, 0)).toBe(true);
  });
});