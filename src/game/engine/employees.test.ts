import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '../model/GameState';
import { normalizeResources } from '../model/Resource';
import { applyEmployeeTick, applyEmployeeUnlocks, getEmployeeProductivityMultiplier } from './employees';

describe('getEmployeeProductivityMultiplier', () => {
  it('returns the expected thresholds', () => {
    const state = createInitialGameState();
    const admin = state.employees.find((employee) => employee.id === 'admin_1');

    expect(getEmployeeProductivityMultiplier({ ...admin!, fatigue: 0 })).toBe(1);
    expect(getEmployeeProductivityMultiplier({ ...admin!, fatigue: 40 })).toBe(0.75);
    expect(getEmployeeProductivityMultiplier({ ...admin!, fatigue: 70 })).toBe(0.5);
    expect(getEmployeeProductivityMultiplier({ ...admin!, fatigue: 90 })).toBe(0);
  });
});

describe('applyEmployeeUnlocks', () => {
  it('unlocks the expected employees from technology and resource progression', () => {
    const baseState = createInitialGameState();

    const analystState = applyEmployeeUnlocks({
      ...baseState,
      unlockedTechnologyIds: ['centralized_logs'],
    });
    const auditorState = applyEmployeeUnlocks({
      ...baseState,
      unlockedTechnologyIds: ['asset_register'],
    });
    const secopsState = applyEmployeeUnlocks({
      ...baseState,
      unlockedTechnologyIds: ['basic_vulnerability_scanner'],
    });
    const governanceState = applyEmployeeUnlocks({
      ...baseState,
      resources: normalizeResources({
        ...baseState.resources,
        trust: 20,
      }),
    });
    const governanceFlagState = applyEmployeeUnlocks({
      ...baseState,
      flags: {
        ...baseState.flags,
        action_write_comex_report_used: true,
      },
    });

    expect(analystState.employees.find((employee) => employee.id === 'analyst_1')?.unlocked).toBe(true);
    expect(auditorState.employees.find((employee) => employee.id === 'auditor_1')?.unlocked).toBe(true);
    expect(secopsState.employees.find((employee) => employee.id === 'secops_1')?.unlocked).toBe(true);
    expect(governanceState.employees.find((employee) => employee.id === 'governance_1')?.unlocked).toBe(true);
    expect(governanceFlagState.employees.find((employee) => employee.id === 'governance_1')?.unlocked).toBe(true);
  });
});

describe('applyEmployeeTick', () => {
  it('applies direct production, fatigue gain and fatigue recovery', () => {
    const state = {
      ...createInitialGameState(),
      resources: normalizeResources({
        ...createInitialGameState().resources,
        knownDebt: 10,
      }),
      employees: createInitialGameState().employees.map((employee) => {
        switch (employee.id) {
          case 'admin_1':
            return {
              ...employee,
              assignedTaskId: 'admin_collect_logs',
            };
          case 'auditor_1':
            return {
              ...employee,
              unlocked: true,
              assignedTaskId: 'auditor_manual_audit',
            };
          case 'secops_1':
            return {
              ...employee,
              unlocked: true,
              assignedTaskId: 'secops_remediation',
            };
          case 'analyst_1':
            return {
              ...employee,
              unlocked: true,
              fatigue: 10,
            };
          default:
            return employee;
        }
      }),
    };

    const nextState = applyEmployeeTick(state, 1000);

    expect(nextState.resources.logs).toBe(1);
    expect(nextState.resources.findings).toBe(0.8);
    expect(nextState.resources.proofs).toBe(0.5);
    expect(nextState.resources.knownDebt).toBe(9.65);
    expect(nextState.employees.find((employee) => employee.id === 'admin_1')?.fatigue).toBeCloseTo(0.05);
    expect(nextState.employees.find((employee) => employee.id === 'analyst_1')?.fatigue).toBeCloseTo(9.8);
  });

  it('prevents exhausted employees from producing', () => {
    const state = {
      ...createInitialGameState(),
      employees: createInitialGameState().employees.map((employee) =>
        employee.id === 'admin_1'
          ? {
              ...employee,
              fatigue: 90,
              assignedTaskId: 'admin_collect_logs',
            }
          : employee,
      ),
    };

    const nextState = applyEmployeeTick(state, 1000);

    expect(nextState.resources.logs).toBe(0);
  });
});