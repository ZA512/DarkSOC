import type { GameAction } from './actions';
import { applyBusinessChoice, processBusinessTurn } from './business';
import {
  applyCrisisTick,
  applyCrisisTransitionNarrative,
  executeCrisisAction,
  synchronizeCrisisState,
} from './crisis';
import { applyEmployeeTick, applyEmployeeUnlocks } from './employees';
import { evaluateObjectives } from './objectives';
import { evaluateSeasonCompletion } from './seasons';
import {
  canAffordManualAction,
  getManualActionCostDelta,
  getManualActionDefinition,
  getManualActionEffectDelta,
} from './manualActions';
import { getPassiveResourceDelta, getTechnologyDefinition, getTechnologyPurchaseDelta } from './technologies';
import { processThreatTurn } from './incidents';
import {
  canAssignEmployeeTask,
  canBuyTechnology,
  getAvailableManualActions,
  getEffectiveStats,
} from './selectors';
import { createInitialGameState, type GameState } from '../model/GameState';
import { applyResourceDelta } from '../model/Resource';

type NarrativeThreshold = {
  flag: string;
  messageKey: string;
  isReached: (state: GameState) => boolean;
};

const NARRATIVE_THRESHOLDS: NarrativeThreshold[] = [
  {
    flag: 'logs_30_reached',
    messageKey: 'events.logs_30_reached',
    isReached: (state) => state.resources.logs >= 30,
  },
  {
    flag: 'findings_10_reached',
    messageKey: 'events.findings_10_reached',
    isReached: (state) => state.resources.findings >= 10,
  },
  {
    flag: 'known_debt_10_reached',
    messageKey: 'events.known_debt_10_reached',
    isReached: (state) => state.resources.knownDebt >= 10,
  },
  {
    flag: 'budget_50_reached',
    messageKey: 'events.budget_50_reached',
    isReached: (state) => state.resources.budget >= 50,
  },
];

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

function completeRunningAction(state: GameState, actionId: GameState['runningActions'][number]['id']): GameState {
  const runningAction = state.runningActions.find((candidate) => candidate.id === actionId);

  if (!runningAction) {
    return state;
  }

  const nextState = {
    ...state,
    resources: applyResourceDelta(state.resources, getManualActionEffectDelta(runningAction.id)),
    flags: {
      ...state.flags,
      [`action_${runningAction.id}_used`]: true,
    },
    runningActions: state.runningActions.filter((candidate) => candidate.id !== actionId),
  };

  return appendNarrativeEntry(
    nextState,
    getManualActionDefinition(runningAction.id).completedMessageKey,
    `action_${runningAction.id}_completed`,
  );
}

function hasResourceDelta(delta: Partial<Record<string, number>>): boolean {
  return Object.values(delta).some((value) => value !== 0);
}

function completeTechnologyPurchase(state: GameState, technologyId: string): GameState {
  const technology = getTechnologyDefinition(technologyId);

  if (!technology || !canBuyTechnology(state, technologyId)) {
    return state;
  }

  const nextState: GameState = {
    ...state,
    resources: applyResourceDelta(state.resources, getTechnologyPurchaseDelta(technology)),
    unlockedTechnologyIds: [...state.unlockedTechnologyIds, technologyId],
    availableTechnologyIds: [
      ...new Set([...state.availableTechnologyIds, ...(technology.unlocks ?? [])]),
    ],
  };
  const withNarrative = appendNarrativeEntry(
    nextState,
    `events.tech.${technologyId}.unlocked`,
    `tech_${technologyId}_unlocked`,
  );

  return applyEmployeeUnlocks(withNarrative);
}

function finalizeCrisisState(state: GameState, previousLevel: GameState['crisis']['level']): GameState {
  const nextState = synchronizeCrisisState(state);
  const withResolvedCount =
    previousLevel === 'recovery' && nextState.crisis.level === 'none'
      ? {
          ...nextState,
          resolvedCrisisCount: nextState.resolvedCrisisCount + 1,
        }
      : nextState;

  return applyCrisisTransitionNarrative(withResolvedCount, previousLevel);
}

function applyProgressionState(state: GameState, previousCrisisLevel: GameState['crisis']['level']): GameState {
  return applyNarrativeThresholds(
    evaluateSeasonCompletion(evaluateObjectives(finalizeCrisisState(state, previousCrisisLevel))),
  );
}

export function applyNarrativeThresholds(state: GameState): GameState {
  let nextState = state;

  for (const threshold of NARRATIVE_THRESHOLDS) {
    if (nextState.flags[threshold.flag] || !threshold.isReached(nextState)) {
      continue;
    }

    nextState = appendNarrativeEntry(nextState, threshold.messageKey, threshold.flag);
    nextState = {
      ...nextState,
      flags: {
        ...nextState.flags,
        [threshold.flag]: true,
      },
    };
  }

  return nextState;
}

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_MANUAL_ACTION': {
      if (state.runningActions.some((runningAction) => runningAction.id === action.actionId)) {
        return state;
      }

      if (!getAvailableManualActions(state).includes(action.actionId)) {
        return state;
      }

      if (!canAffordManualAction(state.resources, action.actionId)) {
        return state;
      }

      const definition = getManualActionDefinition(action.actionId);

      return {
        ...state,
        resources: applyResourceDelta(state.resources, getManualActionCostDelta(action.actionId)),
        runningActions: [
          ...state.runningActions,
          {
            id: action.actionId,
            startedAtTurn: state.turn,
            remainingMs: definition.durationMs,
            durationMs: definition.durationMs,
          },
        ],
      };
    }

    case 'BUY_TECHNOLOGY':
      return completeTechnologyPurchase(state, action.technologyId) === state
        ? state
        : applyProgressionState(completeTechnologyPurchase(state, action.technologyId), state.crisis.level);

    case 'CHOOSE_BUSINESS_OPTION':
      return applyBusinessChoice(state, action.eventId, action.choiceId) === state
        ? state
        : applyProgressionState(applyBusinessChoice(state, action.eventId, action.choiceId), state.crisis.level);

    case 'EXECUTE_CRISIS_ACTION':
      return executeCrisisAction(state, action.crisisActionId) === state
        ? state
        : applyProgressionState(executeCrisisAction(state, action.crisisActionId), state.crisis.level);

    case 'DISMISS_ONBOARDING':
      return state.showOnboarding
        ? {
            ...state,
            showOnboarding: false,
          }
        : state;

    case 'DISMISS_SEASON_SUMMARY':
      return state.showSeasonSummary
        ? {
            ...state,
            showSeasonSummary: false,
          }
        : state;

    case 'ASSIGN_EMPLOYEE_TASK': {
      if (!canAssignEmployeeTask(state, action.employeeId, action.taskId)) {
        return state;
      }

      const employee = state.employees.find((candidate) => candidate.id === action.employeeId);

      if (!employee || employee.assignedTaskId === action.taskId) {
        return state;
      }

      return appendNarrativeEntry(
        {
          ...state,
          employees: state.employees.map((candidate) =>
            candidate.id === action.employeeId
              ? {
                  ...candidate,
                  assignedTaskId: action.taskId,
                }
              : candidate,
          ),
        },
        'events.employee.assigned',
        `employee_assigned_${action.employeeId}`,
      );
    }

    case 'UNASSIGN_EMPLOYEE': {
      const employee = state.employees.find((candidate) => candidate.id === action.employeeId);

      if (!employee?.assignedTaskId) {
        return state;
      }

      return appendNarrativeEntry(
        {
          ...state,
          employees: state.employees.map((candidate) =>
            candidate.id === action.employeeId
              ? {
                  ...candidate,
                  assignedTaskId: undefined,
                }
              : candidate,
          ),
        },
        'events.employee.unassigned',
        `employee_unassigned_${action.employeeId}`,
      );
    }

    case 'COMPLETE_RUNNING_ACTION':
      return completeRunningAction(state, action.actionId) === state
        ? state
        : applyProgressionState(
            applyEmployeeUnlocks(completeRunningAction(state, action.actionId)),
            state.crisis.level,
          );

    case 'UPDATE_SETTINGS': {
      const nextSettings = {
        ...state.settings,
        ...action.settings,
      };

      if (
        nextSettings.locale === state.settings.locale &&
        nextSettings.animationMode === state.settings.animationMode &&
        nextSettings.contrastMode === state.settings.contrastMode
      ) {
        return state;
      }

      return {
        ...state,
        settings: nextSettings,
      };
    }

    case 'TICK': {
      const deltaMs = Math.max(0, action.deltaMs);

      if (deltaMs === 0) {
        return state;
      }

      const previousCrisisLevel = state.crisis.level;
      const passiveDelta = getPassiveResourceDelta(getEffectiveStats(state), deltaMs);
      const tickState = {
        ...state,
        turn: state.turn + 1,
        resources: hasResourceDelta(passiveDelta)
          ? applyResourceDelta(state.resources, passiveDelta)
          : state.resources,
      };
      const baseTickState = synchronizeCrisisState(applyEmployeeUnlocks(applyEmployeeTick(tickState, deltaMs)));
      const nextState = processBusinessTurn(applyCrisisTick(baseTickState, deltaMs));

      return applyProgressionState(processThreatTurn(nextState), previousCrisisLevel);
    }

    case 'RESET_GAME':
      return {
        ...createInitialGameState(state.randomSeed),
        settings: {
          ...state.settings,
        },
      };
  }
}
