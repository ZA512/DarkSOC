<script lang="ts">
  import { getEmployeeStatus } from '../../game/engine/employees';
  import {
    canAssignEmployeeTask,
    getAvailableTasksForEmployee,
    getVisibleLockedEmployees,
    getVisibleUnlockedEmployees,
  } from '../../game/engine/selectors';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onAssign: (employeeId: string, taskId: string) => void;
  export let onUnassign: (employeeId: string) => void;

  let selectedTaskIds: Record<string, string> = {};

  $: unlockedEmployees = getVisibleUnlockedEmployees(state);
  $: lockedEmployees = getVisibleLockedEmployees(state);

  function formatFatigue(value: number): string {
    return `${Math.round(value)} %`;
  }

  function getRoleKey(role: string): string {
    return `employees.role.${role}`;
  }

  function getStatusKey(employeeId: string): string {
    const employee = unlockedEmployees.find((candidate) => candidate.id === employeeId);

    return employee ? `employees.status.${getEmployeeStatus(employee)}` : 'employees.status.locked';
  }

  function getCurrentTaskLabel(taskId?: string): string {
    return taskId ? t(`employeeTasks.${taskId}.name`, locale) : t('employees.currentTask.none', locale);
  }

  function getSelectedTaskId(employeeId: string): string {
    const availableTasks = getAvailableTasksForEmployee(state, employeeId);
    const employee = unlockedEmployees.find((candidate) => candidate.id === employeeId);
    const selectedTaskId = selectedTaskIds[employeeId];

    if (selectedTaskId && availableTasks.some((task) => task.id === selectedTaskId)) {
      return selectedTaskId;
    }

    if (employee?.assignedTaskId && availableTasks.some((task) => task.id === employee.assignedTaskId)) {
      return employee.assignedTaskId;
    }

    return availableTasks[0]?.id ?? '';
  }

  function getTooltip(employeeId: string): string {
    const employee = [...unlockedEmployees, ...lockedEmployees].find((candidate) => candidate.id === employeeId);

    if (!employee) {
      return '';
    }

    const lines = [t(employee.descriptionKey, locale)];
    const availableTasks = getAvailableTasksForEmployee(state, employeeId);

    if (availableTasks.length > 0) {
      lines.push(
        `${t('employees.availableTasks', locale)}: ${availableTasks
          .map((task) => t(task.nameKey, locale))
          .join(' · ')}`,
      );
    }

    return lines.join('\n');
  }

  function handleTaskChange(employeeId: string, event: Event): void {
    selectedTaskIds = {
      ...selectedTaskIds,
      [employeeId]: (event.currentTarget as HTMLSelectElement).value,
    };
  }

  function handleAssign(employeeId: string): void {
    const taskId = getSelectedTaskId(employeeId);

    if (!taskId) {
      return;
    }

    onAssign(employeeId, taskId);
  }
</script>

<section class="employee-panel stage-panel" aria-labelledby="employee-title">
  <div class="stage-panel__header">
    <div>
      <p class="stage-panel__kicker">{t('ui.tab.soc', locale)}</p>
      <h2 id="employee-title">{t('employees.title', locale)}</h2>
    </div>
  </div>

  <div class="list-section">
    <ul class="employee-list">
      {#each unlockedEmployees as employee (employee.id)}
        <li class="employee-row" title={getTooltip(employee.id)}>
          <div class="employee-row__identity">
            <strong>{t(employee.nameKey, locale)}</strong>
            <span>{t(getRoleKey(employee.role), locale)}</span>
          </div>

          <div class="employee-row__task">{getCurrentTaskLabel(employee.assignedTaskId)}</div>

          <div class="employee-row__fatigue">{t('employees.fatigue', locale)} {formatFatigue(employee.fatigue)}</div>

          <div class="employee-row__status">{t(getStatusKey(employee.id), locale)}</div>

          {#if getAvailableTasksForEmployee(state, employee.id).length > 0}
            <div class="employee-row__controls">
              <select
                class="employee-row__select"
                value={getSelectedTaskId(employee.id)}
                onchange={(event) => handleTaskChange(employee.id, event)}
              >
                {#each getAvailableTasksForEmployee(state, employee.id) as task (task.id)}
                  <option value={task.id}>{t(task.nameKey, locale)}</option>
                {/each}
              </select>

              <button
                type="button"
                class="data-row__button"
                disabled={!canAssignEmployeeTask(state, employee.id, getSelectedTaskId(employee.id))}
                onclick={() => handleAssign(employee.id)}
              >
                {t('employees.assign', locale)}
              </button>

              <button
                type="button"
                class="data-row__button data-row__button--ghost"
                disabled={!employee.assignedTaskId}
                onclick={() => onUnassign(employee.id)}
              >
                {t('employees.unassign', locale)}
              </button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </div>

  {#if lockedEmployees.length > 0}
    <div class="list-section">
      <p class="list-section__title">{t('employees.locked', locale)}</p>

      <ul class="employee-list employee-list--locked">
        {#each lockedEmployees as employee (employee.id)}
          <li class="employee-row employee-row--locked" title={getTooltip(employee.id)}>
            <div class="employee-row__identity">
              <strong>{t(employee.nameKey, locale)}</strong>
              <span>{t(getRoleKey(employee.role), locale)}</span>
            </div>
            <span class="data-row__status">{t('employees.status.locked', locale)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>