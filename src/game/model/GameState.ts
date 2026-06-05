import { normalizeResources, type Resources } from './Resource';
import type { GameSettings } from './Settings';

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

export type GameEmployee = {
  id: string;
  role: string;
  assignedTaskId?: string;
  fatigue: number;
  unlocked: boolean;
};

export type NarrativeLogEntry = {
  id: string;
  messageKey: string;
};

export type GameState = {
  turn: number;
  randomSeed: string;
  resources: Resources;
  unlockedTechnologyIds: string[];
  availableTechnologyIds: string[];
  employees: GameEmployee[];
  assets: InfrastructureAsset[];
  narrativeLog: NarrativeLogEntry[];
  settings: GameSettings;
};

export function createInitialGameState(seed = 'dark-soc-seed-1'): GameState {
  return {
    turn: 0,
    randomSeed: seed,
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
    availableTechnologyIds: [],
    employees: [],
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
    narrativeLog: [
      {
        id: 'intro_dark_room',
        messageKey: 'events.intro.dark_room',
      },
    ],
    settings: {
      locale: 'fr',
      animationMode: 'normal',
      contrastMode: 'normal',
    },
  };
}
