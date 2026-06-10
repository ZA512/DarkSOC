import type { ResourceId } from './Resource';

export const CRISIS_LEVELS = ['none', 'watch', 'active', 'severe', 'recovery'] as const;

export type CrisisLevel = (typeof CRISIS_LEVELS)[number];

export const CRISIS_CAUSES = [
  'trust_collapse',
  'team_exhaustion',
  'major_incident',
  'budget_collapse',
  'business_overexposure',
  'audit_failure',
] as const;

export type CrisisCause = (typeof CRISIS_CAUSES)[number];

export type CrisisState = {
  level: CrisisLevel;
  causes: CrisisCause[];
  startedAtTurn?: number;
  lastEscalationTurn?: number;
  recoveryProgress: number;
};

export type CrisisActionEffectId = ResourceId | 'businessMomentum' | 'recoveryProgress';

export type CrisisAction = {
  id: string;
  availableInLevels: CrisisLevel[];
  cost: Partial<Record<ResourceId, number>>;
  effects: Partial<Record<CrisisActionEffectId, number>>;
  requiresTechnologyIds?: string[];
  labelKey: string;
  descriptionKey: string;
  narrativeKey: string;
};

export const INITIAL_CRISIS_STATE: CrisisState = {
  level: 'none',
  causes: [],
  recoveryProgress: 0,
};