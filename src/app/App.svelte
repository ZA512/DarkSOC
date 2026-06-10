<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ActionButton from './components/ActionButton.svelte';
  import BusinessPanel from './components/BusinessPanel.svelte';
  import CrisisPanel from './components/CrisisPanel.svelte';
  import InfrastructureMap from './components/InfrastructureMap.svelte';
  import NarrativeLog from './components/NarrativeLog.svelte';
  import EmployeePanel from './components/EmployeePanel.svelte';
  import ObjectivePanel from './components/ObjectivePanel.svelte';
  import ResourcePanel from './components/ResourcePanel.svelte';
  import SeasonSummaryPanel from './components/SeasonSummaryPanel.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import TechPanel from './components/TechPanel.svelte';
  import ThreatPanel from './components/ThreatPanel.svelte';
  import type { GameAction } from '../game/engine/actions';
  import { applyAction } from '../game/engine/reducer';
  import {
    getActiveIncidentSummaries,
    getAvailableManualActions,
    getEffectiveStats,
    getVisibleTabs,
    hasEmployeeTickActivity,
    isInCrisis,
    getInfrastructureMapView,
    getLastThreatEvent,
    isThreatPanelVisible,
    type AppTabId,
  } from '../game/engine/selectors';
  import { getManualActionDefinition } from '../game/engine/manualActions';
  import { getBusinessStage, getCyberMaturity, getThreatPressure } from '../game/engine/threat';
  import { createInitialGameState, type GameState } from '../game/model/GameState';
  import type { ManualActionId, RunningAction } from '../game/model/ManualAction';
  import type { ResourceId } from '../game/model/Resource';
  import type { AnimationMode } from '../game/model/Settings';
  import { t } from '../i18n/i18n';
  import { downloadSaveFile, importSaveEnvelope } from '../persistence/exportImport';
  import { getImportErrorMessageKey } from '../persistence/saveTypes';
  import { clearLocalSave, hasLocalSave, loadLocalSave, writeLocalSave } from '../persistence/storage';

  let state = createInitialGameState();
  let tickerId: number | undefined;
  let autosaveId: number | undefined;
  let runningActionPollId: number | undefined;
  let lastTickAt = 0;
  let hasExistingLocalSave = false;
  let autosaveEnabled = false;
  let saveStatusKey: string | undefined;
  let saveErrorKey: string | undefined;
  let activeTab: AppTabId = 'soc';
  let utilityPanel: 'options' | undefined;
  let importFileInput: HTMLInputElement | undefined;
  const runningActionDeadlineById = new Map<ManualActionId, number>();
  const runningActionTimeoutById = new Map<ManualActionId, number>();

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

  function clearRunningActionTimer(actionId: ManualActionId): void {
    const timeoutId = runningActionTimeoutById.get(actionId);

    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      runningActionTimeoutById.delete(actionId);
    }

    runningActionDeadlineById.delete(actionId);
  }

  function clearRunningActionTimers(): void {
    for (const actionId of [...runningActionTimeoutById.keys()]) {
      clearRunningActionTimer(actionId);
    }
  }

  function stopRunningActionPoll(): void {
    if (runningActionPollId === undefined) {
      return;
    }

    window.clearInterval(runningActionPollId);
    runningActionPollId = undefined;
  }

  function startRunningActionPoll(): void {
    if (runningActionPollId !== undefined || !hasRunningActions) {
      return;
    }

    runningActionPollId = window.setInterval(() => {
      flushCompletedRunningActions();
    }, 100);
  }

  function getPersistedState(nextState: GameState = state): GameState {
    if (nextState.runningActions.length === 0) {
      return nextState;
    }

    return {
      ...nextState,
      runningActions: nextState.runningActions.map((runningAction) => {
        const deadline = runningActionDeadlineById.get(runningAction.id);

        if (deadline === undefined) {
          return runningAction;
        }

        return {
          ...runningAction,
          remainingMs: Math.max(0, deadline - Date.now()),
        };
      }),
    };
  }

  function hydrateRunningActions(nextState: GameState): GameState {
    if (nextState.runningActions.length === 0) {
      clearRunningActionTimers();
      return nextState;
    }

    clearRunningActionTimers();

    const updatedAtMs = Number.parseInt(String(Date.parse(nextState.updatedAt ?? '')), 10);
    const referenceMs = Number.isFinite(updatedAtMs) ? updatedAtMs : Date.now();
    const now = Date.now();

    let hydratedState: GameState = {
      ...nextState,
      runningActions: nextState.runningActions.map((runningAction) => {
        const deadline = referenceMs + Math.max(0, runningAction.remainingMs);

        return {
          ...runningAction,
          remainingMs: Math.max(0, deadline - now),
        };
      }),
    };

    const completedActionIds = hydratedState.runningActions
      .filter((runningAction) => runningAction.remainingMs === 0)
      .map((runningAction) => runningAction.id);

    for (const actionId of completedActionIds) {
      hydratedState = applyAction(hydratedState, { type: 'COMPLETE_RUNNING_ACTION', actionId });
    }

    synchronizeRunningActionTimers(hydratedState);

    return hydratedState;
  }

  async function persistState(nextState: GameState = state, statusKey = 'save.status.autosaved'): Promise<void> {
    if (!autosaveEnabled) {
      return;
    }

    try {
      await writeLocalSave(getPersistedState(nextState));
      hasExistingLocalSave = hasLocalSave();
      setSaveStatus(statusKey);
    } catch {
      setSaveError('save.error.invalidState');
    }
  }

  async function continueLocalSave(showStatus = true): Promise<void> {
    const result = await loadLocalSave();
    const restoredSave = result?.ok && result.warnings?.includes('restored_missing_fields') === true;

    hasExistingLocalSave = hasLocalSave();

    if (!result) {
      return;
    }

    if (!result.ok) {
      autosaveEnabled = false;
      setSaveError(getImportErrorMessageKey(result.reason));
      return;
    }

    clearRunningActionTimers();
    stopRunningActionPoll();
    const hydratedState = hydrateRunningActions(result.state);
    const shouldPersistHydratedState = hydratedState !== result.state;

    state = hydratedState;
    autosaveEnabled = true;
    setSaveError(undefined);

    if (result.modified) {
      setSaveStatus('save.status.modifiedMode');
      return;
    }

    if (restoredSave) {
      await persistState(state, 'save.status.restored');
      return;
    }

    if (shouldPersistHydratedState) {
      await persistState(state, showStatus ? 'save.status.imported' : 'save.status.autosaved');

      if (!showStatus) {
        saveStatusKey = undefined;
      }

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

    clearRunningActionTimers();
    stopRunningActionPoll();
    state = nextState;
    autosaveEnabled = true;
    await persistState(nextState);
  }

  async function applyImportedState(nextState: GameState, statusKey: string): Promise<void> {
    clearRunningActionTimers();
    stopRunningActionPoll();
    state = hydrateRunningActions(nextState);
    autosaveEnabled = true;
    await persistState(state, statusKey);
  }

  function resetLocalSaveState(): void {
    clearRunningActionTimers();
    stopRunningActionPoll();
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

    const previousRunningActionIds = previousState.runningActions.map((runningAction) => runningAction.id).join('|');
    const nextRunningActionIds = state.runningActions.map((runningAction) => runningAction.id).join('|');
    const runningActionsChanged = previousRunningActionIds !== nextRunningActionIds;
    const boughtTechnology = action.type === 'BUY_TECHNOLOGY';
    const choseBusinessOption = action.type === 'CHOOSE_BUSINESS_OPTION';
    const executedCrisisAction = action.type === 'EXECUTE_CRISIS_ACTION';
    const updatedEmployees =
      action.type === 'ASSIGN_EMPLOYEE_TASK' || action.type === 'UNASSIGN_EMPLOYEE';
    const updatedSettings = action.type === 'UPDATE_SETTINGS';
    const dismissedOnboarding = action.type === 'DISMISS_ONBOARDING';
    const dismissedSeasonSummary = action.type === 'DISMISS_SEASON_SUMMARY';
    const businessStageChanged = previousState.businessStageId !== state.businessStageId;
    const crisisLevelChanged = previousState.crisis.level !== state.crisis.level;
    const objectiveStateChanged =
      previousState.objectives !== state.objectives ||
      previousState.completedObjectiveIds.length !== state.completedObjectiveIds.length;
    const seasonStateChanged =
      previousState.currentSeasonId !== state.currentSeasonId ||
      previousState.completedSeasonIds.length !== state.completedSeasonIds.length ||
      previousState.showSeasonSummary !== state.showSeasonSummary;
    const progressionCountersChanged =
      previousState.survivedIncidentCount !== state.survivedIncidentCount ||
      previousState.resolvedCrisisCount !== state.resolvedCrisisCount;
    const onboardingChanged = previousState.showOnboarding !== state.showOnboarding;

    if (runningActionsChanged) {
      synchronizeRunningActionTimers(state);
    }

    if (
      runningActionsChanged ||
      boughtTechnology ||
      choseBusinessOption ||
      executedCrisisAction ||
      dismissedOnboarding ||
      dismissedSeasonSummary ||
      updatedEmployees ||
      updatedSettings ||
      businessStageChanged ||
      crisisLevelChanged ||
      objectiveStateChanged ||
      seasonStateChanged ||
      progressionCountersChanged ||
      onboardingChanged
    ) {
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
    if (
      tickerId !== undefined ||
      (!hasRunningActions && !hasPassiveProduction && !hasEmployeeActivity && !hasCrisisActivity)
    ) {
      return;
    }

    lastTickAt = Date.now();

    tickerId = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = Math.max(0, now - lastTickAt);

      lastTickAt = now;
      dispatch({ type: 'TICK', deltaMs });

      if (!hasRunningActions && !hasPassiveProduction && !hasEmployeeActivity && !hasCrisisActivity) {
        stopTicker();
      }
    }, 1000);
  }

  function scheduleRunningActionTimer(runningAction: RunningAction): void {
    if (!runningActionDeadlineById.has(runningAction.id)) {
      runningActionDeadlineById.set(runningAction.id, Date.now() + runningAction.remainingMs);
    }

    if (runningActionTimeoutById.has(runningAction.id)) {
      return;
    }

    const deadline = runningActionDeadlineById.get(runningAction.id) ?? Date.now() + runningAction.remainingMs;
    const timeoutId = window.setTimeout(() => {
      runningActionTimeoutById.delete(runningAction.id);
      runningActionDeadlineById.delete(runningAction.id);
      dispatch({ type: 'COMPLETE_RUNNING_ACTION', actionId: runningAction.id });
    }, Math.max(0, deadline - Date.now()));

    runningActionTimeoutById.set(runningAction.id, timeoutId);
  }

  function flushCompletedRunningActions(referenceNow = Date.now()): void {
    const completedActionIds = state.runningActions
      .filter((runningAction) => {
        const deadline = runningActionDeadlineById.get(runningAction.id) ?? referenceNow + runningAction.remainingMs;

        return deadline <= referenceNow;
      })
      .map((runningAction) => runningAction.id);

    for (const actionId of completedActionIds) {
      clearRunningActionTimer(actionId);
      dispatch({ type: 'COMPLETE_RUNNING_ACTION', actionId });
    }
  }

  function synchronizeRunningActionTimers(nextState: GameState = state): void {
    const activeActionIds = new Set(nextState.runningActions.map((runningAction) => runningAction.id));

    for (const actionId of [...runningActionTimeoutById.keys()]) {
      if (!activeActionIds.has(actionId)) {
        clearRunningActionTimer(actionId);
      }
    }

    for (const runningAction of nextState.runningActions) {
      scheduleRunningActionTimer(runningAction);
    }
  }

  function formatSignedValue(value: number): string {
    const roundedValue = Math.round(value);

    return `${roundedValue > 0 ? '+' : ''}${roundedValue}`;
  }

  function formatResourceEntries(entries: Array<[string, number]>): string {
    return entries
      .map(([resourceId, amount]) => `${t(`resources.${resourceId}`, state.settings.locale)} ${formatSignedValue(amount)}`)
      .join(' · ');
  }

  function getActionTooltip(actionId: ManualActionId): string {
    const definition = getManualActionDefinition(actionId);
    const effectEntries = Object.entries(definition.effect) as Array<[ResourceId, number]>;
    const costEntries = Object.entries(definition.cost).filter(([, amount]) => amount !== 0) as Array<
      [ResourceId, number]
    >;
    const lines = [t(`actions.${actionId}.description`, state.settings.locale)];

    lines.push(`${t('ui.tooltip.duration', state.settings.locale)}: ${Math.round(definition.durationMs / 1000)} s`);

    if (effectEntries.length > 0) {
      lines.push(
        `${t('ui.tooltip.gains', state.settings.locale)}: ${formatResourceEntries(effectEntries)}`,
      );
    }

    if (costEntries.length > 0) {
      lines.push(
        `${t('ui.tooltip.cost', state.settings.locale)}: ${formatResourceEntries(
          costEntries.map(([resourceId, amount]) => [resourceId, -amount]),
        )}`,
      );
    }

    return lines.join('\n');
  }

  async function handleManualSave(): Promise<void> {
    autosaveEnabled = true;
    await persistState(state, 'save.status.saved');
  }

  async function handleExport(): Promise<void> {
    try {
      await downloadSaveFile(getPersistedState(state));
      setSaveError(undefined);
      setSaveStatus('save.status.exported');
    } catch {
      setSaveStatus(undefined);
      setSaveError('save.error.invalidPayload');
    }
  }

  function openImportDialog(): void {
    importFileInput?.click();
  }

  async function handleImportChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const raw = await file.text();
    const result = await importSaveEnvelope(raw);
    const restoredSave = result.ok && result.warnings?.includes('restored_missing_fields') === true;

    if (!result.ok) {
      setSaveStatus(undefined);
      setSaveError(getImportErrorMessageKey(result.reason));
      input.value = '';
      return;
    }

    if (result.modified) {
      const confirmed = window.confirm(
        `${t('save.modifiedDetected.title', state.settings.locale)}\n\n${t('save.modifiedDetected.body', state.settings.locale)}`,
      );

      if (!confirmed) {
        input.value = '';
        return;
      }

      await applyImportedState(
        {
          ...result.state,
          modified: true,
        },
        'save.status.modifiedMode',
      );
      input.value = '';
      utilityPanel = undefined;
      return;
    }

    const confirmed = window.confirm(t('save.import.replaceWarning', state.settings.locale));

    if (!confirmed) {
      input.value = '';
      return;
    }

    await applyImportedState(result.state, restoredSave ? 'save.status.restored' : 'save.status.imported');
    input.value = '';
    utilityPanel = undefined;
  }

  async function handleRestart(): Promise<void> {
    const confirmed = window.confirm(t('save.newGame.warning', state.settings.locale));

    if (!confirmed) {
      return;
    }

    utilityPanel = undefined;
    await startNewGame();
  }

  function toggleOptionsPanel(): void {
    utilityPanel = utilityPanel === 'options' ? undefined : 'options';
  }

  $: availableActions = getAvailableManualActions(state);
  $: visibleTabs = getVisibleTabs(state);
  $: effectiveStats = getEffectiveStats(state);
  $: infrastructureMapView = getInfrastructureMapView(state);
  $: activeIncidentSummaries = getActiveIncidentSummaries(state);
  $: lastThreatEvent = getLastThreatEvent(state);
  $: showThreatPanel = isThreatPanelVisible(state);
  $: threatPressure = Math.round(getThreatPressure(state));
  $: cyberMaturity = Math.round(getCyberMaturity(state));
  $: businessStageNameKey = getBusinessStage(state).nameKey;
  $: hasRunningActions = state.runningActions.length > 0;
  $: hasPassiveProduction =
    effectiveStats.logsPerTick > 0 ||
    effectiveStats.findingsPerTick > 0 ||
    effectiveStats.proofsPerTick > 0 ||
    effectiveStats.budgetPerTick > 0;
  $: hasEmployeeActivity = hasEmployeeTickActivity(state);
  $: hasCrisisActivity = isInCrisis(state);
  $: runningActionById = new Map(state.runningActions.map((runningAction) => [runningAction.id, runningAction]));
  $: visibleActions = [...new Set([...availableActions, ...state.runningActions.map((runningAction) => runningAction.id)])];
  $: currentFooterMessageKey = saveErrorKey ?? saveStatusKey;
  $: if (!visibleTabs.some((tab) => tab.id === activeTab)) {
    activeTab = 'soc';
  }
  $: synchronizeRunningActionTimers();
  $: if (hasRunningActions) {
    startRunningActionPoll();
  } else {
    stopRunningActionPoll();
  }
  $: if (hasRunningActions || hasPassiveProduction || hasEmployeeActivity || hasCrisisActivity) {
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
    clearRunningActionTimers();
    stopRunningActionPoll();

    if (autosaveId !== undefined) {
      window.clearInterval(autosaveId);
    }
  });
</script>

<svelte:head>
  <title>{t('app.title', state.settings.locale)}</title>
</svelte:head>

<main class="app-shell">
  <header class="topbar">
    <div class="topbar__brand">
      <h1 id="app-title">{t('app.title', state.settings.locale)}</h1>
    </div>

    {#if visibleTabs.length > 1}
      <nav class="topbar__nav" aria-label={t('ui.tabs.title', state.settings.locale)}>
        {#each visibleTabs as tab (tab.id)}
          <button
            type="button"
            class={`app-tab ${activeTab === tab.id ? 'app-tab--active' : ''}`}
            onclick={() => {
              activeTab = tab.id;
            }}
          >
            {t(tab.labelKey, state.settings.locale)}
          </button>
        {/each}
      </nav>
    {:else}
      <div class="topbar__nav topbar__nav--muted">
        <span>{t('ui.tab.soc', state.settings.locale)}</span>
      </div>
    {/if}

    <div class="topbar__meta">
      {#if state.modified === true}
        <span class="topbar__status">{t('save.status.modifiedMode', state.settings.locale)}</span>
      {/if}
    </div>
  </header>

  <section class="play-area" aria-labelledby="app-title">
    <aside class="rail rail--left">
      <NarrativeLog entries={state.narrativeLog} locale={state.settings.locale} />

      <ObjectivePanel state={state} locale={state.settings.locale} compact={true} />
    </aside>

    <section class="rail rail--center" aria-live="polite">
      {#if activeTab === 'soc'}
        {#if state.showOnboarding}
          <section class="stage-panel stage-panel--quiet" aria-labelledby="soc-onboarding-title">
            <div class="stage-panel__header">
              <div>
                <p class="stage-panel__kicker">{t('ui.tab.soc', state.settings.locale)}</p>
                <h2 id="soc-onboarding-title">{t('onboarding.title', state.settings.locale)}</h2>
              </div>
            </div>

            <p class="stage-panel__text">{t('onboarding.body', state.settings.locale)}</p>

            <button
              type="button"
              class="stage-panel__link"
              onclick={() => dispatch({ type: 'DISMISS_ONBOARDING' })}
            >
              {t('onboarding.start', state.settings.locale)}
            </button>
          </section>
        {:else if showThreatPanel}
          <ThreatPanel
            locale={state.settings.locale}
            threatPressure={threatPressure}
            cyberMaturity={cyberMaturity}
            businessStageNameKey={businessStageNameKey}
            lastThreatEvent={lastThreatEvent}
            activeIncidents={activeIncidentSummaries}
          />
        {:else}
          <section class="stage-panel stage-panel--quiet" aria-labelledby="soc-idle-title">
            <div class="stage-panel__header">
              <div>
                <p class="stage-panel__kicker">{t('ui.tab.soc', state.settings.locale)}</p>
                <h2 id="soc-idle-title">{t('ui.soc.idle.title', state.settings.locale)}</h2>
              </div>

              <span class="stage-panel__badge">{Math.round(state.resources.visibility)}%</span>
            </div>

            <p class="stage-panel__text">{t('ui.soc.idle.body', state.settings.locale)}</p>
          </section>
        {/if}

        <section class="actions actions--center" aria-labelledby="actions-title">
          <div class="stage-panel__header">
            <div>
              <p class="stage-panel__kicker">{t('ui.tab.soc', state.settings.locale)}</p>
              <h2 id="actions-title">{t('ui.actions.title', state.settings.locale)}</h2>
            </div>
          </div>

          <div class="actions__list">
            {#each visibleActions as actionId (actionId)}
              <ActionButton
                labelKey={`actions.${actionId}.label`}
                descriptionKey={`actions.${actionId}.description`}
                locale={state.settings.locale}
                disabled={runningActionById.has(actionId)}
                isRunning={runningActionById.has(actionId)}
                remainingMs={runningActionById.get(actionId)?.remainingMs}
                durationMs={runningActionById.get(actionId)?.durationMs}
                tooltipText={getActionTooltip(actionId)}
                onActivate={() => dispatch({ type: 'START_MANUAL_ACTION', actionId })}
              />
            {/each}
          </div>
        </section>
      {/if}

      {#if activeTab === 'tech'}
        <TechPanel
          state={state}
          locale={state.settings.locale}
          onBuy={(technologyId) => dispatch({ type: 'BUY_TECHNOLOGY', technologyId })}
        />
      {/if}

      {#if activeTab === 'team'}
        <EmployeePanel
          state={state}
          locale={state.settings.locale}
          onAssign={(employeeId, taskId) => dispatch({ type: 'ASSIGN_EMPLOYEE_TASK', employeeId, taskId })}
          onUnassign={(employeeId) => dispatch({ type: 'UNASSIGN_EMPLOYEE', employeeId })}
        />
      {/if}

      {#if activeTab === 'business'}
        <BusinessPanel
          state={state}
          locale={state.settings.locale}
          onChoose={(eventId, choiceId) => dispatch({ type: 'CHOOSE_BUSINESS_OPTION', eventId, choiceId })}
        />
      {/if}

      {#if activeTab === 'crisis'}
        <CrisisPanel
          state={state}
          locale={state.settings.locale}
          onExecute={(crisisActionId) => dispatch({ type: 'EXECUTE_CRISIS_ACTION', crisisActionId })}
        />
      {/if}

      {#if state.showSeasonSummary}
        <div class="overlay-layer">
          <div class="overlay-panel overlay-panel--wide">
            <SeasonSummaryPanel
              state={state}
              locale={state.settings.locale}
              onClose={() => dispatch({ type: 'DISMISS_SEASON_SUMMARY' })}
            />
          </div>
        </div>
      {/if}
    </section>

    <aside class="rail rail--right">
      <ResourcePanel state={state} locale={state.settings.locale} />

      {#if showThreatPanel}
        <section class="signal-panel" aria-labelledby="signal-title">
          <h2 id="signal-title">{t('ui.signals.title', state.settings.locale)}</h2>

          <dl class="signal-panel__list">
            <div>
              <dt>{t('threat.pressure', state.settings.locale)}</dt>
              <dd>{threatPressure}</dd>
            </div>
            <div>
              <dt>{t('threat.maturity', state.settings.locale)}</dt>
              <dd>{cyberMaturity}</dd>
            </div>
            <div>
              <dt>{t('threat.stage', state.settings.locale)}</dt>
              <dd>{t(businessStageNameKey, state.settings.locale)}</dd>
            </div>
          </dl>
        </section>
      {/if}

      <InfrastructureMap
        mapView={infrastructureMapView}
        animationMode={state.settings.animationMode}
        locale={state.settings.locale}
      />
    </aside>
  </section>

  <footer class="app-footer">
    <div class="app-footer__links">
      <button type="button" class="footer-link" onclick={handleManualSave}>
        {t('ui.footer.save', state.settings.locale)}
      </button>
      <button type="button" class="footer-link" onclick={handleExport}>
        {t('ui.footer.export', state.settings.locale)}
      </button>
      <button type="button" class="footer-link" onclick={openImportDialog}>
        {t('ui.footer.import', state.settings.locale)}
      </button>
      <button type="button" class="footer-link" onclick={handleRestart}>
        {t('ui.footer.restart', state.settings.locale)}
      </button>
      <button type="button" class="footer-link" onclick={toggleOptionsPanel}>
        {t('ui.footer.options', state.settings.locale)}
      </button>
    </div>

    {#if currentFooterMessageKey}
      <p class={`app-footer__message ${saveErrorKey ? 'app-footer__message--error' : ''}`}>
        {t(currentFooterMessageKey, state.settings.locale)}
      </p>
    {/if}

    {#if utilityPanel === 'options'}
      <div class="footer-popover">
        <div class="footer-popover__header">
          <strong>{t('settings.title', state.settings.locale)}</strong>
          <button type="button" class="footer-link footer-link--close" onclick={() => (utilityPanel = undefined)}>
            {t('ui.footer.close', state.settings.locale)}
          </button>
        </div>

        <SettingsPanel
          settings={state.settings}
          locale={state.settings.locale}
          compact={true}
          onSetAnimationMode={setAnimationMode}
        />
      </div>
    {/if}

    <input
      bind:this={importFileInput}
      class="app-hidden-input"
      type="file"
      accept=".json,application/json"
      onchange={handleImportChange}
    />
  </footer>
</main>
