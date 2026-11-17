import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Briefcase,
  Megaphone,
  Users,
  Layers,
  Globe,
  Truck,
  UserCheck,
  ShieldAlert,
  HeartPulse,
  ShoppingBag,
  Factory,
  Building2,
  GraduationCap,
  Sparkles,
  Download,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BarChart3,
  Search,
  Filter,
  RotateCcw,
  LayoutGrid,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useToast } from '../../store/useToast';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { ModernKpiCard } from '../modern/ModernKpiCard';
import { ColumnMappingModal } from '../common/ColumnMappingModal';
import { DownloadMenu } from '../common/DownloadMenu';
import { GuideChartRenderer } from '../charts/InteractiveCharts';
import { ChartGuideId } from '../../config/chartGuide';
import {
  ANALYTICS_PACKS,
  getPackById,
  detectPack,
  mapRoles,
  getPersistedPackRoleMap,
  savePersistedPackRoleMap,
  buildDashboard,
  buildReport,
  buildPackTemplateCsv,
  simulateWhatIf,
  analyzeTimeSeries,
  computePareto,
  detectAnomalies,
  computeVariance,
  EnrichedAnalyticsPackConfig,
  PackLensesConfig,
} from '../../analytics';

type PackLensKey = keyof PackLensesConfig;

const PACK_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Landmark,
  Briefcase,
  Megaphone,
  Users,
  Layers,
  Globe,
  Truck,
  UserCheck,
  ShieldAlert,
  HeartPulse,
  ShoppingBag,
  Factory,
  Building2,
  GraduationCap,
};

function resolveGuideChartType(type: string): ChartGuideId {
  switch (type) {
    case 'line':
    case 'area':
      return 'line';
    case 'scatter':
      return 'scatter';
    case 'donut':
    case 'pie':
      return 'donut';
    case 'heatmap':
      return 'heatmap';
    case 'stacked_bar':
      return 'stacked_bar';
    case 'histogram':
      return 'histogram';
    case 'boxplot':
      return 'boxplot';
    case 'bar':
    case 'horizontal_bar':
    case 'waterfall':
    case 'funnel':
    case 'pareto':
    default:
      return 'bar';
  }
}

function triggerCsvDownload(csv: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Extracts a 6-point numeric preview series from a pack's sample dataset rows
 * so every Picker card renders a real mini chart preview from actual pack data.
 */
function extractPackSamplePreviewSeries(pack: EnrichedAnalyticsPackConfig): {
  values: number[];
  primaryMetricLabel: string;
} {
  const sampleRows = pack.sampleDataset.rows || [];
  const primaryMeasure = pack.taxonomy.measures[0] || pack.detect.requiredRoles[1] || 'value';
  const rawVals = sampleRows
    .slice(0, 8)
    .map(r => {
      const direct = Number(r[primaryMeasure]);
      if (Number.isFinite(direct) && direct !== 0) return direct;
      const firstNumericKey = Object.keys(r).find(k => typeof r[k] === 'number' && Number.isFinite(r[k]));
      return firstNumericKey ? Number(r[firstNumericKey]) : 0;
    })
    .filter(v => Number.isFinite(v));

  const values = rawVals.length >= 3 ? rawVals.slice(0, 6) : [42, 58, 51, 74, 69, 88];
  const label = primaryMeasure.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { values, primaryMetricLabel: label };
}

/**
 * Inline SVG Mini Live Preview for Pack Picker Cards (alternates sparkline area, rounded bar chart, and segmented ring+line)
 */
const PackMiniLivePreview: React.FC<{
  pack: EnrichedAnalyticsPackConfig;
  index: number;
}> = ({ pack, index }) => {
  const { values, primaryMetricLabel } = useMemo(() => extractPackSamplePreviewSeries(pack), [pack]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const fromColor = pack.theme.gradientFrom;
  const toColor = pack.theme.gradientTo;
  const variant = index % 3;

  const width = 148;
  const height = 36;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (width - 8) + 4;
    const y = height - ((v - min) / range) * (height - 10) - 5;
    return { x, y, v };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`;

  return (
    <div className="p-2.5 rounded-xl bg-elevated border border-subtle flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted truncate">
          Sample · {primaryMetricLabel}
        </div>
        <div className="text-xs font-mono tabular-nums font-bold text-primary flex items-center gap-1 mt-0.5">
          <TrendingUp className="w-3 h-3 shrink-0" style={{ color: fromColor }} aria-hidden="true" />
          <span>{values[values.length - 1]?.toLocaleString()}</span>
        </div>
      </div>

      {variant === 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0 overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`mini-area-${pack.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fromColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={toColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#mini-area-${pack.id})`} />
          <path d={linePath} fill="none" stroke={fromColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={fromColor} />
        </svg>
      )}

      {variant === 1 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
          {values.map((v, i) => {
            const barW = 16;
            const gap = 6;
            const x = 8 + i * (barW + gap);
            const barH = Math.max(6, ((v - min * 0.85) / (max - min * 0.85 || 1)) * (height - 6));
            const y = height - barH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="3"
                fill={i === values.length - 1 ? fromColor : toColor}
                fillOpacity={i === values.length - 1 ? 0.95 : 0.45 + (i / values.length) * 0.35}
              />
            );
          })}
        </svg>
      )}

      {variant === 2 && (
        <div className="flex items-center gap-2 shrink-0">
          <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90" aria-hidden="true">
            <circle cx="16" cy="16" r="11" fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
            <circle
              cx="16"
              cy="16"
              r="11"
              fill="none"
              stroke={fromColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="69.1"
              strokeDashoffset="18"
            />
          </svg>
          <svg width="96" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
            <path d={linePath} fill="none" stroke={fromColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={toColor} />
          </svg>
        </div>
      )}
    </div>
  );
};

export const AnalyticsPacksView: React.FC = () => {
  const {
    project,
    columns,
    detectedTypes,
    cleanRows,
    filteredRows,
    filters,
    setFilters,
    clearAllSlicers,
    ingestDatasetFromRows,
    openDrillThrough,
    setCurrentTab,
    themeMode,
    activePackId,
    setActivePackId,
  } = usePlatform();
  const { addToast } = useToast();

  const isLight = themeMode === 'light';
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [showCatalogGrid, setShowCatalogGrid] = useState<boolean>(true);
  const [packSearchQuery, setPackSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeLens, setActiveLens] = useState<PackLensKey>('descriptive');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [mappingGeneration, setMappingGeneration] = useState<number>(0);

  React.useEffect(() => {
    const handleFlags = (e: any) => setFlags(e.detail || loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', handleFlags);
    return () => window.removeEventListener('dataanalytix:features-updated', handleFlags);
  }, []);

  // What-If interactive sliders
  const [priceDelta, setPriceDelta] = useState<number>(5);
  const [volumeDelta, setVolumeDelta] = useState<number>(8);
  const [costDelta, setCostDelta] = useState<number>(-3);
  const [churnDelta, setChurnDelta] = useState<number>(-1);

  const activePack = useMemo<EnrichedAnalyticsPackConfig>(
    () => getPackById(activePackId),
    [activePackId]
  );

  const activeRows = filteredRows && filteredRows.length > 0 ? filteredRows : cleanRows;
  const datasetId = project?.id || project?.name || 'default';

  // Auto-detect top matching packs for current dataset
  const detectedMatches = useMemo(
    () => detectPack({ columns, rows: cleanRows, datasetId }),
    [columns, cleanRows, datasetId]
  );

  const filteredCatalogPacks = useMemo(() => {
    const q = packSearchQuery.trim().toLowerCase();
    return ANALYTICS_PACKS.filter(p => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        p.detect.keywords.some(kw => kw.toLowerCase().includes(q))
      );
    });
  }, [packSearchQuery, selectedCategory]);

  // Role mapping (auto + persisted user overrides)
  const roleMap = useMemo(() => {
    const persisted = getPersistedPackRoleMap(datasetId, activePack.id);
    return mapRoles({ columns, rows: cleanRows, datasetId }, activePack, persisted);
  }, [activePack, columns, cleanRows, datasetId, mappingGeneration]);

  // Built Pack Dashboard & Report
  const dashboard = useMemo(
    () => buildDashboard(activePack, activeRows, roleMap),
    [activePack, activeRows, roleMap]
  );

  const report = useMemo(
    () => buildReport(activePack, activeRows, roleMap),
    [activePack, activeRows, roleMap]
  );

  const lensBullets = useMemo(
    () => activePack.lenses[activeLens] || [],
    [activePack.lenses, activeLens]
  );

  // Shared Techniques computed generically from roleMap / first available numeric & category fields
  const primaryNumericCol = useMemo(() => {
    const mappedNumeric = Object.entries(roleMap).find(([role, colName]) => {
      return activePack.roles[role]?.type === 'number' && colName;
    })?.[1];
    return mappedNumeric || columns.find(c => c.dataType === 'number')?.name || '';
  }, [roleMap, activePack, columns]);

  const secondaryNumericCol = useMemo(() => {
    const numericCols = Object.entries(roleMap)
      .filter(([role, colName]) => {
        return activePack.roles[role]?.type === 'number' && colName && colName !== primaryNumericCol;
      })
      .map(([, colName]) => colName);
    return (
      numericCols[0] ||
      columns.find(c => c.dataType === 'number' && c.name !== primaryNumericCol)?.name ||
      primaryNumericCol
    );
  }, [roleMap, activePack, columns, primaryNumericCol]);

  const primaryDateCol = useMemo(() => {
    const mappedDate = Object.entries(roleMap).find(([role, colName]) => {
      return activePack.roles[role]?.type === 'date' && colName;
    })?.[1];
    return mappedDate || columns.find(c => c.dataType === 'date')?.name || '';
  }, [roleMap, activePack, columns]);

  const primaryCategoryCol = useMemo(() => {
    const mappedCat = Object.entries(roleMap).find(([role, colName]) => {
      return activePack.roles[role]?.type === 'category' && colName;
    })?.[1];
    return mappedCat || columns.find(c => c.dataType === 'string')?.name || '';
  }, [roleMap, activePack, columns]);

  const timeSeriesSummary = useMemo(() => {
    if (!primaryNumericCol || activeRows.length === 0) return null;
    const values = activeRows.map(r => Number(r[primaryNumericCol]) || 0);
    const labels = primaryDateCol ? activeRows.map(r => String(r[primaryDateCol] ?? '')) : undefined;
    return analyzeTimeSeries(values, labels, 3);
  }, [activeRows, primaryDateCol, primaryNumericCol]);

  const paretoSummary = useMemo(() => {
    if (!primaryCategoryCol || !primaryNumericCol || activeRows.length === 0) return null;
    const grouped = new Map<string, number>();
    for (const r of activeRows) {
      const cat = String(r[primaryCategoryCol] ?? 'Other').trim() || 'Other';
      grouped.set(cat, (grouped.get(cat) || 0) + (Number(r[primaryNumericCol]) || 0));
    }
    const items = Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
    return computePareto(items, 80);
  }, [activeRows, primaryCategoryCol, primaryNumericCol]);

  const anomalySummary = useMemo(() => {
    if (!primaryNumericCol || activeRows.length === 0) return null;
    const values = activeRows.map(r => Number(r[primaryNumericCol]) || 0);
    const labelCol = primaryCategoryCol || primaryDateCol;
    const labels = labelCol ? activeRows.map((r, i) => String(r[labelCol] ?? `Row ${i + 1}`)) : undefined;
    return detectAnomalies(values, labels);
  }, [activeRows, primaryNumericCol, primaryCategoryCol, primaryDateCol]);

  const varianceSummary = useMemo(() => {
    if (!primaryNumericCol || !secondaryNumericCol || activeRows.length === 0) return null;
    const actuals = activeRows.map(r => Number(r[primaryNumericCol]) || 0);
    const budgets = activeRows.map(r => Number(r[secondaryNumericCol]) || 0);
    const labelCol = primaryCategoryCol || primaryDateCol;
    const labels = labelCol ? activeRows.map((r, i) => String(r[labelCol] ?? `Item ${i + 1}`)) : undefined;
    return computeVariance(actuals, budgets, labels, 'up');
  }, [activeRows, primaryCategoryCol, primaryDateCol, primaryNumericCol, secondaryNumericCol]);

  const whatIfSummary = useMemo(() => {
    const baseRev =
      activeRows.reduce((acc, r) => acc + (Number(r[primaryNumericCol]) || 0), 0) || 100000;
    return simulateWhatIf(baseRev, [
      { id: 'price', label: 'Price Change', deltaPct: priceDelta, elasticity: 1.0 },
      { id: 'volume', label: 'Volume Shift', deltaPct: volumeDelta, elasticity: 1.0 },
      { id: 'cost', label: 'Unit Cost Efficiency', deltaPct: costDelta, elasticity: -0.6 },
      { id: 'churn', label: 'Retention / Churn Impact', deltaPct: churnDelta, elasticity: -0.8 },
    ]);
  }, [activeRows, primaryNumericCol, priceDelta, volumeDelta, costDelta, churnDelta]);

  const handleTrySampleData = (pack: EnrichedAnalyticsPackConfig) => {
    const sampleRows = pack.sampleDataset();
    setActivePackId(pack.id);
    ingestDatasetFromRows(`${pack.name} Sample Dataset`, sampleRows, {
      connectionType: 'PACK_SAMPLE',
      database: pack.name,
    });
    addToast({
      id: 'dataset_load_merged_toast',
      type: 'success',
      title: `${pack.name} Ready`,
      message: `Loaded ${sampleRows.length} sample records and computed ${pack.kpis.length} domain KPIs.`,
    });
  };

  const handleOpenPack = (pack: EnrichedAnalyticsPackConfig) => {
    setActivePackId(pack.id);
  };

  const handleDownloadTemplate = (pack: EnrichedAnalyticsPackConfig = activePack) => {
    const csv = buildPackTemplateCsv(pack);
    const filename = `data-analytix-${pack.id}-template.csv`;
    triggerCsvDownload(csv, filename);
    addToast({
      type: 'success',
      title: 'Pack Template Downloaded',
      message: `Downloaded ${filename} with role headers and 3 sample rows.`,
    });
  };

  const handleAskAiAboutPack = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'dataanalytix_ai_pack_context',
          JSON.stringify({
            packId: activePack.id,
            packName: activePack.name,
            kpis: dashboard.computedKpis.map(k => ({
              id: k.id,
              name: k.label,
              formattedValue: k.formattedValue,
              status: k.status,
              deltaPercent: k.changePercent,
            })),
          })
        );
      } catch {
        // ignore storage quota errors
      }
    }
    setCurrentTab('ai_insights');
  };

  const packRoleOptions = useMemo(() => {
    const reqSet = new Set(activePack.detect.requiredRoles);
    return Object.entries(activePack.roles).map(([roleKey, roleDef]) => ({
      value: roleKey,
      label: roleDef.description || `${roleKey} (e.g. ${roleDef.aliases.slice(0, 2).join(', ')})`,
      required: reqSet.has(roleKey),
    }));
  }, [activePack]);

  const ActiveIcon = PACK_ICON_MAP[activePack.icon] || Layers;
  const availableKpiCount = dashboard.computedKpis.filter(k => k.status === 'available').length;
  const missingReqRoles = activePack.detect.requiredRoles.filter(r => !roleMap[r]);
  const totalCatalogKpis = useMemo(
    () => ANALYTICS_PACKS.reduce((sum, p) => sum + p.kpis.length, 0),
    []
  );

  const dimensionValues = useMemo(() => {
    if (!primaryCategoryCol) return [];
    return Array.from(
      new Set(
        cleanRows
          .map(r => String(r[primaryCategoryCol] ?? '').trim())
          .filter(Boolean)
      )
    ).slice(0, 20);
  }, [cleanRows, primaryCategoryCol]);

  const packCssVars = useMemo(() => {
    const palette = activePack.theme.chartPalette;
    return {
      '--pack-from': activePack.theme.gradientFrom,
      '--pack-to': activePack.theme.gradientTo,
      '--chart-1': palette[0] || activePack.theme.gradientFrom,
      '--chart-2': palette[1] || activePack.theme.gradientTo,
      '--chart-3': palette[2] || 'var(--info)',
      '--chart-4': palette[3] || 'var(--warning)',
      '--chart-5': palette[4] || 'var(--accent)',
      '--chart-6': palette[5] || 'var(--accent-2)',
    } as React.CSSProperties;
  }, [activePack]);

  const topMatch = detectedMatches[0];
  const isTopMatchUncertain = Boolean(topMatch && (topMatch.isUncertain || topMatch.confidence < 60));

  return (
    <div
      style={flags.depthUI ? packCssVars : undefined}
      className="w-full min-w-0 max-w-7xl mx-auto space-y-8 pb-20 animate-fadeIn overflow-x-hidden"
      data-testid="analytics-packs-view"
    >
      {/* SECTION 3: HERO HEADER WITH AURORA MESH, STAT METRICS & ISOMETRIC FLOATING CHART */}
      <div
        className={`depth-card rounded-[20px] border border-subtle p-5 sm:p-8 space-y-6 min-w-0 overflow-hidden ${
          flags.depthUI ? 'pack-hero-aurora' : 'bg-card'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-secondary">
              <span className="font-bold uppercase tracking-wider" style={{ color: activePack.theme.gradientFrom }}>
                Domain Intelligence Studio
              </span>
              <span aria-hidden="true">·</span>
              <span>{ANALYTICS_PACKS.length} Specialized Domains</span>
              <span aria-hidden="true">·</span>
              <span>{totalCatalogKpis}+ Audited KPIs</span>
              <span aria-hidden="true">·</span>
              <span>4 Analytical Lenses</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-4xl font-bold text-primary tracking-tight leading-tight">
              Analytics Packs &amp;{' '}
              <span className={flags.depthUI ? 'pack-hero-gradient-text' : 'text-accent'}>
                {activePack.name}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
              Every analytics domain gets its own tailored visual identity, auto-built KPI scorecard, 4-lens diagnostics, and boardroom report from a single declarative configuration.
            </p>

            {/* 3 Hero Stat Metrics + Quick Controls */}
            <div className="pt-1 flex flex-wrap items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-4 px-3.5 py-2 rounded-xl bg-elevated border border-subtle text-xs font-mono tabular-nums">
                <div>
                  <span className="font-bold text-primary">14</span>{' '}
                  <span className="text-secondary">Domains</span>
                </div>
                <span className="text-muted" aria-hidden="true">·</span>
                <div>
                  <span className="font-bold text-primary">{totalCatalogKpis}+</span>{' '}
                  <span className="text-secondary">KPIs</span>
                </div>
                <span className="text-muted" aria-hidden="true">·</span>
                <div>
                  <span className="font-bold text-primary">4</span>{' '}
                  <span className="text-secondary">Lenses</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCatalogGrid(prev => !prev)}
                  data-testid="toggle-pack-catalog-btn"
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-subtle bg-elevated hover:bg-card-hover text-xs font-semibold text-primary flex items-center gap-2 cursor-pointer transition-colors pack-btn-press"
                >
                  <LayoutGrid className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
                  <span>{showCatalogGrid ? 'Hide Pack Catalog (14)' : 'Browse All 14 Packs'}</span>
                </button>

                <DownloadMenu context="analytics_pack" packId={activePack.id} label="Export Pack" />
              </div>
            </div>
          </div>

          {/* Subtle Isometric Floating Chart Illustration (CSS + SVG, Tinted by Active Pack) */}
          {flags.depthUI && (
            <div
              data-testid="pack-hero-iso-illustration"
              aria-hidden="true"
              className="hidden md:flex items-center justify-center w-64 h-40 shrink-0 pack-iso-scene select-none pointer-events-none"
            >
              <div className="relative w-52 h-32 rounded-2xl border border-subtle bg-elevated p-3.5 shadow-card pack-iso-platform flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="font-bold text-primary truncate">{activePack.name}</span>
                  <span className="font-bold tabular-nums" style={{ color: activePack.theme.gradientFrom }}>
                    {availableKpiCount}/{dashboard.computedKpis.length} KPIs
                  </span>
                </div>
                <svg viewBox="0 0 180 68" className="w-full h-16 overflow-visible">
                  {[
                    { x: 12, h: 28, fill: activePack.theme.gradientTo, op: 0.45 },
                    { x: 46, h: 42, fill: activePack.theme.gradientFrom, op: 0.65 },
                    { x: 80, h: 35, fill: activePack.theme.gradientTo, op: 0.55 },
                    { x: 114, h: 52, fill: activePack.theme.gradientFrom, op: 0.85 },
                    { x: 148, h: 62, fill: activePack.theme.gradientFrom, op: 1.0 },
                  ].map((b, idx) => (
                    <rect
                      key={idx}
                      x={b.x}
                      y={66 - b.h}
                      width="22"
                      height={b.h}
                      rx="4"
                      fill={b.fill}
                      fillOpacity={b.op}
                    />
                  ))}
                  <path
                    d="M 23,36 L 57,22 L 91,28 L 125,14 L 159,4"
                    fill="none"
                    stroke="var(--text-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="159" cy="4" r="3.5" fill={activePack.theme.gradientFrom} />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: VISUAL AUTO-DETECTION BANNER (SVG Circular Confidence Ring + Top 3 Horizontal Bars) */}
        {detectedMatches.length > 0 && cleanRows.length > 0 && topMatch && (() => {
          const topPackConfig = getPackById(topMatch.packId);
          const gaugeColor = isTopMatchUncertain ? 'var(--warning)' : topPackConfig.theme.gradientFrom;
          const radius = 22;
          const circumference = 2 * Math.PI * radius;
          const dashOffset =
            circumference - (Math.min(100, Math.max(0, topMatch.confidence)) / 100) * circumference;

          return (
            <div
              data-testid="pack-auto-detect-banner"
              className="p-4 rounded-2xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-4"
            >
              {/* Left: Circular SVG Confidence Gauge + Verdict */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                  <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90" aria-hidden="true">
                    <circle
                      cx="28"
                      cy="28"
                      r={radius}
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r={radius}
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <span
                    className="absolute text-[11px] font-mono tabular-nums font-bold"
                    style={{ color: gaugeColor }}
                  >
                    {topMatch.confidence}%
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-muted">
                    Automated Schema Match · {cleanRows.length.toLocaleString()} Rows
                  </div>
                  <div className="text-xs sm:text-sm text-primary min-w-0">
                    {isTopMatchUncertain ? (
                      <span data-testid="pack-uncertain-banner" className="font-semibold text-warning">
                        Not sure, please choose — low schema match ({topMatch.confidence}%)
                      </span>
                    ) : (
                      <span data-testid="pack-recommended-banner" className="font-semibold text-primary">
                        Recommended for your data: Looks like {topMatch.packName} data ({topMatch.confidence}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: Top 3 Horizontal Match Bars with Pack Colors */}
              <div className="w-full md:w-72 space-y-1.5">
                {detectedMatches.slice(0, 3).map(m => {
                  const mPack = getPackById(m.packId);
                  const mColor = m.confidence < 60 ? 'var(--warning)' : mPack.theme.gradientFrom;
                  return (
                    <div key={m.packId} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-primary font-medium truncate max-w-[175px]">{m.packName}</span>
                        <span className="text-secondary font-bold">{m.confidence}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-card overflow-hidden border border-subtle">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(6, m.confidence)}%`,
                            backgroundColor: mColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Clear CTA */}
              {!isTopMatchUncertain && topMatch.packId !== activePack.id && (
                <button
                  type="button"
                  onClick={() => setActivePackId(topMatch.packId)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0 flex items-center gap-1.5 pack-btn-press"
                >
                  <span>Use {topMatch.packName}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* SECTION 2: 14-PACK CATALOG GRID WITH PER-PACK GLOW, MINI LIVE PREVIEW & HERO KPIS */}
      {showCatalogGrid && (
        <section aria-label="Analytics Packs Catalog" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-sm sm:text-base font-bold uppercase tracking-wider text-primary">
              Select an Analytics Pack ({filteredCatalogPacks.length}/{ANALYTICS_PACKS.length} Domains)
            </h2>
            <span className="text-xs font-mono text-secondary">
              Active Domain: <strong className="text-primary">{activePack.name}</strong>
            </span>
          </div>

          {/* Pack Picker Search & Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-subtle">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                data-testid="pack-picker-search"
                aria-label="Search analytics packs by domain, metric, or keyword"
                placeholder="Search 14 packs (e.g. Financial, OEE, Churn, Healthcare, Retail)..."
                value={packSearchQuery}
                onChange={e => setPackSearchQuery(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl bg-input border border-subtle text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter packs by category">
              {(
                [
                  'All',
                  'Finance & Risk',
                  'Revenue & Growth',
                  'Product & Web',
                  'Operations & Supply',
                  'People & Sector',
                ] as const
              ).map(cat => {
                const isActiveCat = selectedCategory === cat;
                const slug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <button
                    key={cat}
                    type="button"
                    data-testid={`pack-category-filter-${slug}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer pack-btn-press ${
                      isActiveCat
                        ? 'bg-accent text-on-accent'
                        : 'bg-elevated text-secondary hover:text-primary border border-subtle'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            data-testid="analytics-packs-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filteredCatalogPacks.map((pack, idx) => {
              const Icon = PACK_ICON_MAP[pack.icon] || Layers;
              const isSelected = pack.id === activePack.id;
              const isRecommended =
                cleanRows.length > 0 &&
                topMatch?.packId === pack.id &&
                !isTopMatchUncertain;
              const heroKpiNames = pack.kpis.slice(0, 3).map(k => k.title);

              return (
                <div
                  key={pack.id}
                  data-testid={`pack-card-${pack.id}`}
                  data-selected={isSelected ? 'true' : 'false'}
                  data-recommended={isRecommended ? 'true' : 'false'}
                  style={
                    flags.depthUI
                      ? ({
                          '--pack-from': pack.theme.gradientFrom,
                          '--pack-to': pack.theme.gradientTo,
                        } as React.CSSProperties)
                      : undefined
                  }
                  className={`depth-card rounded-[20px] p-5 border flex flex-col justify-between gap-4 min-w-0 overflow-hidden ${
                    flags.depthUI ? 'pack-picker-card' : 'bg-card'
                  } ${
                    isSelected
                      ? 'border-strong'
                      : 'border-subtle'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Gradient Icon Tile + KPI Count / Best Match Ribbon */}
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          flags.depthUI ? 'pack-icon-tile' : 'bg-accent-soft text-accent border border-subtle'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isRecommended && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-bold bg-elevated border border-subtle"
                            style={{ color: pack.theme.gradientFrom }}
                          >
                            Best match {topMatch?.confidence}%
                          </span>
                        )}
                        <span className="text-[11px] font-mono tabular-nums text-secondary">
                          {pack.kpis.length} KPIs · {pack.charts.length} Charts
                        </span>
                      </div>
                    </div>

                    {/* Title & Category */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: pack.theme.gradientFrom }}>
                        {pack.category}
                      </div>
                      <h3
                        title={pack.name}
                        className="font-heading text-base sm:text-lg font-bold text-primary line-clamp-1"
                      >
                        {pack.name}
                      </h3>
                      <p
                        title={pack.description}
                        className="text-xs text-secondary line-clamp-2 leading-relaxed"
                      >
                        {pack.description}
                      </p>
                    </div>

                    {/* Mini Live Preview built from Pack Sample Data */}
                    {flags.depthUI && <PackMiniLivePreview pack={pack} index={idx} />}

                    {/* 3 Hero KPI Names */}
                    <div className="space-y-1 pt-0.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted">
                        Hero Scorecard Metrics
                      </div>
                      <div className="text-xs text-secondary leading-snug line-clamp-2">
                        {heroKpiNames.join(' · ')}
                      </div>
                    </div>
                  </div>

                  {/* Merged Primary CTA + Subtle Secondary Link */}
                  <div className="pt-3 border-t border-subtle flex items-center justify-between gap-2">
                    <button
                      type="button"
                      data-testid={`pack-sample-btn-${pack.id}`}
                      onClick={() => handleTrySampleData(pack)}
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer text-center pack-btn-press"
                    >
                      Try with sample data
                    </button>
                    <button
                      type="button"
                      data-testid={`pack-open-btn-${pack.id}`}
                      onClick={() => handleOpenPack(pack)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-elevated hover:bg-card-hover text-primary border border-subtle text-xs font-semibold transition-colors cursor-pointer shrink-0 pack-btn-press"
                    >
                      Open Pack
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 5: ACTIVE PACK DASHBOARD VIEW */}
      <section
        aria-label={`${activePack.name} Dashboard`}
        data-testid="active-pack-dashboard"
        className="space-y-6 min-w-0"
      >
        {/* Active Pack Header Strip Tinted with Pack Gradient */}
        <div
          className={`depth-card rounded-[20px] border border-subtle p-5 sm:p-6 space-y-5 min-w-0 overflow-hidden ${
            flags.depthUI ? 'pack-dashboard-header' : 'bg-card'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                  flags.depthUI ? 'pack-icon-tile' : 'bg-accent-soft text-accent border border-subtle'
                }`}
              >
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span
                    className="font-bold uppercase tracking-wider"
                    style={{ color: activePack.theme.gradientFrom }}
                  >
                    {activePack.name}
                  </span>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span className="text-secondary tabular-nums">
                    {availableKpiCount}/{dashboard.computedKpis.length} KPIs Active
                  </span>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span className="text-secondary tabular-nums">
                    {activeRows.length.toLocaleString()} Rows
                  </span>
                </div>

                <EditableDashboardTitle />

                <p className="text-xs text-secondary break-words">
                  {activePack.description} · Dataset: <span className="font-mono text-primary">{project.name}</span>
                </p>
              </div>
            </div>

            {/* Pack Action Bar */}
            <div className="flex flex-wrap items-center gap-2 max-w-full min-w-0">
              <label className="sr-only" htmlFor="pack-selector-select">
                Switch Analytics Pack
              </label>
              <select
                id="pack-selector-select"
                aria-label="Switch Analytics Pack"
                data-testid="pack-selector-select"
                value={activePack.id}
                onChange={e => setActivePackId(e.target.value)}
                className="min-h-[44px] max-w-full rounded-xl bg-elevated border border-subtle px-3 py-2 text-xs font-semibold text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
              >
                {ANALYTICS_PACKS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                data-testid="pack-map-columns-btn"
                onClick={() => setIsMappingModalOpen(true)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-primary flex items-center gap-1.5 cursor-pointer transition-colors pack-btn-press"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
                <span>Map Columns</span>
              </button>

              <button
                type="button"
                data-testid="pack-download-template-btn"
                onClick={() => handleDownloadTemplate(activePack)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-primary flex items-center gap-1.5 cursor-pointer transition-colors pack-btn-press"
              >
                <Download className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
                <span>Download data template</span>
              </button>

              <button
                type="button"
                data-testid="pack-ask-ai-btn"
                onClick={handleAskAiAboutPack}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-opacity pack-btn-press"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI about this pack</span>
              </button>
            </div>
          </div>

          {/* SECTION 6: FRIENDLY ILLUSTRATED EMPTY / PARTIAL DATA STATE BANNER */}
          {(cleanRows.length === 0 || missingReqRoles.length > 0) && (
            <div
              data-testid="pack-missing-roles-banner"
              className="p-4 sm:p-5 rounded-2xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-card border border-subtle flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-primary">
                    {cleanRows.length === 0
                      ? `Ready to analyze ${activePack.name} — load sample data or map your file`
                      : `Partial role mapping: ${missingReqRoles.length} required role(s) unmapped`}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {missingReqRoles.length > 0
                      ? `Missing required roles: ${missingReqRoles.join(', ')}. Click "Map Columns" to bind your headers or load the curated domain dataset.`
                      : 'Load the curated sample dataset for instant KPI & chart synthesis, or download the CSV template with pre-configured role headers.'}
                  </p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTrySampleData(activePack)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer pack-btn-press"
                >
                  Try with sample data
                </button>
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(true)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary transition-colors cursor-pointer pack-btn-press"
                >
                  Map Columns
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(activePack)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary transition-colors cursor-pointer pack-btn-press"
                >
                  Download data template
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="pt-3 border-t border-subtle flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Filter pack records"
                placeholder="Filter rows by keyword or segment..."
                value={filters.searchQuery || ''}
                onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full min-h-[44px] pl-9 pr-3 py-1.5 rounded-xl bg-input border border-subtle text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            {primaryCategoryCol && dimensionValues.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted shrink-0" />
                <select
                  aria-label={`Filter by ${primaryCategoryCol}`}
                  value={
                    filters.selectedDimension === primaryCategoryCol
                      ? filters.selectedDimensionValue || ''
                      : ''
                  }
                  onChange={e => {
                    const val = e.target.value;
                    setFilters(prev => ({
                      ...prev,
                      selectedDimension: val ? primaryCategoryCol : null,
                      selectedDimensionValue: val || null,
                    }));
                  }}
                  className="min-h-[44px] rounded-xl bg-input border border-subtle px-3 py-1.5 text-xs text-primary focus:outline-hidden"
                >
                  <option value="">All {primaryCategoryCol}</option>
                  {dimensionValues.map(v => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(filters.searchQuery || filters.selectedDimensionValue) && (
              <button
                type="button"
                onClick={clearAllSlicers}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1.5 cursor-pointer pack-btn-press"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* HIGHLIGHTED "KEY INSIGHT" NARRATIVE CARD AT TOP OF DASHBOARD */}
        {dashboard.executiveNarrative && dashboard.executiveNarrative.length > 0 && (
          <div
            data-testid="pack-key-insight-card"
            className="pack-insight-banner rounded-2xl p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 pack-icon-tile"
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="font-bold uppercase tracking-wider" style={{ color: activePack.theme.gradientFrom }}>
                    Key Domain Narrative
                  </span>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span className="text-secondary">Auto-synthesized from {activeRows.length.toLocaleString()} records</span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-primary leading-relaxed">
                  {dashboard.executiveNarrative[0]}
                </p>
                {dashboard.executiveNarrative[1] && (
                  <p className="text-xs text-secondary leading-relaxed">
                    {dashboard.executiveNarrative[1]}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPI SCORECARD (Hero Row First + Compact Grid, all direct children of pack-kpi-grid) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-5 h-1 rounded-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${activePack.theme.gradientFrom}, ${activePack.theme.gradientTo})`,
                }}
              />
              <h2 className="font-heading text-sm sm:text-base font-bold uppercase tracking-wider text-primary">
                Domain Key Performance Indicators ({dashboard.computedKpis.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-secondary">
              Top 4 Hero KPIs + {Math.max(0, dashboard.computedKpis.length - 4)} Supporting Metrics · Click any KPI to drill through
            </span>
          </div>

          {/* Date Ambiguity Warning Banner */}
          {dashboard.dateWarning && (
            <div
              data-testid="pack-date-warning-banner"
              className="p-3.5 rounded-xl bg-elevated border border-subtle flex items-start gap-2.5 text-xs text-primary"
            >
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Date Format Advisory: </span>
                <span className="text-secondary">{dashboard.dateWarning}</span>
              </div>
            </div>
          )}

          <div
            data-testid="pack-kpi-grid"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {dashboard.computedKpis.map((k, idx) => (
              <ModernKpiCard
                key={k.id}
                isHero={idx < 4}
                packColor={activePack.theme.gradientFrom}
                packGradientTo={activePack.theme.gradientTo}
                onMapColumn={() => setIsMappingModalOpen(true)}
                goodDirection={k.goodDirection}
                unavailable={k.status === 'unavailable'}
                unavailableReason={k.reason}
                unavailableHint={k.hint}
                sparklineData={k.sparkline}
                formulaText={k.formulaText}
                source={k.source}
                assumption={k.assumption}
                kpi={{
                  id: k.id,
                  name: k.label,
                  value: k.value ?? 0,
                  formattedValue: k.formattedValue,
                  change: k.changePercent ?? 0,
                  changePercent: k.changePercent,
                  period: activePack.name,
                  status: k.status === 'available' ? 'On Track' : 'At Risk',
                  sourceColumn: roleMap[k.needs[0]] || k.needs[0] || 'metric',
                  calculation: k.source,
                  aggregation: 'sum',
                  definition: k.formulaText,
                  traceableSource: `${activePack.id}.${k.id}`,
                }}
                onClick={() => {
                  if (k.status === 'available') {
                    openDrillThrough({
                      title: `${k.label} (${activePack.name})`,
                      subtitle: k.description,
                      kpi: {
                        id: k.id,
                        name: k.label,
                        value: k.value ?? 0,
                        formattedValue: k.formattedValue,
                        change: k.changePercent ?? 0,
                        changePercent: k.changePercent ?? 0,
                        period: 'Current Period',
                        status: 'On Track',
                        sourceColumn: roleMap[k.needs[0]] || k.needs[0] || 'metric',
                        calculation: k.description,
                        aggregation: 'sum',
                        definition: k.description,
                        traceableSource: activePack.name,
                      },
                    });
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* 4 ANALYTICAL LENSES TABS (Segmented Control with Sliding/Active Indicator) */}
        <div className="depth-card rounded-[20px] bg-card border border-subtle p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle pb-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="w-4 h-1 rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${activePack.theme.gradientFrom}, ${activePack.theme.gradientTo})`,
                  }}
                />
                <h2 className="font-heading text-base font-bold text-primary uppercase tracking-wide">
                  4-Lens Analytical Diagnostics
                </h2>
              </div>
              <p className="text-xs text-secondary">
                Switch between Descriptive, Diagnostic, Predictive, and Prescriptive intelligence for {activePack.name}.
              </p>
            </div>

            <div
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-elevated border border-subtle"
              role="tablist"
              aria-label="Analytical Lenses"
            >
              {(['descriptive', 'diagnostic', 'predictive', 'prescriptive'] as PackLensKey[]).map(lens => {
                const isActive = activeLens === lens;
                return (
                  <button
                    key={lens}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`pack-lens-tab-${lens}`}
                    onClick={() => setActiveLens(lens)}
                    className={`min-h-[40px] px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer pack-btn-press ${
                      isActive
                        ? 'bg-accent text-on-accent shadow-xs'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {lens}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Lens Narrative & Bullets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-testid={`pack-lens-content-${activeLens}`}>
            <div className="p-4 rounded-xl bg-elevated border border-subtle space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-sm font-bold text-primary capitalize">
                  {activePack.name} — {activeLens} Lens
                </h3>
                <span
                  className="text-[10px] font-mono uppercase font-bold"
                  style={{ color: activePack.theme.gradientFrom }}
                >
                  {activeLens}
                </span>
              </div>
              <ul className="space-y-2 pt-1">
                {lensBullets.map((b: string, idx: number) => (
                  <li key={idx} className="text-xs text-primary flex items-start gap-2">
                    <CheckCircle2
                      className="w-3.5 h-3.5 shrink-0 mt-0.5"
                      style={{ color: activePack.theme.gradientFrom }}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Interactive Shared Technique Widget matching the active lens */}
            <div className="p-4 rounded-xl bg-elevated border border-subtle space-y-3">
              {activeLens === 'descriptive' && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                    Pareto 80/20 &amp; Time-Series Concentration
                  </div>
                  {paretoSummary && paretoSummary.items.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-secondary">{paretoSummary.summary}</p>
                      <div className="space-y-1.5">
                        {paretoSummary.items.slice(0, 4).map(item => (
                          <div key={item.name} className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="text-primary truncate max-w-[180px]">{item.name}</span>
                            <span className="text-secondary">
                              {item.sharePct.toFixed(1)}% (cum {item.cumulativeSharePct.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-secondary">
                      Load or map a category and numeric column to view 80/20 concentration.
                    </p>
                  )}
                </div>
              )}

              {activeLens === 'diagnostic' && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                    Outlier &amp; Variance Diagnostics
                  </div>
                  {anomalySummary && (
                    <p className="text-xs text-secondary">{anomalySummary.summary}</p>
                  )}
                  {varianceSummary && varianceSummary.rows.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {varianceSummary.rows.slice(0, 4).map((row, idx) => (
                        <div key={`${row.label}-${idx}`} className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="text-primary truncate max-w-[160px]">{row.label}</span>
                          <span className={row.isFavorable ? 'text-success' : 'text-danger'}>
                            {row.variance >= 0 ? '+' : ''}
                            {row.variancePct.toFixed(1)}% ({row.isFavorable ? 'Favorable' : 'Unfavorable'})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeLens === 'predictive' && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                    Linear + Moving-Average Forecast (Next 3 Periods)
                  </div>
                  {timeSeriesSummary && timeSeriesSummary.forecasts.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-secondary">{timeSeriesSummary.confidenceNote}</p>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {timeSeriesSummary.forecasts.map(f => (
                          <div key={f.index} className="p-2.5 rounded-lg bg-card border border-subtle text-center">
                            <div className="text-[10px] font-mono text-muted">{f.label}</div>
                            <div className="text-xs font-bold font-mono tabular-nums text-primary mt-0.5">
                              {f.forecast.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-secondary">
                      Map a date and numeric metric column to compute 3-period trend projections.
                    </p>
                  )}
                </div>
              )}

              {activeLens === 'prescriptive' && (
                <div className="space-y-3" data-testid="pack-whatif-simulator">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                      Interactive What-If Scenario Simulator
                    </span>
                    <span
                      className="text-xs font-mono tabular-nums font-bold"
                      style={{ color: activePack.theme.gradientFrom }}
                    >
                      Net Δ: {whatIfSummary.netDeltaPct >= 0 ? '+' : ''}
                      {whatIfSummary.netDeltaPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="space-y-1">
                      <span className="flex justify-between font-mono tabular-nums text-[11px] text-secondary">
                        <span>Price Δ</span>
                        <span>{priceDelta}%</span>
                      </span>
                      <input
                        type="range"
                        min={-25}
                        max={25}
                        value={priceDelta}
                        onChange={e => setPriceDelta(Number(e.target.value))}
                        className="w-full accent-[var(--accent)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="flex justify-between font-mono tabular-nums text-[11px] text-secondary">
                        <span>Volume Δ</span>
                        <span>{volumeDelta}%</span>
                      </span>
                      <input
                        type="range"
                        min={-25}
                        max={25}
                        value={volumeDelta}
                        onChange={e => setVolumeDelta(Number(e.target.value))}
                        className="w-full accent-[var(--accent)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="flex justify-between font-mono tabular-nums text-[11px] text-secondary">
                        <span>Cost Δ</span>
                        <span>{costDelta}%</span>
                      </span>
                      <input
                        type="range"
                        min={-25}
                        max={25}
                        value={costDelta}
                        onChange={e => setCostDelta(Number(e.target.value))}
                        className="w-full accent-[var(--accent)]"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="flex justify-between font-mono tabular-nums text-[11px] text-secondary">
                        <span>Churn Δ</span>
                        <span>{churnDelta}%</span>
                      </span>
                      <input
                        type="range"
                        min={-15}
                        max={15}
                        value={churnDelta}
                        onChange={e => setChurnDelta(Number(e.target.value))}
                        className="w-full accent-[var(--accent)]"
                      />
                    </label>
                  </div>

                  <p className="text-[11px] font-mono tabular-nums text-secondary">{whatIfSummary.summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DOMAIN VISUALIZATIONS GRID (Pack-Tinted Palette + Insight Subtitle) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-5 h-1 rounded-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${activePack.theme.gradientFrom}, ${activePack.theme.gradientTo})`,
                }}
              />
              <h2 className="font-heading text-sm sm:text-base font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: activePack.theme.gradientFrom }} />
                <span>Domain Visualizations ({dashboard.charts.length})</span>
              </h2>
            </div>
          </div>

          <div
            data-testid="pack-charts-grid"
            className="grid grid-cols-1 lg:grid-cols-2 gap-5"
          >
            {dashboard.charts.map(chart => {
              const guideType = resolveGuideChartType(chart.type);
              const containerId = `pack-chart-${activePack.id}-${chart.id}`;
              const catField = chart.categoryField || primaryCategoryCol || 'Category';
              const valField = chart.valueField || primaryNumericCol || 'Value';
              const agg = (chart.aggregation || 'sum') as 'sum' | 'avg' | 'count' | 'max' | 'min';

              return (
                <div
                  key={chart.id}
                  id={containerId}
                  data-testid={`pack-chart-card-${chart.id}`}
                  className="depth-card rounded-[20px] bg-card border border-subtle p-4 sm:p-5 space-y-4 min-w-0 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-subtle pb-3">
                    <div className="min-w-0 space-y-0.5">
                      <h3 className="font-heading text-sm sm:text-base font-bold text-primary truncate" title={chart.title}>
                        {chart.title}
                      </h3>
                      <p className="text-xs text-secondary truncate" title={chart.subtitle}>
                        {chart.subtitle || `${valField} by ${catField} (${agg.toUpperCase()})`}
                      </p>
                    </div>
                    <DownloadMenu
                      context="chart"
                      compact
                      label="Export"
                      chartPayload={{
                        chartId: chart.id,
                        chartTitle: chart.title,
                        chartType: guideType,
                        containerSelector: `#${containerId}`,
                        categoryField: catField,
                        valueField: valField,
                        aggregation: agg,
                      }}
                    />
                  </div>

                  <GuideChartRenderer
                    chartType={guideType}
                    rows={activeRows}
                    categoryField={catField}
                    secondaryCategoryField={chart.secondaryCategoryField}
                    valueField={valField}
                    secondaryValueField={chart.secondaryValueField}
                    aggregation={agg}
                    isLight={isLight}
                    onDrillThrough={(col, val, lbl) =>
                      openDrillThrough({
                        title: lbl || `${col}: ${val}`,
                        filterColumn: col,
                        filterValue: val,
                        sourceContext: 'chart_bar',
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Auto-Generated Pack Report Sections */}
        <div
          data-testid="pack-report-sections"
          className="depth-card rounded-[20px] bg-card border border-subtle p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle pb-4">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5" style={{ color: activePack.theme.gradientFrom }} />
              <div>
                <h2 className="font-heading text-base font-bold text-primary uppercase tracking-wide">
                  {report.packName} — Executive Report Sections
                </h2>
                <p className="text-xs text-secondary">
                  Auto-compiled narrative and tabular verification for boardroom PDF &amp; ZIP exports.
                </p>
              </div>
            </div>
            <DownloadMenu context="analytics_pack" packId={activePack.id} label="Download Report" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.sections.map((sec, idx) => (
              <div
                key={`${sec.title}-${idx}`}
                data-testid={`pack-report-section-${idx}`}
                className="p-4 rounded-xl bg-elevated border border-subtle space-y-2.5"
              >
                <h3 className="font-heading text-sm font-bold text-primary">{sec.title}</h3>
                <p className="text-xs text-secondary leading-relaxed">{sec.narrative}</p>
                <ul className="space-y-1 text-xs font-mono tabular-nums text-primary">
                  {sec.kpiSummaries.slice(0, 4).map(ks => (
                    <li key={ks.id} className="truncate" title={`${ks.label}: ${ks.formattedValue}`}>
                      • {ks.label}: {ks.formattedValue}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={isMappingModalOpen}
        columns={columns.map(c => c.name)}
        detectedTypes={detectedTypes}
        packRoles={packRoleOptions}
        initialMapping={roleMap}
        packName={activePack.name}
        onCancel={() => setIsMappingModalOpen(false)}
        onConfirm={customMapping => {
          savePersistedPackRoleMap(datasetId, activePack.id, customMapping);
          setMappingGeneration(g => g + 1);
          setIsMappingModalOpen(false);
          addToast({
            type: 'success',
            title: 'Pack Role Mapping Saved',
            message: `Updated column mappings for ${activePack.name}.`,
          });
        }}
      />
    </div>
  );
};

export default AnalyticsPacksView;
