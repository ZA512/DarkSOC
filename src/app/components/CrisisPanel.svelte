<script lang="ts">
  import {
    canExecuteCrisisAction,
    getAvailableCrisisActions,
    getCrisisCauseLabelKeys,
    getCrisisStatusLabelKey,
    isInCrisis,
  } from '../../game/engine/selectors';
  import type { CrisisAction } from '../../game/model/Crisis';
  import type { GameState } from '../../game/model/GameState';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let state: GameState;
  export let locale: Locale = 'fr';
  export let onExecute: (crisisActionId: string) => void;

  $: inCrisis = isInCrisis(state);
  $: availableCrisisActions = getAvailableCrisisActions(state);
  $: causeLabelKeys = getCrisisCauseLabelKeys(state);
  $: crisisStatusLabelKey = getCrisisStatusLabelKey(state);

  function formatSignedValue(value: number): string {
    const roundedValue = Math.round(value);

    return `${roundedValue > 0 ? '+' : ''}${roundedValue}`;
  }

  function getResourceEntries(values: Partial<Record<string, number>>): Array<[string, number]> {
    return Object.entries(values).filter(([, amount]) => amount !== 0) as Array<[string, number]>;
  }

  function getEffectEntries(crisisAction: CrisisAction): Array<[string, number]> {
    return Object.entries(crisisAction.effects).filter(([, amount]) => amount !== 0) as Array<[string, number]>;
  }

  function getHintKey(): string {
    if (state.crisis.level === 'watch') {
      return 'crisis.watch.hint';
    }

    if (state.crisis.level === 'recovery') {
      return 'crisis.recovery.hint';
    }

    return 'crisis.empty';
  }

  function formatEntries(entries: Array<[string, number]>): string {
    return entries
      .map(([effectId, amount]) => {
        if (effectId === 'recoveryProgress') {
          return `${t('crisis.recoveryProgress', locale)} ${formatSignedValue(amount)}`;
        }

        if (effectId === 'businessMomentum') {
          return `${t('business.momentum', locale)} ${formatSignedValue(amount)}`;
        }

        return `${t(`resources.${effectId}`, locale)} ${formatSignedValue(amount)}`;
      })
      .join(' · ');
  }

  function getActionTooltip(crisisAction: CrisisAction): string {
    const lines = [t(crisisAction.descriptionKey, locale)];

    if (getResourceEntries(crisisAction.cost).length > 0) {
      lines.push(
        `${t('crisis.action.cost', locale)}: ${formatEntries(
          getResourceEntries(crisisAction.cost).map(([resourceId, amount]) => [resourceId, -amount]),
        )}`,
      );
    }

    if (getEffectEntries(crisisAction).length > 0) {
      lines.push(`${t('crisis.action.effects', locale)}: ${formatEntries(getEffectEntries(crisisAction))}`);
    }

    return lines.join('\n');
  }
</script>

<section class:crisis-panel--hidden={!inCrisis} class={`crisis-panel stage-panel crisis-panel--${state.crisis.level}`} aria-labelledby="crisis-title">
  <div class="stage-panel__header">
    <div>
      <p class="stage-panel__kicker">{t('crisis.title', locale)}</p>
      <h2 id="crisis-title">{t('crisis.title', locale)}</h2>
      <p class="stage-panel__text">{t(getHintKey(), locale)}</p>
    </div>

    <span class={`stage-panel__badge crisis-panel__badge crisis-panel__badge--${state.crisis.level}`}>
      {t(crisisStatusLabelKey, locale)}
    </span>
  </div>

  <dl class="stat-strip">
    <div>
      <dt>{t('crisis.recoveryProgress', locale)}</dt>
      <dd>{Math.round(state.crisis.recoveryProgress)}%</dd>
    </div>
    <div>
      <dt>{t('crisis.causes', locale)}</dt>
      <dd>{causeLabelKeys.length > 0 ? causeLabelKeys.map((causeLabelKey) => t(causeLabelKey, locale)).join(' · ') : t('crisis.empty', locale)}</dd>
    </div>
  </dl>

  {#if availableCrisisActions.length > 0}
    <div class="list-section">
      <p class="list-section__title">{t('crisis.title', locale)}</p>

      <ul class="data-list">
        {#each availableCrisisActions as crisisAction (crisisAction.id)}
          <li class="data-row" title={getActionTooltip(crisisAction)}>
            <span class="data-row__name">{t(crisisAction.labelKey, locale)}</span>
            <span class="data-row__meta">{formatEntries(getEffectEntries(crisisAction))}</span>
            <button
              type="button"
              class="data-row__button"
              disabled={!canExecuteCrisisAction(state, crisisAction.id)}
              onclick={() => onExecute(crisisAction.id)}
            >
              {t('crisis.action.execute', locale)}
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>