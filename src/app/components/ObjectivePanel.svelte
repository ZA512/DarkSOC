<script lang="ts">
  import {
    getActiveObjectives,
    getCompletedObjectives,
    getCurrentSeason,
    getLockedObjectives,
    getSeasonProgress,
    type ObjectiveView,
  } from '../../game/engine/selectors';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let compact = false;

  $: currentSeason = getCurrentSeason(state);
  $: activeObjectives = getActiveObjectives(state);
  $: completedObjectives = getCompletedObjectives(state);
  $: lockedObjectives = getLockedObjectives(state);
  $: seasonProgress = getSeasonProgress(state);
  $: primaryObjective = activeObjectives[0];

  function getRewardEntries(objective: ObjectiveView): Array<[string, number]> {
    return Object.entries(objective.reward ?? {}).filter(([, amount]) => amount !== 0) as Array<
      [string, number]
    >;
  }

  function formatSignedValue(value: number): string {
    const roundedValue = Math.round(value);

    return `${roundedValue > 0 ? '+' : ''}${roundedValue}`;
  }

  function getStatusKey(status: ObjectiveView['status']): string {
    return `objectives.${status}`;
  }

  function getTooltip(objective: ObjectiveView): string {
    const lines = [t(objective.descriptionKey, locale)];

    if (objective.hintKey) {
      lines.push(t(objective.hintKey, locale));
    }

    if (getRewardEntries(objective).length > 0) {
      lines.push(
        `${t('objectives.reward', locale)}: ${getRewardEntries(objective)
          .map(([resourceId, amount]) => `${t(`resources.${resourceId}`, locale)} ${formatSignedValue(amount)}`)
          .join(' · ')}`,
      );
    }

    return lines.join('\n');
  }
</script>

<section class={`objective-panel ${compact ? 'objective-panel--compact' : ''}`} aria-label={t('ui.objective.title', locale)}>
  {#if compact}
    <span class="objective-panel__section-label">{t('ui.objective.title', locale)}</span>

    {#if primaryObjective}
      <strong class="objective-panel__title">{t(primaryObjective.titleKey, locale)}</strong>
      <p class="objective-panel__text">
        {primaryObjective.hintKey ? t(primaryObjective.hintKey, locale) : t(primaryObjective.descriptionKey, locale)}
      </p>
    {:else}
      <strong class="objective-panel__title">{t(currentSeason.titleKey, locale)}</strong>
      <p class="objective-panel__text">{t(currentSeason.descriptionKey, locale)}</p>
    {/if}

    <div class="objective-panel__compact-meta">
      <span>{seasonProgress.completedRequiredCount}/{seasonProgress.totalRequiredCount}</span>
      <span>{seasonProgress.percent}%</span>
    </div>
  {:else}
    <div class="objective-panel__header">
      <div>
        <span class="objective-panel__section-label">{t('seasons.title', locale)}</span>
        <h2>{t(currentSeason.titleKey, locale)}</h2>
      </div>

      <span class="objective-panel__badge">{seasonProgress.completedRequiredCount}/{seasonProgress.totalRequiredCount}</span>
    </div>

    <ul class="objective-panel__rows">
      {#each activeObjectives as objective (objective.id)}
        <li class="objective-row" title={getTooltip(objective)}>
          <span class="objective-row__title">{t(objective.titleKey, locale)}</span>
          <span class="objective-row__status objective-row__status--active">{t(getStatusKey(objective.status), locale)}</span>
        </li>
      {/each}

      {#each completedObjectives as objective (objective.id)}
        <li class="objective-row objective-row--muted" title={getTooltip(objective)}>
          <span class="objective-row__title">{t(objective.titleKey, locale)}</span>
          <span class="objective-row__status objective-row__status--completed">{t(getStatusKey(objective.status), locale)}</span>
        </li>
      {/each}

      {#each lockedObjectives as objective (objective.id)}
        <li class="objective-row objective-row--muted" title={getTooltip(objective)}>
          <span class="objective-row__title">{t(objective.titleKey, locale)}</span>
          <span class="objective-row__status objective-row__status--locked">{t(getStatusKey(objective.status), locale)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>