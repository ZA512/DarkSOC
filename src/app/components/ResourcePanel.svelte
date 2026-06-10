<script lang="ts">
  import { selectVisibleResources } from '../../game/engine/selectors';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';

  $: visibleResources = selectVisibleResources(state);

  function formatResourceValue(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
</script>

<section class="resource-panel" aria-labelledby="resources-title">
  <h2 id="resources-title">{t('ui.resources.title', locale)}</h2>
  <dl>
    {#each visibleResources as resource (resource.id)}
      <div class="resource-panel__item">
        <dt>{t(`resources.${resource.id}`, locale)}</dt>
        <dd>{formatResourceValue(resource.value)}</dd>
      </div>
    {/each}
  </dl>
</section>
