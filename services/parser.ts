import { GraphData, Node, Link, NodeType, SandboxAnalysisResult } from '../types';
import { getCountryForIp, initGeoIpData, COUNTRY_COORDS } from './geoIpData';
import * as geminiService from './geminiService';

function mispToNodeType(obj: any): NodeType {
  const name = (obj.name || '').toLowerCase();
  const metaCategory = (obj['meta-category'] || '').toLowerCase();

  if (obj.Attribute?.some((a: any) => a.type?.startsWith('ip-'))) return 'ip';
  if (obj.Attribute?.some((a: any) => a.type === 'domain' || a.type === 'url')) return 'domain';
  if (obj.Attribute?.some((a: any) => a.type?.includes('hash') || a.type?.includes('sha') || a.type?.includes('md5') || a.type === 'filename')) return 'file';

  if (name.includes('file') || metaCategory.includes('file')) return 'file';
  if (name.includes('domain') || name.includes('url')) return 'domain';
  if (name.includes('ip') || metaCategory.includes('network')) return 'ip';
  
  return 'main';
}

function getMispObjectLabel(obj: any): string {
    const priorityAttributes = [
      'value', 'domain', 'hostname', 'url', 'ip-src', 'ip-dst', 
      'sha256', 'sha1', 'md5', 'filename'
    ];
    for (const attrType of priorityAttributes) {
        const attribute = obj.Attribute?.find((a: any) => a.type === attrType || a.object_relation === attrType);
        if (attribute?.value) {
            let label = String(attribute.value);
            if (label.length > 40) {
                return label.substring(0, 20) + '...' + label.substring(label.length - 15);
            }
            return label;
        }
    }
    return obj.name || obj.info || obj.uuid || '';
}

async function _parseSandboxReport(sandboxData: SandboxAnalysisResult, nodes: Node[], links: Link[], nodeIds: Set<string>) {
  // Validate the structure of the AI's response before processing.
  if (!sandboxData || typeof sandboxData !== 'object' || typeof sandboxData.file_hash !== 'string' || !Array.isArray(sandboxData.processes_created) || !Array.isArray(sandboxData.files_dropped) || !Array.isArray(sandboxData.registry_keys_modified)) {
      throw new Error("Could not automatically parse the provided sandbox PDF. The AI returned an invalid data structure. Please check the file format.");
  }

  if (!sandboxData.file_hash) {
      throw new Error("Could not automatically parse the provided sandbox PDF. The main file hash could not be found in the report.");
  }

  // Find the file node from the MISP report that matches the sandbox hash.
  let fileNode = nodes.find(n => n.label === sandboxData.file_hash && n.type === 'file');

  // If no matching file is found in the MISP data, create a new node for the sandbox sample.
  if (!fileNode) {
    console.log("Sandbox hash not in MISP report. Creating new node for sandbox data.");
    const fileNodeId = `sandbox-file-${sandboxData.file_hash}`;
    
    if (!nodeIds.has(fileNodeId)) {
        fileNode = { id: fileNodeId, type: 'file', label: sandboxData.file_hash, isMalicious: true };
        nodes.push(fileNode);
        nodeIds.add(fileNode.id);
    } else {
        fileNode = nodes.find(n => n.id === fileNodeId)!;
        fileNode.isMalicious = true;
    }
  } else {
      fileNode.isMalicious = true;
  }

  if (!fileNode) {
    console.error("Could not find or create a parent file node for sandbox analysis.");
    return;
  }
  
  const addNode = (id: string, type: NodeType, label: string) => {
      if (!nodeIds.has(id)) {
          nodes.push({ id, type, label });
          nodeIds.add(id);
      }
      if(fileNode) {
        links.push({ source: fileNode.id, target: id });
      }
  };
  
  (sandboxData.processes_created || []).forEach((proc: string, i: number) => {
      addNode(`proc-${i}-${fileNode!.id}`, 'process', proc);
  });
  (sandboxData.files_dropped || []).forEach((file: string, i: number) => {
      if (file === fileNode?.label) return;
      addNode(`file-drop-${i}-${fileNode!.id}`, 'file', file);
  });
  (sandboxData.registry_keys_modified || []).forEach((key: string, i: number) => {
      addNode(`reg-${i}-${fileNode!.id}`, 'registry_key', key);
  });
}

export async function parseThreatData(mispData: any, sandboxFile: File | null, geoIpJson: string): Promise<{ graphData: GraphData; enrichedIpCount: number; ipAddressesToEnrich: string[] }> {
  if (!mispData?.Event) {
    console.error("Invalid or empty MISP report provided. Expected 'Event' key.");
    return { graphData: { nodes: [], links: [] }, enrichedIpCount: 0, ipAddressesToEnrich: [] };
  }
  
  if (geoIpJson) {
    try {
        initGeoIpData(geoIpJson);
    } catch (error) {
        console.error("Could not parse user-provided GeoIP data. Geolocation enrichment will not be available.", error);
    }
  }
  
  const mispEvent = mispData.Event;
  const nodes: Node[] = [];
  const links: Link[] = [];
  const nodeIds = new Set<string>();
  const geoEnrichedIps = new Set<string>();

  const enrichNodeWithGeo = (node: Node, ipValue: string) => {
    if (node.type === 'ip' && ipValue) {
      const countryCode = getCountryForIp(ipValue);
      if (countryCode) {
        const coords = COUNTRY_COORDS[countryCode.toUpperCase() as keyof typeof COUNTRY_COORDS];
        if (coords) {
          node.lat = coords.lat;
          node.lng = coords.lng;
          geoEnrichedIps.add(ipValue);
        }
      }
    }
  };
  
  const detectionRatioMap = new Map<string, boolean>();
  // First pass: find detection ratios and map them to their object UUIDs.
  (mispEvent.Object || []).forEach((obj: any) => {
    const detectionAttr = obj.Attribute?.find((a: any) => a.object_relation === 'detection-ratio');
    if (detectionAttr?.value) {
        const ratio = String(detectionAttr.value).split('/');
        if (ratio.length === 2) {
            const detections = parseInt(ratio[0], 10);
            if (!isNaN(detections) && detections > 1) {
                detectionRatioMap.set(obj.uuid, true);
            }
        }
    }
  });

  const ignoredObjectNames = ['virustotal-report', 'virustotal-graph'];
  const maliciousNodeIds = new Set<string>();
  
  // Second pass: Link malicious flags through relationships
  (mispEvent.Object || []).forEach((obj: any) => {
    if (detectionRatioMap.has(obj.uuid)) {
        (obj.ObjectReference || []).forEach((ref: any) => {
             // An object with a high detection ratio is related to another object.
             // Both objects involved might be considered malicious.
             maliciousNodeIds.add(ref.object_uuid);
             maliciousNodeIds.add(ref.referenced_uuid);
        });
    }
  });


  if (!nodeIds.has(mispEvent.uuid)) {
    nodes.push({ id: mispEvent.uuid, type: 'main', label: mispEvent.info || 'MISP Event' });
    nodeIds.add(mispEvent.uuid);
  }
  
  if (mispEvent.Object) {
    for (const obj of mispEvent.Object) {
      if (ignoredObjectNames.includes(obj.name)) continue;
      
      if (!nodeIds.has(obj.uuid)) {
        const nodeType = mispToNodeType(obj);
        const nodeLabel = getMispObjectLabel(obj);
        const isMalicious = maliciousNodeIds.has(obj.uuid);
        const newNode: Node = { id: obj.uuid, type: nodeType, label: nodeLabel, isMalicious };
        
        if (nodeType === 'ip') {
            const ipAttr = obj.Attribute?.find((a: any) => a.type?.startsWith('ip-'));
            if (ipAttr?.value) {
                newNode.label = ipAttr.value;
                enrichNodeWithGeo(newNode, ipAttr.value);
            }
        }
        nodes.push(newNode);
        nodeIds.add(obj.uuid);
      } else {
        // If node already exists, update its malicious status
        const existingNode = nodes.find(n => n.id === obj.uuid);
        if (existingNode && maliciousNodeIds.has(obj.uuid)) {
            existingNode.isMalicious = true;
        }
      }
    }
  }
  
  if (mispEvent.Object) {
    for (const obj of mispEvent.Object) {
      if (ignoredObjectNames.includes(obj.name)) continue;
      if (obj.ObjectReference) {
        for (const ref of obj.ObjectReference) {
          const sourceId = ref.object_uuid;
          const targetId = ref.referenced_uuid;
          if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
            links.push({ source: sourceId, target: targetId });
          }
        }
      }
    }
  }
  
  (mispEvent.Attribute || []).forEach((attr: any) => {
    if (attr.object_id && nodeIds.has(attr.object_id)) {
        if (mispEvent.uuid !== attr.object_id) {
            links.push({ source: mispEvent.uuid, target: attr.object_id });
        }
        return;
    }
    
    if (!nodeIds.has(attr.uuid)) {
        let type: NodeType | null = null;
        if (attr.type?.startsWith('ip-')) type = 'ip';
        else if (attr.type === 'domain' || attr.type === 'url') type = 'domain';
        else if (attr.type?.includes('hash') || attr.type?.includes('sha') || attr.type?.includes('md5') || attr.type?.includes('filename')) type = 'file';
        else return;
        
        const newNode: Node = { id: attr.uuid, type, label: attr.value || '' };
        if (type === 'ip') {
             enrichNodeWithGeo(newNode, newNode.label);
        }

        nodes.push(newNode);
        nodeIds.add(attr.uuid);
        links.push({ source: mispEvent.uuid, target: attr.uuid });
    }
  });

  const ipAddressesToEnrich = nodes.filter(n => n.type === 'ip' && n.label).map(n => n.label);
  
  if (sandboxFile) {
      try {
          const sandboxData = await geminiService.analyzeSandboxPdfWithGemini(sandboxFile);
          await _parseSandboxReport(sandboxData, nodes, links, nodeIds);
      } catch (e) {
          console.error("Failed to process sandbox report:", e);
          // Re-throw the error so the main component can catch it and display it to the user.
          throw e;
      }
  }

  const linkSet = new Set<string>();
  const uniqueLinks = links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as Node).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as Node).id;
    const ids = [sourceId, targetId].sort();
    if (sourceId === targetId) return false;
    const uniqueId = ids.join('-');
    if (!linkSet.has(uniqueId)) {
      linkSet.add(uniqueId);
      return true;
    }
    return false;
  });

  return { graphData: { nodes, links: uniqueLinks }, enrichedIpCount: geoEnrichedIps.size, ipAddressesToEnrich };
}