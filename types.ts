// The d3 library doesn't export SimulationNodeDatum and SimulationLinkDatum as named types from the main module.
// We are defining the structure for Node and Link interfaces manually to align with d3-force's expectations.
export type NodeType = 'main' | 'ip' | 'domain' | 'file' | 'process' | 'registry_key' | 'asn';

export interface AsnInfo {
  number: string;
  name: string;
}

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  lat?: number;
  lng?: number;
  isMalicious?: boolean;
  asn?: AsnInfo;
  // Properties from d3.SimulationNodeDatum
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Link {
  source: string | Node;
  target:string | Node;
  // Property from d3.SimulationLinkDatum
  index?: number;
}


export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface AttackTechnique {
    techniqueId: string;
    techniqueName: string;
    justification: string;
    indicatorIds: string[];
}

export interface AttackTactic {
    tacticId: string;
    tacticName: string;
    techniques: AttackTechnique[];
}

export type AttackMatrixData = AttackTactic[];

export interface PathResult {
  path: {
    nodes: string[];
    links: string[];
  };
  narrative: string;
}

export interface Cluster {
  title: string;
  nodeIds: string[];
}

export type ClusteringResolution = 'coarse' | 'default' | 'fine';

export interface CampaignStep {
  node: Node;
  tactic: {
    id: string;
    name: string;
  } | null;
  technique: {
    id: string;
    name: string;
    justification: string;
  } | null;
}

export type PlaybackSpeed = 'slow' | 'normal' | 'fast';

export interface SandboxAnalysisResult {
  file_hash: string;
  processes_created: string[];
  files_dropped: string[];
  registry_keys_modified: string[];
}

export interface EnrichmentData {
  [key: string]: any;
}