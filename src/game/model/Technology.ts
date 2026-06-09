import type { ResourceId } from './Resource';

export type TechnologyCategory =
  | 'detection'
  | 'governance'
  | 'identity'
  | 'resilience'
  | 'risk_reduction'
  | 'appsec'
  | 'cloud'
  | 'third_party';

export type TechnologyStatId =
  | 'logsPerTick'
  | 'findingsPerTick'
  | 'proofsPerTick'
  | 'budgetPerTick'
  | 'detection'
  | 'incidentResponse'
  | 'phishingDefense'
  | 'governance'
  | 'patching'
  | 'identitySecurity'
  | 'appsec'
  | 'cloudSecurity'
  | 'thirdPartyManagement'
  | 'mfa'
  | 'edr'
  | 'backup'
  | 'segmentation'
  | 'waf';

export type TechnologyEffectId = ResourceId | TechnologyStatId;

export type Technology = {
  id: string;
  category: TechnologyCategory;
  cost: Partial<Record<ResourceId, number>>;
  requires: string[];
  effects: Partial<Record<TechnologyEffectId, number>>;
  unlocks?: string[];
  repeatable?: boolean;
};

export type EffectiveStats = Record<TechnologyStatId, number>;

export const TECHNOLOGY_STAT_IDS: TechnologyStatId[] = [
  'logsPerTick',
  'findingsPerTick',
  'proofsPerTick',
  'budgetPerTick',
  'detection',
  'incidentResponse',
  'phishingDefense',
  'governance',
  'patching',
  'identitySecurity',
  'appsec',
  'cloudSecurity',
  'thirdPartyManagement',
  'mfa',
  'edr',
  'backup',
  'segmentation',
  'waf',
];

export function createEmptyEffectiveStats(): EffectiveStats {
  return {
    logsPerTick: 0,
    findingsPerTick: 0,
    proofsPerTick: 0,
    budgetPerTick: 0,
    detection: 0,
    incidentResponse: 0,
    phishingDefense: 0,
    governance: 0,
    patching: 0,
    identitySecurity: 0,
    appsec: 0,
    cloudSecurity: 0,
    thirdPartyManagement: 0,
    mfa: 0,
    edr: 0,
    backup: 0,
    segmentation: 0,
    waf: 0,
  };
}