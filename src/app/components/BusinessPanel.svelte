<script lang="ts">
  import {
    getCurrentBusinessStage,
    getNextBusinessStage,
    getPendingBusinessEvent,
  } from '../../game/engine/selectors';
  import type { BusinessEventChoice } from '../../game/model/Business';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onChoose: (eventId: string, choiceId: string) => void;

  $: currentStage = getCurrentBusinessStage(state);
  $: nextStage = getNextBusinessStage(state);
  $: pendingEvent = getPendingBusinessEvent(state);

  function formatSignedValue(value: number): string {
    const roundedValue = Math.round(value);

    return `${roundedValue > 0 ? '+' : ''}${roundedValue}`;
  }

  function getChoiceEffects(choice: BusinessEventChoice): Array<[string, number]> {
    return Object.entries(choice.effects).filter(([, amount]) => amount !== 0) as Array<[string, number]>;
  }

  function formatEffectEntries(choice: BusinessEventChoice): string {
    const entries = getChoiceEffects(choice)
      .map(([resourceId, amount]) => `${t(`resources.${resourceId}`, locale)} ${formatSignedValue(amount)}`);

    if (choice.momentumDelta) {
      entries.push(`${t('business.choice.momentum', locale)} ${formatSignedValue(choice.momentumDelta)}`);
    }

    return entries.join(' · ');
  }

  function getChoiceTooltip(choice: BusinessEventChoice): string {
    return [t(choice.descriptionKey, locale), `${t('business.choice.effects', locale)}: ${formatEffectEntries(choice)}`].join('\n');
  }
</script>

<section class="business-panel stage-panel" aria-labelledby="business-title">
  <div class="stage-panel__header">
    <div>
      <p class="stage-panel__kicker">{t('business.title', locale)}</p>
      <h2 id="business-title">{t(currentStage.nameKey, locale)}</h2>
    </div>

    <span class="stage-panel__badge">{t('business.level', locale)} {currentStage.level}</span>
  </div>

  <dl class="stat-strip">
    <div title={t(currentStage.descriptionKey, locale)}>
      <dt>{t('business.currentStage', locale)}</dt>
      <dd>{t(currentStage.nameKey, locale)}</dd>
    </div>
    <div>
      <dt>{t('business.momentum', locale)}</dt>
      <dd>{Math.round(state.businessMomentum)}</dd>
    </div>
    <div>
      <dt>{t('business.pendingDecision', locale)}</dt>
      <dd>{pendingEvent ? t(pendingEvent.titleKey, locale) : t('business.noDecision', locale)}</dd>
    </div>
  </dl>

  <div class="list-section">
    <p class="list-section__title">{t('business.nextStage', locale)}</p>

    {#if nextStage}
      <p class="stage-panel__note" title={t(nextStage.descriptionKey, locale)}>
        {t(nextStage.nameKey, locale)} · {t('business.requirement.turn', locale)} {nextStage.minimumTurn} · {t('business.requirement.trust', locale)} {nextStage.minimumTrust}
      </p>
    {:else}
      <p class="stage-panel__note">{t('business.nextStage.none', locale)}</p>
    {/if}
  </div>

  <div class="list-section">
    <p class="list-section__title">{t('business.pendingDecision', locale)}</p>

    {#if pendingEvent}
      <p class="stage-panel__note" title={t(pendingEvent.descriptionKey, locale)}>{t(pendingEvent.titleKey, locale)}</p>

      <ul class="data-list">
        {#each pendingEvent.choices as choice (choice.id)}
          <li class="data-row" title={getChoiceTooltip(choice)}>
            <span class="data-row__name">{t(choice.labelKey, locale)}</span>
            <span class="data-row__meta">{formatEffectEntries(choice)}</span>
            <button type="button" class="data-row__button" onclick={() => onChoose(pendingEvent.id, choice.id)}>
              {t('business.choice.apply', locale)}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="stage-panel__note">{t('business.noDecision', locale)}</p>
    {/if}
  </div>
</section>