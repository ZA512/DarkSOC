import type { GameState } from '../game/model/GameState';

export type SaveGameEnvelope = {
  format: 'dark-soc-save';
  saveVersion: number;
  gameVersion: string;
  createdAt: string;
  updatedAt: string;
  slotName: string;
  payloadEncoding: 'base64';
  payload: string;
  checksum: string;
  modified?: boolean;
};

export type SavePayloadV1 = {
  state: GameState;
};

export type ImportErrorReason =
  | 'invalid_json'
  | 'invalid_format'
  | 'unsupported_version'
  | 'invalid_encoding'
  | 'invalid_checksum'
  | 'invalid_payload'
  | 'invalid_state'
  | 'migration_failed';

export type ImportResult =
  | {
      ok: true;
      modified: boolean;
      state: GameState;
      warnings?: string[];
    }
  | {
      ok: false;
      reason: ImportErrorReason;
      errors?: string[];
    };

export function getImportErrorMessageKey(reason: ImportErrorReason): string {
  switch (reason) {
    case 'invalid_json':
      return 'save.error.invalidJson';

    case 'invalid_format':
      return 'save.error.invalidFormat';

    case 'unsupported_version':
      return 'save.error.unsupportedVersion';

    case 'invalid_encoding':
      return 'save.error.invalidEncoding';

    case 'invalid_payload':
    case 'invalid_checksum':
      return 'save.error.invalidPayload';

    case 'invalid_state':
      return 'save.error.invalidState';

    case 'migration_failed':
      return 'save.error.migrationFailed';
  }
}