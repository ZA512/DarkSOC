import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import { getAttackById, getAttackPower, resolveAttack } from './attacks';

describe('getAttackPower', () => {
  it('increases with attack scaling inputs', () => {
    const attack = getAttackById('vulnerable_web_app');
    const state = createInitialGameState();
    const pressuredState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        exposure: 60,
        knownDebt: 20,
      }),
    };

    expect(attack).toBeDefined();
    expect(getAttackPower(pressuredState, attack!)).toBeGreaterThan(getAttackPower(state, attack!));
  });
});

describe('resolveAttack', () => {
  it('returns blocked when defense is strong enough', () => {
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

    expect(resolveAttack(state, attack!).outcome).toBe('blocked');
  });

  it('returns partial when defense is close to attack power', () => {
    const attack = getAttackById('phishing_basic');
    const state = {
      ...createInitialGameState(),
      unlockedTechnologyIds: ['phishing_awareness_v0'],
      resources: normalizeResources({
        ...createInitialGameState().resources,
        visibility: 10,
      }),
    };

    expect(resolveAttack(state, attack!).outcome).toBe('partial');
  });

  it('returns major when defense is weak', () => {
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

    expect(resolveAttack(state, attack!).outcome).toBe('major');
  });
});