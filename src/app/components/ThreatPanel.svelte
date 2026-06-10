<script lang="ts">
  import type { ActiveIncidentSummary, ThreatEventSummary } from '../../game/engine/selectors';
  import type { Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let locale: Locale = 'fr';
  export let threatPressure = 0;
  export let cyberMaturity = 0;
  export let businessStageNameKey: string;
  export let lastThreatEvent: ThreatEventSummary | undefined;
  export let activeIncidents: ActiveIncidentSummary[] = [];

  function formatAttackName(attackId: string): string {
    return t(`attacks.${attackId}.name`, locale);
  }
</script>

<section class="threat-panel stage-panel" aria-labelledby="threat-title">
  <div class="stage-panel__header">
    <div>
      <p class="stage-panel__kicker">{t('ui.tab.soc', locale)}</p>
      <h2 id="threat-title">{t('threat.title', locale)}</h2>
    </div>
  </div>

  <dl class="stat-strip">
    <div>
      <dt>{t('threat.pressure', locale)}</dt>
      <dd>{threatPressure}</dd>
    </div>
    <div>
      <dt>{t('threat.maturity', locale)}</dt>
      <dd>{cyberMaturity}</dd>
    </div>
    <div>
      <dt>{t('threat.stage', locale)}</dt>
      <dd>{t(businessStageNameKey, locale)}</dd>
    </div>
  </dl>

  <div class="list-section">
    <p class="list-section__title">{t('threat.lastEvent', locale)}</p>

    {#if lastThreatEvent}
      <div class="signal-row" title={t(lastThreatEvent.messageKey, locale)}>
        <span class="signal-row__kind">
            {t(lastThreatEvent.kind === 'warning' ? 'threat.warning' : 'threat.attack', locale)}
        </span>
        <span class="signal-row__name">{formatAttackName(lastThreatEvent.attackId)}</span>
        {#if lastThreatEvent.outcome}
          <span class="signal-row__badge">{t(`attacks.outcome.${lastThreatEvent.outcome}`, locale)}</span>
        {/if}
      </div>
    {:else}
      <p class="stage-panel__note">{t('threat.none', locale)}</p>
    {/if}
  </div>

  <div class="list-section">
    <p class="list-section__title">{t('threat.activeIncidents', locale)}</p>

    {#if activeIncidents.length > 0}
      <ol class="data-list data-list--compact">
        {#each activeIncidents as incident (incident.attackId)}
          <li class="data-row data-row--compact">
            <span class="data-row__name">{formatAttackName(incident.attackId)}</span>
            <span class="data-row__status">x{incident.count}</span>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="stage-panel__note">{t('threat.none', locale)}</p>
    {/if}
  </div>
</section>