import type { Attack } from '../model/Attack';
import type { GameState } from '../model/GameState';
import { applyResourceDelta } from '../model/Resource';
import { getAttackById, resolveAttack, selectAttackForState } from './attacks';
import { getDeterministicThreatRoll, shouldTriggerAttack } from './threat';

function appendNarrativeEntry(state: GameState, messageKey: string, key: string): GameState {
  return {
    ...state,
    narrativeLog: [
      ...state.narrativeLog,
      {
        id: `${key}_${state.turn}_${state.narrativeLog.length}`,
        messageKey,
      },
    ],
  };
}

function createIncidentIds(attack: Attack, state: GameState, count: number): string[] {
  return Array.from({ length: count }, () => attack.id);
}

export function clearExpiredIncidents(state: GameState): GameState {
  if (
    state.activeIncidentIds.length === 0 ||
    state.incidentUntilTurn === undefined ||
    state.turn < state.incidentUntilTurn
  ) {
    return state;
  }

  return {
    ...state,
    activeIncidentIds: [],
    resolvedIncidentIds: [...state.resolvedIncidentIds, ...state.activeIncidentIds],
    incidentUntilTurn: undefined,
  };
}

export function applyAttackToState(state: GameState, attack: Attack): GameState {
  const resolution = resolveAttack(state, attack);
  const incidentCount = resolution.outcome === 'major' ? 3 : resolution.outcome === 'partial' ? 1 : 0;

  const nextState: GameState = {
    ...state,
    resources: applyResourceDelta(state.resources, resolution.impact),
    narrativeLog: state.narrativeLog,
    lastAttackTurn: state.turn,
    pendingWarningAttackId: state.pendingWarningAttackId === attack.id ? undefined : state.pendingWarningAttackId,
    activeIncidentIds:
      incidentCount > 0 ? createIncidentIds(attack, state, incidentCount) : state.activeIncidentIds,
    incidentUntilTurn: incidentCount > 0 ? state.turn + (resolution.outcome === 'major' ? 5 : 3) : state.incidentUntilTurn,
  };

  return appendNarrativeEntry(
    nextState,
    `events.attack.${attack.id}.${resolution.outcome}`,
    `attack_${attack.id}_${resolution.outcome}`,
  );
}

export function maybeQueueAttackWarning(state: GameState, attack: Attack): GameState {
  if (state.pendingWarningAttackId) {
    return state;
  }

  return appendNarrativeEntry(
    {
      ...state,
      pendingWarningAttackId: attack.id,
    },
    `events.warning.${attack.id}`,
    `warning_${attack.id}`,
  );
}

export function processThreatTurn(state: GameState): GameState {
  const incidentClearedState = clearExpiredIncidents(state);
  const selectedAttack =
    (incidentClearedState.pendingWarningAttackId
      ? getAttackById(incidentClearedState.pendingWarningAttackId)
      : undefined) ?? selectAttackForState(incidentClearedState);

  if (!selectedAttack) {
    return incidentClearedState;
  }

  const attackRoll = getDeterministicThreatRoll(incidentClearedState, `attack:${selectedAttack.id}`);

  if (!shouldTriggerAttack(incidentClearedState, attackRoll)) {
    return incidentClearedState;
  }

  if (!incidentClearedState.pendingWarningAttackId) {
    const warningRoll = getDeterministicThreatRoll(incidentClearedState, `warning:${selectedAttack.id}`);

    if (warningRoll < 0.5) {
      return maybeQueueAttackWarning(incidentClearedState, selectedAttack);
    }
  }

  return applyAttackToState(incidentClearedState, selectedAttack);
}