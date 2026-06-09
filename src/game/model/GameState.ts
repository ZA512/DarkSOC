import { normalizeResources, type Resources } from './Resource';
import type { RunningAction } from './ManualAction';
import type { GameSettings } from './Settings';
import { createInitialEmployees, type Employee } from './Employee';

export type AssetStatus = 'unknown' | 'known' | 'stable' | 'debt' | 'incident' | 'critical';

export type InfrastructureAsset = {
  id: string;
  labelKey: string;
  x: number;
  y: number;
  status: AssetStatus;
  criticality: number;
  discovered: boolean;
  connections: string[];
};

export type NarrativeLogEntry = {
  id: string;
  messageKey: string;
};

export type GameState = {
  turn: number;
  randomSeed: string;
  createdAt?: string;
  updatedAt?: string;
  resources: Resources;
  unlockedTechnologyIds: string[];
  availableTechnologyIds: string[];
  employees: Employee[];
  assets: InfrastructureAsset[];
  activeIncidentIds: string[];
  resolvedIncidentIds: string[];
  lastAttackTurn?: number;
  pendingWarningAttackId?: string;
  incidentUntilTurn?: number;
  narrativeLog: NarrativeLogEntry[];
  flags: Record<string, boolean>;
  settings: GameSettings;
  businessStageId: string;
  modified?: boolean;
  runningAction?: RunningAction;
};

export function createInitialGameState(seed = 'dark-soc-seed-1'): GameState {
  const now = new Date().toISOString();

  return {
    turn: 0,
    randomSeed: seed,
    createdAt: now,
    updatedAt: now,
    resources: normalizeResources({
      logs: 0,
      findings: 0,
      proofs: 0,
      budget: 0,
      trust: 10,
      visibility: 1,
      knownDebt: 0,
      unknownDebt: 80,
      fatigue: 0,
      exposure: 10,
      resilience: 0,
      alertNoise: 0,
    }),
    unlockedTechnologyIds: [],
    availableTechnologyIds: [
      'asset_register',
      'incident_procedure_v0',
      'phishing_awareness_v0',
    ],
    employees: createInitialEmployees(),
    assets: [
      {
        id: 'unknown_server_1',
        labelKey: 'assets.unknown_server_1.name',
        x: 50,
        y: 50,
        status: 'known',
        criticality: 1,
        discovered: true,
        connections: [],
      },
    ],
    activeIncidentIds: [],
    resolvedIncidentIds: [],
    lastAttackTurn: undefined,
    pendingWarningAttackId: undefined,
    incidentUntilTurn: undefined,
    narrativeLog: [
      {
        id: 'intro_dark_room',
        messageKey: 'events.intro.dark_room',
      },
    ],
    flags: {},
    settings: {
      locale: 'fr',
      animationMode: 'normal',
      contrastMode: 'normal',
    },
    businessStageId: 'small_company',
    modified: false,
    runningAction: undefined,
  };
}
