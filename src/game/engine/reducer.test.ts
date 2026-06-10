import { describe, expect, it } from 'vitest';
import { applyAction, applyNarrativeThresholds } from './reducer';
import { getManualActionDefinition } from './manualActions';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';

describe('applyAction', () => {
  it('starts an available manual action without mutating the original state', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });
    const collectLogsDefinition = getManualActionDefinition('collect_logs');

    expect(nextState).not.toBe(state);
    expect(nextState.runningActions).toEqual([
      {
        id: 'collect_logs',
        startedAtTurn: 0,
        remainingMs: collectLogsDefinition.durationMs,
        durationMs: collectLogsDefinition.durationMs,
      },
    ]);
    expect(state.runningActions).toEqual([]);
  });

  it('refuses to start an unavailable action', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'START_MANUAL_ACTION',
      actionId: 'analyze_alert',
    });

    expect(nextState).toBe(state);
  });

  it('refuses to start the same action while it is already running', () => {
    const state = applyAction(createInitialGameState(), {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });

    const nextState = applyAction(state, {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });

    expect(nextState).toBe(state);
  });

  it('allows starting a different action while one is already running', () => {
    const baseState = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        logs: 10,
      }),
    };
    const state = applyAction(baseState, {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });

    const nextState = applyAction(state, {
      type: 'START_MANUAL_ACTION',
      actionId: 'analyze_alert',
    });

    expect(nextState.runningActions.map((runningAction) => runningAction.id)).toEqual([
      'collect_logs',
      'analyze_alert',
    ]);
    expect(nextState.resources.logs).toBe(0);
  });

  it('completes a targeted running action, applies its effects and keeps the others active', () => {
    const state = createInitialGameState();
    const readyState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 10,
        fatigue: 68,
      }),
    };
    const runningState = applyAction(readyState, {
      type: 'START_MANUAL_ACTION',
      actionId: 'analyze_alert',
    });
    const withSecondAction = applyAction(runningState, {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });

    const nextState = applyAction(withSecondAction, {
      type: 'COMPLETE_RUNNING_ACTION',
      actionId: 'analyze_alert',
    });

    expect(nextState.runningActions).toEqual([
      {
        id: 'collect_logs',
        startedAtTurn: 0,
        remainingMs: getManualActionDefinition('collect_logs').durationMs,
        durationMs: getManualActionDefinition('collect_logs').durationMs,
      },
    ]);
    expect(nextState.resources.logs).toBe(0);
    expect(nextState.resources.findings).toBe(5);
    expect(nextState.resources.fatigue).toBe(69);
    expect(nextState.turn).toBe(0);
    expect(nextState.narrativeLog.at(-1)).toEqual({
      id: 'action_analyze_alert_completed_0_1',
      messageKey: 'events.action.analyze_alert.completed',
    });
  });

  it('updates the animation setting through the reducer without mutating the source state', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'UPDATE_SETTINGS',
      settings: {
        animationMode: 'off',
      },
    });

    expect(nextState).not.toBe(state);
    expect(nextState.settings.animationMode).toBe('off');
    expect(state.settings.animationMode).toBe('normal');
  });

  it('dismisses onboarding through the reducer', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'DISMISS_ONBOARDING',
    });

    expect(nextState.showOnboarding).toBe(false);
    expect(state.showOnboarding).toBe(true);
  });

  it('advances the business stage during TICK when progression thresholds are met', () => {
    const state = {
      ...createInitialGameState(),
      turn: 119,
      lastAttackTurn: 119,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 15,
      }),
    };

    const nextState = applyAction(state, { type: 'TICK', deltaMs: 1000 });

    expect(nextState.businessStageId).toBe('visible_pme');
    expect(nextState.resources.budget).toBe(100);
    expect(nextState.resources.exposure).toBe(25);
    expect(nextState.businessMomentum).toBe(10);
    expect(nextState.narrativeLog.some((entry) => entry.messageKey === 'events.business.stage.visible_pme')).toBe(
      true,
    );
  });

  it('applies a business choice through the reducer', () => {
    const state = {
      ...createInitialGameState(),
      pendingBusinessEventId: 'launch_marketplace',
      businessStageId: 'visible_pme' as const,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 25,
      }),
    };

    const nextState = applyAction(state, {
      type: 'CHOOSE_BUSINESS_OPTION',
      eventId: 'launch_marketplace',
      choiceId: 'block_temporarily',
    });

    expect(nextState.pendingBusinessEventId).toBeUndefined();
    expect(nextState.businessEventHistory).toEqual(['launch_marketplace']);
    expect(nextState.resources.trust).toBe(10);
    expect(nextState.resources.fatigue).toBe(3);
    expect(nextState.businessMomentum).toBe(0);
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe('events.business.launch_marketplace.block_temporarily');
  });

  it('executes a crisis action through the reducer and can enter recovery', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 3,
        proofs: 50,
        findings: 20,
      }),
      activeIncidentIds: ['ransomware_minor'],
      crisis: {
        level: 'active' as const,
        causes: ['major_incident' as const],
        startedAtTurn: 12,
        lastEscalationTurn: 12,
        recoveryProgress: 90,
      },
    };

    const nextState = applyAction(state, {
      type: 'EXECUTE_CRISIS_ACTION',
      crisisActionId: 'emergency_comex_briefing',
    });

    expect(nextState.resources.proofs).toBe(20);
    expect(nextState.resources.findings).toBe(0);
    expect(nextState.resources.trust).toBe(13);
    expect(nextState.crisis.level).toBe('recovery');
    expect(nextState.crisis.recoveryProgress).toBe(100);
    expect(nextState.narrativeLog.at(-2)?.messageKey).toBe('events.crisis.emergency_comex_briefing');
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe('events.crisis.recovery.entered');
  });

  it('increments resolvedCrisisCount once when recovery ends', () => {
    const state = {
      ...createInitialGameState(),
      turn: 20,
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 20,
        fatigue: 20,
      }),
      crisis: {
        level: 'recovery' as const,
        causes: [],
        startedAtTurn: 16,
        lastEscalationTurn: 19,
        recoveryProgress: 100,
      },
    };

    const nextState = applyAction(state, {
      type: 'TICK',
      deltaMs: 1000,
    });
    const repeatedState = applyAction(nextState, {
      type: 'TICK',
      deltaMs: 1000,
    });

    expect(nextState.crisis.level).toBe('none');
    expect(nextState.resolvedCrisisCount).toBe(1);
    expect(repeatedState.resolvedCrisisCount).toBe(1);
  });

  it('assigns a compatible unlocked employee to a task', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'ASSIGN_EMPLOYEE_TASK',
      employeeId: 'admin_1',
      taskId: 'admin_collect_logs',
    });

    expect(nextState).not.toBe(state);
    expect(nextState.employees.find((employee) => employee.id === 'admin_1')?.assignedTaskId).toBe(
      'admin_collect_logs',
    );
    expect(nextState.narrativeLog.at(-1)?.messageKey).toBe('events.employee.assigned');
  });

  it('refuses invalid employee assignment and supports unassigning a task', () => {
    const state = createInitialGameState();

    expect(
      applyAction(state, {
        type: 'ASSIGN_EMPLOYEE_TASK',
        employeeId: 'analyst_1',
        taskId: 'analyst_alert_triage',
      }),
    ).toBe(state);

    const assignedState = applyAction(state, {
      type: 'ASSIGN_EMPLOYEE_TASK',
      employeeId: 'admin_1',
      taskId: 'admin_collect_logs',
    });
    const unassignedState = applyAction(assignedState, {
      type: 'UNASSIGN_EMPLOYEE',
      employeeId: 'admin_1',
    });

    expect(unassignedState.employees.find((employee) => employee.id === 'admin_1')?.assignedTaskId).toBeUndefined();
    expect(unassignedState.narrativeLog.at(-1)?.messageKey).toBe('events.employee.unassigned');
  });
});

describe('applyNarrativeThresholds', () => {
  it('adds a threshold message only once and sets the corresponding flag', () => {
    const state = createInitialGameState();
    const thresholdState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 30,
      }),
    };

    const nextState = applyNarrativeThresholds(thresholdState);
    const repeatedState = applyNarrativeThresholds(nextState);

    expect(nextState.flags.logs_30_reached).toBe(true);
    expect(nextState.narrativeLog.at(-1)).toEqual({
      id: 'logs_30_reached_0_1',
      messageKey: 'events.logs_30_reached',
    });
    expect(repeatedState.narrativeLog).toHaveLength(nextState.narrativeLog.length);
  });
});

describe('BUY_TECHNOLOGY', () => {
  it('consumes resources, unlocks the technology, applies effects and adds a narrative entry without mutating the source state', () => {
    const state = createInitialGameState();
    const readyState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 80,
        findings: 30,
      }),
    };

    const nextState = applyAction(readyState, {
      type: 'BUY_TECHNOLOGY',
      technologyId: 'asset_register',
    });

    expect(nextState).not.toBe(readyState);
    expect(nextState.unlockedTechnologyIds).toContain('asset_register');
    expect(nextState.availableTechnologyIds).toEqual([
      'asset_register',
      'incident_procedure_v0',
      'phishing_awareness_v0',
      'basic_log_collector',
      'basic_vulnerability_scanner',
    ]);
    expect(nextState.resources.logs).toBe(0);
    expect(nextState.resources.findings).toBe(0);
    expect(nextState.resources.visibility).toBe(11);
    expect(nextState.resources.unknownDebt).toBe(70);
    expect(nextState.resources.knownDebt).toBe(8);
    expect(nextState.narrativeLog.at(-2)).toEqual({
      id: 'tech_asset_register_unlocked_0_1',
      messageKey: 'events.tech.asset_register.unlocked',
    });
    expect(nextState.narrativeLog.at(-1)).toEqual({
      id: 'employee_auditor_1_unlocked_0_2',
      messageKey: 'events.employee.auditor_1.unlocked',
    });
    expect(readyState.unlockedTechnologyIds).toEqual([]);
    expect(readyState.availableTechnologyIds).toEqual([
      'asset_register',
      'incident_procedure_v0',
      'phishing_awareness_v0',
    ]);
  });
});

describe('passive production', () => {
  it('does not generate passive resources without unlocked technologies', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, { type: 'TICK', deltaMs: 1000 });

    expect(nextState).not.toBe(state);
    expect(nextState.turn).toBe(1);
    expect(nextState.resources).toEqual(state.resources);
  });

  it('generates logs passively with basic_log_collector', () => {
    const state = createInitialGameState();
    const nextState = applyAction(
      {
        ...state,
        unlockedTechnologyIds: ['basic_log_collector'],
      },
      { type: 'TICK', deltaMs: 1000 },
    );

    expect(nextState.resources.logs).toBe(2);
  });

  it('generates findings passively with basic_vulnerability_scanner', () => {
    const state = createInitialGameState();
    const nextState = applyAction(
      {
        ...state,
        unlockedTechnologyIds: ['basic_vulnerability_scanner'],
      },
      { type: 'TICK', deltaMs: 1000 },
    );

    expect(nextState.resources.findings).toBe(1);
    expect(nextState.resources.unknownDebt).toBe(80);
  });
});
