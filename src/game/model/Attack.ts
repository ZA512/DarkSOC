import type { ResourceId } from './Resource';

export type AttackFamily =
  | 'phishing'
  | 'ransomware'
  | 'web'
  | 'cloud'
  | 'third_party'
  | 'audit';

export type AttackOutcome = 'blocked' | 'partial' | 'major';

export type AttackImpact = Partial<Record<ResourceId, number>>;

export type Attack = {
  id: string;
  family: AttackFamily;
  basePower: number;
  scaling: {
    exposure?: number;
    knownDebt?: number;
    unknownDebt?: number;
    businessSize?: number;
    alertNoise?: number;
    fatigue?: number;
  };
  relevantDefenses: string[];
  impacts: {
    blocked: AttackImpact;
    partial: AttackImpact;
    major: AttackImpact;
  };
};