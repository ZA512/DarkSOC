import type { ResourceId } from './Resource';

export type BusinessStageId =
  | 'small_company'
  | 'visible_pme'
  | 'known_ecommerce'
  | 'international_group'
  | 'major_target';

export type BusinessStage = {
  id: BusinessStageId;
  level: number;
  nameKey: string;
  descriptionKey: string;
  baseExposure: number;
  budgetBonus: number;
  attackPressureModifier: number;
  minimumTurn: number;
  minimumTrust: number;
};

export type BusinessEventChoice = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  effects: Partial<Record<ResourceId, number>>;
  momentumDelta?: number;
};

export type BusinessEvent = {
  id: string;
  minimumStageId: BusinessStageId;
  minimumTurn: number;
  minimumTrust: number;
  triggersOnce?: boolean;
  titleKey: string;
  descriptionKey: string;
  choices: BusinessEventChoice[];
};