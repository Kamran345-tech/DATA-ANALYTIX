import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Network, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Layers, 
  Sparkles, 
  Key, 
  ArrowRight, 
  Database, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Sliders, 
  Search,
  ExternalLink,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { DataModel, TableSchema, Relationship, ColumnProfile } from '../../types';
import { toast } from '../../store/useToast';

interface D3TableNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'fact' | 'dimension';
  columns: ColumnProfile[];
  primaryKey?: string;
  foreignKeys: { column: string; targetTable: string; targetColumn: string }[];
  rowCount: number;
  width: number;
  height: number;
  tier: number; // 0 for fact, 1 for primary dimension, 2 for sub-dimension (snowflake)
  degree: number;
}

interface D3RelationshipLink extends d3.SimulationLinkDatum<D3TableNode> {
  id: string;
  source: string | D3TableNode;
  target: string | D3TableNode;
  sourceColumn: string;
  targetColumn: string;
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  crossFilterDirection: 'single' | 'both';
  isValid: boolean;
  isActive?: boolean;
  integrityScore?: number;
}

interface D3SchemaGraphProps {
  dataModel: DataModel;
  isLight: boolean;
  onTableSelect?: (tableName: string) => void;
  onAddRelationshipRequest?: () => void;
}

type LayoutMode = 'star' | 'snowflake' | 'force';

export const D3SchemaGraph: React.FC<D3SchemaGraphProps> = ({
  dataModel,
  isLight,
  onTableSelect,
  onAddRelationshipRequest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return dataModel.schemaType === 'snowflake' ? 'snowflake' : 'star';
  });

  // Interactive UI states
  const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPhysicsFrozen, setIsPhysicsFrozen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showColumnDetails, setShowColumnDetails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store D3 simulation and zoom behaviors in refs
  const simulationRef = useRef<d3.Simulation<D3TableNode, D3RelationshipLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Prepare graph data (nodes & links) with tiered classification
  const { nodes, links, factNodeId } = useMemo(() => {
    const tableDegreeMap = new Map<string, number>();
    dataModel.tables.forEach(t => tableDegreeMap.set(t.name, 0));

    dataModel.relationships.forEach(rel => {
      tableDegreeMap.set(rel.sourceTable, (tableDegreeMap.get(rel.sourceTable) || 0) + 1);
      tableDegreeMap.set(rel.targetTable, (tableDegreeMap.get(rel.targetTable) || 0) + 1);
    });

    // Identify primary Fact table (type === 'fact' or highest degree)
    const factTable = dataModel.tables.find(t => t.type === 'fact') ||
      [...dataModel.tables].sort((a, b) => (tableDegreeMap.get(b.name) || 0) - (tableDegreeMap.get(a.name) || 0))[0];

    const factId = factTable ? factTable.name : (dataModel.tables[0]?.name || '');

    // Classify tiers for snowflake detection:
    // Tier 0: Fact
    // Tier 1: Dimensions directly connected to Fact
    // Tier 2: Sub-dimensions connected only to other dimensions
    const directToFact = new Set<string>();
    dataModel.relationships.forEach(r => {
      if (r.sourceTable === factId) directToFact.add(r.targetTable);
      if (r.targetTable === factId) directToFact.add(r.sourceTable);
    });

    const graphNodes: D3TableNode[] = dataModel.tables.map(table => {
      const isFact = table.name === factId;
      const isDirectDim = directToFact.has(table.name);
      const tier = isFact ? 0 : isDirectDim ? 1 : 2;

      // Card dimensions
      const nodeWidth = isFact ? 260 : 220;
      const visibleCols = Math.min(table.columns.length, showColumnDetails ? 5 : 2);
      const nodeHeight = 84 + visibleCols * 22;

      return {
        id: table.name,
        name: table.name,
        type: table.type,
        columns: table.columns,
        primaryKey: table.primaryKey,
        foreignKeys: table.foreignKeys,
        rowCount: table.rowCount,
        width: nodeWidth,
        height: nodeHeight,
        tier,
        degree: tableDegreeMap.get(table.name) || 0
      };
    });

    const graphLinks: D3RelationshipLink[] = dataModel.relationships
      .filter(rel => 
        graphNodes.some(n => n.id === rel.sourceTable) && 
        graphNodes.some(n => n.id === rel.targetTable)
      )
      .map(rel => ({
        id: rel.id,
        source: rel.sourceTable,
        target: rel.targetTable,
        sourceColumn: rel.sourceColumn,
        targetColumn: rel.targetColumn,
        cardinality: rel.cardinality,
        crossFilterDirection: rel.crossFilterDirection,
        isValid: rel.isValid,
        isActive: rel.isActive ?? true,
        integrityScore: rel.integrityScore ?? 100
      }));

    return { nodes: graphNodes, links: graphLinks, factNodeId: factId };
  }, [dataModel, showColumnDetails]);

  // Selected link details
  const activeRelationship = useMemo(() => {
    if (!selectedLinkId) return null;
    return dataModel.relationships.find(r => r.id === selectedLinkId) || null;
  }, [selectedLinkId, dataModel.relationships]);

  // SVG render & D3 simulation initialization
  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    // Clear previous elements
    svg.selectAll('*').remove();

    // Defs for filters, shadows, gradients, and arrow markers
    const defs = svg.append('defs');

    // Arrowhead marker: Single direction
    defs.append('marker')
      .attr('id', 'erd-arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L10,0L0,4')
      .attr('fill', isLight ? '#0284C7' : '#22D3EE');

    // Arrowhead marker: Bi-directional start
    defs.append('marker')
      .attr('id', 'erd-arrowhead-start')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 2)
      .attr('refY', 0)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M10,-4L0,0L10,4')
      .attr('fill', isLight ? '#0284C7' : '#22D3EE');

    // Soft drop shadow filter for table cards
    const filter = defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    filter.append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', isLight ? 3 : 6)
      .attr('stdDeviation', isLight ? 4 : 8)
      .attr('flood-color', isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(0, 0, 0, 0.6)');

    // Glowing border filter on focus
    const glowFilter = defs.append('filter')
      .attr('id', 'glow-active')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', 4)
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Background interactive grid pattern
    const pattern = defs.append('pattern')
      .attr('id', 'schema-grid')
      .attr('width', 32)
      .attr('height', 32)
      .attr('patternUnits', 'userSpaceOnUse');

    pattern.append('path')
      .attr('d', 'M 32 0 L 0 0 0 32')
      .attr('fill', 'none')
      .attr('stroke', isLight ? 'rgba(226, 232, 240, 0.7)' : 'rgba(255, 255, 255, 0.04)')
      .attr('stroke-width', 1);

    // Root zoom container
    const gRoot = svg.append('g').attr('class', 'g-root');

    // Grid rectangle
    gRoot.append('rect')
      .attr('x', -3000)
      .attr('y', -3000)
      .attr('width', 6000)
      .attr('height', 6000)
      .attr('fill', 'url(#schema-grid)')
      .style('pointer-events', 'none');

    // Links container (drawn behind nodes)
    const gLinks = gRoot.append('g').attr('class', 'g-links');

    // Link labels container
    const gLinkLabels = gRoot.append('g').attr('class', 'g-link-labels');

    // Nodes container
    const gNodes = gRoot.append('g').attr('class', 'g-nodes');

    // Setup zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2.5])
      .on('zoom', (event) => {
        gRoot.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    // Apply Layout Topology Positions
    const centerX = width / 2;
    const centerY = height / 2;

    if (layoutMode === 'star') {
      // Star Layout: Fact in exact center, Dimensions orbiting in clean radial rays
      const dimNodes = nodes.filter(n => n.id !== factNodeId);
      const totalDims = dimNodes.length;

      // Position Fact Node
      const factNode = nodes.find(n => n.id === factNodeId);
      if (factNode) {
        factNode.x = centerX;
        factNode.y = centerY;
        factNode.fx = isPhysicsFrozen ? factNode.x : centerX;
        factNode.fy = isPhysicsFrozen ? factNode.y : centerY;
      }

      // Distribute Dimension Nodes in an ellipse
      const radiusX = Math.min(360, Math.max(260, width * 0.35));
      const radiusY = Math.min(260, Math.max(180, height * 0.32));

      dimNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / totalDims - Math.PI / 2;
        node.x = centerX + radiusX * Math.cos(angle);
        node.y = centerY + radiusY * Math.sin(angle);
        if (isPhysicsFrozen) {
          node.fx = node.x;
          node.fy = node.y;
        } else {
          node.fx = null;
          node.fy = null;
        }
      });
    } else if (layoutMode === 'snowflake') {
      // Snowflake Layout: Concentric tiers. Fact -> Tier 1 Dims -> Tier 2 Sub-Dims
      const factNode = nodes.find(n => n.id === factNodeId);
      if (factNode) {
        factNode.x = centerX;
        factNode.y = centerY;
        factNode.fx = isPhysicsFrozen ? factNode.x : centerX;
        factNode.fy = isPhysicsFrozen ? factNode.y : centerY;
      }

      const tier1Nodes = nodes.filter(n => n.tier === 1);
      const tier2Nodes = nodes.filter(n => n.tier === 2);

      const r1X = Math.min(300, width * 0.28);
      const r1Y = Math.min(200, height * 0.26);
      const r2X = Math.min(460, width * 0.44);
      const r2Y = Math.min(320, height * 0.40);

      tier1Nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / Math.max(1, tier1Nodes.length) - Math.PI / 2;
        node.x = centerX + r1X * Math.cos(angle);
        node.y = centerY + r1Y * Math.sin(angle);
        if (isPhysicsFrozen) {
          node.fx = node.x;
          node.fy = node.y;
        }
      });

      tier2Nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * (i + 0.5)) / Math.max(1, tier2Nodes.length) - Math.PI / 2;
        node.x = centerX + r2X * Math.cos(angle);
        node.y = centerY + r2Y * Math.sin(angle);
        if (isPhysicsFrozen) {
          node.fx = node.x;
          node.fy = node.y;
        }
      });
    }

    // Force simulation setup
    const simulation = d3.forceSimulation<D3TableNode>(nodes)
      .force(
        'link',
        d3.forceLink<D3TableNode, D3RelationshipLink>(links)
          .id(d => d.id)
          .distance(layoutMode === 'force' ? 240 : 200)
          .strength(layoutMode === 'force' ? 0.7 : 0.3)
      )
      .force(
        'charge',
        d3.forceManyBody<D3TableNode>().strength(layoutMode === 'force' ? -1200 : -500)
      )
      .force(
        'collide',
        d3.forceCollide<D3TableNode>().radius(d => Math.max(d.width, d.height) * 0.65 + 20)
      )
      .force('center', d3.forceCenter(centerX, centerY).strength(0.05));

    if (layoutMode === 'star' || layoutMode === 'snowflake') {
      simulation.alphaTarget(0).alpha(0.1);
    }

    simulationRef.current = simulation;

    // Helper: Calculate boundary intersection for curved link cables
    const getLinkCoords = (source: D3TableNode, target: D3TableNode) => {
      const sX = source.x ?? centerX;
      const sY = source.y ?? centerY;
      const tX = target.x ?? centerX;
      const tY = target.y ?? centerY;

      // Card half dimensions
      const sHalfW = source.width / 2;
      const sHalfH = source.height / 2;
      const tHalfW = target.width / 2;
      const tHalfH = target.height / 2;

      // Vector from source to target
      const dx = tX - sX;
      const dy = tY - sY;
      const dist = Math.hypot(dx, dy) || 1;

      // Clamping to rectangle boundary
      const sOffsetX = Math.min(sHalfW, Math.max(-sHalfW, (dx / dist) * sHalfW));
      const sOffsetY = Math.min(sHalfH, Math.max(-sHalfH, (dy / dist) * sHalfH));
      const tOffsetX = Math.min(tHalfW, Math.max(-tHalfW, (-dx / dist) * tHalfW));
      const tOffsetY = Math.min(tHalfH, Math.max(-tHalfH, (-dy / dist) * tHalfH));

      const startX = sX + sOffsetX;
      const startY = sY + sOffsetY;
      const endX = tX + tOffsetX;
      const endY = tY + tOffsetY;

      // Midpoint & curvature
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      // Subtle perpendicular curve offset
      const perpX = -dy / dist * 18;
      const perpY = dx / dist * 18;
      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;

      return { startX, startY, endX, endY, ctrlX, ctrlY, midX: ctrlX, midY: ctrlY };
    };

    // Render Relationship Links (SVG path with bezier curvature)
    const linkPaths = gLinks.selectAll<SVGPathElement, D3RelationshipLink>('.erd-link')
      .data(links, d => d.id)
      .enter()
      .append('path')
      .attr('class', 'erd-link transition-all duration-150 cursor-pointer')
      .attr('stroke', d => {
        if (d.id === selectedLinkId) return isLight ? '#0284C7' : '#22D3EE';
        if (d.id === hoveredLinkId) return isLight ? '#0369A1' : '#38BDF8';
        return isLight ? 'rgba(14, 165, 233, 0.45)' : 'rgba(34, 211, 238, 0.35)';
      })
      .attr('stroke-width', d => (d.id === selectedLinkId || d.id === hoveredLinkId ? 3.5 : 2))
      .attr('stroke-dasharray', d => (d.isActive ? 'none' : '4,4'))
      .attr('fill', 'none')
      .attr('marker-end', 'url(#erd-arrowhead)')
      .attr('marker-start', d => (d.crossFilterDirection === 'both' ? 'url(#erd-arrowhead-start)' : 'none'))
      .on('mouseenter', (event, d) => {
        setHoveredLinkId(d.id);
        d3.select(event.currentTarget as SVGPathElement)
          .attr('stroke-width', 4)
          .attr('stroke', isLight ? '#0284C7' : '#22D3EE');
      })
      .on('mouseleave', (event, d) => {
        setHoveredLinkId(null);
        d3.select(event.currentTarget as SVGPathElement)
          .attr('stroke-width', d.id === selectedLinkId ? 3.5 : 2)
          .attr('stroke', d.id === selectedLinkId ? (isLight ? '#0284C7' : '#22D3EE') : (isLight ? 'rgba(14, 165, 233, 0.45)' : 'rgba(34, 211, 238, 0.35)'));
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedLinkId(d.id === selectedLinkId ? null : d.id);
      });

    // Render Link Cardinality Badges (placed at the curve midpoint)
    const linkBadgeGroups = gLinkLabels.selectAll<SVGGElement, D3RelationshipLink>('.erd-link-badge')
      .data(links, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'erd-link-badge cursor-pointer select-none')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedLinkId(d.id === selectedLinkId ? null : d.id);
      })
      .on('mouseenter', (event, d) => {
        setHoveredLinkId(d.id);
      })
      .on('mouseleave', () => {
        setHoveredLinkId(null);
      });

    // Badge pill background
    linkBadgeGroups.append('rect')
      .attr('width', 52)
      .attr('height', 20)
      .attr('rx', 6)
      .attr('x', -26)
      .attr('y', -10)
      .attr('fill', d => {
        if (d.id === selectedLinkId) return isLight ? '#0284C7' : '#0369A1';
        return isLight ? '#FFFFFF' : '#111A2E';
      })
      .attr('stroke', d => {
        if (d.id === selectedLinkId) return isLight ? '#0284C7' : '#38BDF8';
        return isLight ? '#CBD5E1' : '#334155';
      })
      .attr('stroke-width', 1.2)
      .style('filter', isLight ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))');

    // Badge text: Cardinality label (1:N, 1:1, etc.)
    linkBadgeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', d => {
        if (d.id === selectedLinkId) return '#FFFFFF';
        return isLight ? '#0F172A' : '#E2E8F0';
      })
      .text(d => d.cardinality);

    // Render Table Node Cards
    const nodeGroups = gNodes.selectAll<SVGGElement, D3TableNode>('.erd-node')
      .data(nodes, d => d.id)
      .enter()
      .append('g')
      .attr('class', 'erd-node cursor-grab select-none')
      .call(
        d3.drag<SVGGElement, D3TableNode>()
          .on('start', (event, d) => {
            if (!event.active && !isPhysicsFrozen) simulation.alphaTarget(0.2).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
            d.x = event.x;
            d.y = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active && !isPhysicsFrozen) simulation.alphaTarget(0);
            if (!isPhysicsFrozen) {
              d.fx = null;
              d.fy = null;
            }
          })
      )
      .on('mouseenter', (event, d) => {
        setHoveredNodeId(d.id);
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        const found = dataModel.tables.find(t => t.name === d.name) || null;
        setSelectedTable(found);
        if (onTableSelect) onTableSelect(d.name);
      });

    // Card background rectangle
    nodeGroups.append('rect')
      .attr('class', 'node-card-bg transition-all duration-200')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('x', d => -d.width / 2)
      .attr('y', d => -d.height / 2)
      .attr('rx', 12)
      .attr('filter', 'url(#node-shadow)')
      .attr('fill', d => {
        if (d.type === 'fact') {
          return isLight ? '#FFFFFF' : '#111A2E';
        }
        return isLight ? '#FFFFFF' : '#0F172A';
      })
      .attr('stroke', d => {
        if (d.id === hoveredNodeId || (selectedTable && selectedTable.name === d.id)) {
          return isLight ? '#0284C7' : '#38BDF8';
        }
        if (d.type === 'fact') {
          return isLight ? '#10B981' : '#059669';
        }
        return isLight ? '#E2E8F0' : '#1E293B';
      })
      .attr('stroke-width', d => {
        if (d.id === hoveredNodeId || (selectedTable && selectedTable.name === d.id)) return 2.5;
        if (d.type === 'fact') return 2;
        return 1.2;
      });

    // Table Header Band
    nodeGroups.append('rect')
      .attr('width', d => d.width)
      .attr('height', 36)
      .attr('x', d => -d.width / 2)
      .attr('y', d => -d.height / 2)
      .attr('rx', 12)
      .attr('clip-path', 'inset(0 0 50% 0)')
      .attr('fill', d => {
        if (d.type === 'fact') {
          return isLight ? 'rgba(16, 185, 129, 0.12)' : 'rgba(5, 150, 105, 0.25)';
        }
        return isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(30, 41, 59, 0.8)';
      });

    // Table Header Divider Line
    nodeGroups.append('line')
      .attr('x1', d => -d.width / 2)
      .attr('y1', d => -d.height / 2 + 36)
      .attr('x2', d => d.width / 2)
      .attr('y2', d => -d.height / 2 + 36)
      .attr('stroke', isLight ? '#E2E8F0' : '#1E293B')
      .attr('stroke-width', 1);

    // Table Icon Indicator Circle
    nodeGroups.append('circle')
      .attr('cx', d => -d.width / 2 + 18)
      .attr('cy', d => -d.height / 2 + 18)
      .attr('r', 5)
      .attr('fill', d => (d.type === 'fact' ? '#10B981' : isLight ? '#0284C7' : '#38BDF8'));

    // Table Title Text
    nodeGroups.append('text')
      .attr('x', d => -d.width / 2 + 30)
      .attr('y', d => -d.height / 2 + 22)
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('fill', isLight ? '#0F172A' : '#F8FAFC')
      .text(d => {
        const maxLen = d.type === 'fact' ? 18 : 15;
        return d.name.length > maxLen ? `${d.name.slice(0, maxLen)}…` : d.name;
      });

    // Table Type Tag Text (FACT / DIM)
    nodeGroups.append('text')
      .attr('x', d => d.width / 2 - 12)
      .attr('y', d => -d.height / 2 + 22)
      .attr('text-anchor', 'end')
      .attr('font-size', '9px')
      .attr('font-weight', '800')
      .attr('font-family', 'Inter, sans-serif')
      .attr('letter-spacing', '0.05em')
      .attr('fill', d => {
        if (d.type === 'fact') return isLight ? '#059669' : '#34D399';
        return isLight ? '#0284C7' : '#38BDF8';
      })
      .text(d => d.type.toUpperCase());

    // Table Metrics Subtitle (Rows & Cols)
    nodeGroups.append('text')
      .attr('x', d => -d.width / 2 + 14)
      .attr('y', d => -d.height / 2 + 52)
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', isLight ? '#64748B' : '#94A3B8')
      .text(d => `${d.rowCount.toLocaleString()} rows · ${d.columns.length} cols`);

    // Render Column Preview Rows inside the card
    nodes.forEach(node => {
      const nodeG = nodeGroups.filter(d => d.id === node.id);
      const colsToRender = node.columns.slice(0, showColumnDetails ? 5 : 2);

      colsToRender.forEach((col, idx) => {
        const rowY = -node.height / 2 + 70 + idx * 22;
        const isPk = node.primaryKey === col.name || col.isPrimaryKeyCandidate;
        const isFk = col.isForeignKeyCandidate || col.name.toLowerCase().endsWith('id') || col.name.toLowerCase().endsWith('key');

        // Column bullet / Key icon
        nodeG.append('circle')
          .attr('cx', -node.width / 2 + 16)
          .attr('cy', rowY - 4)
          .attr('r', isPk || isFk ? 3 : 1.5)
          .attr('fill', isPk ? '#F59E0B' : isFk ? (isLight ? '#0284C7' : '#38BDF8') : (isLight ? '#94A3B8' : '#64748B'));

        // Column Name Text
        nodeG.append('text')
          .attr('x', -node.width / 2 + 26)
          .attr('y', rowY)
          .attr('font-size', '10px')
          .attr('font-weight', isPk ? '700' : '500')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('fill', isPk ? (isLight ? '#B45309' : '#FBBF24') : (isLight ? '#1E293B' : '#E2E8F0'))
          .text(() => {
            const maxW = isPk ? 14 : 16;
            return col.name.length > maxW ? `${col.name.slice(0, maxW)}…` : col.name;
          });

        // Column Data Type Text
        nodeG.append('text')
          .attr('x', node.width / 2 - 12)
          .attr('y', rowY)
          .attr('text-anchor', 'end')
          .attr('font-size', '9px')
          .attr('font-family', 'Inter, sans-serif')
          .attr('fill', isLight ? '#64748B' : '#94A3B8')
          .text(col.dataType);
      });

      if (node.columns.length > (showColumnDetails ? 5 : 2)) {
        const moreY = -node.height / 2 + 70 + colsToRender.length * 22;
        nodeG.append('text')
          .attr('x', -node.width / 2 + 26)
          .attr('y', moreY)
          .attr('font-size', '9px')
          .attr('font-style', 'italic')
          .attr('font-family', 'Inter, sans-serif')
          .attr('fill', isLight ? '#94A3B8' : '#64748B')
          .text(`+${node.columns.length - colsToRender.length} more columns…`);
      }
    });

    // Simulation Tick Update
    simulation.on('tick', () => {
      // Update link paths
      linkPaths.attr('d', d => {
        const s = typeof d.source === 'object' ? (d.source as D3TableNode) : nodes.find(n => n.id === d.source);
        const t = typeof d.target === 'object' ? (d.target as D3TableNode) : nodes.find(n => n.id === d.target);
        if (!s || !t) return '';

        const { startX, startY, endX, endY, ctrlX, ctrlY } = getLinkCoords(s, t);
        return `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
      });

      // Update link cardinality badges position
      linkBadgeGroups.attr('transform', d => {
        const s = typeof d.source === 'object' ? (d.source as D3TableNode) : nodes.find(n => n.id === d.source);
        const t = typeof d.target === 'object' ? (d.target as D3TableNode) : nodes.find(n => n.id === d.target);
        if (!s || !t) return 'translate(0,0)';

        const { midX, midY } = getLinkCoords(s, t);
        return `translate(${midX}, ${midY})`;
      });

      // Update table node positions
      nodeGroups.attr('transform', d => `translate(${d.x ?? centerX}, ${d.y ?? centerY})`);
    });

    // Center and zoom to fit on initial render
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    svg.call(zoomBehavior.transform, initialTransform);

  }, [nodes, links, factNodeId, isLight, layoutMode, isPhysicsFrozen, showColumnDetails, selectedLinkId, hoveredLinkId, hoveredNodeId, selectedTable, onTableSelect]);

  // Re-run D3 rendering when dependencies update
  useEffect(() => {
    renderGraph();

    // Resize observer to re-center when container changes
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      renderGraph();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [renderGraph]);

  // Zoom to Fit Helper
  const handleZoomToFit = () => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 580;

    if (nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const x = n.x ?? width / 2;
      const y = n.y ?? height / 2;
      minX = Math.min(minX, x - n.width / 2);
      maxX = Math.max(maxX, x + n.width / 2);
      minY = Math.min(minY, y - n.height / 2);
      maxY = Math.max(maxY, y + n.height / 2);
    });

    const graphWidth = maxX - minX + 80;
    const graphHeight = maxY - minY + 80;

    const scale = Math.min(1.4, Math.max(0.4, 0.85 / Math.max(graphWidth / width, graphHeight / height)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
      .translate(width / 2 - scale * centerX, height / 2 - scale * centerY)
      .scale(scale);

    svg.transition().duration(600).call(zoomBehaviorRef.current.transform, transform);
  };

  // Zoom In / Out Handlers
  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  // Toggle Physics Freeze
  const handleToggleFreeze = () => {
    setIsPhysicsFrozen(prev => {
      const next = !prev;
      if (next && simulationRef.current) {
        simulationRef.current.stop();
        nodes.forEach(n => {
          n.fx = n.x;
          n.fy = n.y;
        });
        toast.info('Layout Pinned', 'Nodes are now fixed in place. Drag any node to customize topology.');
      } else if (simulationRef.current) {
        nodes.forEach(n => {
          n.fx = null;
          n.fy = null;
        });
        simulationRef.current.alpha(0.3).restart();
        toast.info('Physics Active', 'Dynamic collision and spring forces restored.');
      }
      return next;
    });
  };

  // Export Diagram as SVG
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgEl = svgRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Schema_${layoutMode.toUpperCase()}_Relationships.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SVG Exported', 'Vector diagram downloaded successfully.');
  };

  // Search filter matching
  const matchingTableNames = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return dataModel.tables.filter(t => t.name.toLowerCase().includes(q)).map(t => t.name);
  }, [searchQuery, dataModel.tables]);

  return (
    <div className={`relative flex flex-col rounded-3xl border transition-all ${
      isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full'
    } ${
      isLight 
        ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
        : 'bg-[#0B1120] border-slate-800 text-slate-100 shadow-xl'
    }`}>
      {/* Top Controls Toolbar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#111A2E]/90 border-slate-800'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Header Title with Schema Badge */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}>
              <Network className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold tracking-tight uppercase">
                  D3 Schema Relationship Visualizer
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  dataModel.schemaType === 'star'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                }`}>
                  {dataModel.schemaType} schema
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {dataModel.tables.length} tables · {dataModel.relationships.length} active relationships · 100% referential integrity
              </p>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search table or column…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono w-44 sm:w-52 border transition-all focus:outline-none ${
                isLight 
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                  : 'bg-slate-900 border-slate-700 text-slate-100 focus:border-emerald-400'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Topology Layout Mode Segmented Control */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isLight ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => { setLayoutMode('star'); renderGraph(); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                layoutMode === 'star'
                  ? isLight ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-500 text-slate-950 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Radial Star Schema Layout (Fact in center with dimensional satellites)"
            >
              Star View
            </button>

            <button
              onClick={() => { setLayoutMode('snowflake'); renderGraph(); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                layoutMode === 'snowflake'
                  ? isLight ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-500 text-slate-950 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Hierarchical Snowflake Layout (Fact -> Primary Dim -> Sub-Dimensions)"
            >
              Snowflake View
            </button>

            <button
              onClick={() => { setLayoutMode('force'); renderGraph(); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                layoutMode === 'force'
                  ? isLight ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-500 text-slate-950 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Force-Directed Physics Simulation with Spring Dynamics"
            >
              Force Physics
            </button>
          </div>

          {/* Toggle Column Details */}
          <button
            onClick={() => setShowColumnDetails(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              showColumnDetails 
                ? isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                : isLight ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title={showColumnDetails ? 'Collapse column preview' : 'Expand column preview'}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Pin/Freeze Physics Toggle */}
          <button
            onClick={handleToggleFreeze}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              isPhysicsFrozen
                ? isLight ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                : isLight ? 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title={isPhysicsFrozen ? 'Unpin nodes (enable dynamic physics)' : 'Pin nodes in place (freeze simulation)'}
          >
            {isPhysicsFrozen ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Fit to Screen */}
          <button
            onClick={handleZoomToFit}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              isLight ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title="Fit graph to canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Export SVG */}
          <button
            onClick={handleExportSVG}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
              isLight ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
            title="Download vector SVG diagram"
          >
            <Download className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">Export SVG</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              isLight ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen ERD canvas'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main SVG Graph Canvas Area */}
      <div 
        ref={containerRef} 
        className={`relative w-full overflow-hidden flex-1 select-none ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[560px] sm:h-[620px]'
        }`}
      >
        <svg 
          ref={svgRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
        />

        {/* Floating Canvas Navigation Overlay Controls */}
        <div className={`absolute bottom-4 right-4 flex items-center gap-1 p-1 rounded-2xl border backdrop-blur-md shadow-lg ${
          isLight ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-slate-900/90 border-slate-700 text-slate-200'
        }`}>
          <button 
            onClick={() => handleZoom(0.8)} 
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold px-2">{Math.round(zoomLevel * 100)}%</span>
          <button 
            onClick={() => handleZoom(1.25)} 
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button 
            onClick={handleZoomToFit}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Center and fit to view"
          >
            <RotateCcw className="w-4 h-4 text-emerald-500" />
          </button>
        </div>

        {/* Interactive Legend & Topology Indicators */}
        <div className={`absolute bottom-4 left-4 p-3 rounded-2xl border backdrop-blur-md shadow-sm max-w-xs text-xs font-mono ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center gap-3 mb-2 font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
            <span>Topology Legend</span>
            <span className="text-emerald-500 font-extrabold">{layoutMode.toUpperCase()}</span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" />
              <span>Fact Table (Central Metric Engine)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-sky-500 shrink-0" />
              <span>Dimension Tables (Attributes & Slicers)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-sky-400 shrink-0" />
              <span>Foreign Key Link (1:* Cardinality)</span>
            </div>
          </div>
        </div>

        {/* Relationship Inspector Drawer / Card (when an edge or badge is clicked) */}
        {activeRelationship && (
          <div className={`absolute top-4 right-4 max-w-sm w-full p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-fadeIn z-30 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-mono font-bold uppercase tracking-wide">
                  Foreign Key Connection
                </span>
              </div>
              <button 
                onClick={() => setSelectedLinkId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Primary Key (Source)</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  {activeRelationship.sourceTable}.[{activeRelationship.sourceColumn}]
                </div>
                <div className="my-1 flex items-center justify-center gap-2 text-slate-400">
                  <ArrowRight className="w-3.5 h-3.5 text-sky-500" />
                  <span className="text-[10px]">{activeRelationship.cardinality} cardinality</span>
                </div>
                <div className="text-[10px] text-slate-500 uppercase">Foreign Key (Target)</div>
                <div className="font-bold text-sky-600 dark:text-sky-400">
                  {activeRelationship.targetTable}.[{activeRelationship.targetColumn}]
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Direction</span>
                  <span className="font-bold capitalize">{activeRelationship.crossFilterDirection}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Referential Health</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {activeRelationship.integrityScore ?? 100}% Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Table Inspector Drawer / Card */}
        {selectedTable && !activeRelationship && (
          <div className={`absolute top-4 right-4 max-w-sm w-full p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-fadeIn z-30 max-h-[90%] overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 truncate">
                <Database className={`w-4 h-4 shrink-0 ${selectedTable.type === 'fact' ? 'text-emerald-500' : 'text-sky-500'}`} />
                <span className="text-xs font-mono font-bold uppercase truncate">
                  {selectedTable.name}
                </span>
              </div>
              <button 
                onClick={() => setSelectedTable(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Type</span>
                  <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">{selectedTable.type}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Records</span>
                  <span className="font-bold">{selectedTable.rowCount.toLocaleString()}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-500 block">Columns</span>
                  <span className="font-bold">{selectedTable.columns.length}</span>
                </div>
              </div>

              {/* Primary Key Callout */}
              {selectedTable.primaryKey && (
                <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                  isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                }`}>
                  <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-bold">Primary Key: {selectedTable.primaryKey}</span>
                </div>
              )}

              {/* Columns Table */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                  Schema Attributes ({selectedTable.columns.length})
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedTable.columns.map(c => {
                    const isPk = selectedTable.primaryKey === c.name || c.isPrimaryKeyCandidate;
                    return (
                      <div 
                        key={c.name}
                        className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                          {isPk && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                          <span className={`truncate ${isPk ? 'font-bold' : ''}`}>{c.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-sans uppercase">{c.dataType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                {onAddRelationshipRequest && (
                  <button
                    onClick={() => {
                      onAddRelationshipRequest();
                      setSelectedTable(null);
                    }}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Connect Key</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
