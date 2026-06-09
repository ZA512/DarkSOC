<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ActionButton from './components/ActionButton.svelte';
  import InfrastructureMap from './components/InfrastructureMap.svelte';
  import NarrativeLog from './components/NarrativeLog.svelte';
  import EmployeePanel from './components/EmployeePanel.svelte';
  import ResourcePanel from './components/ResourcePanel.svelte';
  import SavePanel from './components/SavePanel.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import TechPanel from './components/TechPanel.svelte';
  import ThreatPanel from './components/ThreatPanel.svelte';
  import type { GameAction } from '../game/engine/actions';
  import { applyAction } from '../game/engine/reducer';
  import {
    getActiveIncidentSummaries,
    getAvailableManualActions,
    getEffectiveStats,
    hasEmployeeTickActivity,
    getInfrastructureMapView,
    getLastThreatEvent,
  } from '../game/engine/selectors';
  import { getBusinessStage, getCyberMaturity, getThreatPressure } from '../game/engine/threat';
  import { createInitialGameState, type GameState } from '../game/model/GameState';
  import type { ManualActionId } from '../game/model/ManualAction';
  import type { AnimationMode } from '../game/model/Settings';
  import { t } from '../i18n/i18n';
  import { getImportErrorMessageKey } from '../persistence/saveTypes';
  import { clearLocalSave, hasLocalSave, loadLocalSave, writeLocalSave } from '../persistence/storage';

  let state = createInitialGameState();
  let tickerId: number | undefined;
  let autosaveId: number | undefined;
  let lastTickAt = 0;
  let hasExistingLocalSave = false;
  let autosaveEnabled = false;
  let saveStatusKey: string | undefined;
  let saveErrorKey: string | undefined;

  function setSaveStatus(statusKey?: string): void {
    saveStatusKey = statusKey;

    if (statusKey) {
      saveErrorKey = undefined;
    }
  }

  function setSaveError(errorKey?: string): void {
    saveErrorKey = errorKey;

    if (errorKey) {
      saveStatusKey = undefined;
    }
  }

  async function persistState(nextState: GameState = state, statusKey = 'save.status.autosaved'): Promise<void> {
    if (!autosaveEnabled) {
      return;
    }

    try {
      await writeLocalSave(nextState);
      hasExistingLocalSave = hasLocalSave();
      setSaveStatus(statusKey);
    } catch {
      setSaveError('save.error.invalidState');
    }
  }

  async function continueLocalSave(showStatus = true): Promise<void> {
    const result = await loadLocalSave();

    hasExistingLocalSave = hasLocalSave();

    if (!result) {
      return;
    }

    if (!result.ok) {
      autosaveEnabled = false;
      setSaveError(getImportErrorMessageKey(result.reason));
      return;
    }

    state = result.state;
    autosaveEnabled = true;
    setSaveError(undefined);

    if (result.modified) {
      setSaveStatus('save.status.modifiedMode');
      return;
    }

    if (showStatus) {
      setSaveStatus('save.status.imported');
    } else {
      saveStatusKey = undefined;
    }
  }

  async function startNewGame(): Promise<void> {
    const nextState = {
      ...createInitialGameState(),
      settings: {
        ...state.settings,
      },
    };

    state = nextState;
    autosaveEnabled = true;
    await persistState(nextState);
  }

  async function applyImportedState(nextState: GameState, statusKey: string): Promise<void> {
    state = nextState;
    autosaveEnabled = true;
    await persistState(nextState, statusKey);
  }

  function resetLocalSaveState(): void {
    clearLocalSave();
    hasExistingLocalSave = false;
    autosaveEnabled = false;
    setSaveError(undefined);
    setSaveStatus('save.status.reset');
  }

  function setAnimationMode(animationMode: AnimationMode): void {
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: {
        animationMode,
      },
    });
  }

  function dispatch(action: GameAction): void {
    const previousState = state;

    state = applyAction(state, action);

    if (!autosaveEnabled || state === previousState) {
      return;
    }

    const completedRunningAction = previousState.runningAction && !state.runningAction;
    const boughtTechnology = action.type === 'BUY_TECHNOLOGY';
    const updatedEmployees =
      action.type === 'ASSIGN_EMPLOYEE_TASK' || action.type === 'UNASSIGN_EMPLOYEE';
    const updatedSettings = action.type === 'UPDATE_SETTINGS';

    if (completedRunningAction || boughtTechnology || updatedEmployees || updatedSettings) {
      void persistState(state);
    }
  }

  function stopTicker(): void {
    if (tickerId === undefined) {
      return;
    }

    window.clearInterval(tickerId);
    tickerId = undefined;
  }

  function startTicker(): void {
    if (tickerId !== undefined || (!state.runningAction && !hasPassiveProduction && !hasEmployeeActivity)) {
      return;
    }

    lastTickAt = Date.now();

    tickerId = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = Math.max(0, now - lastTickAt);

      lastTickAt = now;
      dispatch({ type: 'TICK', deltaMs });

      if (!state.runningAction && !hasPassiveProduction && !hasEmployeeActivity) {
        stopTicker();
      }
    }, 1000);
  }

  function getProgressPercent(actionId: ManualActionId): number | undefined {
    if (state.runningAction?.id !== actionId) {
      return undefined;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          ((state.runningAction.durationMs - state.runningAction.remainingMs) /
            state.runningAction.durationMs) *
            100,
        ),
      ),
    );
  }

  $: availableActions = getAvailableManualActions(state);
  $: effectiveStats = getEffectiveStats(state);
  $: infrastructureMapView = getInfrastructureMapView(state);
  $: activeIncidentSummaries = getActiveIncidentSummaries(state);
  $: lastThreatEvent = getLastThreatEvent(state);
  $: threatPressure = Math.round(getThreatPressure(state));
  $: cyberMaturity = Math.round(getCyberMaturity(state));
  $: businessStageNameKey = getBusinessStage(state).nameKey;
  $: hasPassiveProduction =
    effectiveStats.logsPerTick > 0 ||
    effectiveStats.findingsPerTick > 0 ||
    effectiveStats.proofsPerTick > 0 ||
    effectiveStats.budgetPerTick > 0;
  $: hasEmployeeActivity = hasEmployeeTickActivity(state);
  $: visibleActions =
    state.runningAction && !availableActions.includes(state.runningAction.id)
      ? [...availableActions, state.runningAction.id]
      : availableActions;
  $: if (state.runningAction || hasPassiveProduction || hasEmployeeActivity) {
    startTicker();
  } else {
    stopTicker();
  }

  onMount(() => {
    hasExistingLocalSave = hasLocalSave();

    void (async () => {
      if (hasExistingLocalSave) {
        await continueLocalSave(false);
        return;
      }

      autosaveEnabled = true;
      await persistState(state);
    })();

    autosaveId = window.setInterval(() => {
      if (!autosaveEnabled) {
        return;
      }

      void persistState(state);
    }, 5000);
  });

  onDestroy(() => {
    stopTicker();

    if (autosaveId !== undefined) {
      window.clearInterval(autosaveId);
    }
  });
</script>

<svelte:head>
  <title>{t('app.title', state.settings.locale)}</title>
</svelte:head>

<main class="app-shell">
  <section class="play-area" aria-labelledby="app-title">
    <div class="narrative-column">
      <header class="app-header">
        <p class="eyebrow">{t('ui.narrative.title', state.settings.locale)}</p>
        <h1 id="app-title">{t('app.title', state.settings.locale)}</h1>
      </header>

      <NarrativeLog entries={state.narrativeLog} locale={state.settings.locale} />

      <ThreatPanel
        locale={state.settings.locale}
        threatPressure={threatPressure}
        cyberMaturity={cyberMaturity}
        businessStageNameKey={businessStageNameKey}
        lastThreatEvent={lastThreatEvent}
        activeIncidents={activeIncidentSummaries}
      />

      <section class="actions" aria-labelledby="actions-title">
        <h2 id="actions-title">{t('ui.actions.title', state.settings.locale)}</h2>
        {#each visibleActions as actionId (actionId)}
          <ActionButton
            labelKey={`actions.${actionId}.label`}
            descriptionKey={`actions.${actionId}.description`}
            locale={state.settings.locale}
            disabled={Boolean(state.runningAction)}
            isRunning={state.runningAction?.id === actionId}
            progressPercent={getProgressPercent(actionId)}
            onActivate={() => dispatch({ type: 'START_MANUAL_ACTION', actionId })}
          />
        {/each}
      </section>

      <TechPanel
        state={state}
        locale={state.settings.locale}
        onBuy={(technologyId) => dispatch({ type: 'BUY_TECHNOLOGY', technologyId })}
      />

      <EmployeePanel
        state={state}
        locale={state.settings.locale}
        onAssign={(employeeId, taskId) => dispatch({ type: 'ASSIGN_EMPLOYEE_TASK', employeeId, taskId })}
        onUnassign={(employeeId) => dispatch({ type: 'UNASSIGN_EMPLOYEE', employeeId })}
      />

      <SettingsPanel
        settings={state.settings}
        locale={state.settings.locale}
        onSetAnimationMode={setAnimationMode}
      />

      <SavePanel
        state={state}
        locale={state.settings.locale}
        hasLocalSave={hasExistingLocalSave}
        statusKey={saveStatusKey}
        errorKey={saveErrorKey}
        onContinue={() => continueLocalSave(true)}
        onStartNewGame={startNewGame}
        onImportState={applyImportedState}
        onResetLocalSave={resetLocalSaveState}
        onStatusChange={setSaveStatus}
        onErrorChange={setSaveError}
      />
    </div>

    <InfrastructureMap
      mapView={infrastructureMapView}
      animationMode={state.settings.animationMode}
      locale={state.settings.locale}
    />
  </section>

  <ResourcePanel resources={state.resources} locale={state.settings.locale} />
</main>
