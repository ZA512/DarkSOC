<script lang="ts">
  import type {
    InfrastructureLinkStatus,
    InfrastructureMapView,
    InfrastructureNodeStatus,
    InfrastructurePulseMode,
  } from '../../game/model/InfrastructureMap';
  import type { AnimationMode, Locale } from '../../game/model/Settings';
  import { t } from '../../i18n/i18n';

  export let mapView: InfrastructureMapView;
  export let animationMode: AnimationMode = 'normal';
  export let locale: Locale = 'fr';

  const legendStatuses: InfrastructureNodeStatus[] = ['known', 'stable', 'debt', 'incident', 'critical'];

  function getMotionClass(mode: AnimationMode): string {
    return `infrastructure-map--motion-${mode}`;
  }

  function getNodeClass(status: InfrastructureNodeStatus, pulseMode: InfrastructurePulseMode): string {
    return `infrastructure-map__node infrastructure-map__node--${status} infrastructure-map__node--pulse-${pulseMode}`;
  }

  function getHaloClass(status: InfrastructureNodeStatus, pulseMode: InfrastructurePulseMode): string {
    return `infrastructure-map__halo infrastructure-map__halo--${status} infrastructure-map__halo--pulse-${pulseMode}`;
  }

  function getLinkClass(status: InfrastructureLinkStatus): string {
    return `infrastructure-map__link infrastructure-map__link--${status}`;
  }

  function getSubtitleKey(nodeCount: number): string {
    if (nodeCount <= 1) {
      return 'infrastructure.subtitle.single';
    }

    if (nodeCount <= 9) {
      return 'infrastructure.subtitle.growing';
    }

    return 'infrastructure.subtitle.constellation';
  }

  function getNodeById(nodeId: string) {
    return mapView.nodes.find((node) => node.id === nodeId);
  }
</script>

<aside
  class={`infrastructure-map ${getMotionClass(animationMode)}`}
  aria-labelledby="infrastructure-title infrastructure-subtitle"
>
  <div class="infrastructure-map__header">
    <h2 id="infrastructure-title">{t('infrastructure.title', locale)}</h2>
    <p id="infrastructure-subtitle" class="infrastructure-map__subtitle">
      {t(getSubtitleKey(mapView.nodes.length), locale)}
    </p>
  </div>

  <svg
    class="infrastructure-map__svg"
    viewBox="0 0 100 100"
    role="img"
    aria-labelledby="infrastructure-title infrastructure-subtitle"
  >
    <rect class="infrastructure-map__background" x="0" y="0" width="100" height="100" rx="2" />

    {#each mapView.links as link (link.id)}
      {@const sourceNode = getNodeById(link.sourceId)}
      {@const targetNode = getNodeById(link.targetId)}

      {#if sourceNode && targetNode}
        <line
          class={getLinkClass(link.status)}
          x1={sourceNode.x}
          y1={sourceNode.y}
          x2={targetNode.x}
          y2={targetNode.y}
        />
      {/if}
    {/each}

    {#each mapView.nodes as node (node.id)}
      {#if node.pulseMode !== 'none' || node.status === 'critical'}
        <circle class={getHaloClass(node.status, node.pulseMode)} cx={node.x} cy={node.y} r={node.radius * 2.6} />
      {/if}

      <circle
        class={getNodeClass(node.status, node.pulseMode)}
        cx={node.x}
        cy={node.y}
        r={node.radius}
      >
        <title>{t(node.labelKey, locale)}</title>
      </circle>
    {/each}
  </svg>

  <dl class="infrastructure-map__summary">
    <div>
      <dt>{t('infrastructure.summary.nodes', locale)}</dt>
      <dd>{mapView.nodes.length}</dd>
    </div>
    <div>
      <dt>{t('infrastructure.summary.links', locale)}</dt>
      <dd>{mapView.links.length}</dd>
    </div>
  </dl>

  <ul class="infrastructure-map__legend" aria-label={t('infrastructure.legend.title', locale)}>
    {#each legendStatuses as status (status)}
      <li>
        <span class={`infrastructure-map__legend-dot infrastructure-map__legend-dot--${status}`}></span>
        <span>{t(`infrastructure.legend.${status}`, locale)}</span>
      </li>
    {/each}
  </ul>
</aside>
