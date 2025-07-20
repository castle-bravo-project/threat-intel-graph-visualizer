
import React from 'react';
import { AttackMatrixData, GraphData, NodeType, AttackTactic } from '../types';
import { ServerIcon, GlobeIcon, FileCodeIcon, HelpCircleIcon, CrosshairIcon, TerminalSquareIcon, KeyIcon } from './icons';

interface AttackChainViewProps {
    attackData: AttackMatrixData;
    graphData: GraphData;
}

const getIconForNodeType = (type: NodeType) => {
    switch (type) {
        case 'ip': return <ServerIcon className="w-4 h-4 text-slate-400" />;
        case 'domain': return <GlobeIcon className="w-4 h-4 text-slate-400" />;
        case 'file': return <FileCodeIcon className="w-4 h-4 text-slate-400" />;
        case 'process': return <TerminalSquareIcon className="w-4 h-4 text-slate-400" />;
        case 'registry_key': return <KeyIcon className="w-4 h-4 text-slate-400" />;
        default: return <HelpCircleIcon className="w-4 h-4 text-slate-400" />;
    }
};

const AttackChainView: React.FC<AttackChainViewProps> = ({ attackData, graphData }) => {
    const nodesMap = new Map(graphData.nodes.map(node => [node.id, node]));

    const flattenedSteps = attackData.flatMap(tactic => 
        tactic.techniques.map(technique => ({ ...technique, tactic }))
    );

    return (
        <div className="flex flex-col h-full w-full bg-surface/50 p-4 gap-4 animate-fade-in">
            <header className="flex-shrink-0 text-center">
                <h2 className="text-2xl font-bold text-slate-200 flex items-center justify-center gap-3">
                    <CrosshairIcon className="w-7 h-7" />
                    MITRE ATT&CK&reg; Kill Chain
                </h2>
                <p className="text-sm text-slate-400">A sequential breakdown of tactics and techniques identified by the AI.</p>
            </header>
            
            <div className="flex-grow overflow-x-auto overflow-y-hidden pb-4">
                <div className="inline-flex items-start gap-4 p-4 h-full">
                    {flattenedSteps.map((step, index) => (
                        <React.Fragment key={`${step.tactic.tacticId}-${step.techniqueId}`}>
                            <div className="flex flex-col w-72 h-full bg-slate-900 rounded-lg border border-slate-700 shadow-lg flex-shrink-0 animate-fade-in" style={{animationDelay: `${index * 150}ms`}}>
                                <div className="p-3 border-b border-slate-700/50 bg-slate-800/50 rounded-t-lg">
                                    <p className="text-xs font-bold text-primary uppercase">{step.tactic.tacticName}</p>
                                    <h3 className="font-bold text-slate-200 truncate">{step.techniqueName}</h3>
                                    <p className="text-xs text-slate-500">{step.techniqueId}</p>
                                </div>
                                <div className="p-3 flex-grow overflow-y-auto space-y-3">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Justification</h4>
                                        <p className="text-sm text-slate-300 leading-snug">{step.justification}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Evidence</h4>
                                        <div className="space-y-1.5">
                                            {step.indicatorIds.map(id => {
                                                const node = nodesMap.get(id);
                                                if (!node) return null;
                                                return (
                                                    <div key={id} className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-md text-sm">
                                                        <div className="flex-shrink-0">{getIconForNodeType(node.type)}</div>
                                                        <span className="font-mono text-slate-300 truncate" title={node.label}>{node.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {index < flattenedSteps.length - 1 && (
                                <div className="self-center flex-shrink-0">
                                    <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttackChainView;
