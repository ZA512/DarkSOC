import type { GameState } from '../game/model/GameState';
import { CURRENT_SAVE_VERSION, migrateSavePayload } from './migrations';
import { computeChecksum, decodePayload, encodePayload, verifyChecksum } from './saveCodec';
import type { ImportResult, SaveGameEnvelope, SavePayloadV1 } from './saveTypes';
import {
  normalizeGameState,
  normalizeLoadedGameState,
  validateGameState,
  validateLoadedGameState,
} from './validation';

const DEFAULT_GAME_VERSION = '0.1.0';
const DEFAULT_SLOT_NAME = 'Partie principale';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function getDownloadFileName(date: Date): string {
  return `dark-soc-save-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}.json`;
}

export async function createSaveEnvelope(
  state: GameState,
  options?: {
    slotName?: string;
    gameVersion?: string;
  },
): Promise<SaveGameEnvelope> {
  const now = new Date().toISOString();
  const normalizedState = normalizeGameState({
    ...state,
    createdAt: state.createdAt ?? now,
    updatedAt: now,
    modified: state.modified === true,
  });
  const payload: SavePayloadV1 = {
    state: normalizedState,
  };
  const envelopeWithoutChecksum: Omit<SaveGameEnvelope, 'checksum'> = {
    format: 'dark-soc-save',
    saveVersion: CURRENT_SAVE_VERSION,
    gameVersion: options?.gameVersion ?? DEFAULT_GAME_VERSION,
    createdAt: normalizedState.createdAt ?? now,
    updatedAt: now,
    slotName: options?.slotName ?? DEFAULT_SLOT_NAME,
    payloadEncoding: 'base64',
    payload: encodePayload(payload),
    modified: normalizedState.modified === true,
  };

  return {
    ...envelopeWithoutChecksum,
    checksum: await computeChecksum(envelopeWithoutChecksum),
  };
}

export async function importSaveEnvelope(raw: string): Promise<ImportResult> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      reason: 'invalid_json',
    };
  }

  if (!isRecord(parsed) || parsed.format !== 'dark-soc-save') {
    return {
      ok: false,
      reason: 'invalid_format',
    };
  }

  if (!Number.isInteger(parsed.saveVersion)) {
    return {
      ok: false,
      reason: 'invalid_format',
      errors: ['saveVersion must be an integer.'],
    };
  }

  if ((parsed.saveVersion as number) > CURRENT_SAVE_VERSION) {
    return {
      ok: false,
      reason: 'unsupported_version',
    };
  }

  if (parsed.payloadEncoding !== 'base64') {
    return {
      ok: false,
      reason: 'invalid_encoding',
    };
  }

  const envelope = parsed as SaveGameEnvelope;
  let checksumValid = true;

  try {
    checksumValid = await verifyChecksum(envelope);
  } catch {
    checksumValid = false;
  }

  let decodedPayload: SavePayloadV1;

  try {
    decodedPayload = decodePayload(envelope.payload);
  } catch {
    return {
      ok: false,
      reason: 'invalid_payload',
    };
  }

  const migrationResult = migrateSavePayload(decodedPayload, envelope.saveVersion);

  if (!migrationResult.ok) {
    return {
      ok: false,
      reason: migrationResult.reason,
      errors: migrationResult.errors,
    };
  }

  const loadValidationResult = validateLoadedGameState(migrationResult.payload.state);

  if (!loadValidationResult.ok) {
    return {
      ok: false,
      reason: 'invalid_state',
      errors: loadValidationResult.errors,
    };
  }

  const normalizedState = normalizeLoadedGameState({
    ...loadValidationResult.value,
    createdAt: loadValidationResult.value.createdAt ?? envelope.createdAt,
    updatedAt: loadValidationResult.value.updatedAt ?? envelope.updatedAt,
    modified: loadValidationResult.value.modified === true || envelope.modified === true,
  });
  const normalizedValidationResult = validateGameState(normalizedState);

  if (!normalizedValidationResult.ok) {
    return {
      ok: false,
      reason: 'invalid_state',
      errors: normalizedValidationResult.errors,
    };
  }

  const warnings = [
    ...(loadValidationResult.warnings ?? []),
    ...(normalizedValidationResult.warnings ?? []),
  ];

  if (!checksumValid) {
    warnings.push('invalid_checksum');

    return {
      ok: true,
      modified: true,
      state: {
        ...normalizedState,
        modified: true,
      },
      warnings,
    };
  }

  return {
    ok: true,
    modified: normalizedState.modified === true,
    state: normalizedState,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export async function downloadSaveFile(state: GameState): Promise<void> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Download API unavailable.');
  }

  const envelope = await createSaveEnvelope(state);
  const now = new Date();
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = getDownloadFileName(now);
  anchor.click();

  URL.revokeObjectURL(objectUrl);
}