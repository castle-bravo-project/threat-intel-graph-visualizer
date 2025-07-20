
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { GraphData, Node as GraphNode, Link as GraphLink, PathResult, Cluster, AttackMatrixData, ClusteringResolution, EnrichmentData, AsnInfo } from './types';
import { SAMPLE_REPORT } from './constants';
import { parseThreatData } from './services/parser';
import * as geminiService from './services/geminiService';
import { Graph } from './components/Graph';
import MapView from './components/MapView';
import ThreatView from './components/ThreatView';
import AttackMatrixView from './components/AttackMatrixView';
import CampaignView from './components/CampaignView';
import { ReportView } from './components/ReportView';
import NodeDetailView from './components/NodeDetailView';
import AttackChainView from './components/AttackChainView';
import ASView from './components/ASView';
import { ApiKeyBanner } from './components/ApiKeyBanner';
import { FileIcon, BrainCircuitIcon, LoaderCircleIcon, AlertTriangleIcon, NetworkIcon, MapIcon, UploadCloudIcon, MapPinIcon, ShieldAlertIcon, CrosshairIcon, WaypointsIcon, GroupIcon, XIcon, SearchIcon, ClapperboardIcon, PrinterIcon, BookTextIcon, CastleBravoLogo, GeminiLogo, LinkIcon, SitemapIcon } from './components/icons';

type ViewMode = 'graph' | 'map' | 'threat' | 'attack' | 'campaign' | 'report' | 'attack-chain' | 'as-view';

const App: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(SAMPLE_REPORT, null, 2));
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [asGraphData, setAsGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [threatViewData, setThreatViewData] = useState<GraphData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [enrichWithGeoIp, setEnrichWithGeoIp] = useState<boolean>(true);
  const [enrichWithAsn, setEnrichWithAsn] = useState<boolean>(true);
  const [enrichedIpCount, setEnrichedIpCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isMappingAttack, setIsMappingAttack] = useState<boolean>(false);
  const [attackMatrixData, setAttackMatrixData] = useState<AttackMatrixData | null>(null);

  const [isPathfinding, setIsPathfinding] = useState<boolean>(false);
  const [pathfinderSelection, setPathfinderSelection] = useState<GraphNode[]>([]);
  const [pathfinderResult, setPathfinderResult] = useState<PathResult | null>(null);
  const [isFindingPath, setIsFindingPath] = useState<boolean>(false);
  
  const [isClustering, setIsClustering] = useState<boolean>(false);
  const [clusterData, setClusterData] = useState<Cluster[] | null>(null);
  const [isClusteringActive, setIsClusteringActive] = useState<boolean>(false);
  const [clusteringResolution, setClusteringResolution] = useState<ClusteringResolution>('default');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [yaraRules, setYaraRules] = useState<string | null>(null);
  const [mermaidGraph, setMermaidGraph] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string | null>(null);
  
  const [jsonForGraph, setJsonForGraph] = useState<string>('');
  const [geoIpFileContent, setGeoIpFileContent] = useState<string>('');
  const [geoIpFileName, setGeoIpFileName] = useState<string>('');
  const geoIpFileInputRef = useRef<HTMLInputElement>(null);

  const [sandboxFile, setSandboxFile] = useState<File | null>(null);
  const [sandboxFileName, setSandboxFileName] = useState<string>('');
  const sandboxFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [asFilter, setAsFilter] = useState<string | null>(null);
  const [apiKeyRefresh, setApiKeyRefresh] = useState(0);

  useEffect(() => {
    if (viewMode !== 'graph') {
        setAsFilter(null);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!graphData) return;
    if (searchQuery.trim() === '') {
        setSearchResults([]);
        return;
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const results = graphData.nodes
        .filter(node => node.label.toLowerCase().includes(lowerCaseQuery))
        .map(node => node.id);
    setSearchResults(results);
  }, [searchQuery, graphData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() !== '') {
        setIsPathfinding(false);
        setPathfinderSelection([]);
        setPathfinderResult(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setJsonInput(text);
          setError('');
        } else {
          setError('Failed to read file content.');
        }
      };
      reader.onerror = () => {
        setError('Error reading the selected file.');
      };
      reader.readAsText(file);
    }
  };
  
  const handleSandboxFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSandboxFile(file);
      setSandboxFileName(file.name);
    }
  };

  const handleGeoIpFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setGeoIpFileContent(text);
          setGeoIpFileName(file.name);
          setError('');
        } else {
          setError('Failed to read GeoIP file content.');
        }
      };
      reader.onerror = () => {
        setError('Error reading the GeoIP file.');
      };
      reader.readAsText(file);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleSandboxUploadClick = () => {
    sandboxFileInputRef.current?.click();
  };

  const handleGeoIpUploadClick = () => {
    geoIpFileInputRef.current?.click();
  };

  const clearAnalysisStates = () => {
    setAnalysis('');
    setThreatViewData(null);
    setAttackMatrixData(null);
    setPathfinderResult(null);
    setPathfinderSelection([]);
    setIsPathfinding(false);
    setClusterData(null);
    setIsClusteringActive(false);
    setSearchQuery('');
    setSearchResults([]);
    setYaraRules(null);
    setMermaidGraph(null);
    setRecommendations(null);
    setSelectedNode(null);
    setEnrichmentData(null);
    setAsGraphData(null);
    setAsFilter(null);
  }

  const deriveAsGraph = (fullGraph: GraphData): GraphData | null => {
    const asNodesMap = new Map<string, { node: GraphNode; childIpIds: Set<string> }>();
    const asLinks = new Map<string, GraphLink>();
    const nodeMap = new Map(fullGraph.nodes.map(n => [n.id, n]));

    fullGraph.nodes.forEach(node => {
        if (node.type === 'ip' && node.asn) {
            const asId = `as-${node.asn.number}`;
            if (!asNodesMap.has(asId)) {
                asNodesMap.set(asId, {
                    node: {
                        id: asId,
                        label: `AS${node.asn.number}\n${node.asn.name}`,
                        type: 'asn',
                    },
                    childIpIds: new Set()
                });
            }
            asNodesMap.get(asId)!.childIpIds.add(node.id);
        }
    });

    fullGraph.links.forEach(link => {
        const sourceNode = nodeMap.get(typeof link.source === 'string' ? link.source : link.source.id);
        const targetNode = nodeMap.get(typeof link.target === 'string' ? link.target : link.target.id);

        if (sourceNode?.asn && targetNode?.asn && sourceNode.asn.number !== targetNode.asn.number) {
            const asSourceId = `as-${sourceNode.asn.number}`;
            const asTargetId = `as-${targetNode.asn.number}`;
            const linkId = [asSourceId, asTargetId].sort().join('-');
            if (!asLinks.has(linkId)) {
                asLinks.set(linkId, { source: asSourceId, target: asTargetId });
            }
        }
    });

    if (asNodesMap.size === 0) return null;

    const asNodes = Array.from(asNodesMap.values()).map(entry => entry.node);
    return { nodes: asNodes, links: Array.from(asLinks.values()) };
};


  const handleVisualize = useCallback(async () => {
    setError('');
    
    if (jsonInput !== jsonForGraph) {
        clearAnalysisStates();
    }
    
    setGraphData(null);
    setEnrichedIpCount(null);
    setAsGraphData(null);

    if (!jsonInput.trim()) {
      setError('JSON input cannot be empty.');
      return;
    }
    
    setIsVisualizing(true);
    try {
      const parsedJson = JSON.parse(jsonInput);
      const { graphData: data, enrichedIpCount: count, ipAddressesToEnrich } = await parseThreatData(parsedJson, sandboxFile, enrichWithGeoIp ? geoIpFileContent : '');
      
      if (data.nodes.length === 0) {
        setError('No graphable objects or attributes found in the report.');
      } else {
        // Immediate render with core data
        setGraphData(data);
        setJsonForGraph(jsonInput);
        setViewMode('graph');
        if (enrichWithGeoIp) {
          setEnrichedIpCount(count);
        }

        // Background enrichment for ASN
        if (enrichWithAsn && ipAddressesToEnrich && ipAddressesToEnrich.length > 0) {
            geminiService.fetchAsnInfoForIps(ipAddressesToEnrich)
                .then(asnData => {
                    setGraphData(currentGraphData => {
                        if (!currentGraphData) return null;
                        
                        const newNodes = currentGraphData.nodes.map(node => {
                            if (node.type === 'ip' && asnData[node.label]) {
                                return { ...node, asn: asnData[node.label] };
                            }
                            return node;
                        });

                        const finalGraphData = { ...currentGraphData, nodes: newNodes };
                        
                        // After nodes are updated with ASN, derive the AS graph
                        const derivedAsGraph = deriveAsGraph(finalGraphData);
                        setAsGraphData(derivedAsGraph);

                        return finalGraphData;
                    });
                })
                .catch(e => {
                    console.warn("Background ASN enrichment failed:", e);
                    // Silently fail as the main graph is already visible
                });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON format or parsing error.');
      console.error(e);
    } finally {
      setIsVisualizing(false);
    }
  }, [jsonInput, enrichWithGeoIp, enrichWithAsn, geoIpFileContent, jsonForGraph, sandboxFile]);
  
  const handleAnalyze = useCallback(async () => {
    if (!graphData) {
      setError("Please visualize a report before analyzing.");
      return;
    }
    setIsAnalyzing(true);
    setError('');
    setAnalysis('');
    setThreatViewData(null);
    try {
      const { analysis: resultText, keyIndicatorIds } = await geminiService.analyzeGraphWithGemini(graphData);
      setAnalysis(resultText);

      if (keyIndicatorIds && keyIndicatorIds.length > 0) {
        const keyIndicatorIdSet = new Set(keyIndicatorIds);
        const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
        const keyNodes = keyIndicatorIds.map(id => nodeMap.get(id)).filter((n): n is GraphNode => !!n);
        
        const keyLinks = graphData.links.filter(l => {
            const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
            const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
            return keyIndicatorIdSet.has(sourceId) && keyIndicatorIdSet.has(targetId);
        });

        if (keyNodes.length > 0) {
            setThreatViewData({ nodes: keyNodes, links: keyLinks });
            setViewMode('threat');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [graphData]);

  const handleMapToAttack = useCallback(async () => {
    if (!graphData) {
      setError("Please visualize a report first.");
      return;
    }
    
    // Prioritize the focused 'threatViewData' from the initial analysis.
    // This makes the ATT&CK mapping more relevant and avoids token limits.
    const dataForMapping = threatViewData || graphData;

    setIsMappingAttack(true);
    setError('');
    setAttackMatrixData(null);
    try {
      const result = await geminiService.mapToAttckWithGemini(dataForMapping);
      setAttackMatrixData(result);
      setViewMode('attack');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during ATT&CK mapping.');
    } finally {
      setIsMappingAttack(false);
    }
  }, [graphData, threatViewData]);

  const findShortestPath = (startNodeId: string, endNodeId: string): { nodes: string[], links: string[] } | null => {
    if (!graphData) return null;
    
    const adj = new Map<string, string[]>();
    graphData.links.forEach(link => {
        const source = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
        const target = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
        if (!adj.has(source)) adj.set(source, []);
        if (!adj.has(target)) adj.set(target, []);
        adj.get(source)!.push(target);
        adj.get(target)!.push(source);
    });

    const queue: string[][] = [[startNodeId]];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const lastNodeId = path[path.length - 1];

        if (lastNodeId === endNodeId) {
            const getLinkId = (link: GraphLink) => {
                const sId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
                const tId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
                return [sId, tId].sort().join('-');
            };
            const pathLinks = new Set<string>();
            for (let i = 0; i < path.length - 1; i++) {
                const u = path[i];
                const v = path[i+1];
                const link = graphData.links.find(l => {
                    const s = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                    const t = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                    return (s === u && t === v) || (s === v && t === u);
                });
                if (link) pathLinks.add(getLinkId(link));
            }
            return { nodes: path, links: Array.from(pathLinks) };
        }

        const neighbors = adj.get(lastNodeId) || [];
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                const newPath = [...path, neighbor];
                queue.push(newPath);
            }
        }
    }
    return null;
  };

  const handleNodeSelectForPathfinder = useCallback(async (node: GraphNode) => {
    const newSelection = [...pathfinderSelection, node];
    setPathfinderSelection(newSelection);

    if (newSelection.length === 2) {
      setIsFindingPath(true);
      setError('');
      try {
        const [startNode, endNode] = newSelection;
        const path = findShortestPath(startNode.id, endNode.id);
        
        if (path) {
          const nodeMap = new Map(graphData!.nodes.map(n => [n.id, n]));
          const pathNodes = path.nodes.map(id => nodeMap.get(id)).filter((n): n is GraphNode => !!n);
          const narrative = await geminiService.generatePathNarrative(pathNodes, startNode, endNode);
          setPathfinderResult({ path, narrative });
        } else {
          setError(`No path found between "${startNode.label}" and "${endNode.label}".`);
          setPathfinderSelection([]);
        }
      } catch(err) {
        setError(err instanceof Error ? err.message : 'Failed to analyze path.');
        setPathfinderSelection([]);
      } finally {
        setIsFindingPath(false);
        setIsPathfinding(false);
      }
    }
  }, [pathfinderSelection, graphData]);
  
  const handleNodeSelect = useCallback((node: GraphNode | null) => {
    if (isPathfinding) {
      if(node) handleNodeSelectForPathfinder(node);
    } else {
      if (node && node.id === selectedNode?.id) {
        // Deselect if clicking the same node again
        setSelectedNode(null);
        setEnrichmentData(null);
      } else {
        setSelectedNode(node);
        setEnrichmentData(null);
      }
    }
  }, [isPathfinding, selectedNode, handleNodeSelectForPathfinder]);

  const handleEnrichNode = useCallback(async (node: GraphNode) => {
    setIsEnriching(true);
    setEnrichmentData(null);
    setError('');
    try {
      const enrichment = await geminiService.enrichIndicatorWithGemini(node);
      setEnrichmentData(enrichment);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Failed to enrich indicator.');
      setEnrichmentData(null);
    } finally {
      setIsEnriching(false);
    }
  }, []);

  const handleApiKeyChange = useCallback(() => {
    // Trigger a re-render to update AI availability status
    setApiKeyRefresh(prev => prev + 1);
  }, []);

  const handleTogglePathfinder = () => {
    setPathfinderResult(null);
    setPathfinderSelection([]);
    setIsPathfinding(!isPathfinding);
    setClusterData(null);
    setIsClusteringActive(false);
    setSearchQuery('');
    setSelectedNode(null);
  };

  const closePathfinderModal = () => {
    setPathfinderResult(null);
    setPathfinderSelection([]);
  };

  const handleToggleClustering = useCallback(async () => {
    if (isClusteringActive) {
      setIsClusteringActive(false);
      setClusterData(null);
      return;
    }

    if (!threatViewData) {
      setError("Please run 'Analyze' first to identify key indicators for clustering.");
      return;
    }
    
    setIsClustering(true);
    setError('');
    setIsPathfinding(false);
    setPathfinderSelection([]);
    setPathfinderResult(null);
    try {
      const clustersFromAI = await geminiService.clusterGraphWithGemini(threatViewData, clusteringResolution);
      
      const allNodeIdsInScope = new Set(threatViewData.nodes.map(n => n.id));
      const clusteredNodeIds = new Set<string>();

      const validClustersFromAI = clustersFromAI.filter(c => c.nodeIds && c.nodeIds.length > 0).map(cluster => {
          cluster.nodeIds = cluster.nodeIds.filter(id => allNodeIdsInScope.has(id));
          return cluster;
      }).filter(c => c.nodeIds.length > 0);
      
      validClustersFromAI.forEach(cluster => {
        cluster.nodeIds.forEach(id => clusteredNodeIds.add(id));
      });

      const unclusteredNodeIds = [...allNodeIdsInScope].filter(id => !clusteredNodeIds.has(id));
      
      const finalClusters = [...validClustersFromAI];
      if (unclusteredNodeIds.length > 0) {
        finalClusters.push({
          title: 'Miscellaneous',
          nodeIds: unclusteredNodeIds
        });
      }

      setClusterData(finalClusters);
      setIsClusteringActive(true);
    } catch(err) {
      setError(err instanceof Error ? err.message : 'Failed to generate clusters.');
      setClusterData(null);
      setIsClusteringActive(false);
    } finally {
      setIsClustering(false);
    }
  }, [isClusteringActive, threatViewData, clusteringResolution]);
  
  const handleGenerateReport = useCallback(async () => {
    if (!graphData || !analysis || !attackMatrixData || !threatViewData) {
      setError("Please run 'Analyze' and 'ATT&CK Map' before generating a report.");
      return;
    }
    setIsGeneratingReport(true);
    setError('');
    try {
      const [rules, mermaid, recs] = await Promise.all([
        geminiService.generateYaraRules(graphData),
        geminiService.generateMermaidGraph(threatViewData),
        geminiService.generateRecommendations(graphData, analysis),
      ]);
      setYaraRules(rules);
      setMermaidGraph(mermaid);
      setRecommendations(recs);
      setViewMode('report');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during report generation.');
      setYaraRules(null);
      setMermaidGraph(null);
      setRecommendations(null);
    } finally {
      setIsGeneratingReport(false);
    }
  }, [graphData, analysis, attackMatrixData, threatViewData]);

  const memoizedGraph = useMemo(() => {
    return graphData ? <Graph data={graphData} isPathfinding={isPathfinding} onNodeSelect={handleNodeSelect} pathResult={pathfinderResult} clusterData={clusterData} searchResults={searchResults} selectedNodeId={selectedNode?.id || null} asFilter={asFilter} /> : null;
  }, [graphData, isPathfinding, handleNodeSelect, pathfinderResult, clusterData, searchResults, selectedNode, asFilter]);

  const memoizedMap = useMemo(() => {
    return graphData ? <MapView data={graphData} /> : null;
  }, [graphData]);
  
  const memoizedThreatView = useMemo(() => {
    return threatViewData && analysis ? <ThreatView data={threatViewData} analysis={analysis} /> : null;
  }, [threatViewData, analysis]);
  
  const memoizedAttackMatrix = useMemo(() => {
    return attackMatrixData && graphData ? <AttackMatrixView data={attackMatrixData} graphData={graphData} /> : null;
  }, [attackMatrixData, graphData]);

  const memoizedAttackChainView = useMemo(() => {
    return attackMatrixData && graphData ? <AttackChainView attackData={attackMatrixData} graphData={graphData} /> : null;
  }, [attackMatrixData, graphData]);

  const memoizedCampaignView = useMemo(() => {
    return threatViewData && attackMatrixData ? <CampaignView threatData={threatViewData} attackData={attackMatrixData} /> : null;
  }, [threatViewData, attackMatrixData]);
  
  const memoizedAsView = useMemo(() => {
    return asGraphData ? <ASView data={asGraphData} /> : null;
  }, [asGraphData]);

  const memoizedReportView = useMemo(() => {
    const mainNode = graphData?.nodes.find(n => n.type === 'main');
    const eventName = mainNode?.label || 'Unknown Event';
    return graphData && analysis && attackMatrixData && threatViewData && yaraRules && mermaidGraph && recommendations ? 
        <ReportView 
            graphData={graphData}
            analysis={analysis}
            attackData={attackMatrixData}
            threatData={threatViewData}
            yaraRules={yaraRules}
            mermaidGraph={mermaidGraph}
            eventName={eventName}
            recommendations={recommendations}
            sandboxFileName={sandboxFileName || null}
            geoIpFileName={geoIpFileName || null}
        /> : null;
}, [graphData, analysis, attackMatrixData, threatViewData, yaraRules, mermaidGraph, recommendations, sandboxFileName, geoIpFileName]);

  const resolutionButtonClass = (res: ClusteringResolution) => 
      `px-3 py-1 text-xs font-semibold rounded-md transition-colors w-full ${
      clusteringResolution === res ? 'bg-primary text-on-primary' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
  }`;

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col lg:flex-row relative">
      <div id="graph-tooltip" className="absolute max-w-xs rounded-md p-3 bg-slate-900 border border-slate-600 text-sm text-on-surface pointer-events-none transition-opacity duration-200 opacity-0 z-50 shadow-lg"></div>
      
      {pathfinderResult && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-fade-in" onClick={closePathfinderModal}>
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={closePathfinderModal} className="absolute top-3 right-3 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
              <XIcon className="w-5 h-5"/>
            </button>
            <h2 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
              <WaypointsIcon className="w-6 h-6"/>
              Path Analysis
            </h2>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{pathfinderResult.narrative}</p>
          </div>
        </div>
      )}

      <aside className="w-full lg:w-1/3 xl:w-1/4 flex flex-col border-r border-slate-700/50 bg-background lg:h-screen print:hidden">
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            <header className="text-center lg:text-left">
              <h1 className="text-2xl font-bold text-primary">Threat Intel Graph Visualizer</h1>
              <p className="text-secondary text-sm">Paste a MISP JSON report to visualize relationships and geographic locations.</p>
            </header>

            <ApiKeyBanner onApiKeyChange={handleApiKeyChange} />

            <div className="flex-grow flex flex-col space-y-2">
              <label htmlFor="json-input" className="text-sm font-medium">Threat Intel JSON Report (MISP format)</label>
              <textarea
                id="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full h-48 lg:flex-grow p-2 bg-slate-900 border border-slate-600 rounded-md focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 resize-y"
                placeholder="Paste your JSON here..."
              />
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
              <button
                onClick={handleUploadClick}
                className="w-full bg-surface text-on-surface text-sm font-medium py-2 px-4 rounded-md border border-slate-600 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <UploadCloudIcon className="w-4 h-4" />
                Upload JSON File
              </button>
            </div>
            
            <div className="flex-grow flex flex-col space-y-2">
                <label htmlFor="sandbox-input" className="text-sm font-medium">Sandbox Analysis Report (Optional)</label>
                <input type="file" ref={sandboxFileInputRef} onChange={handleSandboxFileSelect} accept=".pdf" className="hidden" />
                 <button
                  onClick={handleSandboxUploadClick}
                  className="w-full bg-surface text-on-surface text-sm font-medium py-2 px-4 rounded-md border border-slate-600 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <UploadCloudIcon className="w-4 h-4" />
                    {sandboxFileName ? 'Change Sandbox PDF' : 'Upload Sandbox PDF'}
                </button>
                {sandboxFileName && <p className="text-xs text-slate-400 text-center truncate px-2" title={sandboxFileName}>Loaded: {sandboxFileName}</p>}
            </div>

            <div className="space-y-2 py-2 border-t border-b border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Options</h3>
                <label htmlFor="geoip-toggle" className="flex items-center justify-between cursor-pointer bg-slate-900 p-2 rounded-md hover:bg-slate-900/50">
                    <span className="text-sm font-medium">Enrich with Geolocation</span>
                    <div className="flex items-center gap-2">
                        {enrichWithGeoIp && <MapPinIcon className="w-5 h-5 text-primary" />}
                        <div className="relative">
                            <input type="checkbox" id="geoip-toggle" className="sr-only" checked={enrichWithGeoIp} onChange={() => setEnrichWithGeoIp(!enrichWithGeoIp)} />
                            <div className="block bg-slate-600 w-10 h-6 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enrichWithGeoIp ? 'transform translate-x-full bg-primary' : ''}`}></div>
                        </div>
                    </div>
                </label>
                 <label htmlFor="asn-toggle" className="flex items-center justify-between cursor-pointer bg-slate-900 p-2 rounded-md hover:bg-slate-900/50">
                    <span className="text-sm font-medium">Enrich with ASN Data</span>
                    <div className="flex items-center gap-2">
                        {enrichWithAsn && <SitemapIcon className="w-5 h-5 text-primary" />}
                        <div className="relative">
                            <input type="checkbox" id="asn-toggle" className="sr-only" checked={enrichWithAsn} onChange={() => setEnrichWithAsn(!enrichWithAsn)} />
                            <div className="block bg-slate-600 w-10 h-6 rounded-full"></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${enrichWithAsn ? 'transform translate-x-full bg-primary' : ''}`}></div>
                        </div>
                    </div>
                </label>
                {enrichWithGeoIp && (
                  <div className="animate-fade-in space-y-2">
                    <input type="file" ref={geoIpFileInputRef} onChange={handleGeoIpFileSelect} accept=".json" className="hidden" />
                    <button
                      onClick={handleGeoIpUploadClick}
                      className="w-full text-xs bg-surface text-on-surface font-medium py-2 px-4 rounded-md border border-slate-600 hover:bg-slate-700 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <UploadCloudIcon className="w-4 h-4" />
                      {geoIpFileName ? 'Change GeoIP File' : 'Upload GeoIP Data'}
                    </button>
                    {geoIpFileName && <p className="text-xs text-slate-400 text-center truncate px-2" title={geoIpFileName}>Loaded: {geoIpFileName}</p>}
                  </div>
                )}
                {enrichWithGeoIp && enrichedIpCount !== null && (
                    <div className="text-xs text-slate-400 p-2 text-center animate-fade-in">
                        {enrichedIpCount > 0 
                          ? `Found location for ${enrichedIpCount} IP addresses.`
                          : 'No geolocation data found for IPs in this report.'
                        }
                    </div>
                )}
            </div>

            <button
              onClick={handleVisualize}
              disabled={isVisualizing}
              className="w-full bg-primary text-on-primary font-bold py-2 px-4 rounded-md hover:bg-sky-400 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVisualizing ? (
                <>
                  <LoaderCircleIcon className="w-5 h-5 animate-spin" />
                  <span>Visualizing...</span>
                </>
              ) : (
                <>
                  <FileIcon className="w-5 h-5" />
                  <span>Visualize Report</span>
                </>
              )}
            </button>

            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm flex items-center gap-2 animate-fade-in">
                    <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {graphData && (
              <div className="space-y-4 animate-fade-in pt-4 border-t border-slate-700/50">
                 <div className="relative group">
                  <input
                      type="text"
                      placeholder="Search nodes by label..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="w-full bg-slate-900 border border-slate-600 rounded-md py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  />
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                 </div>

                 <h3 className="text-sm font-semibold text-slate-400 text-center">AI Toolkit</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || isMappingAttack || isPathfinding || isClustering || isClusteringActive || isFindingPath || !geminiService.isAiAvailable()}
                        title={!geminiService.isAiAvailable() ? "Add API key to enable AI analysis" : "Analyze threat landscape with AI"}
                        className="w-full bg-surface text-on-surface font-bold py-2 px-4 rounded-md border border-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        {isAnalyzing ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <BrainCircuitIcon className="w-5 h-5" />}
                        <span>Analyze</span>
                    </button>
                    <button
                        onClick={handleMapToAttack}
                        disabled={isMappingAttack || isAnalyzing || isPathfinding || isClustering || isClusteringActive || isFindingPath || !geminiService.isAiAvailable()}
                        title={!geminiService.isAiAvailable() ? "Add API key to enable ATT&CK mapping" : "Map indicators to MITRE ATT&CK framework"}
                        className="w-full bg-surface text-on-surface font-bold py-2 px-4 rounded-md border border-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        {isMappingAttack ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <CrosshairIcon className="w-5 h-5" />}
                        <span>ATT&CK Map</span>
                    </button>
                </div>
                 <div className="space-y-2">
                     <div className="text-center text-xs text-slate-400">Clustering Resolution</div>
                     <div className="bg-slate-900 p-1 rounded-lg flex justify-around border border-slate-700 gap-1">
                         <button onClick={() => setClusteringResolution('coarse')} className={resolutionButtonClass('coarse')}>Coarse</button>
                         <button onClick={() => setClusteringResolution('default')} className={resolutionButtonClass('default')}>Default</button>
                         <button onClick={() => setClusteringResolution('fine')} className={resolutionButtonClass('fine')}>Fine</button>
                     </div>
                 </div>
                <div className="grid grid-cols-2 gap-2">
                     <button
                        onClick={handleTogglePathfinder}
                        disabled={isAnalyzing || isMappingAttack || isClustering || isClusteringActive || !!searchQuery}
                        className={`w-full font-bold py-2 px-4 rounded-md border transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isPathfinding ? 'bg-primary/20 border-primary text-primary' : 'bg-surface text-on-surface border-slate-600 hover:bg-slate-700'}`}
                    >
                        <WaypointsIcon className="w-5 h-5" />
                        <span>Find Path</span>
                    </button>
                    <button
                        onClick={handleToggleClustering}
                        disabled={isAnalyzing || isMappingAttack || isPathfinding || !!searchQuery || !threatViewData || !geminiService.isAiAvailable()}
                        title={!geminiService.isAiAvailable() ? "Add API key to enable AI clustering" : (!threatViewData ? "Run 'Analyze' first to enable clustering" : (isClusteringActive ? 'Ungroup nodes' : 'Group key nodes'))}
                        className={`w-full font-bold py-2 px-4 rounded-md border transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isClusteringActive ? 'bg-primary/20 border-primary text-primary' : 'bg-surface text-on-surface border-slate-600 hover:bg-slate-700'}`}
                    >
                        {isClustering ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <GroupIcon className="w-5 h-5" />}
                        <span>{isClusteringActive ? 'Ungroup' : 'Group Nodes'}</span>
                    </button>
                </div>
                <div className="pt-2 border-t border-slate-700/50">
                    <button
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport || !threatViewData || !attackMatrixData || !geminiService.isAiAvailable()}
                        title={!geminiService.isAiAvailable() ? "Add API key to enable report generation" : (!threatViewData || !attackMatrixData ? "Run 'Analyze' and 'ATT&CK Map' first" : 'Generate full HTML report')}
                        className="w-full mt-4 bg-surface text-on-surface font-bold py-2 px-4 rounded-md border border-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        {isGeneratingReport ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <PrinterIcon className="w-5 h-5" />}
                        <span>Generate Report</span>
                    </button>
                </div>
                {(isAnalyzing || isMappingAttack || isClustering || isFindingPath || isPathfinding || isGeneratingReport) && (
                    <div className="text-xs text-slate-400 p-2 text-center animate-fade-in h-8 flex items-center justify-center">
                        {isAnalyzing && "AI is analyzing the threat landscape..."}
                        {isMappingAttack && "AI is mapping indicators to MITRE ATT&CK®..."}
                        {isClustering && "AI is grouping key indicators by activity..."}
                        {isPathfinding && `Pathfinder Mode: Select ${pathfinderSelection.length === 0 ? 'a starting' : 'an ending'} node.`}
                        {isFindingPath && "Analyzing relationship between nodes..."}
                        {isGeneratingReport && "Compiling report and generating diagrams..."}
                    </div>
                )}
                {analysis && !threatViewData && (
                  <div className="bg-slate-900 p-4 rounded-md border border-slate-700 animate-fade-in">
                    <h3 className="font-bold text-primary mb-2">AI Analysis</h3>
                    <p className="text-sm whitespace-pre-wrap">{analysis}</p>
                    <p className="text-xs text-amber-400 mt-2">Could not identify key indicators to generate Threat View.</p>
                  </div>
                )}
            </div>
        )}
        </div>
        <footer className="p-4 border-t border-slate-700/50 text-center text-xs text-slate-500 print:hidden flex-shrink-0">
            <div className="flex justify-center items-center gap-2 mb-2">
                <p>Powered by</p>
                <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-sky-400 transition-colors">
                    <GeminiLogo className="w-5 h-5"/>
                </a>
            </div>
            <a href="https://github.com/castle-bravo/Threat-Intel-Graph-Visualizer" target="_blank" rel="noopener noreferrer" className="inline-block opacity-70 hover:opacity-100 transition-opacity">
                 <CastleBravoLogo width={160} height={40} />
            </a>
        </footer>
      </aside>

      <main className="w-full lg:w-2/3 xl:w-3/4 flex-grow flex flex-col relative bg-surface">
        {graphData && (
          <div className="w-full flex items-center justify-center p-2 bg-background/50 border-b border-slate-700/50 z-10 print:hidden">
            <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'graph' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                aria-pressed={viewMode === 'graph'}
              >
                <NetworkIcon className="w-4 h-4"/> Graph
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'map' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                aria-pressed={viewMode === 'map'}
              >
                <MapIcon className="w-4 h-4"/> Map
              </button>
              {asGraphData && (
                 <button
                    onClick={() => setViewMode('as-view')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'as-view' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                    aria-pressed={viewMode === 'as-view'}
                >
                    <SitemapIcon className="w-4 h-4"/> AS View
                </button>
              )}
              {threatViewData && (
                <button
                  onClick={() => setViewMode('threat')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'threat' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                  aria-pressed={viewMode === 'threat'}
                >
                  <ShieldAlertIcon className="w-4 h-4"/> Threat View
                </button>
              )}
              {attackMatrixData && (
                 <button
                    onClick={() => setViewMode('attack')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'attack' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                    aria-pressed={viewMode === 'attack'}
                >
                    <CrosshairIcon className="w-4 h-4"/> ATT&CK
                </button>
              )}
               {attackMatrixData && (
                 <button
                    onClick={() => setViewMode('attack-chain')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'attack-chain' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                    aria-pressed={viewMode === 'attack-chain'}
                >
                    <LinkIcon className="w-4 h-4"/> Attack Chain
                </button>
              )}
              {threatViewData && attackMatrixData && (
                <button
                  onClick={() => setViewMode('campaign')}
                  title="Run Analyze and ATT&CK Map to enable"
                  className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'campaign' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                  aria-pressed={viewMode === 'campaign'}
                >
                  <ClapperboardIcon className="w-4 h-4"/> Campaign
                </button>
              )}
              {yaraRules && mermaidGraph && recommendations && (
                <button
                  onClick={() => setViewMode('report')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'report' ? 'bg-primary text-on-primary' : 'text-slate-300 hover:bg-slate-700'}`}
                  aria-pressed={viewMode === 'report'}
                >
                  <BookTextIcon className="w-4 h-4"/> Report
                </button>
              )}
            </div>
          </div>
        )}
        <div className="w-full flex-grow relative overflow-hidden">
            <div className="w-full h-full">
                {viewMode === 'graph' && memoizedGraph}
                {viewMode === 'map' && memoizedMap}
                {viewMode === 'as-view' && memoizedAsView}
                {viewMode === 'threat' && memoizedThreatView}
                {viewMode === 'attack' && memoizedAttackMatrix}
                {viewMode === 'attack-chain' && memoizedAttackChainView}
                {viewMode === 'campaign' && memoizedCampaignView}
                {viewMode === 'report' && memoizedReportView}
                {!graphData && !isVisualizing && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-4">
                      <BrainCircuitIcon className="w-24 h-24 mb-4 text-slate-700" />
                      <h2 className="text-xl font-semibold">Visualize Your Threat Data</h2>
                      <p>Paste a MISP report, upload a file, and click "Visualize Report" to begin.</p>
                  </div>
                )}
                {isVisualizing && !graphData && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <LoaderCircleIcon className="w-12 h-12 animate-spin mb-4" />
                        <p>Processing report and building graph...</p>
                    </div>
                )}
            </div>
            <NodeDetailView 
                node={selectedNode}
                enrichmentData={enrichmentData}
                isEnriching={isEnriching}
                onEnrich={handleEnrichNode}
                onClose={() => handleNodeSelect(null)}
            />
        </div>
      </main>
    </div>
  );
};

export default App;
