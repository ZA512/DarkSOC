import technologiesData from '../../data/gameplay/technologies.json';
import {
  createEmptyEffectiveStats,
  TECHNOLOGY_STAT_IDS,
  type EffectiveStats,
  type Technology,
  type TechnologyStatId,
} from '../model/Technology';
import { RESOURCE_IDS, type ResourceId, type Resources } from '../model/Resource';

export type ResourceDelta = Partial<Record<ResourceId, number>>;

const RESOURCE_ID_SET = new Set<ResourceId>(RESOURCE_IDS);
const TECHNOLOGY_STAT_ID_SET = new Set<TechnologyStatId>(TECHNOLOGY_STAT_IDS);

export const TECHNOLOGIES: Technology[] = technologiesData as Technology[];

const technologiesById = new Map(TECHNOLOGIES.map((technology) => [technology.id, technology]));

function isResourceId(value: string): value is ResourceId {
  return RESOURCE_ID_SET.has(value as ResourceId);
}

function isTechnologyStatId(value: string): value is TechnologyStatId {
  return TECHNOLOGY_STAT_ID_SET.has(value as TechnologyStatId);
}

export function getTechnologyDefinition(id: string): Technology | undefined {
  return technologiesById.get(id);
}

export function getTechnologyMissingResourceCost(
  resources: Resources,
  technology: Technology,
): ResourceDelta {
  const missing: ResourceDelta = {};

  for (const [resourceId, amount] of Object.entries(technology.cost) as [ResourceId, number][]) {
    if (resources[resourceId] < amount) {
      missing[resourceId] = amount - resources[resourceId];
    }
  }

  return missing;
}

export function canAffordTechnologyCost(resources: Resources, technology: Technology): boolean {
  return Object.keys(getTechnologyMissingResourceCost(resources, technology)).length === 0;
}

export function getTechnologyResourceEffects(technology: Technology): ResourceDelta {
  const resourceEffects: ResourceDelta = {};

  for (const [effectId, amount] of Object.entries(technology.effects)) {
    if (isResourceId(effectId)) {
      resourceEffects[effectId] = amount;
    }
  }

  return resourceEffects;
}

export function getTechnologyPurchaseDelta(technology: Technology): ResourceDelta {
  const delta = getTechnologyResourceEffects(technology);

  for (const [resourceId, amount] of Object.entries(technology.cost) as [ResourceId, number][]) {
    delta[resourceId] = (delta[resourceId] ?? 0) - amount;
  }

  return delta;
}

export function getTechnologyStatsContribution(technology: Technology): Partial<EffectiveStats> {
  const contribution: Partial<EffectiveStats> = {};

  for (const [effectId, amount] of Object.entries(technology.effects)) {
    if (isTechnologyStatId(effectId)) {
      contribution[effectId] = amount;
    }
  }

  return contribution;
}

export function sumTechnologyStats(technologyIds: string[]): EffectiveStats {
  const stats = createEmptyEffectiveStats();

  for (const technologyId of technologyIds) {
    const technology = getTechnologyDefinition(technologyId);

    if (!technology) {
      continue;
    }

    const contribution = getTechnologyStatsContribution(technology);

    for (const statId of TECHNOLOGY_STAT_IDS) {
      stats[statId] += contribution[statId] ?? 0;
    }
  }

  return stats;
}

export function getPassiveResourceDelta(stats: EffectiveStats, deltaMs: number): ResourceDelta {
  const factor = deltaMs / 1000;
  const delta: ResourceDelta = {};

  if (stats.logsPerTick !== 0) {
    delta.logs = stats.logsPerTick * factor;
  }

  if (stats.findingsPerTick !== 0) {
    delta.findings = stats.findingsPerTick * factor;
  }

  if (stats.proofsPerTick !== 0) {
    delta.proofs = stats.proofsPerTick * factor;
  }

  if (stats.budgetPerTick !== 0) {
    delta.budget = stats.budgetPerTick * factor;
  }

  return delta;
}