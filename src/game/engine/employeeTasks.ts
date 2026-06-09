import employeeTasksData from '../../data/gameplay/employeeTasks.json';
import { RESOURCE_IDS, type ResourceId } from '../model/Resource';
import {
  TECHNOLOGY_STAT_IDS,
  createEmptyEffectiveStats,
  type EffectiveStats,
  type TechnologyStatId,
} from '../model/Technology';
import type { EmployeeRole } from '../model/Employee';

export type EmployeeTaskEffectId = ResourceId | TechnologyStatId;

export type EmployeeTask = {
  id: string;
  compatibleRoles: EmployeeRole[];
  nameKey: string;
  descriptionKey: string;
  effectsPerTick: Partial<Record<EmployeeTaskEffectId, number>>;
  fatiguePerTick: number;
  requiresTechnologyIds?: string[];
};

export const EMPLOYEE_TASKS = employeeTasksData as EmployeeTask[];

const employeeTasksById = new Map(EMPLOYEE_TASKS.map((task) => [task.id, task]));
const resourceIdSet = new Set<ResourceId>(RESOURCE_IDS);
const technologyStatIdSet = new Set<TechnologyStatId>(TECHNOLOGY_STAT_IDS);

function isResourceId(value: string): value is ResourceId {
  return resourceIdSet.has(value as ResourceId);
}

function isTechnologyStatId(value: string): value is TechnologyStatId {
  return technologyStatIdSet.has(value as TechnologyStatId);
}

export function getEmployeeTaskDefinition(id: string): EmployeeTask | undefined {
  return employeeTasksById.get(id);
}

export function getEmployeeTaskResourceEffects(
  task: EmployeeTask,
): Partial<Record<ResourceId, number>> {
  const effects: Partial<Record<ResourceId, number>> = {};

  for (const [effectId, amount] of Object.entries(task.effectsPerTick)) {
    if (isResourceId(effectId)) {
      effects[effectId] = amount;
    }
  }

  return effects;
}

export function getEmployeeTaskStatEffects(task: EmployeeTask): Partial<EffectiveStats> {
  const effects = createEmptyEffectiveStats();

  for (const [effectId, amount] of Object.entries(task.effectsPerTick)) {
    if (isTechnologyStatId(effectId)) {
      effects[effectId] = amount;
    }
  }

  return effects;
}