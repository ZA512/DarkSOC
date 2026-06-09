import type { GameState, NarrativeLogEntry } from '../model/GameState';
import type {
  InfrastructureLinkStatus,
  InfrastructureLinkView,
  InfrastructureMapView,
  InfrastructureNodeStatus,
  InfrastructureNodeView,
  InfrastructurePulseMode,
} from '../model/InfrastructureMap';
import { MANUAL_ACTION_IDS } from './manualActions';
import type { ManualActionId } from '../model/ManualAction';
import type { AttackOutcome } from '../model/Attack';
import type { Employee } from '../model/Employee';
import { createEmptyEffectiveStats, type EffectiveStats, type Technology } from '../model/Technology';
import { RESOURCE_IDS, type ResourceId, type Resources } from '../model/Resource';
import type { EmployeeTask } from './employeeTasks';
import { getEmployeeTaskDefinition, EMPLOYEE_TASKS } from './employeeTasks';
import { getEmployeeProductivityMultiplier, getEmployeeTaskStatsContribution, getEmployeeStatus } from './employees';
import {
  canAffordTechnologyCost,
  getTechnologyDefinition,
  getTechnologyMissingResourceCost,
  sumTechnologyStats,
  TECHNOLOGIES,
} from './technologies';

export type VisibleResource = {
  id: ResourceId;
  value: number;
};

export type ThreatEventSummary = {
  kind: 'warning' | 'attack';
  attackId: string;
  messageKey: string;
  outcome?: AttackOutcome;
};

export type ActiveIncidentSummary = {
  attackId: string;
  count: number;
};

function canEmployeeUseTask(state: GameState, employee: Employee, task: EmployeeTask): boolean {
  if (!employee.unlocked || getEmployeeStatus(employee) === 'exhausted') {
    return false;
  }

  if (!task.compatibleRoles.includes(employee.role)) {
    return false;
  }

  return (task.requiresTechnologyIds ?? []).every((technologyId) => state.unlockedTechnologyIds.includes(technologyId));
}

const MAX_VISIBLE_INFRASTRUCTURE_NODES = 40;

const INFRASTRUCTURE_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 50 },
  { x: 40, y: 46 },
  { x: 61, y: 44 },
  { x: 46, y: 63 },
  { x: 58, y: 66 },
  { x: 32, y: 33 },
  { x: 68, y: 31 },
  { x: 29, y: 69 },
  { x: 71, y: 72 },
  { x: 22, y: 48 },
  { x: 78, y: 47 },
  { x: 43, y: 26 },
  { x: 56, y: 24 },
  { x: 39, y: 79 },
  { x: 63, y: 80 },
  { x: 18, y: 26 },
  { x: 82, y: 28 },
  { x: 18, y: 76 },
  { x: 81, y: 77 },
  { x: 26, y: 57 },
  { x: 73, y: 58 },
  { x: 48, y: 14 },
  { x: 53, y: 86 },
  { x: 13, y: 51 },
  { x: 87, y: 51 },
  { x: 24, y: 18 },
  { x: 76, y: 18 },
  { x: 24, y: 84 },
  { x: 76, y: 84 },
  { x: 35, y: 11 },
  { x: 65, y: 12 },
  { x: 12, y: 35 },
  { x: 88, y: 35 },
  { x: 14, y: 66 },
  { x: 86, y: 67 },
  { x: 35, y: 90 },
  { x: 66, y: 90 },
  { x: 9, y: 21 },
  { x: 91, y: 22 },
  { x: 50, y: 95 },
];

const INFRASTRUCTURE_LABEL_KEYS = [
  'assets.unknown_server_1.name',
  'infrastructure.node.directory',
  'infrastructure.node.gateway',
  'infrastructure.node.backup',
  'infrastructure.node.cloud',
  'infrastructure.node.endpoints',
  'infrastructure.node.monitoring',
  'infrastructure.node.production',
  'infrastructure.node.remote_access',
  'infrastructure.node.saas',
];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashString(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getNodeLabelKey(index: number): string {
  if (index === 0) {
    return INFRASTRUCTURE_LABEL_KEYS[0];
  }

  return INFRASTRUCTURE_LABEL_KEYS[1 + ((index - 1) % (INFRASTRUCTURE_LABEL_KEYS.length - 1))];
}

function getIncidentNodeCount(state: GameState, totalNodes: number): number {
  const maybeIncidentIds = (state as GameState & { activeIncidentIds?: string[] }).activeIncidentIds;

  if (!Array.isArray(maybeIncidentIds) || maybeIncidentIds.length === 0) {
    return 0;
  }

  return clamp(Math.min(3, Math.max(1, maybeIncidentIds.length)), 0, Math.max(0, totalNodes - 1));
}

function getDebtNodeCount(totalNodes: number, knownDebt: number): number {
  if (totalNodes <= 1) {
    return 0;
  }

  return clamp(Math.floor(totalNodes * (knownDebt / (knownDebt + 100))), 0, totalNodes - 1);
}

function getStableNodeCount(
  totalNodes: number,
  stabilityScore: number,
  debtNodeCount: number,
  incidentNodeCount: number,
): number {
  if (stabilityScore < 20 || totalNodes <= 1) {
    return 0;
  }

  const availableSlots = Math.max(0, totalNodes - 1 - debtNodeCount - incidentNodeCount);

  return clamp(Math.floor((availableSlots * Math.min(stabilityScore, 100)) / 100), 0, availableSlots);
}

function getInfrastructureNodeCriticality(state: GameState, index: number): number {
  return 1 + (hashString(`${state.randomSeed}|criticality|${index}`) % 5);
}

export function getVisibleInfrastructureNodeCount(state: GameState): number {
  const visibleNodes =
    1 +
    Math.floor(state.resources.visibility / 5) +
    Math.floor(state.resources.exposure / 25);

  return clamp(visibleNodes, 1, MAX_VISIBLE_INFRASTRUCTURE_NODES);
}

export function getInfrastructureNodeStatus(
  state: GameState,
  index: number,
  totalNodes: number,
): InfrastructureNodeStatus {
  if (index === 0) {
    return state.resources.visibility >= 20 ? 'critical' : 'known';
  }

  const incidentNodeCount = getIncidentNodeCount(state, totalNodes);
  const debtNodeCount = getDebtNodeCount(totalNodes, state.resources.knownDebt);
  const stabilityScore =
    state.resources.resilience +
    state.resources.visibility * 0.3 -
    state.resources.fatigue * 0.2 -
    state.resources.alertNoise * 0.2;
  const stableNodeCount = getStableNodeCount(totalNodes, stabilityScore, debtNodeCount, incidentNodeCount);

  if (incidentNodeCount > 0 && index <= incidentNodeCount) {
    return 'incident';
  }

  if (debtNodeCount > 0 && index >= totalNodes - debtNodeCount) {
    return 'debt';
  }

  if (stableNodeCount > 0 && index > incidentNodeCount && index <= incidentNodeCount + stableNodeCount) {
    return 'stable';
  }

  return 'known';
}

export function getInfrastructurePulseMode(status: InfrastructureNodeStatus): InfrastructurePulseMode {
  switch (status) {
    case 'known':
    case 'critical':
      return 'soft';

    case 'debt':
      return 'unstable';

    case 'incident':
      return 'alert';

    case 'stable':
    case 'unknown':
      return 'none';
  }
}

function getInfrastructureLinkStatus(
  sourceNode: InfrastructureNodeView,
  targetNode: InfrastructureNodeView,
): InfrastructureLinkStatus {
  if (sourceNode.status === 'incident' || targetNode.status === 'incident') {
    return 'critical';
  }

  if (sourceNode.status === 'debt' || targetNode.status === 'debt') {
    return 'weak';
  }

  return 'known';
}

export function getInfrastructureLinks(nodes: InfrastructureNodeView[]): InfrastructureLinkView[] {
  if (nodes.length < 2) {
    return [];
  }

  const pairIds = new Set<string>();
  const pairs: Array<[number, number]> = [];

  function addPair(sourceIndex: number, targetIndex: number): void {
    if (sourceIndex >= nodes.length || targetIndex >= nodes.length || sourceIndex === targetIndex) {
      return;
    }

    const pair = sourceIndex < targetIndex ? [sourceIndex, targetIndex] : [targetIndex, sourceIndex];
    const pairId = `${pair[0]}:${pair[1]}`;

    if (pairIds.has(pairId)) {
      return;
    }

    pairIds.add(pairId);
    pairs.push([pair[0], pair[1]]);
  }

  addPair(0, 1);

  if (nodes.length >= 3) {
    addPair(0, 2);
  }

  for (let index = 1; index < nodes.length - 1; index += 2) {
    addPair(index, index + 1);
  }

  for (let index = 2; index < nodes.length - 2; index += 4) {
    addPair(index, index + 2);
  }

  return pairs.map(([sourceIndex, targetIndex]) => {
    const sourceNode = nodes[sourceIndex];
    const targetNode = nodes[targetIndex];

    return {
      id: `${sourceNode.id}_${targetNode.id}`,
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      status: getInfrastructureLinkStatus(sourceNode, targetNode),
    };
  });
}

export function getInfrastructureMapView(state: GameState): InfrastructureMapView {
  const totalNodes = getVisibleInfrastructureNodeCount(state);
  const nodes = INFRASTRUCTURE_POSITIONS.slice(0, totalNodes).map((position, index) => {
    const status = getInfrastructureNodeStatus(state, index, totalNodes);
    const criticality = getInfrastructureNodeCriticality(state, index);

    return {
      id: `infrastructure_node_${index + 1}`,
      labelKey: getNodeLabelKey(index),
      x: position.x,
      y: position.y,
      radius: clamp(2 + criticality * 0.18 + (status === 'critical' ? 0.25 : 0), 2.1, 3.3),
      status,
      pulseMode: getInfrastructurePulseMode(status),
      criticality,
    } satisfies InfrastructureNodeView;
  });

  return {
    nodes,
    links: getInfrastructureLinks(nodes),
  };
}

export function selectVisibleResources(resources: Resources): VisibleResource[] {
  return RESOURCE_IDS.map((resourceId) => ({
    id: resourceId,
    value: resources[resourceId],
  }));
}

export function selectNarrativeEntries(state: GameState): NarrativeLogEntry[] {
  return state.narrativeLog;
}

export function getAvailableManualActions(state: GameState): ManualActionId[] {
  return MANUAL_ACTION_IDS.filter((actionId) => {
    switch (actionId) {
      case 'collect_logs':
        return true;

      case 'analyze_alert':
        return state.resources.logs >= 10;

      case 'manual_audit':
        return state.resources.logs >= 30 || state.resources.findings >= 5;

      case 'write_comex_report':
        return state.resources.findings >= 20 && state.resources.proofs >= 20;
    }
  });
}

export function getTechnologyById(id: string): Technology | undefined {
  return getTechnologyDefinition(id);
}

export function getUnlockedTechnologies(state: GameState): Technology[] {
  return state.unlockedTechnologyIds
    .map((technologyId) => getTechnologyDefinition(technologyId))
    .filter((technology): technology is Technology => technology !== undefined);
}

export function getTechnologyMissingRequirements(state: GameState, technologyId: string): string[] {
  const technology = getTechnologyDefinition(technologyId);

  if (!technology) {
    return [];
  }

  return technology.requires.filter(
    (requiredTechnologyId) => !state.unlockedTechnologyIds.includes(requiredTechnologyId),
  );
}

export function getTechnologyMissingResources(
  state: GameState,
  technologyId: string,
): Partial<Record<ResourceId, number>> {
  const technology = getTechnologyDefinition(technologyId);

  if (!technology) {
    return {};
  }

  return getTechnologyMissingResourceCost(state.resources, technology);
}

export function getAvailableTechnologies(state: GameState): Technology[] {
  return state.availableTechnologyIds
    .filter((technologyId) => !state.unlockedTechnologyIds.includes(technologyId))
    .map((technologyId) => getTechnologyDefinition(technologyId))
    .filter((technology): technology is Technology => technology !== undefined)
    .filter((technology) => getTechnologyMissingRequirements(state, technology.id).length === 0);
}

export function getLockedTechnologies(state: GameState): Technology[] {
  return TECHNOLOGIES.filter((technology) => {
    if (state.unlockedTechnologyIds.includes(technology.id)) {
      return false;
    }

    if (!state.availableTechnologyIds.includes(technology.id)) {
      return true;
    }

    return getTechnologyMissingRequirements(state, technology.id).length > 0;
  });
}

export function canBuyTechnology(state: GameState, technologyId: string): boolean {
  const technology = getTechnologyDefinition(technologyId);

  if (!technology) {
    return false;
  }

  if (state.unlockedTechnologyIds.includes(technologyId)) {
    return false;
  }

  if (!state.availableTechnologyIds.includes(technologyId)) {
    return false;
  }

  if (getTechnologyMissingRequirements(state, technologyId).length > 0) {
    return false;
  }

  return canAffordTechnologyCost(state.resources, technology);
}

export function getEffectiveStats(state: GameState): EffectiveStats {
  const stats = state.unlockedTechnologyIds.length === 0
    ? createEmptyEffectiveStats()
    : sumTechnologyStats(state.unlockedTechnologyIds);

  for (const employee of state.employees) {
    const contribution = getEmployeeTaskStatsContribution(state, employee);

    for (const statId of Object.keys(stats) as Array<keyof EffectiveStats>) {
      stats[statId] += contribution[statId] ?? 0;
    }
  }

  return stats;
}

export function getUnlockedEmployees(state: GameState): Employee[] {
  return state.employees.filter((employee) => employee.unlocked);
}

export function getLockedEmployees(state: GameState): Employee[] {
  return state.employees.filter((employee) => !employee.unlocked);
}

export function getEmployeeById(state: GameState, employeeId: string): Employee | undefined {
  return state.employees.find((employee) => employee.id === employeeId);
}

export function getAvailableTasksForEmployee(state: GameState, employeeId: string): EmployeeTask[] {
  const employee = getEmployeeById(state, employeeId);

  if (!employee) {
    return [];
  }

  return EMPLOYEE_TASKS.filter(
    (task) =>
      task.compatibleRoles.includes(employee.role) &&
      (task.requiresTechnologyIds ?? []).every((technologyId) => state.unlockedTechnologyIds.includes(technologyId)),
  );
}

export function canAssignEmployeeTask(state: GameState, employeeId: string, taskId: string): boolean {
  const employee = getEmployeeById(state, employeeId);
  const task = getEmployeeTaskDefinition(taskId);

  if (!employee || !task) {
    return false;
  }

  return canEmployeeUseTask(state, employee, task);
}

export function hasEmployeeTickActivity(state: GameState): boolean {
  return state.employees.some(
    (employee) => employee.unlocked && (Boolean(employee.assignedTaskId) || employee.fatigue > 0),
  );
}

export function getActiveIncidentAttackIds(state: GameState): string[] {
  return [...new Set(state.activeIncidentIds)];
}

export function parseThreatEventMessageKey(messageKey: string): ThreatEventSummary | undefined {
  const segments = messageKey.split('.');

  if (segments.length === 3 && segments[0] === 'events' && segments[1] === 'warning') {
    return {
      kind: 'warning',
      attackId: segments[2],
      messageKey,
    };
  }

  if (segments.length === 4 && segments[0] === 'events' && segments[1] === 'attack') {
    return {
      kind: 'attack',
      attackId: segments[2],
      outcome: segments[3] as AttackOutcome,
      messageKey,
    };
  }

  return undefined;
}

export function getLastThreatEventMessageKey(state: GameState): string | undefined {
  return [...state.narrativeLog]
    .reverse()
    .find(
      (entry) => entry.messageKey.startsWith('events.attack.') || entry.messageKey.startsWith('events.warning.'),
    )?.messageKey;
}

export function getLastThreatEvent(state: GameState): ThreatEventSummary | undefined {
  const messageKey = getLastThreatEventMessageKey(state);

  return messageKey ? parseThreatEventMessageKey(messageKey) : undefined;
}

export function getActiveIncidentSummaries(state: GameState): ActiveIncidentSummary[] {
  const counts = new Map<string, number>();

  for (const attackId of state.activeIncidentIds) {
    counts.set(attackId, (counts.get(attackId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([attackId, count]) => ({
      attackId,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.attackId.localeCompare(right.attackId));
}
