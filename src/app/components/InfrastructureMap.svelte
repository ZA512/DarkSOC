<script lang="ts">
  import type { AssetStatus, InfrastructureAsset } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let assets: InfrastructureAsset[];
  export let locale: Locale = 'fr';

  $: visibleAssets = assets.filter((asset) => asset.discovered);

  function getAssetClass(status: AssetStatus): string {
    return `infrastructure-map__node infrastructure-map__node--${status}`;
  }
</script>

<aside class="infrastructure-map" aria-labelledby="infrastructure-title">
  <h2 id="infrastructure-title">{t('ui.infrastructure.title', locale)}</h2>

  <svg
    class="infrastructure-map__svg"
    viewBox="0 0 100 100"
    role="img"
    aria-label={t('ui.infrastructure.placeholder', locale)}
  >
    <rect class="infrastructure-map__background" x="0" y="0" width="100" height="100" rx="2" />

    {#each visibleAssets as asset (asset.id)}
      <circle class="infrastructure-map__halo" cx={asset.x} cy={asset.y} r="7" />
      <circle class={getAssetClass(asset.status)} cx={asset.x} cy={asset.y} r="2.6">
        <title>{t(asset.labelKey, locale)}</title>
      </circle>
    {/each}
  </svg>

  <p>{t('ui.infrastructure.placeholder', locale)}</p>
</aside>
