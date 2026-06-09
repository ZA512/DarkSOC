import { describe, expect, it } from 'vitest';
import { applyAction, applyNarrativeThresholds } from './reducer';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';

describe('applyAction', () => {
  it('starts an available manual action without mutating the original state', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });

    expect(nextState).not.toBe(state);
    expect(nextState.runningAction).toEqual({
      id: 'collect_logs',
      startedAtTurn: 0,
      remainingMs: 2500,
      durationMs: 2500,
    });
    expect(state.runningAction).toBeUndefined();
  });

  it('refuses to start an unavailable action', () => {
    const state = createInitialGameState();

    const nextState = applyAction(state, {
      type: 'START_MANUAL_ACTION',
      actionId: 'analyze_alert',
    });

    expect(nextState).toBe(state);
  });

  it('refuses to start a second action while one is already running', () => {
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

  it('reduces remaining time while an action is running', () => {
    const state = applyAction(createInitialGameState(), {
      type: 'START_MANUAL_ACTION',
      actionId: 'collect_logs',
    });

    const nextState = applyAction(state, { type: 'TICK', deltaMs: 500 });

    expect(nextState.runningAction?.remainingMs).toBe(2000);
    expect(nextState.resources.logs).toBe(0);
  });

  it('completes a running action, applies effects, normalizes resources and adds a narrative entry', () => {
    const state = createInitialGameState();
    const readyState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 10,
        fatigue: 100,
      }),
    };
    const runningState = applyAction(readyState, {
      type: 'START_MANUAL_ACTION',
      actionId: 'analyze_alert',
    });

    const nextState = applyAction(runningState, { type: 'TICK', deltaMs: 3500 });

    expect(nextState.runningAction).toBeUndefined();
    expect(nextState.resources.logs).toBe(0);
    expect(nextState.resources.findings).toBe(5);
    expect(nextState.resources.fatigue).toBe(100);
    expect(nextState.turn).toBe(1);
    expect(nextState.narrativeLog.at(-1)).toEqual({
      id: 'action_analyze_alert_completed_1_1',
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
