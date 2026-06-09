import type { SavePayloadV1 } from './saveTypes';

export const CURRENT_SAVE_VERSION = 1;

export type MigrationResult =
  | {
      ok: true;
      saveVersion: number;
      payload: SavePayloadV1;
      warnings?: string[];
    }
  | {
      ok: false;
      reason: 'migration_failed' | 'unsupported_version';
      errors?: string[];
    };

function isSavePayloadV1(value: unknown): value is SavePayloadV1 {
  return typeof value === 'object' && value !== null && 'state' in value;
}

export function migrateSavePayload(payload: unknown, fromVersion: number): MigrationResult {
  if (fromVersion > CURRENT_SAVE_VERSION) {
    return {
      ok: false,
      reason: 'unsupported_version',
      errors: ['Save version is newer than the current game version.'],
    };
  }

  if (fromVersion !== 1) {
    return {
      ok: false,
      reason: 'migration_failed',
      errors: ['No migration path is available for this save version.'],
    };
  }

  if (!isSavePayloadV1(payload)) {
    return {
      ok: false,
      reason: 'migration_failed',
      errors: ['Payload does not match SavePayloadV1.'],
    };
  }

  return {
    ok: true,
    saveVersion: CURRENT_SAVE_VERSION,
    payload,
  };
}