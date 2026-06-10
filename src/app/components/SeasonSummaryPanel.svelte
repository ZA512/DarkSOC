<script lang="ts">
  import { getCompletedObjectives, getCurrentSeason } from '../../game/engine/selectors';
  import { getCyberMaturity, getThreatPressure } from '../../game/engine/threat';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onClose: () => void;

  $: currentSeason = getCurrentSeason(state);
  $: completedObjectives = getCompletedObjectives(state);
  $: threatPressure = Math.round(getThreatPressure(state));
  $: cyberMaturity = Math.round(getCyberMaturity(state));
</script>

<section class="season-summary" aria-labelledby="season-summary-title">
  <div class="season-summary__header">
    <div>
      <p class="season-summary__eyebrow">{t('seasons.summary.title', locale)}</p>
      <h2 id="season-summary-title">{t(currentSeason.titleKey, locale)}</h2>
    </div>

    <button type="button" class="season-summary__button" onclick={onClose}>
      {t('seasons.summary.close', locale)}
    </button>
  </div>

  <p class="season-summary__message">{t(currentSeason.completionMessageKey, locale)}</p>

  <div class="season-summary__metrics">
    <article class="season-summary__metric">
      <span class="season-summary__metric-label">{t('resources.visibility', locale)}</span>
      <strong>{Math.round(state.resources.visibility)}</strong>
    </article>

    <article class="season-summary__metric">
      <span class="season-summary__metric-label">{t('resources.trust', locale)}</span>
      <strong>{Math.round(state.resources.trust)}</strong>
    </article>

    <article class="season-summary__metric">
      <span class="season-summary__metric-label">{t('resources.knownDebt', locale)}</span>
      <strong>{Math.round(state.resources.knownDebt)}</strong>
    </article>

    <article class="season-summary__metric">
      <span class="season-summary__metric-label">{t('threat.pressure', locale)}</span>
      <strong>{threatPressure}</strong>
    </article>

    <article class="season-summary__metric">
      <span class="season-summary__metric-label">{t('threat.maturity', locale)}</span>
      <strong>{cyberMaturity}</strong>
    </article>

    <article class="season-summary__metric">
      <span class="season-summary__metric-label">{t('seasons.summary.survivedIncidents', locale)}</span>
      <strong>{state.survivedIncidentCount}</strong>
    </article>
  </div>

  <div class="season-summary__section">
    <span class="season-summary__section-label">{t('seasons.summary.completedObjectives', locale)}</span>
    <ul class="season-summary__list">
      {#each completedObjectives as objective (objective.id)}
        <li>{t(objective.titleKey, locale)}</li>
      {/each}
    </ul>
  </div>
</section>