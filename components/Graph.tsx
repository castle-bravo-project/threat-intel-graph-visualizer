import React, { useEffect, useRef, useCallback } from 'react';
import { select, Selection } from 'd3-selection';
import 'd3-transition';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation, ForceLink } from 'd3-force';
import { drag, D3DragEvent } from 'd3-drag';
import { zoom, zoomIdentity, ZoomBehavior } from 'd3-zoom';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { line, curveCatmullRomClosed } from 'd3-shape';
import { polygonHull, polygonCentroid } from 'd3-polygon';
import { GraphData, Node, Link, PathResult, Cluster, NodeType } from '../types';
import { FileIconString, GlobeIconString, ServerIconString, HelpCircleIconString, ZoomInIcon, ZoomOutIcon, ExpandIcon, DownloadIcon, TerminalSquareIconString, KeyIconString, SitemapIconString } from './icons';

interface GraphProps {
  data: GraphData;
  isPathfinding: boolean;
  onNodeSelect: (node: Node | null) => void;
  pathResult: PathResult | null;
  clusterData: Cluster[] | null;
  searchResults?: string[];
  selectedNodeId?: string | null;
  asFilter?: string | null;
}

const getLinkId = (link: Link) => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as Node).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as Node).id;
    return [sourceId, targetId].sort().join('-');
};

const createIconDataURI = (svgString: string, color: string): string => {
    const coloredSvg = svgString
        .replace(/currentColor/g, color)
        .replace(/class=".*?"/g, ''); 
    const base64 = btoa(unescape(encodeURIComponent(coloredSvg)));
    return `data:image/svg+xml;base64,${base64}`;
};

export const Graph: React.FC<GraphProps> = ({ data, isPathfinding, onNodeSelect, pathResult, clusterData, searchResults, selectedNodeId, asFilter }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const graphGroupRef = useRef<Selection<SVGGElement, unknown, SVGSVGElement, unknown> | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<Simulation<Node, Link> | null>(null);
  
  // Refs to store D3 selections
  const selectionsRef = useRef<{
      link?: Selection<SVGLineElement, Link, SVGGElement, unknown>;
      particle?: Selection<SVGCircleElement, Link, SVGGElement, unknown>;
      node?: Selection<SVGGElement, Node, SVGGElement, unknown>;
      hull?: Selection<SVGPathElement, Cluster, SVGGElement, unknown>;
      hullLabel?: Selection<SVGTextElement, Cluster, SVGGElement, unknown>;
  }>({});

  const { nodes, links } = data;

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.scaleBy, 1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.scaleBy, 0.8);
  }, []);
  
  const handleFitToScreen = useCallback(() => {
    if (!svgRef.current || !graphGroupRef.current || !zoomBehaviorRef.current || !nodes || nodes.length === 0) return;

    const svg = select(svgRef.current);
    const gNode = graphGroupRef.current.node();
    if(!gNode) return;

    const bounds = gNode.getBBox();
    const parent = svg.node() as Element;
    const fullWidth = parent.clientWidth;
    const fullHeight = parent.clientHeight;
    
    const { x, y, width, height } = bounds;

    if (width === 0 || height === 0) return;

    const midX = x + width / 2;
    const midY = y + height / 2;
    const scale = Math.min(fullWidth / width, fullHeight / height) * 0.9;
    const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

    const transform = zoomIdentity.translate(translate[0], translate[1]).scale(scale);

    svg.transition().duration(750).call(zoomBehaviorRef.current.transform, transform);
  }, [nodes]);

  const handleExportPNG = useCallback(() => {
    if (!svgRef.current || !graphGroupRef.current) return;

    const svgNode = svgRef.current;
    const graphGroupNode = graphGroupRef.current.node();
    if (!graphGroupNode) return;
    
    const bbox = graphGroupNode.getBBox();
    const padding = 20;
    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;

    const clonedSvgNode = svgNode.cloneNode(true) as SVGSVGElement;
    select(clonedSvgNode)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`);
        
    select(clonedSvgNode).select('g').attr('transform', null);
    
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvgNode);

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');

        if (context) {
            context.fillStyle = '#0f172a'; // slate-900 background
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0);

            const link = document.createElement('a');
            link.download = 'threat-intel-graph.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
    };
    image.onerror = (err) => {
        console.error("Failed to load SVG image for export.", err);
        URL.revokeObjectURL(url);
    };
    image.src = url;
  }, []);

  const dragBehavior = (simulation: Simulation<Node, undefined>) => {
    function dragstarted(event: D3DragEvent<any, Node, any>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x!;
      event.subject.fy = event.subject.y!;
    }
    function dragged(event: D3DragEvent<any, Node, any>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    function dragended(event: D3DragEvent<any, Node, any>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    return drag<any, Node>().on('start', dragstarted).on('drag', dragged).on('end', dragended);
  };

  // Effect for initial setup
  useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = select(svgRef.current);
      const width = svg.node()!.getBoundingClientRect().width;
      const height = svg.node()!.getBoundingClientRect().height;

      const simulation = forceSimulation<Node>()
        .force('link', forceLink<Node, Link>().id(d => d.id).distance(150))
        .force('charge', forceManyBody().strength(-400))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide().radius(40));

      simulationRef.current = simulation;
      
      graphGroupRef.current = svg.append('g');
      
      const g = graphGroupRef.current;
      g.append('g').attr('class', 'hulls');
      g.append('g').attr('class', 'links');
      g.append('g').attr('class', 'particles');
      g.append('g').attr('class', 'nodes');

      const tooltip = select('#graph-tooltip');

      const convexHull = line<[number, number]>()
        .x(d => d[0])
        .y(d => d[1])
        .curve(curveCatmullRomClosed.alpha(0.7));

      simulation.on('tick', () => {
        selectionsRef.current.link
            ?.attr('x1', d => (d.source as Node).x!)
            .attr('y1', d => (d.source as Node).y!)
            .attr('x2', d => (d.target as Node).x!)
            .attr('y2', d => (d.target as Node).y!);

        selectionsRef.current.node?.attr('transform', d => `translate(${d.x!},${d.y!})`);

        selectionsRef.current.particle?.each(function(d) {
            const p = select(this);
            let progress = p.property('progress') || 0;
            progress += 0.01;
            if (progress > 1) progress = 0;
            p.property('progress', progress);

            const sourceNode = d.source as Node;
            const targetNode = d.target as Node;
            
            if (sourceNode.x && targetNode.x) {
              const x = sourceNode.x * (1 - progress) + targetNode.x * progress;
              const y = sourceNode.y! * (1 - progress) + targetNode.y! * progress;
              p.attr('cx', x).attr('cy', y);
            }
        });
        
        // This logic correctly stays in the tick handler to keep labels pinned to their moving clusters
        if (selectionsRef.current.hull && selectionsRef.current.hullLabel) {
            selectionsRef.current.hull.attr('d', cluster => {
                const clusterNodes = (cluster.nodeIds || []).map(id => simulationRef.current!.nodes().find(n => n.id === id)).filter((n): n is Node => !!(n && n.x && n.y));
                if (clusterNodes.length < 2) return null;
                const points = clusterNodes.map(n => [n.x!, n.y!]) as [number, number][];
                if (points.length < 3) return line()(points);
                const hullPoints = polygonHull(points);
                return hullPoints ? convexHull(hullPoints) : null;
            });
            
            selectionsRef.current.hullLabel.attr('transform', cluster => {
                const clusterNodes = (cluster.nodeIds || []).map(id => simulationRef.current!.nodes().find(n => n.id === id)).filter((n): n is Node => !!(n && n.x && n.y));
                if (clusterNodes.length === 0) return '';
                const points = clusterNodes.map(n => [n.x!, n.y!]) as [number, number][];
                const centroid = polygonCentroid(points);
                if(isNaN(centroid[0]) || isNaN(centroid[1])) return '';
                return `translate(${centroid[0]}, ${centroid[1]})`;
            });
        }
      });
      
      const zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]).on('zoom', (event) => g.attr('transform', event.transform));
      zoomBehaviorRef.current = zoomBehavior;
      svg.call(zoomBehavior).on("dblclick.zoom", null);
      
      svg.on('click', () => onNodeSelect(null));

      return () => {
        simulation.stop();
        svg.selectAll('*').remove();
      };
  }, [onNodeSelect]);

  // Effect to update graph with new data
  useEffect(() => {
    if (!simulationRef.current || !graphGroupRef.current) return;

    const g = graphGroupRef.current;
    const simulation = simulationRef.current;
    const tooltip = select('#graph-tooltip');

    // Update simulation data
    simulation.nodes(nodes);
    simulation.force<ForceLink<Node, Link>>('link')?.links(links);
    
    // --- Links ---
    selectionsRef.current.link = g.select<SVGGElement>('g.links')
        .selectAll<SVGLineElement, Link>('line')
        .data(links, d => getLinkId(d))
        .join('line')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 2);
        
    // --- Particles ---
    selectionsRef.current.particle = g.select<SVGGElement>('g.particles')
        .selectAll<SVGCircleElement, Link>('circle')
        .data(links, d => getLinkId(d))
        .join('circle')
        .attr('r', 3)
        .attr('fill', '#0ea5e9');

    // --- Nodes ---
    selectionsRef.current.node = g.select<SVGGElement>('g.nodes')
        .selectAll<SVGGElement, Node>('g.node')
        .data(nodes, d => d.id)
        .join(
            enter => {
                const nodeGroup = enter.append('g')
                    .attr('class', 'node')
                    .attr('cursor', 'pointer')
                    .call(dragBehavior(simulation) as any);
                
                nodeGroup.append('circle')
                    .attr('r', 25)
                    .attr('fill', d => {
                        if (d.isMalicious) return '#ef4444'; // red-500
                        return d.type === 'main' ? '#0ea5e9' : '#1e293b'
                    })
                    .attr('stroke', d => d.isMalicious ? '#f87171' : '#0ea5e9') // red-400
                    .attr('stroke-width', d => d.isMalicious ? 3 : 2);
                
                nodeGroup.append('image')
                    .attr('href', d => {
                        const mainColor = '#ffffff';
                        const otherColor = '#e2e8f0';
                        switch (d.type) {
                            case 'main': return createIconDataURI(FileIconString({}), mainColor);
                            case 'ip': return createIconDataURI(ServerIconString({}), otherColor);
                            case 'domain': return createIconDataURI(GlobeIconString({}), otherColor);
                            case 'file': return createIconDataURI(FileIconString({}), otherColor);
                            case 'process': return createIconDataURI(TerminalSquareIconString({}), otherColor);
                            case 'registry_key': return createIconDataURI(KeyIconString({}), otherColor);
                            case 'asn': return createIconDataURI(SitemapIconString({}), otherColor);
                            default: return createIconDataURI(HelpCircleIconString({}), otherColor);
                        }
                    })
                    .attr('x', -15).attr('y', -15).attr('width', 30).attr('height', 30).style('pointer-events', 'none');

                nodeGroup.append('text')
                    .attr('y', 40).attr('text-anchor', 'middle').attr('fill', '#e2e8f0').attr('font-size', '12px')
                    .text(d => (d.label || '').length > 20 ? d.label.substring(0, 17) + '...' : d.label);
                
                nodeGroup.append('title').text(d => d.label || '');

                return nodeGroup;
            },
            update => { // Handle updates, especially for isMalicious flag
                update.select('circle')
                    .transition().duration(300)
                    .attr('fill', d => d.isMalicious ? '#ef4444' : (d.type === 'main' ? '#0ea5e9' : '#1e293b'))
                    .attr('stroke', d => d.isMalicious ? '#f87171' : '#0ea5e9')
                    .attr('stroke-width', d => d.isMalicious ? 3 : 2);
                return update;
            }
        );

    selectionsRef.current.node
        .on('click', (event, d) => { event.stopPropagation(); onNodeSelect(d); })
        .on('mouseover', (event, d) => {
            tooltip.transition().duration(200).style('opacity', 1);
            tooltip.html(`<div class="font-bold text-primary break-words">${d.type.charAt(0).toUpperCase() + d.type.slice(1)} Node</div><div class="mt-1 border-t border-slate-700 pt-1 break-all"><strong class="text-slate-400">Value:</strong> ${d.label || 'N/A'}</div>`)
                   .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseout', () => tooltip.transition().duration(300).style('opacity', 0));

    simulation.alpha(0.8).restart();
    setTimeout(handleFitToScreen, 100);

  }, [nodes, links, onNodeSelect, handleFitToScreen]);
  
  // Effect for clustering
  useEffect(() => {
    if (!graphGroupRef.current) return;
    const g = graphGroupRef.current;
    const clusterColors = scaleOrdinal(schemeCategory10);

    selectionsRef.current.hull = g.select<SVGGElement>('g.hulls')
      .selectAll<SVGPathElement, Cluster>('path.hull')
      .data(clusterData || [], d => d.title)
      .join('path')
      .attr('class', 'hull')
      .style('fill', (d, i) => clusterColors(i.toString()) as string)
      .style('stroke', (d, i) => clusterColors(i.toString()) as string)
      .style('stroke-width', 40).style('stroke-linejoin', 'round')
      .style('opacity', 0.25).style('filter', 'blur(10px)');

    selectionsRef.current.hullLabel = g.select<SVGGElement>('g.hulls')
      .selectAll<SVGTextElement, Cluster>('text.hull-label')
      .data(clusterData || [], d => d.title)
      .join('text')
      .attr('class', 'hull-label')
      .attr('fill', (d, i) => clusterColors(i.toString()) as string)
      .attr('font-weight', 'bold').attr('font-size', '16px')
      .style('paint-order', 'stroke').style('stroke', '#0f172a')
      .style('stroke-width', '4px').style('stroke-linecap', 'butt').style('stroke-linejoin', 'miter')
      .text(d => d.title).attr('text-anchor', 'middle');

  }, [clusterData]);

  // Effect for highlighting
  useEffect(() => {
    const { node, link, particle } = selectionsRef.current;
    if (!node || !link || !particle) return;
    
    const defaultStroke = (n: Node) => n.isMalicious ? '#f87171' : '#0ea5e9';

    if (pathResult) {
        const pathNodeIds = new Set(pathResult.path.nodes);
        const pathLinkIds = new Set(pathResult.path.links);
        node.style('opacity', (n: Node) => pathNodeIds.has(n.id) ? 1 : 0.1);
        node.selectAll('circle').attr('stroke', (n: Node) => pathNodeIds.has(n.id) ? '#f59e0b' : defaultStroke(n));
        link.style('opacity', (l: Link) => pathLinkIds.has(getLinkId(l)) ? 1 : 0.1)
            .attr('stroke', (l: Link) => pathLinkIds.has(getLinkId(l)) ? '#38bdf8' : '#64748b');
        particle.style('opacity', (l: Link) => pathLinkIds.has(getLinkId(l)) ? 1 : 0.05);
    } else if (asFilter) {
        const asNodeIds = new Set(nodes.filter(n => n.asn?.number === asFilter).map(n => n.id));
        node.style('opacity', (n: Node) => asNodeIds.has(n.id) ? 1 : 0.1);
        node.selectAll('circle')
            .attr('stroke', (n: Node) => asNodeIds.has(n.id) ? '#fbbf24' : defaultStroke(n))
            .attr('stroke-width', (n: Node) => asNodeIds.has(n.id) ? 3 : (n.isMalicious ? 3 : 2));
        link.style('opacity', 0.1);
        particle.style('opacity', 0.05);
    } else if (searchResults && searchResults.length > 0) {
        const searchResultIds = new Set(searchResults);
        const visibleNodeIds = new Set(searchResultIds);
        
        links.forEach(l => {
            const sourceId = (l.source as Node).id;
            const targetId = (l.target as Node).id;
            if (searchResultIds.has(sourceId)) visibleNodeIds.add(targetId);
            if (searchResultIds.has(targetId)) visibleNodeIds.add(sourceId);
        });

        node.style('opacity', (n: Node) => visibleNodeIds.has(n.id) ? 1 : 0.1);
        node.selectAll('circle')
            .attr('stroke', (n: Node) => searchResultIds.has(n.id) ? '#fbbf24' : defaultStroke(n))
            .attr('stroke-width', (n: Node) => searchResultIds.has(n.id) ? 3 : (n.isMalicious ? 3 : 2));
        
        link.style('opacity', (l: Link) => {
            const sourceId = (l.source as Node).id;
            const targetId = (l.target as Node).id;
            return (searchResultIds.has(sourceId) || searchResultIds.has(targetId)) ? 1 : 0.1;
        });
        particle.style('opacity', (l: Link) => {
            const sourceId = (l.source as Node).id;
            const targetId = (l.target as Node).id;
            return (searchResultIds.has(sourceId) || searchResultIds.has(targetId)) ? 1 : 0.05;
        });
    } else if (selectedNodeId) {
        const connectedNodeIds = new Set([selectedNodeId]);
        links.forEach(l => {
            const sourceId = (l.source as Node).id;
            const targetId = (l.target as Node).id;
            if(sourceId === selectedNodeId) connectedNodeIds.add(targetId);
            if(targetId === selectedNodeId) connectedNodeIds.add(sourceId);
        });
        
        node.style('opacity', (n: Node) => connectedNodeIds.has(n.id) ? 1 : 0.2);
        link.style('opacity', (l: Link) => {
            const sourceId = (l.source as Node).id;
            const targetId = (l.target as Node).id;
            return (sourceId === selectedNodeId || targetId === selectedNodeId) ? 0.6 : 0.1;
        });
        node.selectAll('circle')
            .attr('stroke', (n: Node) => n.id === selectedNodeId ? '#f59e0b' : defaultStroke(n))
            .attr('stroke-width', (n: Node) => n.id === selectedNodeId ? 4 : (n.isMalicious ? 3 : 2));
    } else {
        node.style('opacity', 1);
        node.selectAll('circle').attr('stroke', defaultStroke).attr('stroke-width', (n: Node) => n.isMalicious ? 3 : 2);
        link.style('opacity', 1).attr('stroke', '#64748b');
        particle.style('opacity', 1);
    }
  }, [pathResult, searchResults, selectedNodeId, asFilter, links, nodes]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-surface/80 backdrop-blur-sm p-1 rounded-lg border border-slate-700 shadow-lg flex flex-col gap-1 z-10">
          <button onClick={handleZoomIn} title="Zoom In" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <ZoomInIcon className="w-5 h-5" />
          </button>
          <button onClick={handleZoomOut} title="Zoom Out" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <ZoomOutIcon className="w-5 h-5" />
          </button>
          <div className="w-full h-[1px] bg-slate-600 my-1"></div>
          <button onClick={handleFitToScreen} title="Fit to Screen" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <ExpandIcon className="w-5 h-5" />
          </button>
          <button onClick={handleExportPNG} title="Export as PNG" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <DownloadIcon className="w-5 h-5" />
          </button>
      </div>
    </div>
  );
};