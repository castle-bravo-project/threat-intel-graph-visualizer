import React, { useEffect, useMemo } from 'react';
import { GraphData, AttackMatrixData, Node, NodeType } from '../types';
import { PrinterIcon, CastleBravoLogo, ServerIcon, GlobeIcon, FileCodeIcon, HelpCircleIcon, TerminalSquareIcon, KeyIcon } from './icons';

// Make mermaid available in the component scope
declare var mermaid: any;

interface ReportViewProps {
    graphData: GraphData;
    analysis: string;
    attackData: AttackMatrixData;
    threatData: GraphData;
    yaraRules: string;
    mermaidGraph: string;
    eventName: string;
    recommendations: string;
    sandboxFileName: string | null;
    geoIpFileName: string | null;
}

const getIconForNodeType = (type: NodeType) => {
    switch (type) {
        case 'ip': return <ServerIcon className="w-4 h-4 text-slate-600" />;
        case 'domain': return <GlobeIcon className="w-4 h-4 text-slate-600" />;
        case 'file': return <FileCodeIcon className="w-4 h-4 text-slate-600" />;
        case 'process': return <TerminalSquareIcon className="w-4 h-4 text-slate-600" />;
        case 'registry_key': return <KeyIcon className="w-4 h-4 text-slate-600" />;
        default: return <HelpCircleIcon className="w-4 h-4 text-slate-600" />;
    }
};

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


export const ReportView: React.FC<ReportViewProps> = ({ 
    graphData, 
    analysis, 
    attackData, 
    threatData, 
    yaraRules, 
    mermaidGraph, 
    eventName,
    recommendations,
    sandboxFileName,
    geoIpFileName
}) => {
    const nodesMap = useMemo(() => new Map(graphData.nodes.map(node => [node.id, node])), [graphData.nodes]);
    const identifiedTacticsMap = useMemo(() => new Map(attackData.map(tactic => [tactic.tacticId, tactic])), [attackData]);

    const flattenedSteps = attackData.flatMap(tactic => 
        tactic.techniques.map(technique => ({ ...technique, tactic }))
    );

    useEffect(() => {
        try {
            mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                fontFamily: 'sans-serif',
                flowchart: {
                    htmlLabels: true,
                }
            });
            mermaid.run({
                nodes: document.querySelectorAll('.mermaid')
            });
        } catch (e) {
            console.error("Error rendering Mermaid diagram:", e);
        }
    }, [mermaidGraph]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-slate-800 text-on-surface w-full h-full overflow-y-auto" id="report-content">
            <header className="sticky top-0 bg-slate-800/80 backdrop-blur-sm p-4 flex justify-between items-center z-10 print:hidden border-b border-slate-700">
                <h1 className="text-xl font-bold text-primary">Generated Threat Report</h1>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-primary text-on-primary font-bold py-2 px-4 rounded-md hover:bg-sky-400 transition-colors"
                >
                    <PrinterIcon className="w-5 h-5" />
                    Print / Save as PDF
                </button>
            </header>
            <main className="max-w-4xl mx-auto p-4 sm:p-8 bg-white text-black print:p-0 print:shadow-none print:m-0 print:max-w-full">
                <header className="mb-8 pb-4 border-b border-gray-300 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-900">Cyber Threat Intelligence Report</h1>
                        <p className="text-slate-600 text-lg">Event: {eventName}</p>
                        <p className="text-slate-500 text-sm">Generated on: {new Date().toUTCString()}</p>
                    </div>
                    <div className="flex-shrink-0 pt-2">
                        <CastleBravoLogo width={280} height={70}/>
                    </div>
                </header>
                
                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">1. Executive Summary</h2>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">2. Actionable Recommendations</h2>
                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{recommendations}</p>
                     </div>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Attack Timeline (Key Indicators)</h2>
                    <div className="space-y-3">
                        {threatData.nodes.map((node, index) => (
                            <div key={node.id} className="p-3 border border-gray-200 rounded-md flex items-start gap-4">
                                <div className="text-blue-600 font-bold text-xl mt-1">{index + 1}</div>
                                <div className="flex-grow">
                                    <p className="font-bold text-gray-800">{node.type.toUpperCase()}</p>
                                    <p className="font-mono text-sm text-gray-600 break-all">{node.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-8 report-kill-chain" style={{ pageBreakInside: 'avoid' }}>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">4. ATT&CK® Kill Chain</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 print:flex-wrap print:overflow-visible print:gap-y-4">
                        {flattenedSteps.map((step, index) => (
                             <React.Fragment key={`${step.tactic.tacticId}-${step.techniqueId}`}>
                                <div className="flex flex-col w-72 bg-white rounded-lg border border-gray-300 shadow-md flex-shrink-0">
                                    <div className="p-3 border-b border-gray-200 bg-gray-50/80 rounded-t-lg">
                                        <p className="text-xs font-bold text-blue-700 uppercase">{step.tactic.tacticName}</p>
                                        <h3 className="font-bold text-slate-800 truncate">{step.techniqueName}</h3>
                                        <p className="text-xs text-slate-500">{step.techniqueId}</p>
                                    </div>
                                    <div className="p-3 flex-grow space-y-3">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Justification</h4>
                                            <p className="text-sm text-gray-700 leading-snug">{step.justification}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Evidence</h4>
                                            <div className="space-y-1.5">
                                                {step.indicatorIds.map(id => {
                                                    const node = nodesMap.get(id);
                                                    if (!node) return null;
                                                    return (
                                                        <div key={id} className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-md text-sm">
                                                            <div className="flex-shrink-0">{getIconForNodeType(node.type)}</div>
                                                            <span className="font-mono text-gray-700 truncate" title={node.label}>{node.label}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {index < flattenedSteps.length - 1 && (
                                    <div className="self-center flex-shrink-0 print:hidden">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                )}
                             </React.Fragment>
                        ))}
                    </div>
                </section>
                
                <section className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">5. MITRE ATT&CK® Matrix Overview</h2>
                    <div className="w-full overflow-x-auto print:overflow-visible">
                        <div className="inline-grid grid-flow-col auto-cols-fr gap-px bg-gray-300 border border-gray-300">
                            {ALL_TACTICS.map(tactic => {
                                const tacticData = identifiedTacticsMap.get(tactic.id);
                                const isIdentified = !!tacticData;
                                return (
                                <div key={tactic.id} className="flex flex-col w-[85px] bg-white">
                                    <div className={`p-1.5 border-b border-gray-300 ${isIdentified ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                    <h3 className={`font-bold text-[10px] leading-tight text-center break-words ${isIdentified ? 'text-blue-800' : 'text-gray-600'}`}>
                                        {tactic.name}
                                    </h3>
                                    </div>
                                    <div className="p-1 flex-grow space-y-1 min-h-[100px]">
                                    {(tacticData?.techniques || []).map(tech => (
                                        <div key={tech.techniqueId} className="text-[10px] leading-tight p-1 rounded bg-blue-500 text-white" title={`${tech.techniqueId}: ${tech.techniqueName}`}>
                                        {tech.techniqueName}
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
                
                <section className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Attack Flow Diagram</h2>
                    <div className="p-4 border border-gray-200 rounded-md flex justify-center bg-gray-50/50">
                        <pre className="mermaid">
                            {mermaidGraph}
                        </pre>
                    </div>
                </section>

                 <section className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Detailed TTP Analysis</h2>
                    <div className="space-y-6">
                        {attackData.map(tactic => (
                            <div key={tactic.tacticId} className="p-4 border border-gray-200 rounded-lg shadow-md" style={{ pageBreakInside: 'avoid' }}>
                                <header className="mb-3">
                                    <h3 className="text-xl font-bold text-slate-800">{tactic.tacticName}</h3>
                                    <p className="text-sm text-slate-500">{tactic.tacticId}</p>
                                </header>
                                <div className="space-y-4">
                                    {tactic.techniques.map(technique => (
                                        <div key={technique.techniqueId} className="pl-4 border-l-4 border-blue-500 bg-gray-50/50 p-3 rounded-r-lg">
                                            <h4 className="font-semibold text-gray-900">{technique.techniqueName} ({technique.techniqueId})</h4>
                                            <p className="text-sm text-gray-700 italic my-2">{technique.justification}</p>
                                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Related Indicators:</h5>
                                            <ul className="space-y-1">
                                                {technique.indicatorIds.map(id => {
                                                    const node = nodesMap.get(id);
                                                    if (!node) return null;
                                                    return (
                                                        <li key={id} className="flex items-center gap-2 text-sm font-mono text-gray-700">
                                                            <div className="flex-shrink-0">{getIconForNodeType(node.type)}</div>
                                                            <span className="break-all">{node.label}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section style={{ pageBreakBefore: 'always' }}>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Appendix</h2>
                    
                     <details className="mb-4 border border-gray-200 rounded-md group">
                        <summary className="text-xl font-bold text-slate-800 list-none p-4 cursor-pointer flex justify-between items-center group-open:border-b group-open:border-gray-200">
                            <span>A.1 YARA Detection Rule</span>
                            <span className="text-base text-gray-500 transition-transform duration-300 transform group-open:rotate-90">&#x25B6;</span>
                        </summary>
                        <div className="p-4">
                            <pre className="bg-gray-100 text-sm p-4 rounded-md overflow-x-auto">
                                <code>{yaraRules}</code>
                            </pre>
                        </div>
                    </details>
                    
                    <details className="mb-4 border border-gray-200 rounded-md group" open>
                         <summary className="text-xl font-bold text-slate-800 list-none p-4 cursor-pointer flex justify-between items-center group-open:border-b group-open:border-gray-200">
                            <span>A.2 All Indicators of Compromise (IOCs)</span>
                            <span className="text-base text-gray-500 transition-transform duration-300 transform group-open:rotate-90">&#x25B6;</span>
                        </summary>
                        <div className="p-4">
                            <table className="w-full text-sm text-left text-gray-600 border-collapse">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                    <tr>
                                        <th className="p-3 border border-gray-300">Indicator Value</th>
                                        <th className="p-3 border border-gray-300">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {graphData.nodes.filter(n => n.type !== 'main').map(node => (
                                        <tr key={node.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono break-all border border-gray-300">{node.label}</td>
                                            <td className="p-3 capitalize border border-gray-300">{node.type}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>

                    <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                        <h3 className="font-bold text-slate-700 mb-2">A.3 Data Sources</h3>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            <li><span className="font-semibold">Primary Intel Source:</span> MISP Event - <span className="font-mono">{eventName}</span></li>
                            {sandboxFileName && (
                                <li><span className="font-semibold">Sandbox Analysis:</span> <span className="font-mono">{sandboxFileName}</span></li>
                            )}
                            {geoIpFileName && (
                                <li><span className="font-semibold">Geolocation Data:</span> <span className="font-mono">{geoIpFileName}</span></li>
                            )}
                        </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-2">A.4 Analysis Methodology</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            This report was generated using the Castle Bravo AI-driven analysis engine. The methodology involves several automated stages: First, structured threat data (e.g., MISP reports) and unstructured data (e.g., sandbox reports) are parsed into a relational graph of indicators. Second, a large language model analyzes this graph to generate a narrative summary, assess threat levels, and identify key indicators. Third, indicators are mapped to the MITRE ATT&CK® framework to contextualize adversary behavior. Finally, derivative artifacts such as attack timelines, YARA rules, and actionable recommendations are produced. The purpose is to rapidly process complex CTI datasets, providing security analysts with a comprehensive and focused head start for manual analysis and incident response.
                        </p>
                    </div>

                </section>
            </main>
        </div>
    );
};