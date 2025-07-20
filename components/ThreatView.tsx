
import React from 'react';
import { GraphData, Node, NodeType } from '../types';
import { ServerIcon, GlobeIcon, HelpCircleIcon, ShieldAlertIcon, FileCodeIcon, TerminalSquareIcon, KeyIcon } from './icons';

// A mapping from NodeType to a specific icon component
const getIconForNodeType = (type: NodeType): React.FC<{className?: string}> => {
    switch (type) {
        case 'main': return ShieldAlertIcon;
        case 'ip': return ServerIcon;
        case 'domain': return GlobeIcon;
        case 'file': return FileCodeIcon;
        case 'process': return TerminalSquareIcon;
        case 'registry_key': return KeyIcon;
        default: return HelpCircleIcon;
    }
};

const ThreatView = ({ data, analysis }: { data: GraphData; analysis: string; }) => {
    // The `data.nodes` are already ordered by the AI's `keyIndicatorIds`
    const orderedNodes = data?.nodes || [];

    return (
        <div className="flex flex-col lg:flex-row h-full w-full bg-surface/50 p-4 gap-4 animate-fade-in">
            {/* Left Panel: AI Analysis */}
            <aside className="w-full lg:w-1/3 xl:w-1/4 bg-slate-900 rounded-lg p-4 lg:p-6 border border-slate-700/50 flex flex-col">
                <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2 flex-shrink-0">
                    <ShieldAlertIcon className="w-6 h-6" />
                    <span>AI Threat Analysis</span>
                </h2>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                </div>
            </aside>

            {/* Right Panel: Visual Threat Flow */}
            <div className="w-full lg:w-2/3 xl:w-3/4 flex-grow flex flex-col items-center justify-start p-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-slate-300 mb-6 flex-shrink-0">Key Indicator Flow</h2>
                {orderedNodes.length > 0 ? (
                    <div className="w-full max-w-4xl space-y-2">
                        {orderedNodes.map((node, index) => {
                            if (!node) return null; // Defensive check for null nodes in the array
                            const IconComponent = getIconForNodeType(node.type);
                            return (
                                <React.Fragment key={node.id}>
                                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center gap-4 shadow-lg transform hover:scale-[1.02] transition-transform duration-300 animate-fade-in" style={{animationDelay: `${index * 100}ms`}}>
                                        <div className="p-3 bg-primary/20 rounded-full">
                                            <IconComponent className="w-8 h-8 text-primary" />
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <div className="text-xs uppercase font-bold text-slate-400">{node.type}</div>
                                            <div className="text-lg text-on-surface font-mono break-all truncate" title={node.label}>{node.label}</div>
                                        </div>
                                    </div>
                                    {index < orderedNodes.length - 1 && (
                                        <div className="flex justify-center h-8">
                                            <div className="w-px bg-slate-600"></div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-slate-500 text-center">
                        <p>No key indicators were identified for the Threat View.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThreatView;
