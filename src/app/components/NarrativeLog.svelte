<script lang="ts">
  import type { NarrativeLogEntry } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let entries: NarrativeLogEntry[];
  export let locale: Locale = 'fr';
</script>

<section class="narrative-log" aria-labelledby="narrative-title">
  <h2 id="narrative-title">{t('ui.narrative.title', locale)}</h2>
  <ol>
    {#each entries as entry (entry.id)}
      <li>{t(entry.messageKey, locale)}</li>
    {/each}
  </ol>
</section>
