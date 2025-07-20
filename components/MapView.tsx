
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { select, Selection } from 'd3-selection';
import { GraphData, Node as GraphNode } from '../types';

interface MapViewProps {
  data: GraphData;
}

// Helper function to create a quadratic Bezier curve path string for an arc.
function createArcPath(startPoint: L.Point, endPoint: L.Point): string {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const midX = startPoint.x + dx * 0.5;
    const midY = startPoint.y + dy * 0.5;

    // Defines the curvature of the arc. The control point is offset perpendicularly
    // from the line's midpoint, with the offset proportional to the line's length.
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curvature = Math.min(dist * 0.001, 0.3); // Adjust curvature based on distance
    const controlX = midX - dy * curvature;
    const controlY = midY + dx * curvature;

    return `M${startPoint.x},${startPoint.y} Q${controlX},${controlY} ${endPoint.x},${endPoint.y}`;
}

const MapView: React.FC<MapViewProps> = ({ data }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const svgOverlay = useRef<L.SVG | null>(null);
  const svgGroup = useRef<Selection<SVGGElement, unknown, null, undefined> | null>(null);
  
  // Ref to store geo nodes to avoid passing full data into listener closures
  const geoNodeMapRef = useRef(new Map<string, GraphNode>());

  // Initialize map instance once
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    markerLayer.current = L.layerGroup().addTo(mapInstance.current);
    svgOverlay.current = L.svg().addTo(mapInstance.current);
    
    const pane = svgOverlay.current.getPane();
    if (pane) {
      svgGroup.current = select(pane).select('svg').append('g');
    }
  }, []);

  // Handle data changes and map listeners
  useEffect(() => {
    if (!mapInstance.current || !markerLayer.current || !svgGroup.current) return;
    
    // Define the function to draw/update arcs. This function does not change map state.
    const redrawArcs = () => {
        if (!mapInstance.current || !svgGroup.current) return;
        
        svgGroup.current.selectAll('*').remove();
        const geoNodeMap = geoNodeMapRef.current;

        data.links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
            
            const sourceNode = geoNodeMap.get(sourceId);
            const targetNode = geoNodeMap.get(targetId);

            if (sourceNode && targetNode) {
                const startPoint = mapInstance.current!.latLngToLayerPoint(L.latLng(sourceNode.lat!, sourceNode.lng!));
                const endPoint = mapInstance.current!.latLngToLayerPoint(L.latLng(targetNode.lat!, targetNode.lng!));
                const pathData = createArcPath(startPoint, endPoint);

                // Background track for the arc
                svgGroup.current!.append('path')
                    .attr('d', pathData)
                    .attr('fill', 'none')
                    .attr('stroke', '#64748b')
                    .attr('stroke-width', 1.5)
                    .attr('opacity', 0.4);
                
                // Animated "marching ants" arc
                svgGroup.current!.append('path')
                    .attr('d', pathData)
                    .attr('fill', 'none')
                    .attr('stroke', '#0ea5e9')
                    .attr('stroke-width', 2)
                    .attr('class', 'arc-path-animated');
            }
        });
    };

    // Update markers and geoNodeMapRef based on new data
    markerLayer.current.clearLayers();
    const geoNodes = data.nodes.filter(node => node.lat !== undefined && node.lng !== undefined);
    geoNodeMapRef.current = new Map(geoNodes.map(node => [node.id, node]));

    // Update markers and set map view. This part *does* change map state.
    if (geoNodes.length > 0) {
      geoNodes.forEach(node => {
        const icon = L.divIcon({
            className: 'leaflet-pulsing-icon',
            html: `<div class="bg-primary rounded-full w-3 h-3 border-2 border-slate-100 shadow-lg animate-pulse-slow"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        const marker = L.marker([node.lat!, node.lng!], { icon }).addTo(markerLayer.current!);
        marker.bindPopup(`<div class="bg-slate-800 text-white p-1 rounded-md shadow-lg"><strong class="text-primary">${node.type}:</strong> ${node.label}</div>`, { closeButton: false });
      });

      const bounds = L.latLngBounds(geoNodes.map(n => [n.lat!, n.lng!]));
      if (bounds.isValid()) {
          // fitBounds will trigger a 'moveend' event, which will correctly call redrawArcs
          mapInstance.current.fitBounds(bounds.pad(0.5));
      }
    } else {
      // If no geo nodes, reset view and clear arcs
      mapInstance.current.setView([20, 0], 2);
      redrawArcs();
    }
    
    // Set up listeners for map interaction
    mapInstance.current.on('viewreset moveend', redrawArcs);
    
    // Cleanup listeners on component unmount or when data changes (to re-attach)
    return () => {
      if (mapInstance.current) {
        mapInstance.current.off('viewreset moveend', redrawArcs);
      }
    };
  }, [data]);

  return <div ref={mapRef} className="w-full h-full bg-slate-800" />;
};

export default MapView;
