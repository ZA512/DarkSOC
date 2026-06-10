import manualActionsData from '../../data/gameplay/manualActions.json';
import type { ManualActionId } from '../model/ManualAction';
import type { ResourceId, Resources } from '../model/Resource';

export type ResourceDelta = Partial<Record<ResourceId, number>>;

export type ManualActionDefinition = {
  durationMs: number;
  cost: ResourceDelta;
  effect: ResourceDelta;
  completedMessageKey: string;
};

type ManualActionJson = Record<
  ManualActionId,
  {
    durationMs: number;
    cost: ResourceDelta;
    effect: ResourceDelta;
    completedMessageKey: string;
  }
>;

export const MANUAL_ACTION_IDS: ManualActionId[] = [
  'collect_logs',
  'analyze_alert',
  'manual_audit',
  'write_comex_report',
];

export const MANUAL_ACTION_DEFINITIONS: Record<ManualActionId, ManualActionDefinition> =
  manualActionsData as ManualActionJson;

export function getManualActionDefinition(actionId: ManualActionId): ManualActionDefinition {
  return MANUAL_ACTION_DEFINITIONS[actionId];
}

export function canAffordManualAction(resources: Resources, actionId: ManualActionId): boolean {
  const { cost } = getManualActionDefinition(actionId);

  for (const [resourceId, amount] of Object.entries(cost) as [ResourceId, number][]) {
    if (resources[resourceId] < amount) {
      return false;
    }
  }

  return true;
}

export function getManualActionCostDelta(actionId: ManualActionId): ResourceDelta {
  const { cost } = getManualActionDefinition(actionId);
  const delta: ResourceDelta = {};

  for (const [resourceId, amount] of Object.entries(cost) as [ResourceId, number][]) {
    delta[resourceId] = (delta[resourceId] ?? 0) - amount;
  }

  return delta;
}

export function getManualActionEffectDelta(actionId: ManualActionId): ResourceDelta {
  const { effect } = getManualActionDefinition(actionId);
  const delta: ResourceDelta = {};

  for (const [resourceId, amount] of Object.entries(effect) as [ResourceId, number][]) {
    delta[resourceId] = (delta[resourceId] ?? 0) + amount;
  }

  return delta;
}

export function getManualActionDelta(actionId: ManualActionId): ResourceDelta {
  const delta: ResourceDelta = {
    ...getManualActionEffectDelta(actionId),
  };

  for (const [resourceId, amount] of Object.entries(getManualActionCostDelta(actionId)) as [
    ResourceId,
    number,
  ][]) {
    delta[resourceId] = (delta[resourceId] ?? 0) + amount;
  }

  return delta;
}