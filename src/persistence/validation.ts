import { createInitialGameState, type GameState } from '../game/model/GameState';
import { normalizeEmployeeRoster } from '../game/model/Employee';
import { normalizeResources, RESOURCE_IDS } from '../game/model/Resource';

export type ValidationResult<T> =
  | { ok: true; value: T; warnings?: string[] }
  | { ok: false; errors: string[] };

type UnknownRecord = Record<string, unknown>;

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

export function validateGameState(value: unknown): ValidationResult<GameState> {
  const errors: string[] = [];

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

  if (!isStringArray(value.availableTechnologyIds)) {
    errors.push('availableTechnologyIds must be an array of strings.');
  }

  if (!Array.isArray(value.employees)) {
    errors.push('employees must be an array.');
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

  if (!Array.isArray(value.assets)) {
    errors.push('assets must be an array.');
  }

  if ('activeIncidentIds' in value && !isStringArray(value.activeIncidentIds)) {
    errors.push('activeIncidentIds must be an array of strings when present.');
  }

  if ('resolvedIncidentIds' in value && !isStringArray(value.resolvedIncidentIds)) {
    errors.push('resolvedIncidentIds must be an array of strings when present.');
  }

  if (!Array.isArray(value.narrativeLog)) {
    errors.push('narrativeLog must be an array.');
  }

  if (!isRecord(value.flags)) {
    errors.push('flags must be an object.');
  }

  if (!isRecord(value.settings)) {
    errors.push('settings must exist.');
  } else {
    if (typeof value.settings.locale !== 'string') {
      errors.push('settings.locale must be a string.');
    }

    if (typeof value.settings.animationMode !== 'string') {
      errors.push('settings.animationMode must be a string.');
    }

    if (typeof value.settings.contrastMode !== 'string') {
      errors.push('settings.contrastMode must be a string.');
    }
  }

  if (
    'businessStageId' in value &&
    value.businessStageId !== undefined &&
    typeof value.businessStageId !== 'string'
  ) {
    errors.push('businessStageId must be a string when present.');
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

  if ('runningAction' in value && value.runningAction !== undefined) {
    if (!isRecord(value.runningAction)) {
      errors.push('runningAction must be an object when present.');
    } else {
      if (typeof value.runningAction.id !== 'string') {
        errors.push('runningAction.id must be a string.');
      }

      if (!isFiniteNumber(value.runningAction.startedAtTurn)) {
        errors.push('runningAction.startedAtTurn must be a finite number.');
      }

      if (!isFiniteNumber(value.runningAction.remainingMs)) {
        errors.push('runningAction.remainingMs must be a finite number.');
      }

      if (!isFiniteNumber(value.runningAction.durationMs)) {
        errors.push('runningAction.durationMs must be a finite number.');
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: value as GameState };
}

export function normalizeGameState(state: GameState): GameState {
  const initialState = createInitialGameState(state.randomSeed);

  return {
    ...initialState,
    ...state,
    turn: Math.max(0, Math.floor(state.turn)),
    resources: normalizeResources(state.resources),
    unlockedTechnologyIds: [...new Set(state.unlockedTechnologyIds)],
    availableTechnologyIds: [...new Set(state.availableTechnologyIds)],
    employees:
      state.employees.length > 0
        ? normalizeEmployeeRoster(state.employees)
        : normalizeEmployeeRoster(initialState.employees),
    assets: [...state.assets],
    activeIncidentIds: [...new Set(state.activeIncidentIds ?? [])],
    resolvedIncidentIds: [...new Set(state.resolvedIncidentIds ?? [])],
    narrativeLog: [...state.narrativeLog],
    flags: Object.fromEntries(
      Object.entries(state.flags).filter(([, flagValue]) => typeof flagValue === 'boolean'),
    ),
    settings: {
      ...initialState.settings,
      ...state.settings,
    },
    runningAction: state.runningAction ? { ...state.runningAction } : undefined,
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
      typeof state.businessStageId === 'string'
        ? state.businessStageId
        : initialState.businessStageId,
  };
}