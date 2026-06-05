<script lang="ts">
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let labelKey: string;
  export let descriptionKey: string;
  export let locale: Locale = 'fr';
  export let disabled = false;
  export let onActivate: () => void;

  $: descriptionId = `action-${labelKey.replaceAll('.', '-')}-description`;
</script>

<button
  type="button"
  class="action-button"
  aria-describedby={descriptionId}
  {disabled}
  onclick={onActivate}
>
  <span class="action-button__label">{t(labelKey, locale)}</span>
  <span id={descriptionId} class="action-button__description">
    {t(descriptionKey, locale)}
  </span>
</button>
