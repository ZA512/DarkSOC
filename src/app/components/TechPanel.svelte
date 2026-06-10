<script lang="ts">
  import {
    canBuyTechnology,
    getVisibleAvailableTechnologies,
    getVisibleLockedTechnologies,
    getTechnologyMissingRequirements,
    getTechnologyMissingResources,
    getVisibleUnlockedTechnologies,
  } from '../../game/engine/selectors';
  import type { GameState } from '../../game/model/GameState';
  import type { Technology } from '../../game/model/Technology';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onBuy: (technologyId: string) => void;

  $: unlockedTechnologies = getVisibleUnlockedTechnologies(state);
  $: availableTechnologies = getVisibleAvailableTechnologies(state);
  $: lockedTechnologies = getVisibleLockedTechnologies(state);

  function formatTechnologyName(technologyId: string): string {
    return t(`technologies.${technologyId}.name`, locale);
  }

  function formatResourceList(entries: Array<[string, number]>): string {
    return entries.map(([resourceId, amount]) => `${t(`resources.${resourceId}`, locale)}: ${amount}`).join(' • ');
  }

   function formatEffectLabel(effectId: string): string {
     const resourceLabel = t(`resources.${effectId}`, locale);

     if (!resourceLabel.startsWith('[')) {
       return resourceLabel;
     }

     return t(`stats.${effectId}`, locale);
   }

   function formatEffects(technology: Technology): string {
     return Object.entries(technology.effects)
       .map(([effectId, amount]) => `${formatEffectLabel(effectId)} ${amount > 0 ? '+' : ''}${Math.round(amount)}`)
       .join(' · ');
   }

  function formatCost(technology: Technology): string {
    return formatResourceList(Object.entries(technology.cost) as Array<[string, number]>);
  }

  function formatMissingResources(technologyId: string): string {
    return formatResourceList(
      Object.entries(getTechnologyMissingResources(state, technologyId)) as Array<[string, number]>,
    );
  }

  function formatRequirements(technologyId: string): string {
    return getTechnologyMissingRequirements(state, technologyId)
      .map((requiredTechnologyId) => formatTechnologyName(requiredTechnologyId))
      .join(' • ');
  }

  function getStatusKey(technology: Technology): string {
    if (state.unlockedTechnologyIds.includes(technology.id)) {
      return 'tech.unlocked';
    }

    if (getTechnologyMissingRequirements(state, technology.id).length > 0) {
      return 'tech.locked';
    }

    if (canBuyTechnology(state, technology.id)) {
      return 'tech.available';
    }

    return 'tech.insufficientResources';
  }

  function getTooltip(technology: Technology): string {
    const lines = [t(`technologies.${technology.id}.description`, locale)];

    lines.push(`${t('tech.cost', locale)}: ${formatCost(technology)}`);

    if (Object.keys(technology.effects).length > 0) {
      lines.push(`${t('ui.tooltip.effects', locale)}: ${formatEffects(technology)}`);
    }

    if (getTechnologyMissingRequirements(state, technology.id).length > 0) {
      lines.push(`${t('tech.requires', locale)}: ${formatRequirements(technology.id)}`);
    }

    if (!canBuyTechnology(state, technology.id) && getTechnologyMissingResources(technology.id)) {
      const missingResources = formatMissingResources(technology.id);

      if (missingResources.length > 0) {
        lines.push(`${t('tech.insufficientResources', locale)}: ${missingResources}`);
      }
    }

    return lines.join('\n');
  }
</script>

<section class="tech-panel stage-panel" aria-labelledby="tech-title">
  <div class="stage-panel__header">
    <div>
      <p class="stage-panel__kicker">{t('ui.tab.soc', locale)}</p>
      <h2 id="tech-title">{t('tech.title', locale)}</h2>
    </div>
  </div>

  {#if availableTechnologies.length > 0}
    <div class="list-section">
      <p class="list-section__title">{t('tech.available', locale)}</p>

      <ul class="data-list">
        {#each availableTechnologies as technology (technology.id)}
          <li class="data-row" title={getTooltip(technology)}>
            <span class="data-row__name">{formatTechnologyName(technology.id)}</span>
            <span class="data-row__meta">{formatCost(technology)}</span>
            <button
              type="button"
              class="data-row__button"
              disabled={!canBuyTechnology(state, technology.id)}
              onclick={() => onBuy(technology.id)}
            >
              {t('tech.buy', locale)}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if lockedTechnologies.length > 0}
    <div class="list-section">
      <p class="list-section__title">{t('tech.locked', locale)}</p>

      <ul class="data-list">
        {#each lockedTechnologies as technology (technology.id)}
          <li class="data-row data-row--muted" title={getTooltip(technology)}>
            <span class="data-row__name">{formatTechnologyName(technology.id)}</span>
            <span class="data-row__meta">{formatCost(technology)}</span>
            <span class="data-row__status">{t('tech.locked', locale)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if unlockedTechnologies.length > 0}
    <div class="list-section">
      <p class="list-section__title">{t('tech.unlocked', locale)}</p>

      <ul class="data-list">
        {#each unlockedTechnologies as technology (technology.id)}
          <li class="data-row" title={getTooltip(technology)}>
            <span class="data-row__name">{formatTechnologyName(technology.id)}</span>
            <span class="data-row__meta">{formatEffects(technology)}</span>
            <span class="data-row__status data-row__status--strong">{t('tech.unlocked', locale)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>