import type { GameState } from '../game/model/GameState';
import { createSaveEnvelope, importSaveEnvelope } from './exportImport';
import type { ImportResult } from './saveTypes';
import { normalizeGameState, validateGameState } from './validation';

export const LOCAL_SAVE_STORAGE_KEY = 'dark-soc-save-main';

function getStorage(): Storage | undefined {
  try {
    return typeof globalThis.localStorage === 'undefined' ? undefined : globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export async function writeLocalSave(state: GameState): Promise<void> {
  const validationResult = validateGameState(state);
  const storage = getStorage();

  if (!validationResult.ok) {
    throw new Error(validationResult.errors.join('\n'));
  }

  if (!storage) {
    return;
  }

  const envelope = await createSaveEnvelope(normalizeGameState(validationResult.value));

  storage.setItem(LOCAL_SAVE_STORAGE_KEY, JSON.stringify(envelope));
}

export async function loadLocalSave(): Promise<ImportResult | null> {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const rawSave = storage.getItem(LOCAL_SAVE_STORAGE_KEY);

  if (rawSave === null) {
    return null;
  }

  return importSaveEnvelope(rawSave);
}

export function clearLocalSave(): void {
  getStorage()?.removeItem(LOCAL_SAVE_STORAGE_KEY);
}

export function hasLocalSave(): boolean {
  const storage = getStorage();

  return storage?.getItem(LOCAL_SAVE_STORAGE_KEY) !== null;
}