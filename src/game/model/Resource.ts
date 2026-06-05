export type ResourceId =
  | 'logs'
  | 'findings'
  | 'proofs'
  | 'budget'
  | 'trust'
  | 'visibility'
  | 'knownDebt'
  | 'unknownDebt'
  | 'fatigue'
  | 'exposure'
  | 'resilience'
  | 'alertNoise';

export type Resources = Record<ResourceId, number>;

export const RESOURCE_IDS: ResourceId[] = [
  'logs',
  'findings',
  'proofs',
  'budget',
  'trust',
  'visibility',
  'knownDebt',
  'unknownDebt',
  'fatigue',
  'exposure',
  'resilience',
  'alertNoise',
];

const CLAMPED_RESOURCE_IDS = new Set<ResourceId>([
  'trust',
  'visibility',
  'fatigue',
  'resilience',
  'alertNoise',
]);

const NON_NEGATIVE_RESOURCE_IDS = new Set<ResourceId>([
  'logs',
  'findings',
  'proofs',
  'budget',
  'knownDebt',
  'unknownDebt',
  'exposure',
]);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeResourceValue(resourceId: ResourceId, value: number): number {
  const finiteValue = Number.isFinite(value) ? value : 0;

  if (CLAMPED_RESOURCE_IDS.has(resourceId)) {
    return clamp(finiteValue, 0, 100);
  }

  if (NON_NEGATIVE_RESOURCE_IDS.has(resourceId)) {
    return Math.max(0, finiteValue);
  }

  return finiteValue;
}

export function normalizeResources(resources: Partial<Record<ResourceId, number>>): Resources {
  const normalized = {} as Resources;

  for (const resourceId of RESOURCE_IDS) {
    normalized[resourceId] = normalizeResourceValue(resourceId, resources[resourceId] ?? 0);
  }

  return normalized;
}

export function applyResourceDelta(
  resources: Resources,
  delta: Partial<Record<ResourceId, number>>,
): Resources {
  const nextResources: Partial<Record<ResourceId, number>> = {};

  for (const resourceId of RESOURCE_IDS) {
    nextResources[resourceId] = resources[resourceId] + (delta[resourceId] ?? 0);
  }

  return normalizeResources(nextResources);
}
