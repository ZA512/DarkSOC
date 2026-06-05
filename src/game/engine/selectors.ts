import type { GameState, NarrativeLogEntry } from '../model/GameState';
import { RESOURCE_IDS, type ResourceId, type Resources } from '../model/Resource';

export type VisibleResource = {
  id: ResourceId;
  value: number;
};

export function selectVisibleResources(resources: Resources): VisibleResource[] {
  return RESOURCE_IDS.map((resourceId) => ({
    id: resourceId,
    value: resources[resourceId],
  }));
}

export function selectNarrativeEntries(state: GameState): NarrativeLogEntry[] {
  return state.narrativeLog;
}
