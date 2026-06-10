import { createInitialGameState, type GameState } from '../game/model/GameState';
import {
  getBusinessEventDefinition,
  getBusinessStageDefinition,
  normalizeBusinessMomentum,
} from '../game/engine/business';
import {
  normalizeRecoveryProgress,
} from '../game/engine/crisis';
import { createInitialObjectiveStatuses, getObjectiveDefinition } from '../game/engine/objectives';
import { getSeasonDefinition } from '../game/engine/seasons';
import { normalizeEmployeeRoster } from '../game/model/Employee';
import { normalizeResources, RESOURCE_IDS } from '../game/model/Resource';
import { CRISIS_CAUSES, CRISIS_LEVELS } from '../game/model/Crisis';
import { OBJECTIVE_STATUSES, type ObjectiveStatus } from '../game/model/Objective';

export type ValidationResult<T> =
  | { ok: true; value: T; warnings?: string[] }
  | { ok: false; errors: string[] };

type ValidateGameStateOptions = {
  allowRecoverableMissingFields?: boolean;
};

export const RESTORED_MISSING_FIELDS_WARNING = 'restored_missing_fields';

type UnknownRecord = Record<string, unknown>;
type RunningActionRecord = {
  id: string;
  startedAtTurn: number;
  remainingMs: number;
  durationMs: number;
};
type LegacyRunningActionState = Partial<GameState> & {
  runningAction?: unknown;
  runningActions?: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isEmployeeArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((item) => isRecord(item));
}

function isIntegerAtLeastZero(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isCrisisLevel(value: unknown): boolean {
  return typeof value === 'string' && (CRISIS_LEVELS as readonly string[]).includes(value);
}

function isCrisisCauseArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && (CRISIS_CAUSES as readonly string[]).includes(item));
}

function isObjectiveStatus(value: unknown): value is ObjectiveStatus {
  return typeof value === 'string' && (OBJECTIVE_STATUSES as readonly string[]).includes(value);
}

function isObjectiveStatusRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((status) => isObjectiveStatus(status));
}

function isRunningActionRecord(value: unknown): value is RunningActionRecord {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isFiniteNumber(value.startedAtTurn) &&
    isFiniteNumber(value.remainingMs) &&
    isFiniteNumber(value.durationMs)
  );
}

function noteRecoverableMissingField(
  warnings: string[],
  options: ValidateGameStateOptions,
): void {
  if (!options.allowRecoverableMissingFields || warnings.includes(RESTORED_MISSING_FIELDS_WARNING)) {
    return;
  }

  warnings.push(RESTORED_MISSING_FIELDS_WARNING);
}

export function validateGameState(
  value: unknown,
  options: ValidateGameStateOptions = {},
): ValidationResult<GameState> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['GameState must be an object.'] };
  }

  if (!Number.isInteger(value.turn) || (value.turn as number) < 0) {
    errors.push('turn must be an integer >= 0.');
  }

  if (typeof value.randomSeed !== 'string' || value.randomSeed.length === 0) {
    errors.push('randomSeed must be a non-empty string.');
  }

  if (!isRecord(value.resources)) {
    errors.push('resources must exist.');
  } else {
    for (const resourceId of RESOURCE_IDS) {
      if (!(resourceId in value.resources)) {
        errors.push(`Missing resource: ${resourceId}.`);
        continue;
      }

      if (!isFiniteNumber(value.resources[resourceId])) {
        errors.push(`Resource ${resourceId} must be a finite number.`);
      }
    }
  }

  if (!isStringArray(value.unlockedTechnologyIds)) {
    errors.push('unlockedTechnologyIds must be an array of strings.');
  }

  if ('availableTechnologyIds' in value) {
    if (!isStringArray(value.availableTechnologyIds)) {
      errors.push('availableTechnologyIds must be an array of strings when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if (!('employees' in value)) {
    noteRecoverableMissingField(warnings, options);
  } else if (!Array.isArray(value.employees)) {
    errors.push('employees must be an array when present.');
  } else if (!isEmployeeArray(value.employees)) {
    errors.push('employees must contain objects.');
  } else {
    for (const employee of value.employees) {
      if ('id' in employee && typeof employee.id !== 'string') {
        errors.push('employee.id must be a string when present.');
      }

      if ('fatigue' in employee && !isFiniteNumber(employee.fatigue)) {
        errors.push('employee.fatigue must be a finite number when present.');
      }

      if ('assignedTaskId' in employee && employee.assignedTaskId !== undefined && typeof employee.assignedTaskId !== 'string') {
        errors.push('employee.assignedTaskId must be a string when present.');
      }

      if ('unlocked' in employee && typeof employee.unlocked !== 'boolean') {
        errors.push('employee.unlocked must be a boolean when present.');
      }
    }
  }

  if (!('assets' in value)) {
    noteRecoverableMissingField(warnings, options);
  } else if (!Array.isArray(value.assets)) {
    errors.push('assets must be an array when present.');
  }

  if ('activeIncidentIds' in value) {
    if (!isStringArray(value.activeIncidentIds)) {
      errors.push('activeIncidentIds must be an array of strings when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('resolvedIncidentIds' in value) {
    if (!isStringArray(value.resolvedIncidentIds)) {
      errors.push('resolvedIncidentIds must be an array of strings when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if (!('narrativeLog' in value)) {
    noteRecoverableMissingField(warnings, options);
  } else if (!Array.isArray(value.narrativeLog)) {
    errors.push('narrativeLog must be an array when present.');
  }

  if (!('flags' in value)) {
    noteRecoverableMissingField(warnings, options);
  } else if (!isRecord(value.flags)) {
    errors.push('flags must be an object when present.');
  }

  if (!('settings' in value)) {
    noteRecoverableMissingField(warnings, options);
  } else if (!isRecord(value.settings)) {
    errors.push('settings must be an object when present.');
  } else {
    if ('locale' in value.settings) {
      if (typeof value.settings.locale !== 'string') {
        errors.push('settings.locale must be a string when present.');
      }
    } else {
      noteRecoverableMissingField(warnings, options);
    }

    if ('animationMode' in value.settings) {
      if (typeof value.settings.animationMode !== 'string') {
        errors.push('settings.animationMode must be a string when present.');
      }
    } else {
      noteRecoverableMissingField(warnings, options);
    }

    if ('contrastMode' in value.settings) {
      if (typeof value.settings.contrastMode !== 'string') {
        errors.push('settings.contrastMode must be a string when present.');
      }
    } else {
      noteRecoverableMissingField(warnings, options);
    }
  }

  if ('businessStageId' in value) {
    if (value.businessStageId !== undefined && typeof value.businessStageId !== 'string') {
      errors.push('businessStageId must be a string when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('businessEventHistory' in value) {
    if (!isStringArray(value.businessEventHistory)) {
      errors.push('businessEventHistory must be an array of strings when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if (
    'pendingBusinessEventId' in value &&
    value.pendingBusinessEventId !== undefined &&
    typeof value.pendingBusinessEventId !== 'string'
  ) {
    errors.push('pendingBusinessEventId must be a string when present.');
  }

  if ('businessMomentum' in value) {
    if (value.businessMomentum !== undefined && !isFiniteNumber(value.businessMomentum)) {
      errors.push('businessMomentum must be a finite number when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('currentSeasonId' in value) {
    if (
      value.currentSeasonId !== undefined &&
      (typeof value.currentSeasonId !== 'string' || !getSeasonDefinition(value.currentSeasonId))
    ) {
      errors.push('currentSeasonId must reference a valid season when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('completedSeasonIds' in value) {
    if (!isStringArray(value.completedSeasonIds)) {
      errors.push('completedSeasonIds must be an array of strings when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('objectives' in value) {
    if (value.objectives !== undefined && !isObjectiveStatusRecord(value.objectives)) {
      errors.push('objectives must be a record of valid objective statuses when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('completedObjectiveIds' in value) {
    if (!isStringArray(value.completedObjectiveIds)) {
      errors.push('completedObjectiveIds must be an array of strings when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('survivedIncidentCount' in value) {
    if (
      value.survivedIncidentCount !== undefined &&
      (!isFiniteNumber(value.survivedIncidentCount) || value.survivedIncidentCount < 0)
    ) {
      errors.push('survivedIncidentCount must be a finite number >= 0 when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('resolvedCrisisCount' in value) {
    if (
      value.resolvedCrisisCount !== undefined &&
      (!isFiniteNumber(value.resolvedCrisisCount) || value.resolvedCrisisCount < 0)
    ) {
      errors.push('resolvedCrisisCount must be a finite number >= 0 when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('showOnboarding' in value) {
    if (value.showOnboarding !== undefined && typeof value.showOnboarding !== 'boolean') {
      errors.push('showOnboarding must be a boolean when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if ('showSeasonSummary' in value) {
    if (value.showSeasonSummary !== undefined && typeof value.showSeasonSummary !== 'boolean') {
      errors.push('showSeasonSummary must be a boolean when present.');
    }
  } else {
    noteRecoverableMissingField(warnings, options);
  }

  if (!('crisis' in value)) {
    noteRecoverableMissingField(warnings, options);
  } else if (!isRecord(value.crisis)) {
    errors.push('crisis must be an object when present.');
  } else {
    if ('level' in value.crisis) {
      if (!isCrisisLevel(value.crisis.level)) {
        errors.push('crisis.level must be a valid crisis level when present.');
      }
    } else {
      noteRecoverableMissingField(warnings, options);
    }

    if ('causes' in value.crisis) {
      if (!isCrisisCauseArray(value.crisis.causes)) {
        errors.push('crisis.causes must contain valid crisis causes when present.');
      }
    } else {
      noteRecoverableMissingField(warnings, options);
    }

    if ('recoveryProgress' in value.crisis) {
      if (!isFiniteNumber(value.crisis.recoveryProgress)) {
        errors.push('crisis.recoveryProgress must be a finite number when present.');
      }
    } else {
      noteRecoverableMissingField(warnings, options);
    }

    if (
      'startedAtTurn' in value.crisis &&
      value.crisis.startedAtTurn !== undefined &&
      !isIntegerAtLeastZero(value.crisis.startedAtTurn)
    ) {
      errors.push('crisis.startedAtTurn must be an integer >= 0 when present.');
    }

    if (
      'lastEscalationTurn' in value.crisis &&
      value.crisis.lastEscalationTurn !== undefined &&
      !isIntegerAtLeastZero(value.crisis.lastEscalationTurn)
    ) {
      errors.push('crisis.lastEscalationTurn must be an integer >= 0 when present.');
    }
  }

  if ('createdAt' in value && value.createdAt !== undefined && typeof value.createdAt !== 'string') {
    errors.push('createdAt must be a string when present.');
  }

  if ('updatedAt' in value && value.updatedAt !== undefined && typeof value.updatedAt !== 'string') {
    errors.push('updatedAt must be a string when present.');
  }

  if ('modified' in value && typeof value.modified !== 'boolean') {
    errors.push('modified must be a boolean when present.');
  }

  if ('lastAttackTurn' in value && value.lastAttackTurn !== undefined && !isFiniteNumber(value.lastAttackTurn)) {
    errors.push('lastAttackTurn must be a finite number when present.');
  }

  if (
    'pendingWarningAttackId' in value &&
    value.pendingWarningAttackId !== undefined &&
    typeof value.pendingWarningAttackId !== 'string'
  ) {
    errors.push('pendingWarningAttackId must be a string when present.');
  }

  if (
    'incidentUntilTurn' in value &&
    value.incidentUntilTurn !== undefined &&
    !isFiniteNumber(value.incidentUntilTurn)
  ) {
    errors.push('incidentUntilTurn must be a finite number when present.');
  }

  if ('runningActions' in value && value.runningActions !== undefined) {
    if (!Array.isArray(value.runningActions)) {
      errors.push('runningActions must be an array when present.');
    } else if (!value.runningActions.every((runningAction) => isRunningActionRecord(runningAction))) {
      errors.push('runningActions must contain valid running action objects.');
    }
  }

  if ('runningAction' in value && value.runningAction !== undefined && !isRunningActionRecord(value.runningAction)) {
    errors.push('runningAction must be a valid legacy running action object when present.');
  }

  return errors.length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: value as GameState,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
}

export function validateLoadedGameState(value: unknown): ValidationResult<Partial<GameState>> {
  const result = validateGameState(value, { allowRecoverableMissingFields: true });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    value: result.value as Partial<GameState>,
    warnings: result.warnings,
  };
}

export function normalizeGameState(state: Partial<GameState>): GameState {
  const legacyState = state as LegacyRunningActionState;
  const initialState = createInitialGameState(
    typeof state.randomSeed === 'string' && state.randomSeed.length > 0 ? state.randomSeed : undefined,
  );
  const initialObjectiveStatuses = createInitialObjectiveStatuses();
  const normalizedObjectiveEntries = isRecord(state.objectives)
    ? Object.entries(state.objectives).filter(
        ([objectiveId, status]) => Boolean(getObjectiveDefinition(objectiveId)) && isObjectiveStatus(status),
      )
    : [];
  const normalizedObjectives = {
    ...initialObjectiveStatuses,
    ...Object.fromEntries(normalizedObjectiveEntries),
  } as Record<string, ObjectiveStatus>;
  const normalizedCompletedObjectiveIds = [...new Set([
    ...((Array.isArray(state.completedObjectiveIds) ? state.completedObjectiveIds : []).filter(
      (objectiveId): objectiveId is string => typeof objectiveId === 'string' && Boolean(getObjectiveDefinition(objectiveId)),
    )),
    ...Object.entries(normalizedObjectives)
      .filter(([, status]) => status === 'completed')
      .map(([objectiveId]) => objectiveId),
  ])];

  for (const objectiveId of normalizedCompletedObjectiveIds) {
    normalizedObjectives[objectiveId] = 'completed';
  }

  const normalizedUnlockedTechnologyIds = [...new Set(
    (Array.isArray(state.unlockedTechnologyIds) ? state.unlockedTechnologyIds : []).filter(
      (technologyId): technologyId is string => typeof technologyId === 'string',
    ),
  )];
  const normalizedAvailableTechnologyIds = [...new Set(
    (Array.isArray(state.availableTechnologyIds) && state.availableTechnologyIds.length > 0
      ? state.availableTechnologyIds
      : initialState.availableTechnologyIds
    ).filter((technologyId): technologyId is string => typeof technologyId === 'string'),
  )];
  const normalizedEmployeesSource = Array.isArray(state.employees) ? state.employees : initialState.employees;
  const normalizedRunningActionsSource =
    Array.isArray(legacyState.runningActions) && legacyState.runningActions.length > 0
      ? legacyState.runningActions
      : isRunningActionRecord(legacyState.runningAction)
        ? [legacyState.runningAction]
        : Array.isArray(legacyState.runningActions)
          ? legacyState.runningActions
          : [];

  return {
    ...initialState,
    ...state,
    turn: typeof state.turn === 'number' ? Math.max(0, Math.floor(state.turn)) : initialState.turn,
    resources: normalizeResources(isRecord(state.resources) ? state.resources : initialState.resources),
    unlockedTechnologyIds: normalizedUnlockedTechnologyIds,
    availableTechnologyIds: normalizedAvailableTechnologyIds,
    employees:
      normalizedEmployeesSource.length > 0
        ? normalizeEmployeeRoster(normalizedEmployeesSource)
        : normalizeEmployeeRoster(initialState.employees),
    assets: Array.isArray(state.assets) ? [...state.assets] : [...initialState.assets],
    activeIncidentIds: [...new Set(state.activeIncidentIds ?? [])],
    resolvedIncidentIds: [...new Set(state.resolvedIncidentIds ?? [])],
    narrativeLog: Array.isArray(state.narrativeLog) ? [...state.narrativeLog] : [...initialState.narrativeLog],
    flags: Object.fromEntries(
      Object.entries(isRecord(state.flags) ? state.flags : initialState.flags).filter(
        ([, flagValue]) => typeof flagValue === 'boolean',
      ),
    ),
    settings: {
      ...initialState.settings,
      ...(isRecord(state.settings) ? state.settings : {}),
    },
    runningActions: normalizedRunningActionsSource
      .filter((runningAction): runningAction is RunningActionRecord => isRunningActionRecord(runningAction))
      .map((runningAction) => ({
        id: runningAction.id,
        startedAtTurn: Math.max(0, Math.floor(runningAction.startedAtTurn)),
        remainingMs: Math.max(0, runningAction.remainingMs),
        durationMs: Math.max(1, runningAction.durationMs),
      })),
    createdAt: typeof state.createdAt === 'string' ? state.createdAt : initialState.createdAt,
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : initialState.updatedAt,
    modified: state.modified === true,
    lastAttackTurn: typeof state.lastAttackTurn === 'number' ? state.lastAttackTurn : initialState.lastAttackTurn,
    pendingWarningAttackId:
      typeof state.pendingWarningAttackId === 'string'
        ? state.pendingWarningAttackId
        : initialState.pendingWarningAttackId,
    incidentUntilTurn:
      typeof state.incidentUntilTurn === 'number' ? state.incidentUntilTurn : initialState.incidentUntilTurn,
    businessStageId:
      typeof state.businessStageId === 'string' && getBusinessStageDefinition(state.businessStageId)
        ? state.businessStageId
        : initialState.businessStageId,
    businessEventHistory: [...new Set(
      (Array.isArray(state.businessEventHistory) ? state.businessEventHistory : []).filter(
        (eventId): eventId is string => typeof eventId === 'string' && Boolean(getBusinessEventDefinition(eventId)),
      ),
    )],
    pendingBusinessEventId:
      typeof state.pendingBusinessEventId === 'string' && getBusinessEventDefinition(state.pendingBusinessEventId)
        ? state.pendingBusinessEventId
        : initialState.pendingBusinessEventId,
    businessMomentum: normalizeBusinessMomentum(state.businessMomentum),
    currentSeasonId:
      typeof state.currentSeasonId === 'string' && getSeasonDefinition(state.currentSeasonId)
        ? state.currentSeasonId
        : initialState.currentSeasonId,
    completedSeasonIds: [...new Set(
      (Array.isArray(state.completedSeasonIds) ? state.completedSeasonIds : []).filter(
        (seasonId): seasonId is string => typeof seasonId === 'string' && Boolean(getSeasonDefinition(seasonId)),
      ),
    )],
    objectives: normalizedObjectives,
    completedObjectiveIds: normalizedCompletedObjectiveIds,
    survivedIncidentCount:
      typeof state.survivedIncidentCount === 'number'
        ? Math.max(0, Math.floor(state.survivedIncidentCount))
        : initialState.survivedIncidentCount,
    resolvedCrisisCount:
      typeof state.resolvedCrisisCount === 'number'
        ? Math.max(0, Math.floor(state.resolvedCrisisCount))
        : initialState.resolvedCrisisCount,
    showOnboarding:
      typeof state.showOnboarding === 'boolean' ? state.showOnboarding : initialState.showOnboarding,
    showSeasonSummary:
      typeof state.showSeasonSummary === 'boolean'
        ? state.showSeasonSummary
        : initialState.showSeasonSummary,
    crisis: {
      level: isCrisisLevel(state.crisis?.level) ? state.crisis.level : initialState.crisis.level,
      causes: isCrisisCauseArray(state.crisis?.causes)
        ? [...new Set(state.crisis.causes)]
        : initialState.crisis.causes,
      startedAtTurn:
        isIntegerAtLeastZero(state.crisis?.startedAtTurn)
          ? state.crisis.startedAtTurn
          : initialState.crisis.startedAtTurn,
      lastEscalationTurn:
        isIntegerAtLeastZero(state.crisis?.lastEscalationTurn)
          ? state.crisis.lastEscalationTurn
          : initialState.crisis.lastEscalationTurn,
      recoveryProgress: normalizeRecoveryProgress(state.crisis?.recoveryProgress),
    },
  };
}

export function normalizeLoadedGameState(state: Partial<GameState>): GameState {
  return normalizeGameState(state);
}