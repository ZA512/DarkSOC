<script lang="ts">
  import {
    canBuyTechnology,
    getAvailableTechnologies,
    getLockedTechnologies,
    getTechnologyMissingRequirements,
    getTechnologyMissingResources,
    getUnlockedTechnologies,
  } from '../../game/engine/selectors';
  import type { GameState } from '../../game/model/GameState';
  import type { Technology } from '../../game/model/Technology';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onBuy: (technologyId: string) => void;

  $: unlockedTechnologies = getUnlockedTechnologies(state);
  $: availableTechnologies = getAvailableTechnologies(state);
  $: lockedTechnologies = getLockedTechnologies(state);

  function formatTechnologyName(technologyId: string): string {
    return t(`technologies.${technologyId}.name`, locale);
  }

  function formatResourceList(entries: Array<[string, number]>): string {
    return entries.map(([resourceId, amount]) => `${t(`resources.${resourceId}`, locale)}: ${amount}`).join(' • ');
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
</script>

<section class="tech-panel" aria-labelledby="tech-title">
  <h2 id="tech-title">{t('tech.title', locale)}</h2>

  {#if availableTechnologies.length > 0}
    <div class="tech-panel__section">
      <p class="tech-panel__section-title">{t('tech.available', locale)}</p>

      {#each availableTechnologies as technology (technology.id)}
        <article class="tech-card">
          <div class="tech-card__header">
            <div>
              <h3>{formatTechnologyName(technology.id)}</h3>
              <p>{t(`technologies.${technology.id}.description`, locale)}</p>
            </div>

            <span class="tech-card__status tech-card__status--available">
              {t(getStatusKey(technology), locale)}
            </span>
          </div>

          <p class="tech-card__meta">
            <span class="tech-card__meta-label">{t('tech.cost', locale)}</span>
            <span>{formatCost(technology)}</span>
          </p>

          {#if !canBuyTechnology(state, technology.id)}
            <p class="tech-card__hint">
              <span class="tech-card__meta-label">{t('tech.insufficientResources', locale)}</span>
              <span>{formatMissingResources(technology.id)}</span>
            </p>
          {/if}

          <button
            type="button"
            class="tech-card__button"
            disabled={!canBuyTechnology(state, technology.id)}
            onclick={() => onBuy(technology.id)}
          >
            {t('tech.buy', locale)}
          </button>
        </article>
      {/each}
    </div>
  {/if}

  {#if lockedTechnologies.length > 0}
    <div class="tech-panel__section">
      <p class="tech-panel__section-title">{t('tech.locked', locale)}</p>

      {#each lockedTechnologies as technology (technology.id)}
        <article class="tech-card tech-card--locked">
          <div class="tech-card__header">
            <div>
              <h3>{formatTechnologyName(technology.id)}</h3>
              <p>{t(`technologies.${technology.id}.description`, locale)}</p>
            </div>

            <span class="tech-card__status tech-card__status--locked">{t('tech.locked', locale)}</span>
          </div>

          <p class="tech-card__meta">
            <span class="tech-card__meta-label">{t('tech.cost', locale)}</span>
            <span>{formatCost(technology)}</span>
          </p>

          {#if getTechnologyMissingRequirements(state, technology.id).length > 0}
            <p class="tech-card__hint">
              <span class="tech-card__meta-label">{t('tech.requires', locale)}</span>
              <span>{formatRequirements(technology.id)}</span>
            </p>
          {/if}
        </article>
      {/each}
    </div>
  {/if}

  {#if unlockedTechnologies.length > 0}
    <div class="tech-panel__section">
      <p class="tech-panel__section-title">{t('tech.unlocked', locale)}</p>

      {#each unlockedTechnologies as technology (technology.id)}
        <article class="tech-card tech-card--unlocked">
          <div class="tech-card__header">
            <div>
              <h3>{formatTechnologyName(technology.id)}</h3>
              <p>{t(`technologies.${technology.id}.description`, locale)}</p>
            </div>

            <span class="tech-card__status tech-card__status--unlocked">
              {t('tech.unlocked', locale)}
            </span>
          </div>

          <p class="tech-card__meta">
            <span class="tech-card__meta-label">{t('tech.cost', locale)}</span>
            <span>{formatCost(technology)}</span>
          </p>
        </article>
      {/each}
    </div>
  {/if}
</section>