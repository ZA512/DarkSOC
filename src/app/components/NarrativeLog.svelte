<script lang="ts">
  import type { NarrativeLogEntry } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let entries: NarrativeLogEntry[];
  export let locale: Locale = 'fr';

  $: visibleEntries = entries.slice(-5);
  $: leadEntries = visibleEntries.slice(-2);
  $: journalEntries = visibleEntries.slice(0, -2).reverse();
</script>

<section class="narrative-log" aria-label={t('ui.narrative.title', locale)}>
  <p class="narrative-log__eyebrow">{t('ui.narrative.title', locale)}</p>

  <div class="narrative-log__lead">
    {#if leadEntries.length > 0}
      {#each leadEntries as entry (entry.id)}
        <p>{t(entry.messageKey, locale)}</p>
      {/each}
    {:else}
      <p>{t('ui.soc.idle.body', locale)}</p>
    {/if}
  </div>

  {#if journalEntries.length > 0}
    <ol>
      {#each journalEntries as entry (entry.id)}
        <li>{t(entry.messageKey, locale)}</li>
      {/each}
    </ol>
  {/if}
</section>
