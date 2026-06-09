export type InfrastructureNodeStatus =
  | 'unknown'
  | 'known'
  | 'stable'
  | 'debt'
  | 'incident'
  | 'critical';

export type InfrastructurePulseMode = 'none' | 'soft' | 'unstable' | 'alert';

export type InfrastructureNodeView = {
  id: string;
  labelKey: string;
  x: number;
  y: number;
  radius: number;
  status: InfrastructureNodeStatus;
  pulseMode: InfrastructurePulseMode;
  criticality: number;
};

export type InfrastructureLinkStatus = 'known' | 'weak' | 'critical';

export type InfrastructureLinkView = {
  id: string;
  sourceId: string;
  targetId: string;
  status: InfrastructureLinkStatus;
};

export type InfrastructureMapView = {
  nodes: InfrastructureNodeView[];
  links: InfrastructureLinkView[];
};