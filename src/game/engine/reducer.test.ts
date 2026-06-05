import { describe, expect, it } from 'vitest';
import { applyAction } from './reducer';
import { createInitialGameState } from '../model/GameState';
import { RESOURCE_IDS } from '../model/Resource';

describe('applyAction', () => {
  it('collects 10 logs without mutating the original state', () => {
    const state = createInitialGameState();
    const originalResources = { ...state.resources };

    const nextState = applyAction(state, { type: 'COLLECT_LOGS' });

    expect(nextState).not.toBe(state);
    expect(nextState.resources).not.toBe(state.resources);
    expect(nextState.resources.logs).toBe(10);
    expect(state.resources.logs).toBe(0);

    for (const resourceId of RESOURCE_IDS) {
      if (resourceId === 'logs') {
        continue;
      }

      expect(nextState.resources[resourceId]).toBe(originalResources[resourceId]);
    }
  });
});
