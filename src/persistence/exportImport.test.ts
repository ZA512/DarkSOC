import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../game/model/GameState';
import { normalizeResources } from '../game/model/Resource';
import { computeChecksum, encodePayload } from './saveCodec';
import { createSaveEnvelope, importSaveEnvelope } from './exportImport';

describe('createSaveEnvelope', () => {
  it('creates a versioned dark-soc save envelope with base64 payload and checksum', async () => {
    const state = createInitialGameState();

    const envelope = await createSaveEnvelope(state);

    expect(envelope.format).toBe('dark-soc-save');
    expect(envelope.saveVersion).toBe(1);
    expect(envelope.payloadEncoding).toBe('base64');
    expect(envelope.payload.length).toBeGreaterThan(0);
    expect(envelope.checksum.startsWith('sha256:')).toBe(true);
  });

  it('preserves modified mode when state.modified is true', async () => {
    const state = {
      ...createInitialGameState(),
      modified: true,
    };

    const envelope = await createSaveEnvelope(state);

    expect(envelope.modified).toBe(true);
  });
});

describe('importSaveEnvelope', () => {
  it('reimports an exported save and preserves resources', async () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        logs: 42,
        findings: 11,
      }),
      employees: createInitialGameState().employees.map((employee) =>
        employee.id === 'admin_1'
          ? {
              ...employee,
              assignedTaskId: 'admin_collect_logs',
              fatigue: 12,
            }
          : employee,
      ),
    };
    const envelope = await createSaveEnvelope(state);

    const result = await importSaveEnvelope(JSON.stringify(envelope));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.modified).toBe(false);
      expect(result.state.resources.logs).toBe(42);
      expect(result.state.resources.findings).toBe(11);
      expect(result.state.employees.find((employee) => employee.id === 'admin_1')?.assignedTaskId).toBe(
        'admin_collect_logs',
      );
      expect(result.state.employees.find((employee) => employee.id === 'admin_1')?.fatigue).toBe(12);
    }
  });

  it('loads a save in modified mode when the checksum is invalid but the state is still valid', async () => {
    const state = createInitialGameState();
    const envelope = await createSaveEnvelope(state);
    const tamperedPayload = encodePayload({
      state: {
        ...state,
        resources: normalizeResources({
          ...state.resources,
          budget: 123,
        }),
      },
    });
    const tamperedEnvelope = {
      ...envelope,
      payload: tamperedPayload,
    };

    const result = await importSaveEnvelope(JSON.stringify(tamperedEnvelope));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.modified).toBe(true);
      expect(result.state.modified).toBe(true);
      expect(result.state.resources.budget).toBe(123);
    }
  });

  it('rejects malformed JSON and invalid save metadata', async () => {
    expect(await importSaveEnvelope('{')).toEqual({
      ok: false,
      reason: 'invalid_json',
    });

    expect(await importSaveEnvelope(JSON.stringify({ format: 'other-save' }))).toEqual({
      ok: false,
      reason: 'invalid_format',
    });

    const validEnvelope = await createSaveEnvelope(createInitialGameState());
    const futureVersionEnvelope = {
      ...validEnvelope,
      saveVersion: 99,
      checksum: await computeChecksum({
        ...validEnvelope,
        saveVersion: 99,
      }),
    };

    expect(await importSaveEnvelope(JSON.stringify(futureVersionEnvelope))).toEqual({
      ok: false,
      reason: 'unsupported_version',
    });

    const invalidEncodingEnvelope = {
      ...validEnvelope,
      payloadEncoding: 'json',
    };

    expect(await importSaveEnvelope(JSON.stringify(invalidEncodingEnvelope))).toEqual({
      ok: false,
      reason: 'invalid_encoding',
    });
  });

  it('rejects invalid payloads and invalid game states', async () => {
    const validEnvelope = await createSaveEnvelope(createInitialGameState());
    const invalidPayloadEnvelope = {
      ...validEnvelope,
      payload: 'not-base64',
    };

    expect(await importSaveEnvelope(JSON.stringify(invalidPayloadEnvelope))).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });

    const invalidStatePayload = encodePayload({
      state: {
        ...createInitialGameState(),
        turn: -1,
        resources: {
          logs: 0,
        },
      },
    } as never);
    const invalidStateEnvelopeWithoutChecksum = {
      ...validEnvelope,
      payload: invalidStatePayload,
    };
    const invalidStateEnvelope = {
      ...invalidStateEnvelopeWithoutChecksum,
      checksum: await computeChecksum(invalidStateEnvelopeWithoutChecksum),
    };
    const result = await importSaveEnvelope(JSON.stringify(invalidStateEnvelope));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('invalid_state');
      expect(result.errors?.length).toBeGreaterThan(0);
    }
  });
});