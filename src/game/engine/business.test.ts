import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import { applyBusinessChoice, getPendingBusinessEvent, processBusinessTurn } from './business';

describe('processBusinessTurn', () => {
  it('advances to the next business stage when turn and trust thresholds are met', () => {
    const state = {
      ...createInitialGameState(),
      turn: 120,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 15,
      }),
    };

    const nextState = processBusinessTurn(state);

    expect(nextState.businessStageId).toBe('visible_pme');
    expect(nextState.resources.budget).toBe(100);
    expect(nextState.resources.exposure).toBe(25);
    expect(nextState.businessMomentum).toBe(10);
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe('events.business.stage.visible_pme');
  });

  it('queues a business event once the event conditions are satisfied', () => {
    const state = {
      ...createInitialGameState(),
      turn: 140,
      businessStageId: 'visible_pme' as const,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 18,
        exposure: 25,
      }),
    };

    const nextState = processBusinessTurn(state);

    expect(getPendingBusinessEvent(nextState)?.id).toBe('launch_marketplace');
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe('events.business.launch_marketplace.pending');
  });

  it('does not queue a business event during crisis recovery', () => {
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
        level: 'recovery' as const,
        causes: [],
        startedAtTurn: 140,
        lastEscalationTurn: 140,
        recoveryProgress: 100,
      },
    };

    expect(processBusinessTurn(state).pendingBusinessEventId).toBeUndefined();
  });
});

describe('applyBusinessChoice', () => {
  it('applies the selected option, clears the pending event and records the history', () => {
    const state = {
      ...createInitialGameState(),
      pendingBusinessEventId: 'launch_marketplace',
      businessStageId: 'visible_pme' as const,
    };

    const nextState = applyBusinessChoice(state, 'launch_marketplace', 'accept_without_conditions');

    expect(nextState.pendingBusinessEventId).toBeUndefined();
    expect(nextState.businessEventHistory).toEqual(['launch_marketplace']);
    expect(nextState.resources.budget).toBe(300);
    expect(nextState.resources.exposure).toBe(45);
    expect(nextState.resources.unknownDebt).toBe(100);
    expect(nextState.resources.trust).toBe(15);
    expect(nextState.businessMomentum).toBe(18);
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe(
      'events.business.launch_marketplace.accept_without_conditions',
    );
  });
});