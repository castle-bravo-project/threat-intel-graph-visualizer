
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { select } from 'd3-selection';
import 'd3-transition';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation } from 'd3-force';
import { zoom, zoomIdentity } from 'd3-zoom';
import { easeLinear } from 'd3-ease';
import { GraphData, AttackMatrixData, CampaignStep, Node, Link, PlaybackSpeed, NodeType } from '../types';
import { 
    PlayIcon, PauseIcon, StepForwardIcon, StepBackIcon, HistoryIcon, RewindIcon, FastForwardIcon,
    IconProps, TerminalSquareIcon, KeyIcon, GlobeIcon, ServerIcon, FileCodeIcon, HelpCircleIcon
} from './icons';


interface CampaignViewProps {
    threatData: GraphData;
    attackData: AttackMatrixData;
}

const PLAYBACK_SPEED_MAP: Record<PlaybackSpeed, number> = {
    'slow': 3000,
    'normal': 1500,
    'fast': 750,
};

const getIconForNodeType = (type: NodeType): React.FC<{className?: string}> => {
    switch (type) {
        case 'ip': return ServerIcon;
        case 'domain': return GlobeIcon;
        case 'file': return FileCodeIcon;
        case 'process': return TerminalSquareIcon;
        case 'registry_key': return KeyIcon;
        default: return HelpCircleIcon;
    }
};

// --- D3 Graph Component (Self-Contained for this view) ---
interface CampaignGraphProps {
    data: GraphData;
    currentIndex: number;
    campaignSteps: CampaignStep[];
    playbackSpeed: PlaybackSpeed;
}

const CampaignGraph: React.FC<CampaignGraphProps> = ({ data, currentIndex, campaignSteps, playbackSpeed }) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const simulationRef = useRef<Simulation<Node, Link> | null>(null);
    const selectionsRef = useRef<{ node?: any, link?: any }>({});
    const { nodes, links } = data;
    
    const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
    
    // Effect for initial setup and teardown
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = select(svgRef.current);
        svg.selectAll('*').remove();

        const width = svg.node()!.getBoundingClientRect().width;
        const height = svg.node()!.getBoundingClientRect().height;

        const simulation = forceSimulation<Node>(data.nodes)
            .force('link', forceLink<Node, Link>(data.links).id((d: any) => d.id).distance(200).strength(0.5))
            .force('charge', forceManyBody().strength(-800))
            .force('center', forceCenter(width / 2, height / 2))
            .force('collide', forceCollide().radius(50));
        simulationRef.current = simulation;

        const g = svg.append('g');
        
        selectionsRef.current.link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(data.links)
            .join('line')
            .attr('stroke', '#64748b')
            .attr('stroke-width', 2);

        selectionsRef.current.node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g.node')
            .data(data.nodes, (d: any) => d.id)
            .join('g')
            .attr('class', 'node');
            
        selectionsRef.current.node.append('circle').attr('r', 25).attr('fill', '#1e293b').attr('stroke', '#0ea5e9').attr('stroke-width', 2);
        selectionsRef.current.node.append('text').attr('y', 40).attr('text-anchor', 'middle').attr('fill', '#e2e8f0').attr('font-size', '12px').text((d: any) => (d.label.length > 20 ? d.label.substring(0, 17) + '...' : d.label));

        simulation.on('tick', () => {
            selectionsRef.current.link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);
            selectionsRef.current.node.attr('transform', (d: any) => `translate(${d.x!},${d.y!})`);
        });
        
        const zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 2]).on('zoom', (event) => g.attr('transform', event.transform));
        svg.call(zoomBehavior);
        
        const gNode = g.node();
        if (gNode) {
             setTimeout(() => {
                const bounds = gNode.getBBox();
                if (bounds.width > 0 && bounds.height > 0) {
                     const scale = Math.min(width / bounds.width, height / bounds.height) * 0.9;
                     const translate = [
                         width / 2 - scale * (bounds.x + bounds.width / 2),
                         height / 2 - scale * (bounds.y + bounds.height / 2)
                     ];
                     const transform = zoomIdentity.translate(translate[0], translate[1]).scale(scale);
                     svg.transition().duration(750).call(zoomBehavior.transform, transform);
                }
            }, 150);
        }
        
        return () => { simulation.stop(); };

    }, [data]);
    
    // Effect to handle updates based on currentIndex
    useEffect(() => {
        if (!svgRef.current || !campaignSteps.length || !selectionsRef.current.node) return;

        const currentStepId = currentIndex >= 0 ? campaignSteps[currentIndex]?.node.id : null;
        const nextStepId = currentIndex >= 0 && currentIndex < campaignSteps.length - 1 ? campaignSteps[currentIndex + 1]?.node.id : null;
        const pastStepIds = new Set(campaignSteps.slice(0, currentIndex).map(s => s.node.id));
        
        const safeGetId = (val: string | Node): string => typeof val === 'string' ? val : val.id;
        
        selectionsRef.current.node
           .transition().duration(500)
           .attr('opacity', (d: Node) => (d.id === currentStepId || d.id === nextStepId) ? 1 : pastStepIds.has(d.id) ? 0.5 : 0.15)
           .select('circle')
           .attr('stroke', (d: Node) => d.id === currentStepId ? '#f59e0b' : '#0ea5e9')
           .attr('stroke-width', (d: Node) => d.id === currentStepId ? 4 : 2);
        
        selectionsRef.current.link
            .transition().duration(500)
            .attr('stroke', (l: Link) => {
                const sourceId = safeGetId(l.source);
                const targetId = safeGetId(l.target);
                return (sourceId === currentStepId && targetId === nextStepId) || (sourceId === nextStepId && targetId === currentStepId) ? '#f59e0b' : '#64748b';
            })
            .attr('opacity', (l: Link) => {
                const sourceId = safeGetId(l.source);
                const targetId = safeGetId(l.target);
                return (sourceId === currentStepId && targetId === nextStepId) || (sourceId === nextStepId && targetId === currentStepId) ? 1 : 0.1;
            });
            
        const particleLink = links.find(l => {
             const sourceId = safeGetId(l.source);
             const targetId = safeGetId(l.target);
             return (sourceId === currentStepId && targetId === nextStepId) || (sourceId === nextStepId && targetId === currentStepId);
        });
        
        const g = select(svgRef.current).select('g');
        g.selectAll('.particle').interrupt().remove();

        if (particleLink) {
            const sourceNode = particleLink.source as Node;
            const targetNode = particleLink.target as Node;
            
            if (sourceNode?.x && sourceNode?.y && targetNode?.x && targetNode?.y) {
              g.select('g.nodes').append('circle')
                  .attr('class', 'particle')
                  .attr('r', 4)
                  .attr('fill', '#38bdf8')
                  .attr('cx', sourceNode.x).attr('cy', sourceNode.y)
                  .transition().duration(PLAYBACK_SPEED_MAP[playbackSpeed]).ease(easeLinear)
                  .attr('cx', targetNode.x).attr('cy', targetNode.y)
                  .remove();
            }
        }

    }, [currentIndex, campaignSteps, links, playbackSpeed, nodeMap, nodes]);

    return <svg ref={svgRef} className="w-full h-full" />;
};


// --- Main CampaignView Component ---
const CampaignView: React.FC<CampaignViewProps> = ({ threatData, attackData }) => {
    const [campaignSteps, setCampaignSteps] = useState<CampaignStep[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('normal');
    
    const timelineRef = useRef<HTMLDivElement | null>(null);

    // Prepare campaign data by merging threat and ATT&CK info
    useEffect(() => {
        const attackMap = new Map<string, { tactic: any; technique: any }>();
        attackData.forEach(tactic => {
            tactic.techniques.forEach(technique => {
                technique.indicatorIds.forEach(id => {
                    if (!attackMap.has(id)) {
                        attackMap.set(id, {
                            tactic: { id: tactic.tacticId, name: tactic.tacticName },
                            technique: { id: technique.techniqueId, name: technique.techniqueName, justification: technique.justification }
                        });
                    }
                });
            });
        });

        const steps: CampaignStep[] = threatData.nodes.map(node => {
            const attackInfo = attackMap.get(node.id);
            return {
                node,
                tactic: attackInfo?.tactic || null,
                technique: attackInfo?.technique || null,
            };
        });
        setCampaignSteps(steps);
        setCurrentIndex(-1);
        setIsPlaying(false);
    }, [threatData, attackData]);

    // Playback logic
    useEffect(() => {
        if (isPlaying && currentIndex < campaignSteps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentIndex(prevIndex => prevIndex + 1);
            }, PLAYBACK_SPEED_MAP[playbackSpeed]);
            return () => clearTimeout(timer);
        } else if (isPlaying && currentIndex >= campaignSteps.length - 1) {
            setIsPlaying(false); // Stop when it reaches the end
        }
    }, [isPlaying, currentIndex, campaignSteps.length, playbackSpeed]);

    // Scroll timeline to active item
    useEffect(() => {
        if (timelineRef.current && currentIndex >= 0) {
            const activeElement = timelineRef.current.children[currentIndex] as HTMLElement;
            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentIndex]);
    
    const handlePlayPause = () => setIsPlaying(!isPlaying);
    const handleReset = () => { setCurrentIndex(-1); setIsPlaying(false); };
    const handleStepForward = () => setCurrentIndex(i => Math.min(i + 1, campaignSteps.length - 1));
    const handleStepBack = () => setCurrentIndex(i => Math.max(i - 1, -1));
    const handleSpeedChange = (speed: PlaybackSpeed) => setPlaybackSpeed(speed);
    
    const currentStep = currentIndex >= 0 ? campaignSteps[currentIndex] : null;

    const SpeedButton: React.FC<{speed: PlaybackSpeed, icon: React.FC<IconProps>}> = ({ speed, icon: Icon }) => (
        <button onClick={() => handleSpeedChange(speed)} title={`${speed.charAt(0).toUpperCase() + speed.slice(1)} Speed`} className={`p-2 rounded-md transition-colors ${playbackSpeed === speed ? 'text-primary bg-primary/20' : 'text-slate-400 hover:bg-slate-700'}`}>
            <Icon className="w-5 h-5"/>
        </button>
    );

    return (
        <div className="flex flex-col h-full w-full bg-surface/50 p-2 sm:p-4 gap-4 animate-fade-in">
            <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
                {/* Left Panel: Timeline */}
                <aside className="w-full md:w-1/3 xl:w-1/4 bg-slate-900 rounded-lg p-4 border border-slate-700 flex flex-col">
                    <h2 className="text-lg font-bold text-primary mb-4 flex-shrink-0">Attack Timeline</h2>
                    <div ref={timelineRef} className="overflow-y-auto pr-2 space-y-1">
                        {campaignSteps.map((step, index) => {
                            const Icon = getIconForNodeType(step.node.type);
                            const isActive = index === currentIndex;
                            const isPast = index < currentIndex;
                            return (
                                <div key={step.node.id} onClick={() => setCurrentIndex(index)}
                                     className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-300 ${isActive ? 'bg-primary/20 border-primary scale-105' : isPast ? 'bg-slate-800/50 border-slate-600 opacity-60' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}>
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-6 h-6 flex-shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                                        <div className="overflow-hidden">
                                            <p className={`font-bold text-sm truncate ${isActive ? 'text-on-surface' : 'text-slate-300'}`}>{step.node.label}</p>
                                            <p className="text-xs text-slate-400">{step.tactic?.name || 'Indicator'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Center Panel: Graph */}
                <main className="w-full md:w-2/3 xl:w-3/4 flex-grow rounded-lg bg-background border border-slate-700 overflow-hidden relative">
                    <CampaignGraph data={threatData} currentIndex={currentIndex} campaignSteps={campaignSteps} playbackSpeed={playbackSpeed} />
                </main>
            </div>
            
             {/* Bottom Panel: Controls */}
            <footer className="flex-shrink-0 bg-slate-900 rounded-lg p-3 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4 w-1/3">
                    {currentStep ? (
                        <div className="overflow-hidden">
                            <p className="text-xs text-slate-400">Current Step ({currentIndex + 1}/{campaignSteps.length})</p>
                            <p className="font-bold text-on-surface truncate" title={currentStep.node.label}>{currentStep.node.label}</p>
                        </div>
                    ) : (
                         <p className="font-bold text-slate-400">Ready to Play</p>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2">
                    <button onClick={handleReset} title="Reset" className="p-2 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"><HistoryIcon className="w-6 h-6"/></button>
                    <button onClick={handleStepBack} title="Step Back" className="p-2 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"><StepBackIcon className="w-6 h-6"/></button>
                    <button onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'} className="p-3 rounded-full bg-primary text-on-primary hover:bg-sky-400 transition-colors">
                        {isPlaying ? <PauseIcon className="w-7 h-7"/> : <PlayIcon className="w-7 h-7"/>}
                    </button>
                    <button onClick={handleStepForward} title="Step Forward" className="p-2 rounded-md text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"><StepForwardIcon className="w-6 h-6"/></button>
                </div>

                <div className="flex items-center justify-end gap-2 w-1/3">
                    <SpeedButton speed="slow" icon={RewindIcon} />
                    <SpeedButton speed="normal" icon={PlayIcon} />
                    <SpeedButton speed="fast" icon={FastForwardIcon} />
                </div>
            </footer>
        </div>
    );
};

export default CampaignView;
