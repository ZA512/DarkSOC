import { describe, expect, it } from 'vitest';
import {
  canAssignEmployeeTask,
  canExecuteCrisisAction,
  getAvailableTasksForEmployee,
  getAvailableCrisisActions,
  getActiveIncidentSummaries,
  canBuyTechnology,
  getCurrentBusinessStage,
  getCrisisCauseLabelKeys,
  getCrisisStatusLabelKey,
  getEmployeeById,
  getAvailableManualActions,
  getAvailableTechnologies,
  getEffectiveStats,
  getInfrastructureMapView,
  getInfrastructureNodeStatus,
  getLockedEmployees,
  getLastThreatEvent,
  getNextBusinessStage,
  getPendingBusinessEvent,
  getVisibleAvailableTechnologies,
  getVisibleLockedEmployees,
  getVisibleTabs,
  getVisibleUnlockedEmployees,
  getUnlockedEmployees,
  getVisibleInfrastructureNodeCount,
  isBusinessPanelVisible,
  isEmployeePanelVisible,
  isInCrisis,
  isTechnologyPanelVisible,
  isThreatPanelVisible,
  getLockedTechnologies,
  getTechnologyById,
  getTechnologyMissingRequirements,
  getTechnologyMissingResources,
  selectVisibleResources,
} from './selectors';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';

const INFRASTRUCTURE_NODE_STATUSES = new Set([
  'unknown',
  'known',
  'stable',
  'debt',
  'incident',
  'critical',
]);

describe('getAvailableManualActions', () => {
  it('returns only collect_logs in the initial state', () => {
    const state = createInitialGameState();

    expect(getAvailableManualActions(state)).toEqual(['collect_logs']);
  });

  it('unlocks analyze_alert when logs reach 10', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 10,
      }),
    };

    expect(getAvailableManualActions(nextState)).toEqual(['collect_logs', 'analyze_alert']);
  });

  it('unlocks manual_audit when logs reach 30', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 30,
      }),
    };

    expect(getAvailableManualActions(nextState)).toEqual([
      'collect_logs',
      'analyze_alert',
      'manual_audit',
    ]);
  });

  it('unlocks write_comex_report when findings and proofs reach 20', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 10,
        findings: 20,
        proofs: 20,
      }),
    };

    expect(getAvailableManualActions(nextState)).toEqual([
      'collect_logs',
      'analyze_alert',
      'manual_audit',
      'write_comex_report',
    ]);
  });
});

describe('technology selectors', () => {
  it('returns a technology by id', () => {
    const technology = getTechnologyById('asset_register');

    expect(technology?.id).toBe('asset_register');
  });

  it('rejects an unknown technology', () => {
    expect(canBuyTechnology(createInitialGameState(), 'unknown_technology')).toBe(false);
  });

  it('rejects a technology that is already unlocked', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      unlockedTechnologyIds: ['asset_register'],
    };

    expect(canBuyTechnology(nextState, 'asset_register')).toBe(false);
  });

  it('rejects a technology with insufficient resources', () => {
    expect(canBuyTechnology(createInitialGameState(), 'asset_register')).toBe(false);
    expect(getTechnologyMissingResources(createInitialGameState(), 'asset_register')).toEqual({
      logs: 80,
      findings: 30,
    });
  });

  it('rejects a technology with a missing requirement', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      availableTechnologyIds: [...state.availableTechnologyIds, 'basic_log_collector'],
      resources: normalizeResources({
        ...state.resources,
        logs: 100,
        budget: 50,
      }),
    };

    expect(canBuyTechnology(nextState, 'basic_log_collector')).toBe(false);
    expect(getTechnologyMissingRequirements(nextState, 'basic_log_collector')).toEqual([
      'asset_register',
    ]);
  });

  it('accepts a technology when resources and requirements are satisfied', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        logs: 80,
        findings: 30,
      }),
    };

    expect(canBuyTechnology(nextState, 'asset_register')).toBe(true);
  });

  it('exposes initial available and locked technologies for the UI', () => {
    const state = createInitialGameState();

    expect(getAvailableTechnologies(state).map((technology) => technology.id)).toEqual([
      'asset_register',
      'incident_procedure_v0',
      'phishing_awareness_v0',
    ]);
    expect(getLockedTechnologies(state).some((technology) => technology.id === 'basic_log_collector')).toBe(
      true,
    );
  });

  it('sums effective stats from unlocked technologies', () => {
    const state = createInitialGameState();
    const nextState = {
      ...state,
      unlockedTechnologyIds: ['basic_log_collector', 'basic_vulnerability_scanner'],
    };

    expect(getEffectiveStats(nextState)).toMatchObject({
      logsPerTick: 2,
      findingsPerTick: 1,
    });
  });

  it('reveals technology UI progressively instead of showing the whole tree at start', () => {
    const initialState = createInitialGameState();
    const nearAssetRegisterState = {
      ...initialState,
      resources: normalizeResources({
        ...initialState.resources,
        logs: 30,
      }),
    };
    const postAssetRegisterState = {
      ...initialState,
      unlockedTechnologyIds: ['asset_register'],
      availableTechnologyIds: [
        ...initialState.availableTechnologyIds,
        'basic_log_collector',
        'basic_vulnerability_scanner',
      ],
    };

    expect(isTechnologyPanelVisible(initialState)).toBe(false);
    expect(getVisibleAvailableTechnologies(initialState)).toEqual([]);
    expect(getVisibleAvailableTechnologies(nearAssetRegisterState).map((technology) => technology.id)).toEqual([
      'asset_register',
    ]);
    expect(getVisibleAvailableTechnologies(postAssetRegisterState).map((technology) => technology.id)).toEqual([
      'basic_log_collector',
      'basic_vulnerability_scanner',
      'incident_procedure_v0',
      'phishing_awareness_v0',
    ]);
  });
});

describe('employee selectors', () => {
  it('returns unlocked and locked employees from the roster', () => {
    const state = createInitialGameState();

    expect(getUnlockedEmployees(state).map((employee) => employee.id)).toEqual(['admin_1']);
    expect(getLockedEmployees(state).map((employee) => employee.id)).toEqual([
      'analyst_1',
      'auditor_1',
      'secops_1',
      'governance_1',
    ]);
  });

  it('returns only compatible available tasks for an employee', () => {
    const state = createInitialGameState();

    expect(getAvailableTasksForEmployee(state, 'admin_1').map((task) => task.id)).toEqual([
      'admin_collect_logs',
      'admin_inventory',
    ]);
    expect(getAvailableTasksForEmployee(state, 'analyst_1').map((task) => task.id)).toEqual([
      'analyst_alert_triage',
    ]);
  });

  it('refuses assignment for locked employees, incompatible roles and missing technologies', () => {
    const initialState = createInitialGameState();
    const analystUnlockedState = {
      ...initialState,
      employees: initialState.employees.map((employee) =>
        employee.id === 'analyst_1'
          ? {
              ...employee,
              unlocked: true,
            }
          : employee,
      ),
    };

    expect(canAssignEmployeeTask(initialState, 'analyst_1', 'analyst_alert_triage')).toBe(false);
    expect(canAssignEmployeeTask(analystUnlockedState, 'admin_1', 'analyst_alert_triage')).toBe(false);
    expect(canAssignEmployeeTask(analystUnlockedState, 'analyst_1', 'analyst_siem_tuning')).toBe(false);
  });

  it('includes employee task stats in effective stats with fatigue scaling', () => {
    const state = {
      ...createInitialGameState(),
      unlockedTechnologyIds: ['centralized_logs'],
      employees: createInitialGameState().employees.map((employee) => {
        if (employee.id === 'analyst_1') {
          return {
            ...employee,
            unlocked: true,
            assignedTaskId: 'analyst_alert_triage',
            fatigue: 50,
          };
        }

        return employee;
      }),
    };

    expect(getEffectiveStats(state)).toMatchObject({
      detection: 13.75,
    });
  });

  it('reveals the employee UI progressively instead of listing the full roster immediately', () => {
    const initialState = createInitialGameState();
    const logsState = {
      ...initialState,
      resources: normalizeResources({
        ...initialState.resources,
        logs: 10,
      }),
    };

    expect(isEmployeePanelVisible(initialState)).toBe(false);
    expect(getVisibleUnlockedEmployees(initialState)).toEqual([]);
    expect(getVisibleLockedEmployees(initialState)).toEqual([]);
    expect(getVisibleUnlockedEmployees(logsState).map((employee) => employee.id)).toEqual(['admin_1']);
  });
});

describe('progressive reveal selectors', () => {
  it('shows only minimal useful resources at start', () => {
    const state = createInitialGameState();

    expect(selectVisibleResources(state).map((resource) => resource.id)).toEqual([
      'logs',
      'findings',
      'proofs',
      'trust',
    ]);
  });

  it('reveals fatigue when a fatigue-producing action becomes available', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        logs: 10,
      }),
    };

    expect(selectVisibleResources(state).map((resource) => resource.id)).toContain('fatigue');
  });

  it('shows only the SOC tab at the beginning and reveals more tabs later', () => {
    const initialState = createInitialGameState();
    const progressedState = {
      ...initialState,
      turn: 140,
      businessStageId: 'visible_pme' as const,
      businessMomentum: 10,
      pendingBusinessEventId: 'launch_marketplace',
      resources: normalizeResources({
        ...initialState.resources,
        logs: 30,
      }),
      crisis: {
        level: 'watch' as const,
        causes: ['trust_collapse' as const],
        startedAtTurn: 140,
        lastEscalationTurn: 140,
        recoveryProgress: 0,
      },
    };

    expect(getVisibleTabs(initialState).map((tab) => tab.id)).toEqual(['soc']);
    expect(getVisibleTabs(progressedState).map((tab) => tab.id)).toEqual([
      'soc',
      'tech',
      'team',
      'business',
      'crisis',
    ]);
    expect(isBusinessPanelVisible(progressedState)).toBe(true);
    expect(isThreatPanelVisible(initialState)).toBe(false);
  });
});

describe('getVisibleInfrastructureNodeCount', () => {
  it('returns 1 in the initial state', () => {
    expect(getVisibleInfrastructureNodeCount(createInitialGameState())).toBe(1);
  });

  it('adds one visible node per unlocked business stage level', () => {
    const state = {
      ...createInitialGameState(),
      businessStageId: 'visible_pme' as const,
    };

    expect(getVisibleInfrastructureNodeCount(state)).toBe(2);
  });

  it('returns 3 for visibility 10 and exposure 10', () => {
    const state = createInitialGameState();

    expect(
      getVisibleInfrastructureNodeCount({
        ...state,
        resources: normalizeResources({
          ...state.resources,
          visibility: 10,
          exposure: 10,
        }),
      }),
    ).toBe(3);
  });

  it('returns 8 for visibility 30 and exposure 25', () => {
    const state = createInitialGameState();

    expect(
      getVisibleInfrastructureNodeCount({
        ...state,
        resources: normalizeResources({
          ...state.resources,
          visibility: 30,
          exposure: 25,
        }),
      }),
    ).toBe(8);
  });

  it('caps the node count at 40', () => {
    const state = createInitialGameState();

    expect(
      getVisibleInfrastructureNodeCount({
        ...state,
        resources: normalizeResources({
          ...state.resources,
          visibility: 100,
          exposure: 1000,
        }),
      }),
    ).toBe(40);
  });
});

describe('getInfrastructureMapView', () => {
  it('returns at least one node and is deterministic for the same state', () => {
    const state = createInitialGameState();
    const firstView = getInfrastructureMapView(state);
    const secondView = getInfrastructureMapView(state);

    expect(firstView.nodes.length).toBeGreaterThanOrEqual(1);
    expect(firstView).toEqual(secondView);
  });

  it('increases the number of nodes when visibility increases', () => {
    const state = createInitialGameState();
    const richerState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        visibility: 20,
      }),
    };

    expect(getInfrastructureMapView(richerState).nodes.length).toBeGreaterThan(
      getInfrastructureMapView(state).nodes.length,
    );
  });

  it('increases the number of nodes when exposure increases', () => {
    const state = createInitialGameState();
    const richerState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        exposure: 50,
      }),
    };

    expect(getInfrastructureMapView(richerState).nodes.length).toBeGreaterThan(
      getInfrastructureMapView(state).nodes.length,
    );
  });

  it('returns links when several nodes exist', () => {
    const state = createInitialGameState();
    const richerState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        visibility: 30,
        exposure: 25,
      }),
    };

    expect(getInfrastructureMapView(richerState).links.length).toBeGreaterThan(0);
  });

  it('produces debt nodes when known debt is high', () => {
    const state = createInitialGameState();
    const debtState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        visibility: 30,
        exposure: 25,
        knownDebt: 120,
      }),
    };

    expect(getInfrastructureMapView(debtState).nodes.some((node) => node.status === 'debt')).toBe(true);
  });

  it('can produce stable nodes when resilience is high enough', () => {
    const state = createInitialGameState();
    const stableState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        visibility: 30,
        exposure: 25,
        resilience: 45,
        fatigue: 0,
        alertNoise: 0,
      }),
    };

    expect(getInfrastructureMapView(stableState).nodes.some((node) => node.status === 'stable')).toBe(true);
  });

  it('never returns an invalid node status', () => {
    const state = createInitialGameState();
    const view = getInfrastructureMapView({
      ...state,
      resources: normalizeResources({
        ...state.resources,
        visibility: 40,
        exposure: 50,
        knownDebt: 80,
        resilience: 25,
      }),
    });

    expect(view.nodes.every((node) => INFRASTRUCTURE_NODE_STATUSES.has(node.status))).toBe(true);
  });

  it('keeps the first node known, then critical when visibility reaches 20', () => {
    const state = createInitialGameState();
    const visibleState = {
      ...state,
      resources: normalizeResources({
        ...state.resources,
        visibility: 20,
        exposure: 25,
      }),
    };

    expect(getInfrastructureNodeStatus(state, 0, 1)).toBe('known');
    expect(getInfrastructureNodeStatus(visibleState, 0, 6)).toBe('critical');
  });
});

describe('threat selectors', () => {
  it('aggregates active incidents by attack id', () => {
    const state = {
      ...createInitialGameState(),
      activeIncidentIds: ['phishing_basic', 'ransomware_minor', 'phishing_basic'],
    };

    expect(getActiveIncidentSummaries(state)).toEqual([
      {
        attackId: 'phishing_basic',
        count: 2,
      },
      {
        attackId: 'ransomware_minor',
        count: 1,
      },
    ]);
  });

  it('returns the last warning or attack event', () => {
    const state = {
      ...createInitialGameState(),
      narrativeLog: [
        ...createInitialGameState().narrativeLog,
        {
          id: 'warning',
          messageKey: 'events.warning.phishing_basic',
        },
        {
          id: 'attack',
          messageKey: 'events.attack.ransomware_minor.major',
        },
      ],
    };

    expect(getLastThreatEvent(state)).toEqual({
      kind: 'attack',
      attackId: 'ransomware_minor',
      outcome: 'major',
      messageKey: 'events.attack.ransomware_minor.major',
    });
  });
});

describe('business selectors', () => {
  it('returns the current stage, next stage and pending event', () => {
    const state = {
      ...createInitialGameState(),
      businessStageId: 'visible_pme' as const,
      pendingBusinessEventId: 'launch_marketplace',
    };

    expect(getCurrentBusinessStage(state).id).toBe('visible_pme');
    expect(getNextBusinessStage(state)?.id).toBe('known_ecommerce');
    expect(getPendingBusinessEvent(state)?.id).toBe('launch_marketplace');
  });
});

describe('crisis selectors', () => {
  it('exposes the crisis status, causes and available crisis actions', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        trust: 7,
        proofs: 25,
      }),
      crisis: {
        level: 'watch' as const,
        causes: ['trust_collapse' as const],
        startedAtTurn: 22,
        lastEscalationTurn: 22,
        recoveryProgress: 0,
      },
    };

    expect(isInCrisis(state)).toBe(true);
    expect(getCrisisStatusLabelKey(state)).toBe('crisis.status.watch');
    expect(getCrisisCauseLabelKeys(state)).toEqual(['crisis.cause.trust_collapse']);
    expect(getAvailableCrisisActions(state).map((crisisAction) => crisisAction.id)).toContain('activate_crisis_cell');
    expect(canExecuteCrisisAction(state, 'activate_crisis_cell')).toBe(true);
  });
});