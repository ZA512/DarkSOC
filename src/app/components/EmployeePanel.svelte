<script lang="ts">
  import { getEmployeeStatus } from '../../game/engine/employees';
  import {
    canAssignEmployeeTask,
    getAvailableTasksForEmployee,
    getLockedEmployees,
    getUnlockedEmployees,
  } from '../../game/engine/selectors';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onAssign: (employeeId: string, taskId: string) => void;
  export let onUnassign: (employeeId: string) => void;

  let selectedTaskIds: Record<string, string> = {};

  $: unlockedEmployees = getUnlockedEmployees(state);
  $: lockedEmployees = getLockedEmployees(state);

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

<section class="employee-panel" aria-labelledby="employee-title">
  <h2 id="employee-title">{t('employees.title', locale)}</h2>

  <div class="employee-panel__section">
    {#each unlockedEmployees as employee (employee.id)}
      <article class="employee-card">
        <div class="employee-card__header">
          <div>
            <h3>{t(employee.nameKey, locale)}</h3>
            <p>{t(employee.descriptionKey, locale)}</p>
          </div>

          <span class={`employee-card__status employee-card__status--${getEmployeeStatus(employee)}`}>
            {t(getStatusKey(employee.id), locale)}
          </span>
        </div>

        <p class="employee-card__meta">
          <span class="employee-card__meta-label">{t(getRoleKey(employee.role), locale)}</span>
          <span>{t('employees.fatigue', locale)}: {formatFatigue(employee.fatigue)}</span>
        </p>

        <p class="employee-card__task">
          <span class="employee-card__task-label">{t('employees.currentTask', locale)}</span>
          <span>{getCurrentTaskLabel(employee.assignedTaskId)}</span>
        </p>

        {#if getAvailableTasksForEmployee(state, employee.id).length > 0}
          <div class="employee-card__controls">
            <select
              class="employee-card__select"
              value={getSelectedTaskId(employee.id)}
              onchange={(event) => handleTaskChange(employee.id, event)}
            >
              {#each getAvailableTasksForEmployee(state, employee.id) as task (task.id)}
                <option value={task.id}>{t(task.nameKey, locale)}</option>
              {/each}
            </select>

            <button
              type="button"
              class="employee-card__button"
              disabled={!canAssignEmployeeTask(state, employee.id, getSelectedTaskId(employee.id))}
              onclick={() => handleAssign(employee.id)}
            >
              {t('employees.assign', locale)}
            </button>

            <button
              type="button"
              class="employee-card__button"
              disabled={!employee.assignedTaskId}
              onclick={() => onUnassign(employee.id)}
            >
              {t('employees.unassign', locale)}
            </button>
          </div>
        {:else}
          <p class="employee-card__empty">{t('employees.availableTasks', locale)}: {t('employees.currentTask.none', locale)}</p>
        {/if}
      </article>
    {/each}
  </div>

  {#if lockedEmployees.length > 0}
    <div class="employee-panel__section">
      <p class="employee-panel__section-title">{t('employees.locked', locale)}</p>

      {#each lockedEmployees as employee (employee.id)}
        <article class="employee-card employee-card--locked">
          <div class="employee-card__header">
            <div>
              <h3>{t(employee.nameKey, locale)}</h3>
              <p>{t(employee.descriptionKey, locale)}</p>
            </div>

            <span class="employee-card__status employee-card__status--locked">
              {t('employees.status.locked', locale)}
            </span>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>