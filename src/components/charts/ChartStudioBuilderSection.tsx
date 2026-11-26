/**
 * CHART STUDIO & VIP LAYOUTS SECTION FOR DASHBOARD BUILDER (Parts B1–B12, C1–C4, D1–D7, E2)
 * Lazy-loaded inside DashboardBuilderView when flags.chartStudio is enabled.
 */

import React, { useMemo, useState } from 'react';
import {
  Crown,
  BarChart3,
  Globe,
  Sparkles,
  Calendar,
  Layers,
  Filter,
  Type,
  Square,
  Bookmark,
  Plus,
  Compass,
} from 'lucide-react';
import { ChartStudioVisualType, VisualCalculationType } from '../../engine/chartStudioEngine';
import { ChartStudioVisual } from './ChartStudioVisual';
import { detectGeographicColumns } from './geo/geoMatcher';
import {
  VipBoardroomDashboard,
  VIP_LAYOUT_TEMPLATES,
  VipLayoutTemplateId,
} from '../views/VipBoardroomDashboard';

export interface ChartStudioBuilderSectionProps {
  rows: Record<string, any>[];
}

const STUDIO_VISUAL_CATALOG: Array<{
  id: ChartStudioVisualType;
  label: string;
  group: string;
}> = [
  { id: 'bar', label: 'Horizontal Bar', group: 'Compare' },
  { id: 'column', label: 'Vertical Column', group: 'Compare' },
  { id: 'clustered_bar', label: 'Clustered Bar', group: 'Compare' },
  { id: 'stacked_bar', label: 'Stacked Bar', group: 'Compare' },
  { id: 'combo', label: 'Combo (Bar + Line)', group: 'Compare' },
  { id: 'line', label: 'Line + Forecast', group: 'Trend' },
  { id: 'area_stacked', label: 'Stacked Area', group: 'Trend' },
  { id: 'waterfall', label: 'Waterfall Bridge', group: 'Trend' },
  { id: 'donut', label: 'Donut (Total in Center)', group: 'Part-to-Whole' },
  { id: 'treemap', label: 'Treemap', group: 'Part-to-Whole' },
  { id: 'funnel', label: 'Conversion Funnel', group: 'Part-to-Whole' },
  { id: 'sankey', label: 'Sankey Flow', group: 'Part-to-Whole' },
  { id: 'scatter', label: 'Scatter Plot', group: 'Distribution' },
  { id: 'box_plot', label: 'Box & Whisker Plot', group: 'Distribution' },
  { id: 'dot_plot', label: 'Dot Plot', group: 'Distribution' },
  { id: 'heatmap', label: 'Heatmap Matrix', group: 'Distribution' },
  { id: 'gantt', label: 'Gantt Schedule', group: 'Time Plan' },
  { id: 'table_enhanced', label: 'Data-Bar Table', group: 'Tables' },
  { id: 'matrix', label: 'Stepped Matrix', group: 'Tables' },
  { id: 'gauge', label: 'Radial Target Gauge', group: 'Cards & Goals' },
  { id: 'bullet', label: 'Bullet Scorecard', group: 'Cards & Goals' },
  { id: 'map_choropleth', label: 'Choropleth Filled Map', group: 'Maps' },
  { id: 'map_bubble', label: 'Bubble Map', group: 'Maps' },
  { id: 'map_shape', label: 'Regional Shape Map', group: 'Maps' },
  { id: 'key_influencers', label: 'Key Influencers AI', group: 'AI Visuals' },
  { id: 'decomposition_tree', label: 'Decomposition Tree', group: 'AI Visuals' },
  { id: 'smart_narrative', label: 'Smart Narrative', group: 'AI Visuals' },
  { id: 'qa_visual', label: 'Ask Q&A Visual', group: 'AI Visuals' },
];

export const ChartStudioBuilderSection: React.FC<ChartStudioBuilderSectionProps> = ({ rows }) => {
  const [activeTab, setActiveTab] = useState<'studio' | 'vip'>('studio');
  const [selectedVipLayout, setSelectedVipLayout] =
    useState<VipLayoutTemplateId>('executive-summary');
  const [selectedVisualType, setSelectedVisualType] =
    useState<ChartStudioVisualType>('waterfall');
  const [visualCalc, setVisualCalc] = useState<VisualCalculationType>('none');
  const [slicerFormat, setSlicerFormat] = useState<'button' | 'dropdown' | 'list' | 'date-range'>(
    'button'
  );
  const [selectedSlicerValue, setSelectedSlicerValue] = useState<string | null>(null);
  const [enableSmallMultiples, setEnableSmallMultiples] = useState(false);
  const [canvasNotes, setCanvasNotes] = useState<string[]>([
    'Executive Takeaway: Use Chart Studio visuals & theme tokens for live boardroom recolouring.',
  ]);

  const sampleRows = useMemo(() => {
    if (rows && rows.length > 0) return rows;
    return [
      { date: '2025-01-01', category: 'Enterprise Cloud', region: 'Karachi', revenue: 480000, cost: 290000, units: 120 },
      { date: '2025-02-01', category: 'AI Copilot Suite', region: 'Lahore', revenue: 620000, cost: 340000, units: 165 },
      { date: '2025-03-01', category: 'Data Governance', region: 'Islamabad', revenue: 390000, cost: 210000, units: 95 },
      { date: '2025-04-01', category: 'Security Shield', region: 'Peshawar', revenue: 510000, cost: 275000, units: 140 },
      { date: '2025-05-01', category: 'Analytics Automation', region: 'Quetta', revenue: 710000, cost: 360000, units: 190 },
      { date: '2025-06-01', category: 'Managed FinOps', region: 'Faisalabad', revenue: 445000, cost: 240000, units: 112 },
    ];
  }, [rows]);

  const geoDetection = useMemo(() => detectGeographicColumns(sampleRows), [sampleRows]);

  const { categoryCol, metricCol, secondaryMetricCol, distinctCategories } = useMemo(() => {
    const cols = Object.keys(sampleRows[0] || {});
    const cat =
      cols.find((c) => typeof sampleRows[0]?.[c] === 'string' && !/date|id/i.test(c)) ||
      cols[0] ||
      'category';
    const numCols = cols.filter((c) => {
      if (c === cat || /id|date|code|zip/i.test(c)) return false;
      const val = sampleRows[0]?.[c];
      if (typeof val === 'number') return Number.isFinite(val);
      const cleaned = String(val ?? '').replace(/[^0-9.-]/g, '');
      return cleaned.length > 0 && Number.isFinite(Number(cleaned));
    });
    const m1 = numCols[0] || 'revenue';
    const m2 = numCols[1] || m1;
    const distinct = Array.from(
      new Set(sampleRows.map((r) => String(r[cat] ?? '')).filter(Boolean))
    ).slice(0, 8);
    return {
      categoryCol: cat,
      metricCol: m1,
      secondaryMetricCol: m2,
      distinctCategories: distinct,
    };
  }, [sampleRows]);

  const filteredRows = useMemo(() => {
    if (!selectedSlicerValue) return sampleRows;
    return sampleRows.filter((r) => String(r[categoryCol] ?? '') === selectedSlicerValue);
  }, [sampleRows, selectedSlicerValue, categoryCol]);

  return (
    <div
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-4"
      data-testid="chart-studio-builder-section"
    >
      {/* Top Bar: Switch between Chart Studio Visual Gallery & 6 VIP Boardroom Templates */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Chart Studio &amp; VIP Boardroom Templates
              </h2>
              {geoDetection.hasGeo && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--accent)] text-[var(--text-on-accent)] inline-flex items-center gap-1"
                  data-testid="map-available-badge"
                >
                  <Globe className="w-3 h-3" />
                  <span>Map available ({geoDetection.locationCol})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              27+ interactive visuals, offline World/US/Pakistan maps, Key Influencers AI, and 6 boardroom layouts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            data-testid="builder-tab-chart-studio"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'studio'
                ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
            }`}
          >
            Chart Studio Picker (27 Visuals)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vip')}
            data-testid="builder-tab-vip-layouts"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              activeTab === 'vip'
                ? 'bg-[var(--accent)] text-[var(--text-on-accent)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>VIP Boardroom Layouts (6)</span>
          </button>
        </div>
      </div>

      {activeTab === 'vip' ? (
        <VipBoardroomDashboard
          rows={sampleRows}
          initialLayoutId={selectedVipLayout}
        />
      ) : (
        <div className="space-y-4">
          {/* Visual Type Selector Strip */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Chart Studio Visual Types">
            {STUDIO_VISUAL_CATALOG.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVisualType(v.id)}
                data-testid={`studio-pick-${v.id}`}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedVisualType === v.id
                    ? 'bg-[var(--accent)] text-[var(--text-on-accent)] font-semibold'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Part B10 & D4 & D5 Controls: Slicer Format Switcher + Visual Calc + Small Multiples + B11 Canvas Elements */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* B10 Slicer Format Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Slicer ({slicerFormat}):</span>
              </span>
              <select
                value={slicerFormat}
                onChange={(e) => setSlicerFormat(e.target.value as any)}
                aria-label="Slicer Format"
                data-testid="studio-slicer-format"
                className="px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
              >
                <option value="button">Button Slicer</option>
                <option value="dropdown">Dropdown Slicer</option>
                <option value="list">List Slicer</option>
                <option value="date-range">Date-Range Slicer</option>
              </select>

              {slicerFormat === 'dropdown' ? (
                <select
                  value={selectedSlicerValue || ''}
                  onChange={(e) => setSelectedSlicerValue(e.target.value || null)}
                  aria-label="Filter Category"
                  className="px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]"
                >
                  <option value="">All {categoryCol}</option>
                  {distinctCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSlicerValue(null)}
                    className={`px-2 py-0.5 rounded ${
                      !selectedSlicerValue
                        ? 'bg-[var(--accent)] text-[var(--text-on-accent)] font-semibold'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}
                  >
                    All
                  </button>
                  {distinctCategories.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setSelectedSlicerValue((prev) => (prev === c ? null : c))
                      }
                      className={`px-2 py-0.5 rounded ${
                        selectedSlicerValue === c
                          ? 'bg-[var(--accent)] text-[var(--text-on-accent)] font-semibold'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* D5 Small Multiples & B11 Canvas Annotation Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEnableSmallMultiples((v) => !v)}
                data-testid="studio-small-multiples-toggle"
                className={`px-2.5 py-1 rounded-lg border font-medium ${
                  enableSmallMultiples
                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }`}
              >
                Small Multiples Grid
              </button>
              <button
                type="button"
                onClick={() =>
                  setCanvasNotes((prev) => [
                    ...prev,
                    `Note #${prev.length + 1}: Target review on ${categoryCol} (${metricCol})`,
                  ])
                }
                data-testid="studio-add-textbox-btn"
                className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                <Type className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>+ Text Box</span>
              </button>
            </div>
          </div>

          {/* Primary Active Chart Studio Visual + Companion Key Influencers / Map */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <ChartStudioVisual
                visualType={selectedVisualType}
                rows={filteredRows}
                categoryCol={
                  selectedVisualType.startsWith('map_') && geoDetection.locationCol
                    ? geoDetection.locationCol
                    : categoryCol
                }
                metricCol={metricCol}
                secondaryMetricCol={secondaryMetricCol}
                visualCalc={visualCalc}
                smallMultiplesCol={enableSmallMultiples ? categoryCol : undefined}
                height={330}
                showControls
                selectedCategory={selectedSlicerValue}
                onCategorySelect={(cat) =>
                  setSelectedSlicerValue((prev) => (prev === cat ? null : cat))
                }
              />
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4">
              <ChartStudioVisual
                visualType="map_choropleth"
                rows={sampleRows}
                categoryCol={geoDetection.locationCol || 'region'}
                metricCol={metricCol}
                geoScope="pakistan"
                title={`Offline Geography Map (${metricCol})`}
                height={260}
              />
            </div>
          </div>

          {/* B11 Canvas Text Boxes / Annotations */}
          {canvasNotes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {canvasNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)] flex items-center gap-2"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChartStudioBuilderSection;
