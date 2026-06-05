import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './GameState';

describe('createInitialGameState', () => {
  it('creates the expected phase 1 initial state', () => {
    const state = createInitialGameState('test-seed');

    expect(state.turn).toBe(0);
    expect(state.randomSeed).toBe('test-seed');
    expect(state.resources.logs).toBe(0);
    expect(state.resources.trust).toBe(10);
    expect(state.resources.visibility).toBe(1);
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0]?.id).toBe('unknown_server_1');
    expect(state.narrativeLog).toContainEqual({
      id: 'intro_dark_room',
      messageKey: 'events.intro.dark_room',
    });
  });
});
