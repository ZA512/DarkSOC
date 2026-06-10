import objectivesData from '../../data/gameplay/objectives.json';
import type { GameState } from '../model/GameState';
import {
  type Objective,
  OBJECTIVE_STATUSES,
  type ObjectiveStateMap,
  type ObjectiveStatus,
} from '../model/Objective';
import { applyResourceDelta } from '../model/Resource';
import { getBusinessStageDefinition, getBusinessStageLevel } from './business';

export const OBJECTIVES = objectivesData as Objective[];

const objectivesById = new Map(OBJECTIVES.map((objective) => [objective.id, objective]));

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

function isObjectiveStatus(value: unknown): value is ObjectiveStatus {
  return typeof value === 'string' && (OBJECTIVE_STATUSES as readonly string[]).includes(value);
}

function getObjectiveStatusFromState(state: Pick<GameState, 'objectives'>, objectiveId: string): ObjectiveStatus {
  const status = state.objectives[objectiveId];

  if (isObjectiveStatus(status)) {
    return status;
  }

  return getObjectiveDefinition(objectiveId)?.status ?? 'locked';
}

function isObjectiveConditionMet(state: GameState, objective: Objective): boolean {
  return objective.conditions.every((condition) => {
    switch (condition.type) {
      case 'resource_at_least':
        return state.resources[condition.resourceId] >= condition.value;

      case 'technology_unlocked':
        return state.unlockedTechnologyIds.includes(condition.technologyId);

      case 'incident_survived':
        return state.survivedIncidentCount >= condition.count;

      case 'employee_unlocked':
        return state.employees.some(
          (employee) => employee.id === condition.employeeId && employee.unlocked === true,
        );

      case 'business_stage_reached': {
        const targetStage = getBusinessStageDefinition(condition.businessStageId);

        return Boolean(targetStage && getBusinessStageLevel(state) >= targetStage.level);
      }

      case 'crisis_resolved':
        return state.resolvedCrisisCount >= condition.count;
    }
  });
}

function unlockObjectives(statuses: ObjectiveStateMap, objectiveIds: string[] | undefined): ObjectiveStateMap {
  if (!objectiveIds || objectiveIds.length === 0) {
    return statuses;
  }

  const nextStatuses = { ...statuses };

  for (const objectiveId of objectiveIds) {
    const currentStatus = nextStatuses[objectiveId] ?? getObjectiveDefinition(objectiveId)?.status;

    if (currentStatus === 'locked') {
      nextStatuses[objectiveId] = 'active';
    }
  }

  return nextStatuses;
}

export function createInitialObjectiveStatuses(): ObjectiveStateMap {
  return Object.fromEntries(OBJECTIVES.map((objective) => [objective.id, objective.status]));
}

export function getObjectiveDefinition(objectiveId: string): Objective | undefined {
  return objectivesById.get(objectiveId);
}

export function getObjectivesForSeason(seasonId: string): Objective[] {
  return OBJECTIVES.filter((objective) => objective.seasonId === seasonId);
}

export function getObjectiveStatus(state: Pick<GameState, 'objectives'>, objectiveId: string): ObjectiveStatus {
  return getObjectiveStatusFromState(state, objectiveId);
}

export function evaluateObjective(state: GameState, objective: Objective): boolean {
  if (getObjectiveStatusFromState(state, objective.id) !== 'active') {
    return false;
  }

  return isObjectiveConditionMet(state, objective);
}

export function evaluateObjectives(state: GameState): GameState {
  let nextState = state;
  let shouldContinue = true;

  while (shouldContinue) {
    shouldContinue = false;

    for (const objective of OBJECTIVES) {
      if (!evaluateObjective(nextState, objective)) {
        continue;
      }

      shouldContinue = true;

      const nextObjectives = unlockObjectives(
        {
          ...nextState.objectives,
          [objective.id]: 'completed',
        },
        objective.unlocksObjectiveIds,
      );

      nextState = appendNarrativeEntry(
        {
          ...nextState,
          objectives: nextObjectives,
          completedObjectiveIds: [...new Set([...nextState.completedObjectiveIds, objective.id])],
          resources: objective.reward
            ? applyResourceDelta(nextState.resources, objective.reward)
            : nextState.resources,
        },
        'events.objective.completed',
        `objective_${objective.id}_completed`,
      );
    }
  }

  return nextState;
}