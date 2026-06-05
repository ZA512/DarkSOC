<script lang="ts">
  import ActionButton from './components/ActionButton.svelte';
  import InfrastructureMap from './components/InfrastructureMap.svelte';
  import NarrativeLog from './components/NarrativeLog.svelte';
  import ResourcePanel from './components/ResourcePanel.svelte';
  import type { GameAction } from '../game/engine/actions';
  import { applyAction } from '../game/engine/reducer';
  import { createInitialGameState } from '../game/model/GameState';
  import { t } from '../i18n/i18n';

  let state = createInitialGameState();

  function dispatch(action: GameAction): void {
    state = applyAction(state, action);
  }
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

      <section class="actions" aria-labelledby="actions-title">
        <h2 id="actions-title">{t('ui.actions.title', state.settings.locale)}</h2>
        <ActionButton
          labelKey="actions.collect_logs.label"
          descriptionKey="actions.collect_logs.description"
          locale={state.settings.locale}
          onActivate={() => dispatch({ type: 'COLLECT_LOGS' })}
        />
      </section>
    </div>

    <InfrastructureMap assets={state.assets} locale={state.settings.locale} />
  </section>

  <ResourcePanel resources={state.resources} locale={state.settings.locale} />
</main>
