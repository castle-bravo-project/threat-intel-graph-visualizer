import React, { useState, useMemo } from 'react';
import { AttackMatrixData, AttackTactic, GraphData, Node as GraphNode, NodeType } from '../types';
import { CrosshairIcon, XIcon, ServerIcon, GlobeIcon, FileCodeIcon, HelpCircleIcon } from './icons';

interface AttackMatrixViewProps {
  data: AttackMatrixData;
  graphData: GraphData;
}

// Full list of enterprise tactics for rendering the matrix structure
const ALL_TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance' },
  { id: 'TA0042', name: 'Resource Development' },
  { id: 'TA0001', name: 'Initial Access' },
  { id: 'TA0002', name: 'Execution' },
  { id: 'TA0003', name: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation' },
  { id: 'TA0005', name: 'Defense Evasion' },
  { id: 'TA0006', name: 'Credential Access' },
  { id: 'TA0007', name: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement' },
  { id: 'TA0009', name: 'Collection' },
  { id: 'TA0011', name: 'Command and Control' },
  { id: 'TA0010', name: 'Exfiltration' },
  { id: 'TA0040', name: 'Impact' },
];

const getIconForNodeType = (type: NodeType) => {
    switch (type) {
        case 'ip': return <ServerIcon className="w-4 h-4 text-slate-400" />;
        case 'domain': return <GlobeIcon className="w-4 h-4 text-slate-400" />;
        case 'file': return <FileCodeIcon className="w-4 h-4 text-slate-400" />;
        default: return <HelpCircleIcon className="w-4 h-4 text-slate-400" />;
    }
}

const AttackMatrixView: React.FC<AttackMatrixViewProps> = ({ data, graphData }) => {
    const [selectedTactic, setSelectedTactic] = useState<AttackTactic | null>(null);

    const identifiedTacticsMap = useMemo(() => {
        return new Map((data || []).map(tactic => [tactic.tacticId, tactic]));
    }, [data]);

    const nodesMap = useMemo(() => {
        return new Map(graphData.nodes.map(node => [node.id, node]));
    }, [graphData]);

    const handleTacticClick = (tacticId: string) => {
        const tacticData = identifiedTacticsMap.get(tacticId);
        if (tacticData) {
            setSelectedTactic(tacticData);
        }
    };

    return (
        <div className="flex h-full w-full bg-surface/50 p-2 sm:p-4 gap-4 animate-fade-in overflow-hidden">
            
            {/* Main Content: Matrix */}
            <div className="flex-grow flex flex-col h-full overflow-hidden">
                <header className="flex-shrink-0 mb-4 px-2">
                    <h2 className="text-xl font-bold text-slate-200">MITRE ATT&CK&reg; Matrix</h2>
                    <p className="text-sm text-slate-400">Tactics identified by AI are highlighted below. Click a tactic for details.</p>
                </header>
                <div className="flex-grow overflow-x-auto overflow-y-hidden">
                    <div className="inline-grid grid-flow-col auto-cols-fr h-full gap-1 pb-4">
                        {ALL_TACTICS.map(tactic => {
                            const isIdentified = identifiedTacticsMap.has(tactic.id);
                            const tacticData = identifiedTacticsMap.get(tactic.id);
                            return (
                                <div
                                    key={tactic.id}
                                    onClick={() => handleTacticClick(tactic.id)}
                                    className={`flex flex-col w-32 h-full rounded-md border transition-all duration-300 ${
                                        isIdentified
                                            ? 'bg-primary/10 border-primary/50 cursor-pointer hover:bg-primary/20 hover:border-primary'
                                            : 'bg-slate-800/50 border-slate-700/50'
                                    }`}
                                >
                                    <div className="p-2 border-b border-b-slate-700/50 flex-shrink-0">
                                        <h3 className={`font-bold text-xs uppercase tracking-wider ${isIdentified ? 'text-primary' : 'text-slate-400'}`}>
                                            {tactic.name}
                                        </h3>
                                    </div>
                                    <div className="p-2 flex-grow space-y-1 overflow-y-auto">
                                      {(tacticData?.techniques || []).map(tech => (
                                        <div key={tech.techniqueId} className="text-xs p-1 rounded bg-slate-900/70 text-slate-300 truncate" title={`${tech.techniqueId}: ${tech.techniqueName}`}>
                                          {tech.techniqueName}
                                        </div>
                                      ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Side Panel: Details */}
            <aside className={`flex-shrink-0 flex flex-col transition-all duration-500 ease-in-out bg-slate-900 border-l border-slate-700 h-full ${selectedTactic ? 'w-full md:w-1/2 lg:w-2/5 xl:w-1/3' : 'w-0'}`} style={{transitionProperty: 'width'}}>
                 {selectedTactic && (
                    <div className="p-4 flex flex-col h-full overflow-hidden animate-fade-in">
                        <header className="flex justify-between items-center pb-3 border-b border-slate-700 flex-shrink-0">
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-primary uppercase">{selectedTactic.tacticId}</p>
                                <h3 className="text-lg font-bold text-slate-200 truncate">{selectedTactic.tacticName}</h3>
                            </div>
                            <button onClick={() => setSelectedTactic(null)} className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white">
                                <XIcon className="w-5 h-5"/>
                            </button>
                        </header>
                        <div className="flex-grow overflow-y-auto mt-4 pr-2">
                           <div className="space-y-4">
                                {(selectedTactic.techniques || []).map(technique => (
                                    <div key={technique.techniqueId} className="bg-surface p-3 rounded-lg border border-slate-700/80">
                                        <h4 className="font-bold text-slate-300">{technique.techniqueName}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{technique.techniqueId}</p>
                                        <p className="text-sm text-slate-400 mb-3 leading-relaxed">{technique.justification}</p>
                                        
                                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Associated Indicators</h5>
                                        <div className="space-y-1">
                                            {(technique.indicatorIds || []).map(id => {
                                                const node = nodesMap.get(id);
                                                if (!node) return null;
                                                return (
                                                    <div key={id} className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-md text-sm">
                                                        {getIconForNodeType(node.type)}
                                                        <span className="font-mono text-slate-300 truncate" title={node.label}>{node.label}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                           </div>
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
};

export default AttackMatrixView;