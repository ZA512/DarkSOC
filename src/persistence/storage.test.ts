import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/model/GameState';
import { clearLocalSave, hasLocalSave, loadLocalSave, LOCAL_SAVE_STORAGE_KEY, writeLocalSave } from './storage';

type StorageMap = Map<string, string>;

function createMockLocalStorage() {
  const storage = new Map() as StorageMap;

  return {
    clear(): void {
      storage.clear();
    },
    getItem(key: string): string | null {
      return storage.has(key) ? storage.get(key) ?? null : null;
    },
    key(index: number): string | null {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      storage.delete(key);
    },
    setItem(key: string, value: string): void {
      storage.set(key, value);
    },
    get length(): number {
      return storage.size;
    },
  } satisfies Storage;
}

describe('local storage save helpers', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMockLocalStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    clearLocalSave();
  });

  it('writes, detects, loads and clears the local save', async () => {
    const state = createInitialGameState();

    expect(hasLocalSave()).toBe(false);

    await writeLocalSave(state);

    expect(hasLocalSave()).toBe(true);
    expect(globalThis.localStorage.getItem(LOCAL_SAVE_STORAGE_KEY)).not.toBeNull();

    const result = await loadLocalSave();

    expect(result?.ok).toBe(true);

    clearLocalSave();

    expect(hasLocalSave()).toBe(false);
  });
});