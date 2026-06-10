<script lang="ts">
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let locale: Locale = 'fr';
  export let onStart: () => void;
</script>

<section class="onboarding-panel" aria-labelledby="onboarding-title">
  <div class="onboarding-panel__content">
    <h2 id="onboarding-title">{t('onboarding.title', locale)}</h2>
    <p class="onboarding-panel__body">{t('onboarding.body', locale)}</p>
  </div>

  <button type="button" class="onboarding-panel__button" onclick={onStart}>
    {t('onboarding.start', locale)}
  </button>
</section>