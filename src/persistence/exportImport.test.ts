import { describe, expect, it } from 'vitest';
import { createInitialObjectiveStatuses } from '../game/engine/objectives';
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
      unlockedTechnologyIds: ['asset_register'],
      businessStageId: 'visible_pme' as const,
      pendingBusinessEventId: 'launch_marketplace',
      businessMomentum: 14,
      currentSeasonId: 'season_1_visibility',
      completedSeasonIds: ['season_1_visibility'],
      objectives: {
        ...createInitialGameState().objectives,
        collect_first_logs: 'completed' as const,
        create_asset_register: 'active' as const,
      },
      completedObjectiveIds: ['collect_first_logs'],
      survivedIncidentCount: 1,
      resolvedCrisisCount: 2,
      showOnboarding: false,
      showSeasonSummary: true,
      settings: {
        locale: 'fr' as const,
        animationMode: 'reduced' as const,
        contrastMode: 'high' as const,
      },
      runningActions: [
        {
          id: 'collect_logs' as const,
          startedAtTurn: 3,
          remainingMs: 2400,
          durationMs: 7000,
        },
      ],
      crisis: {
        level: 'active' as const,
        causes: ['major_incident' as const],
        startedAtTurn: 20,
        lastEscalationTurn: 24,
        recoveryProgress: 45,
      },
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
      expect(result.state.unlockedTechnologyIds).toEqual(['asset_register']);
      expect(result.state.businessStageId).toBe('visible_pme');
      expect(result.state.pendingBusinessEventId).toBe('launch_marketplace');
      expect(result.state.businessMomentum).toBe(14);
      expect(result.state.currentSeasonId).toBe('season_1_visibility');
      expect(result.state.completedSeasonIds).toEqual(['season_1_visibility']);
      expect(result.state.objectives.collect_first_logs).toBe('completed');
      expect(result.state.objectives.create_asset_register).toBe('active');
      expect(result.state.completedObjectiveIds).toEqual(['collect_first_logs']);
      expect(result.state.survivedIncidentCount).toBe(1);
      expect(result.state.resolvedCrisisCount).toBe(2);
      expect(result.state.showOnboarding).toBe(false);
      expect(result.state.showSeasonSummary).toBe(true);
      expect(result.state.settings).toEqual({
        locale: 'fr',
        animationMode: 'reduced',
        contrastMode: 'high',
      });
      expect(result.state.runningActions).toEqual([
        {
          id: 'collect_logs',
          startedAtTurn: 3,
          remainingMs: 2400,
          durationMs: 7000,
        },
      ]);
      expect(result.state.crisis).toEqual({
        level: 'active',
        causes: ['major_incident'],
        startedAtTurn: 20,
        lastEscalationTurn: 24,
        recoveryProgress: 45,
      });
      expect(result.state.employees.find((employee) => employee.id === 'admin_1')?.assignedTaskId).toBe(
        'admin_collect_logs',
      );
      expect(result.state.employees.find((employee) => employee.id === 'admin_1')?.fatigue).toBe(12);
    }
  });

  it('clamps crisis recovery progress during import normalization', async () => {
    const state = {
      ...createInitialGameState(),
      crisis: {
        level: 'recovery' as const,
        causes: [],
        startedAtTurn: 10,
        lastEscalationTurn: 12,
        recoveryProgress: 180,
      },
    };
    const envelope = await createSaveEnvelope(state);

    const result = await importSaveEnvelope(JSON.stringify(envelope));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.crisis.recoveryProgress).toBe(100);
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

  it('restores a legacy V1 save that is missing recoverable fields', async () => {
    const state = createInitialGameState();
    const legacyEnvelopeWithoutChecksum = {
      format: 'dark-soc-save' as const,
      saveVersion: 1,
      gameVersion: '0.1.0',
      createdAt: state.createdAt ?? new Date().toISOString(),
      updatedAt: state.updatedAt ?? new Date().toISOString(),
      slotName: 'Partie principale',
      payloadEncoding: 'base64' as const,
      payload: encodePayload({
        state: {
          turn: 12,
          randomSeed: state.randomSeed,
          createdAt: state.createdAt,
          updatedAt: state.updatedAt,
          resources: normalizeResources({
            ...state.resources,
            logs: 37,
            findings: 9,
          }),
          unlockedTechnologyIds: ['asset_register'],
          availableTechnologyIds: ['incident_procedure_v0'],
          assets: state.assets,
          narrativeLog: state.narrativeLog,
          settings: state.settings,
        },
      } as never),
    };
    const legacyEnvelope = {
      ...legacyEnvelopeWithoutChecksum,
      checksum: await computeChecksum(legacyEnvelopeWithoutChecksum),
    };

    const result = await importSaveEnvelope(JSON.stringify(legacyEnvelope));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.modified).toBe(false);
      expect(result.state.resources.logs).toBe(37);
      expect(result.state.resources.findings).toBe(9);
      expect(result.state.employees.length).toBeGreaterThan(0);
      expect(result.state.activeIncidentIds).toEqual([]);
      expect(result.state.resolvedIncidentIds).toEqual([]);
      expect(result.state.businessStageId).toBe('small_company');
      expect(result.state.businessEventHistory).toEqual([]);
      expect(result.state.businessMomentum).toBe(0);
      expect(result.state.crisis).toEqual({
        level: 'none',
        causes: [],
        recoveryProgress: 0,
      });
      expect(result.state.currentSeasonId).toBe('season_1_visibility');
      expect(result.state.completedSeasonIds).toEqual([]);
      expect(result.state.objectives).toEqual(createInitialObjectiveStatuses());
      expect(result.state.completedObjectiveIds).toEqual([]);
      expect(result.state.survivedIncidentCount).toBe(0);
      expect(result.state.resolvedCrisisCount).toBe(0);
      expect(result.state.showOnboarding).toBe(true);
      expect(result.state.showSeasonSummary).toBe(false);
      expect(result.state.flags).toEqual({});
      expect(result.state.runningActions).toEqual([]);
      expect(result.warnings).toContain('restored_missing_fields');
    }
  });

  it('restores a legacy save that still uses the singular runningAction field', async () => {
    const state = createInitialGameState();
    const legacyEnvelopeWithoutChecksum = {
      format: 'dark-soc-save' as const,
      saveVersion: 1,
      gameVersion: '0.1.0',
      createdAt: state.createdAt ?? new Date().toISOString(),
      updatedAt: state.updatedAt ?? new Date().toISOString(),
      slotName: 'Partie principale',
      payloadEncoding: 'base64' as const,
      payload: encodePayload({
        state: {
          ...state,
          runningAction: {
            id: 'collect_logs',
            startedAtTurn: 2,
            remainingMs: 3200,
            durationMs: 7000,
          },
        },
      } as never),
    };
    const legacyEnvelope = {
      ...legacyEnvelopeWithoutChecksum,
      checksum: await computeChecksum(legacyEnvelopeWithoutChecksum),
    };

    const result = await importSaveEnvelope(JSON.stringify(legacyEnvelope));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.state.runningActions).toEqual([
        {
          id: 'collect_logs',
          startedAtTurn: 2,
          remainingMs: 3200,
          durationMs: 7000,
        },
      ]);
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

  it('still rejects an invalid state when the checksum is also invalid', async () => {
    const state = createInitialGameState();
    const envelope = await createSaveEnvelope(state);
    const invalidStateEnvelope = {
      ...envelope,
      payload: encodePayload({
        state: {
          ...state,
          turn: -1,
        },
      } as never),
    };

    const result = await importSaveEnvelope(JSON.stringify(invalidStateEnvelope));

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toBe('invalid_state');
    }
  });
});