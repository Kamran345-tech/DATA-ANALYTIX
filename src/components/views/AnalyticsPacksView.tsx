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
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { useToast } from '../../store/useToast';
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
  AnalyticsPackConfig,
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
  const [showCatalogGrid, setShowCatalogGrid] = useState<boolean>(true);
  const [activeLens, setActiveLens] = useState<PackLensKey>('descriptive');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [mappingGeneration, setMappingGeneration] = useState<number>(0);

  // What-If interactive sliders
  const [priceDelta, setPriceDelta] = useState<number>(5);
  const [volumeDelta, setVolumeDelta] = useState<number>(8);
  const [costDelta, setCostDelta] = useState<number>(-3);
  const [churnDelta, setChurnDelta] = useState<number>(-1);

  const activePack = useMemo<AnalyticsPackConfig>(
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

  const handleTrySampleData = (pack: AnalyticsPackConfig) => {
    const sampleRows = pack.sampleDataset();
    setActivePackId(pack.id);
    ingestDatasetFromRows(`${pack.name} Sample Dataset`, sampleRows, {
      connectionType: 'PACK_SAMPLE',
      database: pack.name,
    });
    addToast({
      type: 'success',
      title: `${pack.name} Sample Loaded`,
      message: `Loaded ${sampleRows.length} domain records and built KPIs & charts.`,
    });
  };

  const handleOpenPack = (pack: AnalyticsPackConfig) => {
    setActivePackId(pack.id);
  };

  const handleDownloadTemplate = (pack: AnalyticsPackConfig = activePack) => {
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

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto space-y-8 pb-20 animate-fadeIn overflow-x-hidden" data-testid="analytics-packs-view">
      {/* Top Hero / Catalog Header */}
      <div className="depth-card rounded-[20px] bg-card border border-subtle p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-soft text-accent text-[11px] font-mono font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>14 Domain-Driven Analytics Packs</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              Analytics Packs &amp; Domain Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-secondary max-w-3xl">
              Every analytics domain gets its own auto-built dashboard, KPIs, 4-lens diagnostics, and executive report from a single declarative pack configuration.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCatalogGrid(prev => !prev)}
              data-testid="toggle-pack-catalog-btn"
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-subtle bg-elevated hover:bg-card-hover text-xs font-semibold text-primary flex items-center gap-2 cursor-pointer transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-accent" />
              <span>{showCatalogGrid ? 'Hide Pack Catalog (14)' : 'Browse All 14 Packs'}</span>
            </button>

            <DownloadMenu context="analytics_pack" packId={activePack.id} label="Export Pack" />
          </div>
        </div>

        {/* Auto-Detection Banner for Current Dataset */}
        {detectedMatches.length > 0 && cleanRows.length > 0 && (
          <div
            data-testid="pack-auto-detect-banner"
            className="p-3.5 rounded-xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-accent shrink-0" />
              <div className="text-xs text-primary min-w-0">
                <span className="font-semibold">
                  Looks like {detectedMatches[0].packName} data ({detectedMatches[0].confidence}%)
                </span>
                <span className="text-secondary ml-2 hidden sm:inline">
                  Top matches:{' '}
                  {detectedMatches
                    .slice(0, 3)
                    .map(m => `${m.packName} (${m.confidence}%)`)
                    .join(' · ')}
                </span>
              </div>
            </div>
            {detectedMatches[0].packId !== activePack.id && (
              <button
                type="button"
                onClick={() => setActivePackId(detectedMatches[0].packId)}
                className="min-h-[40px] px-3 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                Switch to {detectedMatches[0].packName}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 14-Pack Catalog Grid */}
      {showCatalogGrid && (
        <section aria-label="Analytics Packs Catalog" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-secondary">
              Select an Analytics Pack ({ANALYTICS_PACKS.length} Domains)
            </h2>
            <span className="text-xs font-mono text-muted">
              Active: {activePack.name}
            </span>
          </div>

          <div
            data-testid="analytics-packs-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {ANALYTICS_PACKS.map(pack => {
              const Icon = PACK_ICON_MAP[pack.icon] || Layers;
              const isSelected = pack.id === activePack.id;
              return (
                <div
                  key={pack.id}
                  data-testid={`pack-card-${pack.id}`}
                  className={`depth-card rounded-[20px] p-5 border flex flex-col justify-between gap-4 transition-all min-w-0 overflow-hidden ${
                    isSelected
                      ? 'bg-card border-[var(--accent)] shadow-md'
                      : 'bg-card border-subtle hover:border-strong'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent border border-subtle flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-elevated text-secondary border border-subtle">
                        {pack.kpis.length} KPIs
                      </span>
                    </div>

                    <h3
                      title={pack.name}
                      className="font-heading text-base font-bold text-primary line-clamp-1"
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

                  <div className="pt-3 border-t border-subtle flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid={`pack-sample-btn-${pack.id}`}
                      onClick={() => handleTrySampleData(pack)}
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer text-center"
                    >
                      Try with sample data
                    </button>
                    <button
                      type="button"
                      data-testid={`pack-open-btn-${pack.id}`}
                      onClick={() => handleOpenPack(pack)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-elevated hover:bg-card-hover text-primary border border-subtle text-xs font-semibold transition-colors cursor-pointer"
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

      {/* Generic Active Pack Dashboard View */}
      <section
        aria-label={`${activePack.name} Dashboard`}
        data-testid="active-pack-dashboard"
        className="space-y-6 min-w-0"
      >
        {/* Active Pack Header */}
        <div className="depth-card rounded-[20px] bg-card border border-subtle p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 min-w-0">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-accent-soft text-accent border border-subtle flex items-center justify-center shrink-0 mt-0.5">
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent">
                    {activePack.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-elevated text-secondary border border-subtle">
                    {availableKpiCount}/{dashboard.computedKpis.length} KPIs Active
                  </span>
                </div>

                <EditableDashboardTitle />

                <p className="text-xs text-secondary break-words">
                  {activePack.description} · Dataset: <span className="font-mono text-primary">{project.name}</span> ({activeRows.length.toLocaleString()} rows)
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
                className="min-h-[40px] max-w-full rounded-xl bg-elevated border border-subtle px-3 py-2 text-xs font-semibold text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
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
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                <span>Map Columns</span>
              </button>

              <button
                type="button"
                data-testid="pack-download-template-btn"
                onClick={() => handleDownloadTemplate(activePack)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-primary flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-accent" />
                <span>Download data template</span>
              </button>

              <button
                type="button"
                data-testid="pack-ask-ai-btn"
                onClick={handleAskAiAboutPack}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-opacity"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI about this pack</span>
              </button>
            </div>
          </div>

          {/* Empty / Partial Data State Banner */}
          {(cleanRows.length === 0 || missingReqRoles.length > 0) && (
            <div
              data-testid="pack-missing-roles-banner"
              className="p-4 rounded-xl bg-elevated border border-subtle flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-bold text-primary">
                    {cleanRows.length === 0
                      ? 'No dataset rows loaded — showing pack schema & template'
                      : `Partial role mapping: ${missingReqRoles.length} required role(s) unmapped`}
                  </div>
                  <p className="text-xs text-secondary">
                    {missingReqRoles.length > 0
                      ? `Missing required roles: ${missingReqRoles.join(', ')}. Map your columns or download the pack CSV template.`
                      : 'Load the curated sample dataset or download the CSV template with role headers.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTrySampleData(activePack)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-accent text-on-accent text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Try with sample data
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate(activePack)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-card hover:bg-card-hover border border-subtle text-xs font-semibold text-primary transition-colors cursor-pointer"
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
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl bg-input border border-subtle text-xs text-primary focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)]"
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
                  className="min-h-[40px] rounded-xl bg-input border border-subtle px-3 py-1.5 text-xs text-primary focus:outline-hidden"
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
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-elevated hover:bg-card-hover border border-subtle text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Row (Generic Renderer using ModernKpiCard) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-secondary">
              Domain Key Performance Indicators ({dashboard.computedKpis.length})
            </h2>
            <span className="text-xs font-mono text-muted">
              Click any available KPI to inspect records
            </span>
          </div>

          <div
            data-testid="pack-kpi-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {dashboard.computedKpis.map(k => (
              <ModernKpiCard
                key={k.id}
                goodDirection={k.goodDirection}
                unavailable={k.status === 'unavailable'}
                unavailableReason={k.reason}
                unavailableHint={k.hint}
                sparklineData={k.sparkline}
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
                  calculation: k.description,
                  aggregation: 'sum',
                  definition: k.description,
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

        {/* 4 Analytical Lenses Tabs: Descriptive / Diagnostic / Predictive / Prescriptive */}
        <div className="depth-card rounded-[20px] bg-card border border-subtle p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-subtle pb-4">
            <div>
              <h2 className="font-heading text-base font-bold text-primary uppercase tracking-wide">
                4-Lens Analytical Diagnostics
              </h2>
              <p className="text-xs text-secondary">
                Switch between Descriptive, Diagnostic, Predictive, and Prescriptive intelligence for {activePack.name}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Analytical Lenses">
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
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-accent text-on-accent shadow-xs'
                        : 'bg-elevated text-secondary hover:text-primary border border-subtle'
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
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-accent-soft text-accent font-bold">
                  {activeLens}
                </span>
              </div>
              <ul className="space-y-2 pt-1">
                {lensBullets.map((b: string, idx: number) => (
                  <li key={idx} className="text-xs text-primary flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
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
                          <div key={item.name} className="flex items-center justify-between text-xs font-mono">
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
                        <div key={`${row.label}-${idx}`} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-primary truncate max-w-[160px]">{row.label}</span>
                          <span className={row.isFavorable ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
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
                            <div className="text-xs font-bold font-mono text-primary mt-0.5">
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
                    <span className="text-xs font-mono font-bold text-accent">
                      Net Δ: {whatIfSummary.netDeltaPct >= 0 ? '+' : ''}
                      {whatIfSummary.netDeltaPct.toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="space-y-1">
                      <span className="flex justify-between font-mono text-[11px] text-secondary">
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
                      <span className="flex justify-between font-mono text-[11px] text-secondary">
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
                      <span className="flex justify-between font-mono text-[11px] text-secondary">
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
                      <span className="flex justify-between font-mono text-[11px] text-secondary">
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

                  <p className="text-[11px] font-mono text-secondary">{whatIfSummary.summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              <span>Domain Visualizations ({dashboard.charts.length})</span>
            </h2>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-sm font-bold text-primary truncate" title={chart.title}>
                        {chart.title}
                      </h3>
                      <p className="text-[11px] font-mono text-secondary truncate">
                        {valField} by {catField} ({agg.toUpperCase()})
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
              <FileText className="w-5 h-5 text-accent" />
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
                <ul className="space-y-1 text-xs font-mono text-primary">
                  {sec.kpiSummaries.slice(0, 4).map((ks) => (
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
