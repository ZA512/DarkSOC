<script lang="ts">
  import type { GameSettings, AnimationMode, Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let settings: GameSettings;
  export let locale: Locale = 'fr';
  export let compact = false;
  export let onSetAnimationMode: (animationMode: AnimationMode) => void;

  const animationModes: AnimationMode[] = ['normal', 'reduced', 'off'];

  function handleAnimationModeChange(event: Event): void {
    const animationMode = (event.currentTarget as HTMLSelectElement).value as AnimationMode;

    onSetAnimationMode(animationMode);
  }
</script>

<section class={`settings-panel ${compact ? 'settings-panel--compact' : ''}`} aria-label={t('settings.title', locale)}>
  {#if !compact}
    <h2 id="settings-title">{t('settings.title', locale)}</h2>
  {/if}

  <label class="settings-panel__field" for="animation-mode-select">
    <span class="settings-panel__label">{t('settings.animationMode.label', locale)}</span>
    <select
      id="animation-mode-select"
      class="settings-panel__select"
      value={settings.animationMode}
      onchange={handleAnimationModeChange}
    >
      {#each animationModes as animationMode}
        <option value={animationMode}>{t(`settings.animationMode.${animationMode}`, locale)}</option>
      {/each}
    </select>
  </label>

  <p class="settings-panel__hint">{t('settings.animationMode.hint', locale)}</p>
</section>