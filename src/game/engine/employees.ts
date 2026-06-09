import type { GameState } from '../model/GameState';
import {
  createInitialEmployees,
  normalizeEmployeeFatigue,
  type Employee,
  type EmployeeStatus,
} from '../model/Employee';
import { applyResourceDelta, type ResourceId } from '../model/Resource';
import { TECHNOLOGY_STAT_IDS, type EffectiveStats } from '../model/Technology';
import {
  getEmployeeTaskDefinition,
  getEmployeeTaskResourceEffects,
  getEmployeeTaskStatEffects,
  type EmployeeTask,
} from './employeeTasks';

const EMPLOYEE_REST_RECOVERY_PER_TICK = 0.2;

type EmployeeUnlockRule = {
  employeeId: string;
  flag: string;
  messageKey: string;
  isUnlocked: (state: GameState) => boolean;
};

const EMPLOYEE_UNLOCK_RULES: EmployeeUnlockRule[] = [
  {
    employeeId: 'analyst_1',
    flag: 'employee_analyst_1_unlocked',
    messageKey: 'events.employee.analyst_1.unlocked',
    isUnlocked: (state) =>
      state.unlockedTechnologyIds.includes('centralized_logs') || state.resources.logs >= 300,
  },
  {
    employeeId: 'auditor_1',
    flag: 'employee_auditor_1_unlocked',
    messageKey: 'events.employee.auditor_1.unlocked',
    isUnlocked: (state) =>
      state.unlockedTechnologyIds.includes('asset_register') || state.resources.findings >= 50,
  },
  {
    employeeId: 'secops_1',
    flag: 'employee_secops_1_unlocked',
    messageKey: 'events.employee.secops_1.unlocked',
    isUnlocked: (state) =>
      state.unlockedTechnologyIds.includes('basic_vulnerability_scanner') ||
      state.resources.knownDebt >= 30,
  },
  {
    employeeId: 'governance_1',
    flag: 'employee_governance_1_unlocked',
    messageKey: 'events.employee.governance_1.unlocked',
    isUnlocked: (state) =>
      state.resources.trust >= 20 || state.flags.action_write_comex_report_used === true,
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

function hasTaskTechnologyRequirements(state: GameState, task: EmployeeTask): boolean {
  return (task.requiresTechnologyIds ?? []).every((technologyId) => state.unlockedTechnologyIds.includes(technologyId));
}

function addResourceDelta(
  left: Partial<Record<ResourceId, number>>,
  right: Partial<Record<ResourceId, number>>,
): Partial<Record<ResourceId, number>> {
  const delta: Partial<Record<ResourceId, number>> = {
    ...left,
  };

  for (const [resourceId, amount] of Object.entries(right) as Array<[ResourceId, number]>) {
    delta[resourceId] = (delta[resourceId] ?? 0) + amount;
  }

  return delta;
}

export function getEmployeeStatus(employee: Employee): EmployeeStatus {
  if (!employee.unlocked) {
    return 'locked';
  }

  if (employee.fatigue >= 90) {
    return 'exhausted';
  }

  if (employee.assignedTaskId) {
    return 'assigned';
  }

  return 'available';
}

export function getEmployeeProductivityMultiplier(employee: Employee): number {
  if (employee.fatigue >= 90) {
    return 0;
  }

  if (employee.fatigue >= 70) {
    return 0.5;
  }

  if (employee.fatigue >= 40) {
    return 0.75;
  }

  return 1;
}

export function getEmployeeTaskStatsContribution(
  state: GameState,
  employee: Employee,
): Partial<EffectiveStats> {
  if (!employee.unlocked || !employee.assignedTaskId) {
    return {};
  }

  const task = getEmployeeTaskDefinition(employee.assignedTaskId);

  if (!task || !task.compatibleRoles.includes(employee.role) || !hasTaskTechnologyRequirements(state, task)) {
    return {};
  }

  const multiplier = getEmployeeProductivityMultiplier(employee);

  if (multiplier === 0) {
    return {};
  }

  const contribution = getEmployeeTaskStatEffects(task);
  const scaledContribution: Partial<EffectiveStats> = {};

  for (const statId of TECHNOLOGY_STAT_IDS) {
    const amount = contribution[statId] ?? 0;

    if (amount !== 0) {
      scaledContribution[statId] = amount * multiplier;
    }
  }

  return scaledContribution;
}

export function applyEmployeeUnlocks(state: GameState): GameState {
  let nextState = state;

  for (const rule of EMPLOYEE_UNLOCK_RULES) {
    const employee = nextState.employees.find((candidate) => candidate.id === rule.employeeId);

    if (!employee || employee.unlocked || nextState.flags[rule.flag] || !rule.isUnlocked(nextState)) {
      continue;
    }

    nextState = {
      ...nextState,
      employees: nextState.employees.map((candidate) =>
        candidate.id === rule.employeeId
          ? {
              ...candidate,
              unlocked: true,
            }
          : candidate,
      ),
      flags: {
        ...nextState.flags,
        [rule.flag]: true,
      },
    };
    nextState = appendNarrativeEntry(nextState, rule.messageKey, rule.flag);
  }

  return nextState;
}

export function applyEmployeeTick(state: GameState, deltaMs: number): GameState {
  if (state.employees.length === 0) {
    return state;
  }

  const factor = deltaMs / 1000;
  let resourceDelta: Partial<Record<ResourceId, number>> = {};
  const employees = state.employees.map((employee) => {
    if (!employee.unlocked) {
      return {
        ...employee,
        fatigue: normalizeEmployeeFatigue(employee.fatigue),
      };
    }

    const task = employee.assignedTaskId ? getEmployeeTaskDefinition(employee.assignedTaskId) : undefined;

    if (!task || !task.compatibleRoles.includes(employee.role) || !hasTaskTechnologyRequirements(state, task)) {
      return {
        ...employee,
        fatigue: normalizeEmployeeFatigue(employee.fatigue - EMPLOYEE_REST_RECOVERY_PER_TICK * factor),
      };
    }

    const multiplier = getEmployeeProductivityMultiplier(employee);
    const directEffects = getEmployeeTaskResourceEffects(task);
    const scaledEffects: Partial<Record<ResourceId, number>> = {};

    for (const [resourceId, amount] of Object.entries(directEffects) as Array<[ResourceId, number]>) {
      scaledEffects[resourceId] = amount * factor * multiplier;
    }

    resourceDelta = addResourceDelta(resourceDelta, scaledEffects);

    return {
      ...employee,
      fatigue: normalizeEmployeeFatigue(employee.fatigue + task.fatiguePerTick * factor),
    };
  });

  return {
    ...state,
    employees,
    resources: applyResourceDelta(state.resources, resourceDelta),
  };
}

export function createEmployeeRoster(): Employee[] {
  return createInitialEmployees();
}