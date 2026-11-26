/**
 * OFFLINE GEO MAP COMPONENT (Part C1, C2, C3, C4)
 * Uses d3-geo with simplified offline GeoJSON (World Countries, US States, Pakistan Provinces & Districts).
 * Supports:
 * - Filled / Choropleth Map (value -> theme token colour scale)
 * - Bubble Map (lat/long or centroid bubble sized by metric & coloured by theme tokens)
 * - Shape Map (regional focus for World, US States, Pakistan)
 * - Zoom, Pan, Hover Tooltip, Colour Scale Legend, Accessible Screen-Reader / Keyboard Table View
 * - Unmatched Values Banner with One-Click Alias Fix
 */

import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  Globe,
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Table as TableIcon,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { GeoScopeId, GeoRegionFeature, getRegionsForScope } from './geoDataLazy';
import {
  detectGeographicColumns,
  matchDatasetToGeoRegions,
  MatchedGeoRowSummary,
} from './geoMatcher';

export type GeoMapMode = 'choropleth' | 'bubble' | 'shape';

export interface OfflineGeoMapProps {
  rows: Record<string, any>[];
  locationColumn?: string;
  metricColumn?: string;
  latColumn?: string;
  lngColumn?: string;
  initialScope?: GeoScopeId;
  initialMode?: GeoMapMode;
  title?: string;
  subtitle?: string;
  height?: number;
  selectedRegionName?: string | null;
  onRegionClick?: (regionName: string, rawLabels: string[]) => void;
  compact?: boolean;
}

function formatMapMetric(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return Number.isInteger(val) ? String(val) : val.toFixed(1);
}

export const OfflineGeoMap: React.FC<OfflineGeoMapProps> = ({
  rows,
  locationColumn,
  metricColumn,
  latColumn,
  lngColumn,
  initialScope,
  initialMode = 'choropleth',
  title = 'Geographic Performance Map',
  subtitle,
  height = 340,
  selectedRegionName,
  onRegionClick,
  compact = false,
}) => {
  const detected = useMemo(() => detectGeographicColumns(rows), [rows]);
  const activeLocCol = locationColumn || detected.locationCol || '';
  const activeLatCol = latColumn || detected.latitudeCol;
  const activeLngCol = lngColumn || detected.longitudeCol;

  const activeMetricCol = useMemo(() => {
    if (metricColumn) return metricColumn;
    if (!rows.length) return '';
    const sample = rows[0];
    const numCol = Object.keys(sample).find((k) => {
      if (k === activeLocCol || k === activeLatCol || k === activeLngCol) return false;
      if (/id|code|year|zip|date/i.test(k)) return false;
      const val = sample[k];
      if (typeof val === 'number') return Number.isFinite(val);
      const cleaned = String(val ?? '').replace(/[^0-9.-]/g, '');
      return cleaned.length > 0 && Number.isFinite(Number(cleaned));
    });
    return numCol || '';
  }, [metricColumn, rows, activeLocCol, activeLatCol, activeLngCol]);

  const [scope, setScope] = useState<GeoScopeId>(
    initialScope || detected.recommendedScope || 'world'
  );
  const [mode, setMode] = useState<GeoMapMode>(initialMode);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<[number, number]>([0, 0]);
  const [showAccessibleTable, setShowAccessibleTable] = useState(false);
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});
  const [hoveredFeature, setHoveredFeature] = useState<{
    name: string;
    isoCode: string;
    value: number;
    count: number;
    sharePct: number;
  } | null>(null);

  const matchResult = useMemo(() => {
    if (!activeLocCol) {
      return {
        scope,
        matched: [],
        unmatchedValues: [],
        totalMatchedRows: 0,
        totalUnmatchedRows: 0,
      };
    }
    return matchDatasetToGeoRegions(
      rows,
      activeLocCol,
      activeMetricCol,
      scope,
      customMappings
    );
  }, [rows, activeLocCol, activeMetricCol, scope, customMappings]);

  // Also support direct lat/lng row plotting when mode === 'bubble' and lat/lng columns exist
  const directLatLngPoints = useMemo(() => {
    if (!activeLatCol || !activeLngCol) return [];
    const pts: Array<{
      id: string;
      label: string;
      lat: number;
      lng: number;
      value: number;
    }> = [];
    for (let i = 0; i < Math.min(rows.length, 250); i++) {
      const r = rows[i];
      const lat = Number(r[activeLatCol]);
      const lng = Number(r[activeLngCol]);
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        const val = activeMetricCol
          ? Number(String(r[activeMetricCol] ?? '0').replace(/[^0-9.-]/g, '')) || 1
          : 1;
        pts.push({
          id: `pt-${i}`,
          label: String(r[activeLocCol] || `${lat.toFixed(2)}, ${lng.toFixed(2)}`),
          lat,
          lng,
          value: val,
        });
      }
    }
    return pts;
  }, [rows, activeLatCol, activeLngCol, activeLocCol, activeMetricCol]);

  const allScopeRegions = useMemo(() => getRegionsForScope(scope), [scope]);

  const matchedById = useMemo(() => {
    const map = new Map<string, MatchedGeoRowSummary>();
    for (const m of matchResult.matched) {
      map.set(m.feature.id, m);
    }
    return map;
  }, [matchResult.matched]);

  const totalValue = useMemo(
    () => matchResult.matched.reduce((acc, m) => acc + Math.max(0, m.value), 0) || 1,
    [matchResult.matched]
  );

  const maxValue = useMemo(
    () => Math.max(...matchResult.matched.map((m) => m.value), 1),
    [matchResult.matched]
  );

  // Build D3 Geo projection for the selected scope
  const svgWidth = 680;
  const svgHeight = 340;

  const { projection, pathGenerator } = useMemo(() => {
    let proj: d3.GeoProjection;
    if (scope === 'pakistan') {
      proj = d3
        .geoMercator()
        .center([69.5, 30.5])
        .scale(1380 * zoom)
        .translate([svgWidth / 2 + pan[0], svgHeight / 2 + pan[1]]);
    } else if (scope === 'us-states') {
      proj = d3
        .geoMercator()
        .center([-96.5, 38.5])
        .scale(620 * zoom)
        .translate([svgWidth / 2 + pan[0], svgHeight / 2 + pan[1]]);
    } else {
      proj = d3
        .geoEqualEarth()
        .center([12, 16])
        .scale(128 * zoom)
        .translate([svgWidth / 2 + pan[0], svgHeight / 2 + pan[1]]);
    }
    return {
      projection: proj,
      pathGenerator: d3.geoPath().projection(proj),
    };
  }, [scope, zoom, pan]);

  // Semantic theme-token color ramp (--chart-1 to --chart-5)
  const getRegionFillColor = (val: number | undefined, isSelected: boolean): string => {
    if (isSelected) return 'var(--accent)';
    if (val === undefined || val <= 0) return 'var(--bg-elevated)';
    const ratio = Math.min(1, Math.max(0, val / maxValue));
    if (ratio >= 0.8) return 'var(--chart-1)';
    if (ratio >= 0.55) return 'var(--chart-2)';
    if (ratio >= 0.3) return 'var(--chart-3)';
    if (ratio >= 0.12) return 'var(--chart-4)';
    return 'var(--chart-5)';
  };

  const handleOneClickFixAll = () => {
    const next = { ...customMappings };
    for (const u of matchResult.unmatchedValues) {
      next[u.rawValue] = u.suggestedFeatureId;
    }
    setCustomMappings(next);
  };

  const handleOneClickFixSingle = (rawValue: string, targetFeatureId: string) => {
    setCustomMappings((prev) => ({
      ...prev,
      [rawValue]: targetFeatureId,
    }));
  };

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 flex flex-col gap-3"
      data-testid="offline-geo-map"
    >
      {/* Header + Scope & Mode Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <h3
              title={title}
              className="text-sm font-semibold text-[var(--text-primary)] break-words"
            >
              {title}
            </h3>
            <span
              title={`Offline GeoJSON • ${matchResult.matched.length} regions`}
              className="text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
            >
              Offline GeoJSON • {matchResult.matched.length} regions
            </span>
          </div>
          {subtitle ? (
            <p
              title={subtitle}
              className="text-xs text-[var(--text-secondary)] mt-0.5 break-words"
            >
              {subtitle}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Location: <span className="font-medium text-[var(--text-primary)]">{activeLocCol || 'Auto'}</span>
              {activeMetricCol ? (
                <>
                  {' '}• Metric: <span className="font-medium text-[var(--text-primary)]">{activeMetricCol}</span>
                </>
              ) : null}
            </p>
          )}
        </div>

        {!compact && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Scope Picker: World / US States / Pakistan */}
            <div
              className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-xs"
              role="group"
              aria-label="Map Geography Scope"
            >
              {(['world', 'us-states', 'pakistan'] as GeoScopeId[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setScope(s);
                    setZoom(1);
                    setPan([0, 0]);
                  }}
                  data-testid={`geo-scope-${s}`}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    scope === s
                      ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s === 'world' ? 'World' : s === 'us-states' ? 'US States' : 'Pakistan'}
                </button>
              ))}
            </div>

            {/* Map Mode Picker: Choropleth / Bubble / Shape */}
            <div
              className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5 text-xs"
              role="group"
              aria-label="Map Visual Mode"
            >
              {(['choropleth', 'bubble', 'shape'] as GeoMapMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  data-testid={`geo-mode-${m}`}
                  className={`px-2 py-1 rounded-md font-medium capitalize transition-colors ${
                    mode === m
                      ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Accessible Table Fallback Toggle */}
            <button
              type="button"
              onClick={() => setShowAccessibleTable((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-pressed={showAccessibleTable}
              title="Toggle accessible region data table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{showAccessibleTable ? 'Map View' : 'List View'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Unmatched Values Notice + One-Click Mapping Fix (Part C2) */}
      {matchResult.unmatchedValues.length > 0 && (
        <div
          className="rounded-lg border border-[var(--warning)] bg-[var(--bg-elevated)] px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
          data-testid="geo-unmatched-banner"
        >
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0" />
            <span>
              <strong>{matchResult.unmatchedValues.length} unmatched location value(s)</strong> (
              {matchResult.unmatchedValues
                .slice(0, 3)
                .map((u) => `"${u.rawValue}" → ${u.suggestedFeatureName}`)
                .join(', ')}
              )
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {matchResult.unmatchedValues.slice(0, 2).map((u) => (
              <button
                key={u.rawValue}
                type="button"
                onClick={() => handleOneClickFixSingle(u.rawValue, u.suggestedFeatureId)}
                className="px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent)]"
              >
                Map &ldquo;{u.rawValue}&rdquo; → {u.suggestedFeatureName}
              </button>
            ))}
            <button
              type="button"
              onClick={handleOneClickFixAll}
              data-testid="geo-fix-all-unmatched"
              className="px-2.5 py-1 rounded font-semibold bg-[var(--accent)] text-[var(--text-on-accent)]"
            >
              One-Click Map All ({matchResult.unmatchedValues.length})
            </button>
          </div>
        </div>
      )}

      {/* Map Canvas or Accessible Keyboard/Screen-Reader Table */}
      {showAccessibleTable ? (
        <div className="overflow-x-auto max-h-72 border border-[var(--border-subtle)] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="py-2 px-3">Region</th>
                <th className="py-2 px-3">ISO</th>
                <th className="py-2 px-3 text-right">{activeMetricCol || 'Value'}</th>
                <th className="py-2 px-3 text-right">Share</th>
                <th className="py-2 px-3 text-right">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {matchResult.matched.map((m) => {
                const share = (m.value / totalValue) * 100;
                return (
                  <tr
                    key={m.feature.id}
                    onClick={() => onRegionClick?.(m.feature.name, m.rawLabels)}
                    className="hover:bg-[var(--bg-elevated)] cursor-pointer"
                  >
                    <td className="py-2 px-3 font-medium text-[var(--text-primary)]">
                      {m.feature.name}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-secondary)]">{m.feature.isoCode}</td>
                    <td className="py-2 px-3 text-right font-mono text-[var(--text-primary)]">
                      {formatMapMetric(m.value)}
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                      {share.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{m.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="relative rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
          style={{ height: `${height}px` }}
        >
          {/* Zoom & Pan Controls */}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1 bg-[var(--bg-card)]/90 backdrop-blur-xs p-1 rounded-lg border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4, Number((z * 1.25).toFixed(2))))}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Zoom in map"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, Number((z / 1.25).toFixed(2))))}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Zoom out map"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan([0, 0]);
              }}
              className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Reset map view"
              title="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hover Tooltip Overlay */}
          {hoveredFeature && (
            <div
              className="absolute top-2.5 left-2.5 z-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/95 px-3 py-2 text-xs shadow-md pointer-events-none"
              data-testid="geo-map-tooltip"
            >
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{hoveredFeature.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  ({hoveredFeature.isoCode})
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-[var(--text-secondary)]">
                <span>
                  {activeMetricCol || 'Value'}:{' '}
                  <strong className="text-[var(--text-primary)] font-mono">
                    {formatMapMetric(hoveredFeature.value)}
                  </strong>
                </span>
                <span>
                  Share:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {hoveredFeature.sharePct.toFixed(1)}%
                  </strong>
                </span>
                <span>Rows: {hoveredFeature.count}</span>
              </div>
            </div>
          )}

          {/* Vector SVG Map */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full select-none"
            role="img"
            aria-label={`${title} (${scope} ${mode} map)`}
          >
            {/* Subtle Graticule Grid */}
            <path
              d={pathGenerator(d3.geoGraticule10()) || ''}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={0.4}
              strokeDasharray="2,2"
              opacity={0.45}
            />

            {/* Region Polygons */}
            <g>
              {(() => {
                const top5Ids = new Set(
                  matchResult.matched.slice(0, 5).map((m) => m.feature.id)
                );
                return allScopeRegions.map((feature: GeoRegionFeature) => {
                  const matched = matchedById.get(feature.id);
                  const val = matched?.value ?? 0;
                  const count = matched?.count ?? 0;
                  const sharePct = totalValue > 0 ? (val / totalValue) * 100 : 0;
                  const isTop5 = top5Ids.has(feature.id);
                  const isSelected =
                    Boolean(selectedRegionName) &&
                    (selectedRegionName === feature.name ||
                      matched?.rawLabels.includes(selectedRegionName!));

                  const geoJsonPolygon: GeoJSON.Feature<GeoJSON.Polygon> = {
                    type: 'Feature',
                    properties: { name: feature.name },
                    geometry: {
                      type: 'Polygon',
                      coordinates: feature.coordinates,
                    },
                  };

                  const pathD = pathGenerator(geoJsonPolygon) || '';
                  const projectedCentroid = projection(feature.centroid) || [0, 0];

                  const fillColor =
                    mode === 'bubble'
                      ? 'var(--bg-elevated)'
                      : getRegionFillColor(matched ? val : undefined, Boolean(isSelected));

                  return (
                    <g
                      key={feature.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${feature.name}: ${formatMapMetric(val)}`}
                      onClick={() =>
                        onRegionClick?.(
                          feature.name,
                          matched?.rawLabels || [feature.name]
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRegionClick?.(
                            feature.name,
                            matched?.rawLabels || [feature.name]
                          );
                        }
                      }}
                      onMouseEnter={() =>
                        setHoveredFeature({
                          name: feature.name,
                          isoCode: feature.isoCode,
                          value: val,
                          count,
                          sharePct,
                        })
                      }
                      onMouseLeave={() => setHoveredFeature(null)}
                      className="cursor-pointer focus:outline-none"
                    >
                      <title>{`${feature.name} (${feature.isoCode}): ${formatMapMetric(val)}`}</title>
                      <path
                        d={pathD}
                        fill={fillColor}
                        fillOpacity={matched ? (mode === 'shape' ? 0.92 : 0.85) : 0.35}
                        stroke={isSelected ? 'var(--text-primary)' : 'var(--border-subtle)'}
                        strokeWidth={isSelected ? 2 : 0.9}
                        className="transition-opacity duration-150 hover:opacity-100"
                      />
                      {/* Persistent Top 5 Value Badge or Region Code */}
                      {Number.isFinite(projectedCentroid[0]) &&
                        Number.isFinite(projectedCentroid[1]) &&
                        (isTop5 ? (
                          <g className="pointer-events-none" data-testid={`geo-top5-label-${feature.id}`}>
                            <text
                              x={projectedCentroid[0]}
                              y={projectedCentroid[1]}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="var(--text-primary)"
                              stroke="var(--bg-card)"
                              strokeWidth={2.5}
                              paintOrder="stroke"
                              fontSize={9}
                              fontWeight={700}
                            >
                              {`${feature.isoCode} · ${formatMapMetric(val)}`}
                            </text>
                          </g>
                        ) : (
                          (scope !== 'world' || matched) && (
                            <text
                              x={projectedCentroid[0]}
                              y={projectedCentroid[1]}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fill="var(--text-primary)"
                              fontSize={scope === 'us-states' ? 8.5 : 9}
                              fontWeight={matched ? 600 : 400}
                              className="pointer-events-none"
                            >
                              {feature.isoCode}
                            </text>
                          )
                        ))}
                    </g>
                  );
                });
              })()}
            </g>

            {/* Bubble Layer (active in 'bubble' mode or when matched cities have pointCoords) */}
            {(mode === 'bubble' || matchResult.matched.some((m) => m.pointCoords)) && (
              <g>
                {directLatLngPoints.length > 0
                  ? directLatLngPoints.map((pt) => {
                      const coords = projection([pt.lng, pt.lat]);
                      if (!coords) return null;
                      const r = Math.max(4, Math.min(22, Math.sqrt(pt.value / maxValue) * 20));
                      return (
                        <circle
                          key={pt.id}
                          cx={coords[0]}
                          cy={coords[1]}
                          r={r}
                          fill="var(--chart-1)"
                          fillOpacity={0.75}
                          stroke="var(--bg-card)"
                          strokeWidth={1.2}
                        >
                          <title>{`${pt.label}: ${formatMapMetric(pt.value)}`}</title>
                        </circle>
                      );
                    })
                  : matchResult.matched.map((m) => {
                      const center = m.pointCoords || m.feature.centroid;
                      const coords = projection(center);
                      if (!coords) return null;
                      const radius = Math.max(
                        6,
                        Math.min(26, 6 + Math.sqrt(Math.max(0, m.value) / maxValue) * 20)
                      );
                      return (
                        <g
                          key={`bubble-${m.feature.id}`}
                          onClick={() => onRegionClick?.(m.feature.name, m.rawLabels)}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={coords[0]}
                            cy={coords[1]}
                            r={radius}
                            fill="var(--chart-2)"
                            fillOpacity={0.78}
                            stroke="var(--bg-card)"
                            strokeWidth={1.5}
                          />
                          <text
                            x={coords[0]}
                            y={coords[1] - radius - 3}
                            textAnchor="middle"
                            fill="var(--text-primary)"
                            fontSize={9}
                            fontWeight={600}
                          >
                            {formatMapMetric(m.value)}
                          </text>
                        </g>
                      );
                    })}
              </g>
            )}
          </svg>

          {/* Bottom Legend Bar (Theme Token Colour Scale) */}
          <div className="absolute bottom-2 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-card)]/90 backdrop-blur-xs border border-[var(--border-subtle)] px-2.5 py-1.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Low</span>
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'var(--chart-5)' }} />
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'var(--chart-4)' }} />
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'var(--chart-3)' }} />
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'var(--chart-2)' }} />
              <span className="w-3.5 h-2.5 rounded-xs" style={{ background: 'var(--chart-1)' }} />
              <span className="text-[var(--text-secondary)]">
                High ({formatMapMetric(maxValue)})
              </span>
            </div>

            {matchResult.matched.length > 0 && (
              <div
                title={`Top: ${matchResult.matched[0].feature.name} (${formatMapMetric(matchResult.matched[0].value)})`}
                className="text-[var(--text-secondary)] truncate"
              >
                Top:{' '}
                <strong className="text-[var(--text-primary)]">
                  {matchResult.matched[0].feature.name}
                </strong>{' '}
                ({formatMapMetric(matchResult.matched[0].value)})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineGeoMap;
