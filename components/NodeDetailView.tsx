import React from 'react';
import { Node, EnrichmentData } from '../types';
import { XIcon, ServerIcon, GlobeIcon, FileCodeIcon, HelpCircleIcon, ZapIcon, LoaderCircleIcon, IconProps, ShieldCheckIcon, ShieldXIcon, AlertTriangleIcon } from './icons';

interface NodeDetailViewProps {
  node: Node | null;
  enrichmentData: EnrichmentData | null;
  isEnriching: boolean;
  onEnrich: (node: Node) => void;
  onClose: () => void;
}

const getIconForNodeType = (type: string): React.FC<IconProps> => {
    switch (type) {
        case 'ip': return ServerIcon;
        case 'domain': return GlobeIcon;
        case 'file': return FileCodeIcon;
        default: return HelpCircleIcon;
    }
};

const formatKey = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const TrustScorecard: React.FC<{node: Node, data: EnrichmentData}> = ({ node, data }) => {
    const isDomainRecent = (creationDate: string): boolean => {
        try {
            const date = new Date(creationDate);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return date > thirtyDaysAgo;
        } catch (e) {
            return false;
        }
    };

    const isSslMismatch = data.ssl_certificate?.common_name && node.label !== data.ssl_certificate.common_name;
    const isRecent = data.creation_date && isDomainRecent(data.creation_date);

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Domain Trust Scorecard</h4>
            
            {/* SSL Mismatch */}
            <div className={`p-3 rounded-lg flex items-start gap-3 ${isSslMismatch ? 'bg-red-900/50 border-l-4 border-red-500' : 'bg-green-900/30 border-l-4 border-green-500'}`}>
                {isSslMismatch ? <ShieldXIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-1"/> : <ShieldCheckIcon className="w-6 h-6 text-green-400 flex-shrink-0 mt-1"/>}
                <div>
                    <p className="font-bold text-slate-200">SSL Certificate Match</p>
                    {isSslMismatch ? (
                        <>
                            <p className="text-sm text-red-300">Certificate name does NOT match domain.</p>
                            <p className="text-xs font-mono text-red-400 mt-1 break-all">Domain: {node.label}<br/>Cert CN: {data.ssl_certificate.common_name}</p>
                        </>
                    ) : (
                        <p className="text-sm text-green-300">Certificate name matches domain.</p>
                    )}
                </div>
            </div>

            {/* Domain Age */}
            <div className={`p-3 rounded-lg flex items-start gap-3 ${isRecent ? 'bg-amber-900/50 border-l-4 border-amber-500' : 'bg-slate-800/80 border-l-4 border-slate-600'}`}>
                <AlertTriangleIcon className={`w-6 h-6 ${isRecent ? 'text-amber-400' : 'text-slate-500'} flex-shrink-0 mt-1`}/>
                <div>
                    <p className="font-bold text-slate-200">Domain Age</p>
                    <p className={`text-sm ${isRecent ? 'text-amber-300' : 'text-slate-300'}`}>
                        {isRecent ? 'Domain registered recently.' : 'Domain is not newly registered.'}
                    </p>
                     <p className="text-xs font-mono text-slate-400 mt-1">Created: {data.creation_date || 'N/A'}</p>
                </div>
            </div>

            <div className="bg-slate-800/80 p-3 rounded-lg">
                <p><strong className="text-slate-400 font-medium">Registrar:</strong> <span className="text-slate-200">{data.registrar || 'N/A'}</span></p>
                <p><strong className="text-slate-400 font-medium">VT Detections:</strong> <span className="text-slate-200">{data.vt_detection_ratio || 'N/A'}</span></p>
                <p><strong className="text-slate-400 font-medium">Reputation:</strong> <span className="text-slate-200">{data.reputation || 'N/A'}</span></p>
            </div>
             <div className="bg-slate-800/80 p-3 rounded-lg">
                <p className="font-bold text-slate-300 mb-1">AI Summary</p>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{data.summary || 'No summary available.'}</p>
            </div>

        </div>
    );
};


const NodeDetailView: React.FC<NodeDetailViewProps> = ({ node, enrichmentData, isEnriching, onEnrich, onClose }) => {
  if (!node) {
    return null;
  }

  const Icon = getIconForNodeType(node.type);

  return (
    <div className={`absolute top-0 right-0 h-full w-full md:w-1/2 lg:w-2/5 xl:w-1/3 bg-slate-900/80 backdrop-blur-sm border-l border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out z-20 ${node ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full p-4">
        <header className="flex justify-between items-start pb-3 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="flex-shrink-0 mt-1">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-primary uppercase">{node.type}</p>
              <h3 className="text-lg font-mono text-slate-200 truncate break-all" title={node.label}>
                {node.label}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white">
            <XIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto mt-4 pr-2">
            {(node.type === 'ip' || node.type === 'domain' || node.type === 'file') && (
              <button
                  onClick={() => onEnrich(node)}
                  disabled={isEnriching}
                  className="w-full bg-primary text-on-primary font-bold py-2 px-4 rounded-md hover:bg-sky-400 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                  {isEnriching ? <LoaderCircleIcon className="w-5 h-5 animate-spin" /> : <ZapIcon className="w-5 h-5" />}
                  <span>{isEnriching ? 'Enriching...' : 'Enrich Indicator'}</span>
              </button>
            )}
            
            <div className="space-y-4">
                {isEnriching ? (
                    <div className="text-center p-8 text-slate-400">
                        <LoaderCircleIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>Gathering intelligence...</p>
                    </div>
                ) : enrichmentData ? (
                    <div className="animate-fade-in">
                      {node.type === 'domain' ? (
                        <TrustScorecard node={node} data={enrichmentData} />
                      ) : (
                        <>
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Enrichment Data</h4>
                          <div className="space-y-3">
                              {Object.entries(enrichmentData).map(([key, value]) => (
                                  <div key={key} className="text-sm">
                                      <p className="font-semibold text-slate-400">{formatKey(key)}</p>
                                      <p className="text-slate-200 pl-2 whitespace-pre-wrap break-all">
                                          {Array.isArray(value) ? value.join(', ') : String(value)}
                                      </p>
                                  </div>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                ) : (
                   (node.type === 'ip' || node.type === 'domain' || node.type === 'file') && (
                        <div className="text-center p-8 text-slate-500">
                           <p>Click "Enrich Indicator" to get detailed threat intelligence.</p>
                        </div>
                    )
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailView;