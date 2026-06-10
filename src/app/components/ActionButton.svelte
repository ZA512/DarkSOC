<script lang="ts">
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let labelKey: string;
  export let descriptionKey: string;
  export let locale: Locale = 'fr';
  export let disabled = false;
  export let isRunning = false;
  export let remainingMs: number | undefined = undefined;
  export let durationMs: number | undefined = undefined;
  export let tooltipText = '';
  export let onActivate: () => void;

  $: remainingPercent =
    isRunning && typeof remainingMs === 'number' && typeof durationMs === 'number' && durationMs > 0
      ? Math.max(0, Math.min(100, (remainingMs / durationMs) * 100))
      : 0;

  $: cooldownStyle =
    isRunning && typeof remainingMs === 'number'
      ? `width: ${remainingPercent}%; animation-duration: ${Math.max(remainingMs, 1)}ms;`
      : '';
</script>

<div class="action-entry" title={tooltipText}>
  <button
    type="button"
    class="action-button"
    class:action-button--running={isRunning}
    aria-busy={isRunning}
    {disabled}
    onclick={onActivate}
  >
    {#if isRunning}
      <span
        class="action-button__cooldown action-button__cooldown--animate"
        aria-hidden="true"
        style={cooldownStyle}
      ></span>
    {/if}

    <span class="action-button__content">
      <span class="action-button__label">{t(labelKey, locale)}</span>
    </span>

    <span class="sr-only">{t(descriptionKey, locale)}</span>
  </button>
</div>
