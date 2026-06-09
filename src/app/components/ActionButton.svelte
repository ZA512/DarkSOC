<script lang="ts">
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let labelKey: string;
  export let descriptionKey: string;
  export let locale: Locale = 'fr';
  export let disabled = false;
  export let isRunning = false;
  export let progressPercent: number | undefined = undefined;
  export let onActivate: () => void;

  $: descriptionId = `action-${labelKey.replaceAll('.', '-')}-description`;
  $: progressValue = Math.max(0, Math.min(100, Math.round(progressPercent ?? 0)));
</script>

<button
  type="button"
  class="action-button"
  class:action-button--running={isRunning}
  aria-describedby={descriptionId}
  aria-busy={isRunning}
  {disabled}
  onclick={onActivate}
>
  <span class="action-button__label">{t(labelKey, locale)}</span>
  <span id={descriptionId} class="action-button__description">
    {t(descriptionKey, locale)}
  </span>

  {#if isRunning}
    <span class="action-button__meta">
      <span>{t('actions.running', locale)}</span>
      <span>{progressValue} %</span>
    </span>
    <span
      class="action-button__progress"
      role="progressbar"
      aria-label={t('actions.progress', locale)}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={progressValue}
    >
      <span class="action-button__progress-fill" style={`width: ${progressValue}%`}></span>
    </span>
  {/if}
</button>
