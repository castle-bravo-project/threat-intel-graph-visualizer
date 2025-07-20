import React, { useEffect, useRef, useCallback } from 'react';
import { select, Selection } from 'd3-selection';
import 'd3-transition';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, Simulation } from 'd3-force';
import { drag, D3DragEvent } from 'd3-drag';
import { zoom, zoomIdentity, ZoomBehavior } from 'd3-zoom';
import { GraphData, Node, Link } from '../types';
import { ZoomInIcon, ZoomOutIcon, ExpandIcon, SitemapIconString } from './icons';

interface ASViewProps {
  data: GraphData;
}

const createIconDataURI = (svgString: string, color: string): string => {
    const coloredSvg = svgString
        .replace(/currentColor/g, color)
        .replace(/class=".*?"/g, ''); 
    const base64 = btoa(unescape(encodeURIComponent(coloredSvg)));
    return `data:image/svg+xml;base64,${base64}`;
};

const ASView: React.FC<ASViewProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const graphGroupRef = useRef<Selection<SVGGElement, unknown, SVGSVGElement, unknown> | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<Simulation<Node, Link> | null>(null);

  const { nodes, links } = data;

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

  useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = select(svgRef.current);
      svg.selectAll('*').remove();

      const width = svg.node()!.getBoundingClientRect().width;
      const height = svg.node()!.getBoundingClientRect().height;

      const simulation = forceSimulation<Node>(nodes)
        .force('link', forceLink<Node, Link>(links).id(d => d.id).distance(250))
        .force('charge', forceManyBody().strength(-1200))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide().radius(80));
      simulationRef.current = simulation;
      
      graphGroupRef.current = svg.append('g');
      const g = graphGroupRef.current;

      const linkSelection = g.append('g').attr('class', 'links')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 2);

      const nodeSelection = g.append('g').attr('class', 'nodes')
        .selectAll('g.node')
        .data<Node>(nodes, d => (d as Node).id)
        .join('g')
        .attr('class', 'node')
        .call(dragBehavior(simulation) as any);

      nodeSelection.append('circle')
        .attr('r', 50)
        .attr('fill', '#1e293b')
        .attr('stroke', '#0ea5e9')
        .attr('stroke-width', 3);

      nodeSelection.append('image')
        .attr('href', createIconDataURI(SitemapIconString({}), '#e2e8f0'))
        .attr('x', -25).attr('y', -25).attr('width', 50).attr('height', 50);

      const textSelection = nodeSelection.append('text')
        .attr('fill', '#e2e8f0')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none');
      
      textSelection.selectAll('tspan').data(d => d.label.split('\n'))
        .join('tspan')
        .attr('x', 0)
        .attr('dy', (d, i) => i === 0 ? '65px' : '1.2em')
        .attr('font-size', (d, i) => i === 0 ? '14px' : '12px')
        .attr('font-weight', (d, i) => i === 0 ? 'bold' : 'normal')
        .text(d => d);

      simulation.on('tick', () => {
        linkSelection
            .attr('x1', d => (d.source as Node).x!)
            .attr('y1', d => (d.source as Node).y!)
            .attr('x2', d => (d.target as Node).x!)
            .attr('y2', d => (d.target as Node).y!);

        nodeSelection.attr('transform', d => `translate(${d.x!},${d.y!})`);
      });
      
      const zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 2]).on('zoom', (event) => g.attr('transform', event.transform));
      zoomBehaviorRef.current = zoomBehavior;
      svg.call(zoomBehavior).on("dblclick.zoom", null);
      
      setTimeout(handleFitToScreen, 150);

      return () => {
        simulation.stop();
        svg.selectAll('*').remove();
      };
  }, [data, nodes, links, handleFitToScreen]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 bg-surface/80 backdrop-blur-sm p-1 rounded-lg border border-slate-700 shadow-lg flex flex-col gap-1 z-10">
          <button onClick={() => select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current!.scaleBy, 1.2)} title="Zoom In" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <ZoomInIcon className="w-5 h-5" />
          </button>
          <button onClick={() => select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current!.scaleBy, 0.8)} title="Zoom Out" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <ZoomOutIcon className="w-5 h-5" />
          </button>
          <div className="w-full h-[1px] bg-slate-600 my-1"></div>
          <button onClick={handleFitToScreen} title="Fit to Screen" className="p-2 text-slate-300 hover:text-primary hover:bg-slate-700 rounded-md transition-colors">
              <ExpandIcon className="w-5 h-5" />
          </button>
      </div>
    </div>
  );
};

export default ASView;
