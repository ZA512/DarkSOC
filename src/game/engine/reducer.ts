import type { GameAction } from './actions';
import { createInitialGameState, type GameState } from '../model/GameState';
import { applyResourceDelta } from '../model/Resource';

const COLLECT_LOGS_GAIN = 10;

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'COLLECT_LOGS':
      return {
        ...state,
        resources: applyResourceDelta(state.resources, {
          logs: COLLECT_LOGS_GAIN,
        }),
      };

    case 'RESET_GAME':
      return createInitialGameState(state.randomSeed);
  }
}
