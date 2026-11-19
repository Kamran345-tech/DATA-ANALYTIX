import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ArrowLeft,
  TrendingUp,
  Calendar,
  Compass,
  Activity,
  LineChart,
  Lightbulb,
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useToast } from '../../store/useToast';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { ModernKpiCard } from '../modern/ModernKpiCard';
import { ColumnMappingModal } from '../common/ColumnMappingModal';
import { DownloadMenu } from '../common/DownloadMenu';
import { PagePurposeBar } from '../common/PagePurposeBar';
import { InteractiveSlicersBar } from '../common/InteractiveSlicersBar';
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

const LENS_META: Record<
  PackLensKey,
  {
    label: string;
    question: string;
    actionText: string;
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  descriptive: {
    label: 'Descriptive',
    question: 'What happened across core KPIs?',
    actionText: 'Review top 80/20 Pareto drivers and period totals.',
    Icon: Compass,
  },
  diagnostic: {
    label: 'Diagnostic',
    question: 'Why did variance or anomalies occur?',
    actionText: 'Inspect outlier records and unfavorable variance segments.',
    Icon: Activity,
  },
  predictive: {
    label: 'Predictive',
    question: 'Where is the trajectory heading next?',
    actionText: 'Validate 3-period linear + moving-average projections.',
    Icon: LineChart,
  },
  prescriptive: {
    label: 'Prescriptive',
    question: 'What levers should leadership pull now?',
    actionText: 'Simulate price, volume, cost, and churn sensitivity below.',
    Icon: Lightbulb,
  },
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
 * Formats a sample preview number into a compact abbreviated string (e.g. 1.29M, 355K, 94.0M)
 * so picker card numbers never collide with sparklines or truncate.
 */
function formatCompactPreviewNumber(val: number): string {
  if (!Number.isFinite(val)) return '0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  if (Number.isInteger(abs)) {
    return `${sign}${abs.toLocaleString()}`;
  }
  return `${sign}${abs.toFixed(1)}`;
}

/**
 * Highlights numeric tokens ($8.16M, 69.2%, +3.5%, etc.) inside narrative sentences
 * with pack-tinted tabular-nums badges.
 */
function renderHighlightedNarrative(text: string, accentColor: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/([+-]?\$?\d[\d,]*(?:\.\d+)?(?:%|M|B|K|x|d|bps)?)/g);
  return parts.map((part, idx) => {
    if (/^[+-]?\$?\d[\d,]*(?:\.\d+)?(?:%|M|B|K|x|d|bps)?$/.test(part) && (part.length > 1 || /\d/.test(part))) {
      return (
        <span
          key={idx}
          className="font-mono tabular-nums font-bold px-1.5 py-0.5 mx-0.5 rounded-md bg-elevated border border-subtle text-primary"
          style={{ borderColor: `color-mix(in srgb, ${accentColor} 45%, var(--border-subtle))` }}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

/**
 * Extracts a 6-point numeric preview series from a pack's sample dataset rows
 * so every Picker card renders a real mini chart preview from actual pack data.
 */
function extractPackSamplePreviewSeries(pack: EnrichedAnalyticsPackConfig): {
  values: number[];
  primaryMetricLabel: string;
} {
  const sampleRows: Record<string, any>[] = pack.sampleDataset();
  const primaryMeasure = pack.taxonomy.measures[0] || pack.detect.requiredRoles[1] || 'value';
  const rawVals = sampleRows
    .slice(0, 8)
    .map((r: Record<string, any>) => {
      const direct = Number(r[primaryMeasure]);
      if (Number.isFinite(direct) && direct !== 0) return direct;
      const firstNumericKey = Object.keys(r).find(k => typeof r[k] === 'number' && Number.isFinite(r[k]));
      return firstNumericKey ? Number(r[firstNumericKey]) : 0;
    })
    .filter((v: number) => Number.isFinite(v));

  const values = rawVals.length >= 3 ? rawVals.slice(0, 6) : [42, 58, 51, 74, 69, 88];
  const label = primaryMeasure.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { values, primaryMetricLabel: label };
}

/**
 * Non-Overlapping Two-Row Inline SVG Mini Live Preview for Pack Picker Cards
 * Row 1: Full "Sample · <Metric>" label on left + compact abbreviated value (e.g. 1.29M) on right.
 * Row 2: Dedicated full-width SVG sparkline / bars / ring+line with zero overlap at 1440, 1024, and 375px.
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

  const width = 220;
  const height = 32;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * (width - 12) + 6;
    const y = height - ((v - min) / range) * (height - 10) - 5;
    return { x, y, v };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`;
  const lastVal = values[values.length - 1] ?? 0;
  const compactVal = formatCompactPreviewNumber(lastVal);

  return (
    <div
      data-testid={`pack-mini-preview-${pack.id}`}
      className="p-3 rounded-xl bg-elevated border border-subtle flex flex-col gap-2 min-w-0"
    >
      {/* Row 1: Full "Sample" badge + metric label on left, abbreviated number on right */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div
          className="flex items-center gap-1.5 min-w-0 text-[11px] font-mono text-secondary"
          title={`Sample · ${primaryMetricLabel}: ${lastVal.toLocaleString()}`}
        >
          <span
            className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-card border border-subtle text-primary"
          >
            Sample
          </span>
          <span className="truncate text-muted">{primaryMetricLabel}</span>
        </div>

        <div
          className="shrink-0 text-xs font-mono tabular-nums font-bold text-primary flex items-center gap-1"
          title={lastVal.toLocaleString()}
        >
          <TrendingUp className="w-3 h-3 shrink-0" style={{ color: fromColor }} aria-hidden="true" />
          <span>{compactVal}</span>
        </div>
      </div>

      {/* Row 2: Dedicated non-overlapping SVG chart preview */}
      <div className="w-full h-8 flex items-center">
        {variant === 0 && (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-8 block overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
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
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-8 block"
            aria-hidden="true"
          >
            {values.map((v, i) => {
              const barW = 24;
              const gap = 10;
              const x = 10 + i * (barW + gap);
              const barH = Math.max(6, ((v - min * 0.85) / (max - min * 0.85 || 1)) * (height - 4));
              const y = height - barH;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="3.5"
                  fill={i === values.length - 1 ? fromColor : toColor}
                  fillOpacity={i === values.length - 1 ? 0.95 : 0.45 + (i / values.length) * 0.35}
                />
              );
            })}
          </svg>
        )}

        {variant === 2 && (
          <div className="w-full flex items-center gap-3 min-w-0 overflow-hidden">
            <svg width="28" height="28" viewBox="0 0 32 32" className="-rotate-90 shrink-0" aria-hidden="true">
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
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="flex-1 min-w-0 h-8 block"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={linePath} fill="none" stroke={fromColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={pts[pts.length - 1].x - 3} cy={pts[pts.length - 1].y} r="3" fill={toColor} />
            </svg>
          </div>
        )}
      </div>
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
    isProcessing,
  } = usePlatform();
  const { addToast } = useToast();

  const isLight = themeMode === 'light';
  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());
  const [showCatalogGrid, setShowCatalogGrid] = useState<boolean>(true);
  const [packSearchQuery, setPackSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeLens, setActiveLens] = useState<PackLensKey>('descriptive');
  const [dateWindowFilter, setDateWindowFilter] = useState<'all' | 'recent3' | 'recentHalf'>('all');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [mappingGeneration, setMappingGeneration] = useState<number>(0);

  const dashboardSectionRef = useRef<HTMLElement | null>(null);
  const dashboardHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const lensSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
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

  // Determine if the user has uploaded/connected a custom dataset (vs startup demo or pack sample)
  const isStartupRetailDemo =
    project?.id === 'demo-global-retail-sales' ||
    project?.sourceFileName === 'enterprise_sales_margin_telemetry.csv';
  const isPackSampleDataset = Boolean(project?.sourceFileName?.includes('[PACK_SAMPLE]'));
  const hasCustomUserDataset = Boolean(
    cleanRows.length > 0 && !isStartupRetailDemo && !isPackSampleDataset
  );

  // Part A Bug #5: If AnalyticsPacksView is opened while the generic startup "Enterprise Sales & Margin Telemetry"
  // demo is loaded (and not in start_empty mode), immediately load the active pack's own sample dataset
  // so Financial & FP&A shows 12/12 KPIs Active on its own domain sample data instead of 2/12.
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('dataanalytix_start_empty') === 'true') {
      return;
    }
    if (isStartupRetailDemo && cleanRows.length > 0) {
      const sampleRows = activePack.sampleDataset();
      ingestDatasetFromRows(`${activePack.name} Sample Dataset`, sampleRows, {
        connectionType: 'PACK_SAMPLE',
        database: activePack.name,
      });
    }
  }, [isStartupRetailDemo, activePack, cleanRows.length, ingestDatasetFromRows]);

  const baseActiveRows = filteredRows && filteredRows.length > 0 ? filteredRows : cleanRows;
  const activeRows = useMemo(() => {
    if (dateWindowFilter === 'recent3' && baseActiveRows.length > 3) {
      return baseActiveRows.slice(-3);
    }
    if (dateWindowFilter === 'recentHalf' && baseActiveRows.length > 2) {
      return baseActiveRows.slice(-Math.ceil(baseActiveRows.length / 2));
    }
    return baseActiveRows;
  }, [baseActiveRows, dateWindowFilter]);

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
  const persistedOverrides = useMemo(
    () => getPersistedPackRoleMap(datasetId, activePack.id),
    [datasetId, activePack.id, mappingGeneration]
  );

  const roleMap = useMemo(() => {
    return mapRoles({ columns, rows: cleanRows, datasetId }, activePack, persistedOverrides);
  }, [activePack, columns, cleanRows, datasetId, persistedOverrides]);

  const effectiveRoleOverrides = useMemo(
    () => ({ ...roleMap, ...persistedOverrides }),
    [roleMap, persistedOverrides]
  );

  // Built Pack Dashboard & Report
  const dashboard = useMemo(
    () => buildDashboard(activePack, activeRows, effectiveRoleOverrides),
    [activePack, activeRows, effectiveRoleOverrides]
  );

  const report = useMemo(
    () => buildReport(activePack, activeRows, effectiveRoleOverrides),
    [activePack, activeRows, effectiveRoleOverrides]
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

  const focusAndScrollToDashboard = () => {
    setShowCatalogGrid(false);
    if (typeof window === 'undefined') return;
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollParent = dashboardSectionRef.current?.closest('main') as HTMLElement | null;
    if (scrollParent) {
      scrollParent.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
    setTimeout(() => {
      if (scrollParent) {
        scrollParent.scrollTop = 0;
      }
      if (dashboardSectionRef.current) {
        dashboardSectionRef.current.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start',
        });
      }
      if (dashboardHeadingRef.current) {
        dashboardHeadingRef.current.focus({ preventScroll: true });
      }
    }, 20);
  };

  const handleTrySampleData = (
    pack: EnrichedAnalyticsPackConfig,
    options?: { collapseCatalog?: boolean }
  ) => {
    const sampleRows = pack.sampleDataset();
    setActivePackId(pack.id);
    ingestDatasetFromRows(`${pack.name} Sample Dataset`, sampleRows, {
      connectionType: 'PACK_SAMPLE',
      database: pack.name,
    });
    if (options?.collapseCatalog !== false) {
      focusAndScrollToDashboard();
    }
    addToast({
      id: 'dataset_load_merged_toast',
      type: 'success',
      title: `${pack.name} Ready`,
      message: `Loaded ${sampleRows.length} sample records (${pack.kpis.length}/${pack.kpis.length} domain KPIs active).`,
    });
  };

  const handleOpenPack = (pack: EnrichedAnalyticsPackConfig) => {
    setActivePackId(pack.id);
    if (!hasCustomUserDataset && cleanRows.length > 0) {
      const sampleRows = pack.sampleDataset();
      ingestDatasetFromRows(`${pack.name} Sample Dataset`, sampleRows, {
        connectionType: 'PACK_SAMPLE',
        database: pack.name,
      });
    }
    focusAndScrollToDashboard();
  };

  const handleSwitchPack = (packId: string) => {
    const nextPack = getPackById(packId);
    setActivePackId(nextPack.id);
    if (!hasCustomUserDataset && cleanRows.length > 0) {
      const sampleRows = nextPack.sampleDataset();
      ingestDatasetFromRows(`${nextPack.name} Sample Dataset`, sampleRows, {
        connectionType: 'PACK_SAMPLE',
        database: nextPack.name,
      });
      addToast({
        id: 'dataset_load_merged_toast',
        type: 'success',
        title: `${nextPack.name} Ready`,
        message: `Loaded ${sampleRows.length} sample records (${nextPack.kpis.length}/${nextPack.kpis.length} domain KPIs active).`,
      });
    }
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

  const handleViewWhyDiagnostic = () => {
    setActiveLens('diagnostic');
    if (typeof window !== 'undefined' && lensSectionRef.current) {
      const prefersReduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      lensSectionRef.current.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start',
      });
    }
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
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const hasActiveFilters = Boolean(
    filters.searchQuery || filters.selectedDimensionValue || dateWindowFilter !== 'all'
  );

  return (
    <div
      style={flags.depthUI ? packCssVars : undefined}
      className="w-full min-w-0 max-w-[1280px] mx-auto space-y-6 pb-24 animate-fadeIn overflow-x-hidden"
      data-testid="analytics-packs-view"
    >
      <PagePurposeBar page="analytics_packs" />
      <InteractiveSlicersBar />

      {/* SLIM STICKY "SWITCH PACK" BAR WHEN CATALOG IS COLLAPSED (Part A Bug #4) */}
      {!showCatalogGrid && (
        <div
          data-testid="pack-sticky-switch-bar"
          className="sticky top-0 z-30 backdrop-blur-md bg-card border border-subtle rounded-2xl p-2.5 shadow-card flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5"
        >
          <button
            type="button"
            data-testid="pack-back-to-catalog-btn"
            onClick={() => setShowCatalogGrid(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-bold text-primary inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors pack-btn-press"
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
            <span>Back to all packs</span>
          </button>

          <div
            className="flex items-center gap-1.5 overflow-x-auto py-0.5 min-w-0 flex-1 no-scrollbar"
            role=" navigation"
            aria-label="Quick switch analytics pack"
          >
            {ANALYTICS_PACKS.map(p => {
              const isCurrent = p.id === activePack.id;
              const ChipIcon = PACK_ICON_MAP[p.icon] || Layers;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`pack-chip-${p.id}`}
                  onClick={() => handleSwitchPack(p.id)}
                  className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 transition-all cursor-pointer pack-btn-press border ${
                    isCurrent
                      ? 'bg-elevated text-primary border-strong shadow-xs'
                      : 'bg-card text-secondary hover:text-primary border-subtle'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.theme.gradientFrom }}
                    aria-hidden="true"
                  />
                  <ChipIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: HERO HEADER WITH AURORA MESH, STAT METRICS & ISOMETRIC FLOATING CHART */}
      {showCatalogGrid && (
        <div
          className={`depth-card rounded-[20px] border border-subtle p-5 sm:p-7 space-y-5 min-w-0 overflow-hidden ${
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
              <div className="pt-1 flex flex-wrap items-center gap-3 sm:gap-4">
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
                    className="min-h-[42px] px-3.5 py-2 rounded-xl border border-subtle bg-elevated hover:bg-card-hover text-xs font-semibold text-primary flex items-center gap-2 cursor-pointer transition-colors pack-btn-press"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
                    <span>{showCatalogGrid ? 'Jump to Active Dashboard' : 'Browse All 14 Packs'}</span>
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
                    onClick={() => handleSwitchPack(topMatch.packId)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0 flex items-center gap-1.5 pack-btn-press"
                  >
                    <span>Use {topMatch.packName}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* SECTION 2: 14-PACK CATALOG GRID WITH PER-PACK GLOW, NON-OVERLAPPING MINI LIVE PREVIEW & SINGLE PRIMARY CTA */}
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
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-input border border-subtle text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
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
                    className={`h-9 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer pack-btn-press ${
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
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5"
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

                    {/* Non-overlapping 2-row Mini Live Preview built from Pack Sample Data (Part A Bug #1) */}
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

                  {/* Part A Bug #2: ONE Primary CTA ("Open with sample data") + subtle text link ("Use my data") */}
                  <div className="pt-3 border-t border-subtle flex flex-col gap-2">
                    <button
                      type="button"
                      data-testid={`pack-sample-btn-${pack.id}`}
                      onClick={() => handleTrySampleData(pack)}
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5 pack-btn-press"
                    >
                      <span>Open with sample data</span>
                      <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                    </button>

                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        data-testid={`pack-open-btn-${pack.id}`}
                        disabled={!hasCustomUserDataset}
                        onClick={() => handleOpenPack(pack)}
                        title={
                          hasCustomUserDataset
                            ? `Open ${pack.name} using your uploaded dataset (${project?.name})`
                            : 'Upload a CSV or Excel dataset first to analyze your own data'
                        }
                        className={`text-[11px] font-medium py-1 px-2 rounded-lg transition-colors ${
                          hasCustomUserDataset
                            ? 'text-secondary hover:text-primary underline underline-offset-4 cursor-pointer'
                            : 'text-muted opacity-75 cursor-not-allowed'
                        }`}
                      >
                        {hasCustomUserDataset
                          ? 'Use my data →'
                          : 'Use my data (upload file first)'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 5 (PART B): ACTIVE PACK DASHBOARD VIEW (Hierarchy: Header + Filters -> Key Insight -> Hero KPIs -> Charts -> Lens & Report Details) */}
      <section
        ref={dashboardSectionRef}
        aria-label={`${activePack.name} Dashboard`}
        data-testid="active-pack-dashboard"
        className="space-y-6 min-w-0 scroll-mt-16"
      >
        {/* Active Pack Header Strip Tinted with Pack Gradient */}
        <div
          className={`depth-card rounded-[20px] border border-subtle p-5 sm:p-6 space-y-4 min-w-0 overflow-hidden ${
            flags.depthUI ? 'pack-dashboard-header' : 'bg-card'
          }`}
        >
          {/* Row 1: Pack Icon + Title + Editable Dataset Name + Grouped Actions Toolbar */}
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                  flags.depthUI ? 'pack-icon-tile' : 'bg-accent-soft text-accent border border-subtle'
                }`}
              >
                <ActiveIcon className="w-6 h-6" />
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <h2
                    ref={dashboardHeadingRef}
                    tabIndex={-1}
                    data-testid="pack-dashboard-heading"
                    className="font-bold uppercase tracking-wider focus:outline-hidden"
                    style={{ color: activePack.theme.gradientFrom }}
                  >
                    {activePack.name}
                  </h2>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span
                    data-testid="pack-active-kpi-badge"
                    className="px-2 py-0.5 rounded-md bg-elevated border border-subtle text-primary font-bold tabular-nums"
                  >
                    {availableKpiCount}/{dashboard.computedKpis.length} KPIs Active
                  </span>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span className="text-secondary tabular-nums">
                    {activeRows.length.toLocaleString()} Rows
                  </span>
                </div>

                <EditableDashboardTitle />
              </div>
            </div>

            {/* Grouped Action Toolbar (Switch Pack + Map Columns + Template + Ask AI + Download) */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-elevated border border-subtle shrink-0 self-start">
              <label htmlFor="pack-selector-select" className="sr-only">
                Switch Analytics Pack
              </label>
              <select
                id="pack-selector-select"
                aria-label="Switch Analytics Pack"
                data-testid="pack-selector-select"
                value={activePack.id}
                onChange={e => handleSwitchPack(e.target.value)}
                className="h-9 max-w-[200px] rounded-xl bg-card border border-subtle px-2.5 text-xs font-semibold text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
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
                className="h-9 px-3 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1.5 cursor-pointer transition-colors pack-btn-press"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
                <span>Map Columns</span>
              </button>

              <button
                type="button"
                data-testid="pack-download-template-btn"
                onClick={() => handleDownloadTemplate(activePack)}
                className="h-9 px-3 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1.5 cursor-pointer transition-colors pack-btn-press"
              >
                <Download className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
                <span>Template</span>
              </button>

              <button
                type="button"
                data-testid="pack-ask-ai-btn"
                onClick={handleAskAiAboutPack}
                className="h-9 px-3 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer transition-opacity pack-btn-press"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>

              <DownloadMenu context="analytics_pack" packId={activePack.id} label="Download" compact />
            </div>
          </div>

          {/* Full-width body font dataset/pack description with 2-line clamp and "more" toggle (Phase 1.1 & 1.2) */}
          <div className="w-full flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <p
              data-testid="pack-header-description"
              className={`w-full font-sans text-xs sm:text-sm text-secondary leading-relaxed ${
                isDescExpanded ? '' : 'line-clamp-2'
              }`}
            >
              {activePack.description}
            </p>
            <button
              type="button"
              data-testid="pack-description-more-btn"
              onClick={() => setIsDescExpanded(prev => !prev)}
              className="text-xs font-semibold text-accent hover:underline shrink-0 self-start cursor-pointer"
            >
              {isDescExpanded ? 'less' : 'more'}
            </button>
          </div>

          {/* Row 2: Segmented Pill Lens Control in Header + Tidy 1-Row Filter Bar */}
          <div className="pt-3 border-t border-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Segmented Pill Lens Control with Active Pill Indicator */}
            <div
              data-testid="pack-header-lens-pills"
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-elevated border border-subtle self-start"
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
                    className={`h-8 px-3.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer pack-btn-press ${
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

            {/* Tidy 1-Row Filter Bar (Search + Category Filter + Date Range + Clear-all chip) */}
            <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-end">
              <div className="relative flex-1 sm:flex-initial sm:w-56 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Filter pack records"
                  placeholder="Filter rows by keyword..."
                  value={filters.searchQuery || ''}
                  onChange={e => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="w-full h-10 pl-8 pr-3 rounded-xl bg-input border border-subtle text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              {primaryCategoryCol && dimensionValues.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-muted shrink-0 hidden sm:inline" />
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
                    className="h-10 rounded-xl bg-input border border-subtle px-3 text-xs text-primary focus:outline-hidden cursor-pointer"
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

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted shrink-0 hidden sm:inline" />
                <select
                  aria-label="Filter by date range window"
                  data-testid="pack-date-range-select"
                  value={dateWindowFilter}
                  onChange={e => setDateWindowFilter(e.target.value as 'all' | 'recent3' | 'recentHalf')}
                  className="h-10 rounded-xl bg-input border border-subtle px-3 text-xs text-primary focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All periods ({baseActiveRows.length})</option>
                  <option value="recentHalf">Latest 50% periods</option>
                  <option value="recent3">Latest 3 periods</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  data-testid="pack-clear-filters-chip"
                  onClick={() => {
                    clearAllSlicers();
                    setDateWindowFilter('all');
                  }}
                  className="h-10 px-3 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-secondary hover:text-primary inline-flex items-center gap-1.5 cursor-pointer pack-btn-press"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear all</span>
                </button>
              )}
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
                      ? `Ready to analyze ${activePack.name} — open with sample data or map your file`
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
                  onClick={() => handleTrySampleData(activePack, { collapseCatalog: false })}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer pack-btn-press"
                >
                  Open with sample data
                </button>
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(true)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary transition-colors cursor-pointer pack-btn-press"
                >
                  Map Columns
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(activePack)}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary transition-colors cursor-pointer pack-btn-press"
                >
                  Download data template
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SKELETON SHIMMER WHILE COMPUTING */}
        {isProcessing && (
          <div
            data-testid="pack-loading-skeleton"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className="h-32 rounded-[20px] border border-subtle pack-skeleton-shimmer"
              />
            ))}
          </div>
        )}

        {/* 1. HIGHLIGHTED "KEY INSIGHT" HERO CARD FIRST (Part B: highlighted numbers + "View why" link) */}
        {dashboard.executiveNarrative && dashboard.executiveNarrative.length > 0 && (
          <div
            data-testid="pack-key-insight-card"
            className="pack-insight-banner rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 pack-icon-tile">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="font-bold uppercase tracking-wider" style={{ color: activePack.theme.gradientFrom }}>
                    Key Insight
                  </span>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span className="text-secondary">
                    Synthesized across {activeRows.length.toLocaleString()} records
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-primary leading-relaxed">
                  {renderHighlightedNarrative(dashboard.executiveNarrative[0], activePack.theme.gradientFrom)}
                </p>
                {dashboard.executiveNarrative[1] && (
                  <p className="text-xs text-secondary leading-relaxed">
                    {renderHighlightedNarrative(dashboard.executiveNarrative[1], activePack.theme.gradientFrom)}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              data-testid="pack-insight-view-why-btn"
              onClick={handleViewWhyDiagnostic}
              className="self-start sm:self-center shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-bold text-primary inline-flex items-center gap-1.5 cursor-pointer transition-colors pack-btn-press"
            >
              <span>View why</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: activePack.theme.gradientFrom }} />
            </button>
          </div>
        )}

        {/* 2. KPI SCORECARD (4 Big Hero KPIs First + Remaining KPIs in Compact Grid) */}
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

        {/* 3. DOMAIN VISUALIZATIONS GRID (Glass Panels + Pack Palette + Insight Subtitle) */}
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
                  className={`depth-card rounded-[20px] border border-subtle p-4 sm:p-5 space-y-4 min-w-0 overflow-hidden ${
                    flags.depthUI ? 'pack-chart-panel' : 'bg-card'
                  }`}
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

        {/* 4. 4-LENS ANALYTICAL DIAGNOSTICS (Structured Cards with Icon, Headline Finding & Recommended Action) */}
        <div
          ref={lensSectionRef}
          className="depth-card rounded-[20px] bg-card border border-subtle p-5 sm:p-6 space-y-5 scroll-mt-16"
        >
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
                {LENS_META[activeLens].question} — {LENS_META[activeLens].actionText}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className="px-2.5 py-1 rounded-lg bg-elevated border border-subtle font-bold uppercase"
                style={{ color: activePack.theme.gradientFrom }}
              >
                Active Lens: {LENS_META[activeLens].label}
              </span>
            </div>
          </div>

          {/* Active Lens Finding Card + Interactive Evidence Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" data-testid={`pack-lens-content-${activeLens}`}>
            {/* Left Card: Icon + Headline Finding + Domain Evidence + Recommended Action */}
            <div className="p-4 sm:p-5 rounded-2xl bg-elevated border border-subtle flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 pack-icon-tile">
                      {React.createElement(LENS_META[activeLens].Icon, { className: 'w-4 h-4' })}
                    </div>
                    <div>
                      <h3 className="font-heading text-sm font-bold text-primary capitalize">
                        {activePack.name} — {activeLens} Lens
                      </h3>
                      <div className="text-[11px] text-secondary">
                        {LENS_META[activeLens].question}
                      </div>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-card border border-subtle shrink-0"
                    style={{ color: activePack.theme.gradientFrom }}
                  >
                    {activeLens}
                  </span>
                </div>

                <ul className="space-y-2 pt-1">
                  {lensBullets.map((b: string, idx: number) => (
                    <li key={idx} className="text-xs text-primary flex items-start gap-2 leading-relaxed">
                      <CheckCircle2
                        className="w-3.5 h-3.5 shrink-0 mt-0.5"
                        style={{ color: activePack.theme.gradientFrom }}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-subtle flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-[11px] text-secondary">
                  Recommended Action: <strong className="text-primary">{LENS_META[activeLens].actionText}</strong>
                </span>
              </div>
            </div>

            {/* Right Card: Interactive Technique Widget matching the active lens */}
            <div className="p-4 sm:p-5 rounded-2xl bg-elevated border border-subtle space-y-3">
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
                      Open with sample data or map a category and numeric column to compute 80/20 Pareto concentration.
                    </p>
                  )}
                </div>
              )}

              {activeLens === 'diagnostic' && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider font-mono">
                    Outlier &amp; Variance Diagnostics
                  </div>
                  {anomalySummary ? (
                    <p className="text-xs text-secondary">{anomalySummary.summary}</p>
                  ) : (
                    <p className="text-xs text-secondary">
                      Open with sample data or map numeric columns to run Z-score and IQR outlier diagnostics.
                    </p>
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
                      Open with sample data or map a date and numeric metric column to compute 3-period trend projections.
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

        {/* 5. AUTO-GENERATED PACK EXECUTIVE REPORT SECTIONS */}
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
            <span className="text-xs font-mono text-secondary">
              Use the top <strong className="text-primary">Download</strong> button to export PDF, PPTX, or ZIP bundles
            </span>
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
