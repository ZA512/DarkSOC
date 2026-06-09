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

<section class="threat-panel" aria-labelledby="threat-title">
  <h2 id="threat-title">{t('threat.title', locale)}</h2>

  <div class="threat-panel__metrics">
    <article class="threat-panel__metric">
      <span class="threat-panel__metric-label">{t('threat.pressure', locale)}</span>
      <strong class="threat-panel__metric-value">{threatPressure}</strong>
    </article>

    <article class="threat-panel__metric">
      <span class="threat-panel__metric-label">{t('threat.maturity', locale)}</span>
      <strong class="threat-panel__metric-value">{cyberMaturity}</strong>
    </article>

    <article class="threat-panel__metric">
      <span class="threat-panel__metric-label">{t('threat.stage', locale)}</span>
      <strong class="threat-panel__metric-value">{t(businessStageNameKey, locale)}</strong>
    </article>
  </div>

  <div class="threat-panel__section">
    <span class="threat-panel__section-label">{t('threat.lastEvent', locale)}</span>

    {#if lastThreatEvent}
      <article class="threat-panel__event">
        <div class="threat-panel__event-header">
          <span class="threat-panel__event-kind">
            {t(lastThreatEvent.kind === 'warning' ? 'threat.warning' : 'threat.attack', locale)}
          </span>
          {#if lastThreatEvent.outcome}
            <span class="threat-panel__incident-count">
              {t(`attacks.outcome.${lastThreatEvent.outcome}`, locale)}
            </span>
          {/if}
        </div>

        <div class="threat-panel__event-title">{formatAttackName(lastThreatEvent.attackId)}</div>
        <p class="threat-panel__event-text">{t(lastThreatEvent.messageKey, locale)}</p>
      </article>
    {:else}
      <p class="threat-panel__empty">{t('threat.none', locale)}</p>
    {/if}
  </div>

  <div class="threat-panel__section">
    <span class="threat-panel__section-label">{t('threat.activeIncidents', locale)}</span>

    {#if activeIncidents.length > 0}
      <ol class="threat-panel__incident-list">
        {#each activeIncidents as incident (incident.attackId)}
          <li class="threat-panel__incident">
            <div class="threat-panel__incident-header">
              <span class="threat-panel__incident-title">{formatAttackName(incident.attackId)}</span>
              <span class="threat-panel__incident-count">x{incident.count}</span>
            </div>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="threat-panel__empty">{t('threat.none', locale)}</p>
    {/if}
  </div>
</section>