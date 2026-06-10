import type { ResourceId } from './Resource';

export const OBJECTIVE_STATUSES = ['locked', 'active', 'completed'] as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export type ObjectiveCondition =
  | {
      type: 'resource_at_least';
      resourceId: ResourceId;
      value: number;
    }
  | {
      type: 'technology_unlocked';
      technologyId: string;
    }
  | {
      type: 'incident_survived';
      count: number;
    }
  | {
      type: 'employee_unlocked';
      employeeId: string;
    }
  | {
      type: 'business_stage_reached';
      businessStageId: string;
    }
  | {
      type: 'crisis_resolved';
      count: number;
    };

export type Objective = {
  id: string;
  seasonId: string;
  titleKey: string;
  descriptionKey: string;
  hintKey?: string;
  status: ObjectiveStatus;
  conditions: ObjectiveCondition[];
  reward?: Partial<Record<ResourceId, number>>;
  unlocksObjectiveIds?: string[];
};

export type ObjectiveStateMap = Record<string, ObjectiveStatus>;