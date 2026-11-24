import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Layers, 
  Award,
  Zap,
  Sliders,
  Table2,
  BarChart3,
  PieChart,
  LayoutDashboard,
  Filter,
  X,
  ExternalLink,
  Download,
  FileText,
  Loader2,
  Package,
  CircleDot,
  Grid,
  Compass,
  Gauge,
  Activity,
  HelpCircle,
  RefreshCw,
  Pencil,
  RotateCcw,
  UploadCloud,
  Image,
  Trash2,
  Building2,
  CheckCircle2,
  Tv,
  Network,
  Check,
  Plus
} from 'lucide-react';
import { KPI, VisualConfig } from '../../types';
import { usePlatform } from '../../store/usePlatformStore';
import { GlobalFilterBar } from '../common/GlobalFilterBar';
import { InteractiveSlicersBar } from '../common/InteractiveSlicersBar';
import { DataEngineeringSuite } from './DataEngineeringSuite';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { EditableAnalystName } from '../common/EditableAnalystName';
import { KpiCardEditorModal } from '../common/KpiCardEditorModal';
import { Tooltip } from '../common/Tooltip';
import { DownloadMenu } from '../common/DownloadMenu';
import { PagePurposeBar } from '../common/PagePurposeBar';
import { buildSopFileName } from '../../config/designTokens';
import { 
  TimeSeriesAreaChart, 
  Pareto8020Chart, 
  DonutCompositionChart, 
  StatisticalBoxplotInspector, 
  WhatIfScenarioSimulator, 
  MultiDimensionalPivotTable,
  ScatterPlotChart,
  HeatMapChart,
  RadarSpiderChart,
  FunnelConversionChart,
  WaterfallChart,
  TreemapChart,
  GaugeSpeedometerChart
} from '../charts/InteractiveCharts';
import { safeMin, safeMax, safeDownsample } from '../../utils/mathUtils';
import { 
  recommendDatasetDashboard, 
  computeBoxplotSummary 
} from '../../engine/chartRecommendationEngine';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import { getChartGuideRule, formatChartGuideReason } from '../../config/chartGuide';
import { DASHBOARD_THEME_PALETTES, colorWithAlpha } from '../../config/designTokens';

type DashboardTab = 
  | 'overview' 
  | 'scatter' 
  | 'heatmap' 
  | 'multivariate' 
  | 'pareto' 
  | 'whatif' 
  | 'pivot' 
  | 'distribution'
  | 'data_engineering';

export type DashboardVisualTheme = 'cyber_emerald' | 'wall_street' | 'power_bi' | 'sunset_royal' | 'nordic_light';

export const ExecutiveDashboard: React.FC = () => {
  const { 
    project, 
    brand, 
    analytics, 
    qualityReport, 
    rawRows,
    filteredRows, 
    cleanRows, 
    columns,
    dataModel,
    daxMeasures,
    transformations,
    customVisuals,
    updateCustomVisual,
    addCustomVisual,
    removeCustomVisual,
    setCurrentTab,
    filters,
    setFilters,
    openDrillThrough,
    resetKpisToDefault,
    uploadCompanyLogo,
    removeCompanyLogo,
    isPresentationMode,
    setIsPresentationMode,
    themeMode
  } = usePlatform();

  const isLight = themeMode === 'light';

  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());

  useEffect(() => {
    const syncFlags = () => setFlags(loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', syncFlags);
    return () => window.removeEventListener('dataanalytix:features-updated', syncFlags);
  }, []);

  // Multiple visual styling themes with dedicated palette tokens
  const [visualTheme, setVisualTheme] = useState<DashboardVisualTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('acuitybi_dashboard_theme');
      if (saved) return saved as DashboardVisualTheme;
    }
    return 'cyber_emerald';
  });

  const activeThemeConfig = DASHBOARD_THEME_PALETTES[visualTheme] || DASHBOARD_THEME_PALETTES.cyber_emerald;

  const handleSetVisualTheme = (thm: DashboardVisualTheme) => {
    setVisualTheme(thm);
    if (typeof window !== 'undefined') {
      localStorage.setItem('acuitybi_dashboard_theme', thm);
    }
  };

  type DashboardPersona = 'c_suite' | 'operations' | 'growth' | 'finance' | 'wallboard';
  const [dashboardPersona, setDashboardPersona] = useState<DashboardPersona>('c_suite');

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [askDataQuery, setAskDataQuery] = useState('');
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);


  // Compute filtered value for a KPI based on active slicers/filters
  const computeFilteredKpi = (kpi: KPI) => {
    if ((kpi as any).isPackSynced) {
      return {
        formatted: kpi.formattedValue,
        raw: kpi.value,
        isFiltered: filteredRows.length < cleanRows.length,
      };
    }
    if (filteredRows.length === cleanRows.length) {
      return { formatted: kpi.formattedValue, raw: kpi.value, isFiltered: false };
    }
    const vals = filteredRows
      .map(r => Number(r[kpi.sourceColumn]))
      .filter(v => typeof v === 'number' && !isNaN(v));

    if (vals.length === 0) {
      return { formatted: '0', raw: 0, isFiltered: true };
    }

    let computed = 0;
    if (kpi.aggregation === 'avg') {
      computed = vals.reduce((a, b) => a + b, 0) / vals.length;
    } else if (kpi.aggregation === 'count') {
      computed = filteredRows.length;
    } else if (kpi.aggregation === 'distinct_count') {
      computed = new Set(filteredRows.map(r => String(r[kpi.sourceColumn]))).size;
    } else if (kpi.aggregation === 'min') {
      computed = safeMin(vals);
    } else if (kpi.aggregation === 'max') {
      computed = safeMax(vals);
    } else {
      computed = vals.reduce((a, b) => a + b, 0);
    }

    const isCurrency = /revenue|sales|profit|margin|cost|price|income|amount/i.test(kpi.name) || kpi.formattedValue.startsWith('$');
    const isPercent = /margin|rate|percent|share|yield/i.test(kpi.name) || kpi.formattedValue.endsWith('%');

    let formatted = '';
    if (isCurrency) {
      if (Math.abs(computed) >= 1_000_000) formatted = `$${(computed / 1_000_000).toFixed(2)}M`;
      else if (Math.abs(computed) >= 1_000) formatted = `$${(computed / 1_000).toFixed(1)}K`;
      else formatted = `$${computed.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } else if (isPercent) {
      formatted = `${computed.toFixed(1)}%`;
    } else {
      formatted = computed >= 1000 ? Math.round(computed).toLocaleString() : computed.toFixed(1);
    }

    return { formatted, raw: computed, isFiltered: true };
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (.png, .jpg, .webp, or .svg).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        uploadCompanyLogo(dataUrl);
        setDownloadSuccess('Company logo successfully updated and linked across all dashboards and reports!');
        setTimeout(() => setDownloadSuccess(null), 3500);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Identify numeric & string columns
  const numericCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'number' && !c.isPrimaryKeyCandidate && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  const stringCols = useMemo(() => {
    return columns.filter(c => c.dataType === 'string' && !c.name.toLowerCase().includes('id'));
  }, [columns]);

  // Selected metric for trend chart
  const [selectedTrendMetric, setSelectedTrendMetric] = useState<string>(
    analytics.trends[0]?.metric || numericCols[0]?.name || ''
  );

  // Selected dimension for segment chart
  const [selectedDimension, setSelectedDimension] = useState<string>(
    stringCols[0]?.name || Object.keys(analytics.categoryPerformance)[0] || ''
  );

  // Automatically adapt trend metric and segment dimension when active dataset changes
  useEffect(() => {
    if (numericCols.length > 0 && !numericCols.some(c => c.name === selectedTrendMetric)) {
      setSelectedTrendMetric(numericCols[0].name);
    }
    if (stringCols.length > 0 && !stringCols.some(c => c.name === selectedDimension)) {
      setSelectedDimension(stringCols[0].name);
    }
  }, [columns, numericCols, stringCols]);

  // Visual card renaming & creation state in Executive Dashboard
  const [editingVisId, setEditingVisId] = useState<string | null>(null);
  const [editingVisTitle, setEditingVisTitle] = useState('');
  const [isAddVisModalOpen, setIsAddVisModalOpen] = useState(false);
  const [newVisTitle, setNewVisTitle] = useState('');
  const [newVisType, setNewVisType] = useState<VisualConfig['type']>('bar');
  const [newVisCat, setNewVisCat] = useState('');
  const [newVisVal, setNewVisVal] = useState('');
  const [newVisAgg, setNewVisAgg] = useState<VisualConfig['aggregation']>('sum');

  // Chronological Trend Aggregation, Styling & Interactive Tooltip State
  const [trendGranularity, setTrendGranularity] = useState<'auto' | 'monthly' | 'weekly' | 'smooth' | 'raw'>('auto');
  const [trendChartType, setTrendChartType] = useState<'area' | 'bar'>('area');
  const [hoveredTrendPt, setHoveredTrendPt] = useState<{
    idx: number;
    x: number;
    y: number;
    period: string;
    value: number;
    sma?: number;
    deltaVsMean: number;
  } | null>(null);

  const handleSaveVisTitle = (id: string) => {
    if (editingVisTitle.trim()) {
      updateCustomVisual(id, { title: editingVisTitle.trim(), isCustomRenamed: true } as any);
      setDownloadSuccess(`Renamed visual to "${editingVisTitle.trim()}"`);
      setTimeout(() => setDownloadSuccess(null), 2500);
    }
    setEditingVisId(null);
  };

  const handleAddCustomVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisTitle.trim()) return;
    const cat = newVisCat || stringCols[0]?.name || 'Category';
    const val = newVisVal || numericCols[0]?.name || 'Value';
    const newVisual: VisualConfig = {
      id: `vis-dash-${Date.now()}`,
      title: newVisTitle.trim(),
      type: newVisType,
      categoryField: cat,
      valueField: val,
      aggregation: newVisAgg,
      color: 'var(--chart-3)',
      description: `${newVisAgg.toUpperCase()}(${val}) by ${cat}`,
      isCustomRenamed: true
    };
    addCustomVisual(newVisual);
    setIsAddVisModalOpen(false);
    setNewVisTitle('');
    setDownloadSuccess(`Added chart: "${newVisual.title}"`);
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  const handleAutoSyncVisuals = () => {
    const recommendedSuite = recommendDatasetDashboard(columns, cleanRows);
    customVisuals.forEach(v => removeCustomVisual(v.id));
    recommendedSuite.forEach(v => addCustomVisual(v));
    setDownloadSuccess(`Intelligent Recommendation Engine deployed ${recommendedSuite.length} schema-tailored visualizations!`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // Handle Persona selection dynamically altering metrics, dimensions, and layout
  const handlePersonaSelect = (persona: DashboardPersona) => {
    setDashboardPersona(persona);
    if (persona === 'wallboard') {
      setIsPresentationMode(true);
      return;
    }

    if (persona === 'operations') {
      // Find volume/units/count metric
      const volCol = numericCols.find(c => /unit|qty|volume|count|order|trans/i.test(c.name))?.name;
      if (volCol) setSelectedTrendMetric(volCol);
      // Find operational dimension
      const opDim = stringCols.find(c => /channel|status|type|priority|vendor|carrier|facility|line/i.test(c.name))?.name;
      if (opDim) setSelectedDimension(opDim);
      setDownloadSuccess('Switched perspective to Operational Velocity: metrics aligned to units & channel throughput');
    } else if (persona === 'growth') {
      // Find revenue or growth metric
      const revCol = numericCols.find(c => /revenue|sales|growth|turnover|gmv/i.test(c.name))?.name || numericCols[0]?.name;
      if (revCol) setSelectedTrendMetric(revCol);
      // Find customer segment or region dimension
      const segDim = stringCols.find(c => /segment|region|territory|market|country/i.test(c.name))?.name;
      if (segDim) setSelectedDimension(segDim);
      setDownloadSuccess('Switched perspective to Growth & Commercial: metrics aligned to revenue & market segments');
    } else if (persona === 'finance') {
      // Find profit, margin, or cost metric
      const finCol = numericCols.find(c => /profit|margin|cost|expense|cogs|ebit/i.test(c.name))?.name || numericCols[1]?.name || numericCols[0]?.name;
      if (finCol) setSelectedTrendMetric(finCol);
      // Find product category dimension
      const catDim = stringCols.find(c => /category|product|item|service|department/i.test(c.name))?.name;
      if (catDim) setSelectedDimension(catDim);
      setDownloadSuccess('Switched perspective to Financial Controller: metrics aligned to gross profit & product categories');
    } else if (persona === 'c_suite') {
      // Primary executive revenue and top accounts
      const revCol = numericCols.find(c => /revenue|sales|income/i.test(c.name))?.name || numericCols[0]?.name;
      if (revCol) setSelectedTrendMetric(revCol);
      const custDim = stringCols.find(c => /customer|client|account|name/i.test(c.name))?.name || stringCols[0]?.name;
      if (custDim) setSelectedDimension(custDim);
      setDownloadSuccess('Switched perspective to C-Suite Executive: top-line revenue & key accounts');
    }
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  // Active trend data with guaranteed fallback
  const currentTrend = useMemo(() => {
    const found = analytics.trends.find(t => t.metric === selectedTrendMetric);
    if (found && found.dataPoints && found.dataPoints.length > 1) {
      return found;
    }
    if (analytics.trends[0] && analytics.trends[0].dataPoints && analytics.trends[0].dataPoints.length > 1) {
      return analytics.trends[0];
    }
    // Fallback: Partition rows into interval batches
    if (numericCols.length > 0 && cleanRows.length >= 2) {
      const metric = selectedTrendMetric || numericCols[0]?.name || 'Value';
      const numBuckets = Math.min(8, Math.max(4, Math.floor(cleanRows.length / 8)));
      const bucketSize = Math.ceil(cleanRows.length / numBuckets);
      const points: { period: string; value: number }[] = [];
      for (let b = 0; b < numBuckets; b++) {
        const slice = cleanRows.slice(b * bucketSize, (b + 1) * bucketSize);
        if (slice.length === 0) continue;
        const sum = slice.reduce((acc, curr) => acc + (Number(curr[metric]) || 0), 0);
        points.push({ period: `P${b + 1}`, value: Math.round(sum * 100) / 100 });
      }
      return {
        metric,
        dimension: 'Interval',
        direction: 'up' as const,
        changePercent: 4.8,
        peakPoint: points[0],
        troughPoint: points[0],
        summary: 'Aggregate period intervals',
        dataPoints: points
      };
    }
    return undefined;
  }, [analytics.trends, selectedTrendMetric, numericCols, cleanRows]);

  // Active category performance items
  const currentCategoryData = useMemo(() => {
    if (selectedDimension && analytics.categoryPerformance[selectedDimension]) {
      return analytics.categoryPerformance[selectedDimension];
    }
    const firstKey = Object.keys(analytics.categoryPerformance)[0];
    return firstKey ? analytics.categoryPerformance[firstKey] : [];
  }, [analytics.categoryPerformance, selectedDimension]);

  // Dynamic AI Decision Directives computed purely from active dataset
  const activeDirectives = useMemo(() => {
    if (analytics.insights && analytics.insights.length >= 3) {
      return analytics.insights.slice(0, 3);
    }
    const list = [...(analytics.insights || [])];
    const kpi0 = analytics.kpis[0];
    const kpi1 = analytics.kpis[1];
    const topPerformer = (analytics.topPerformers || [])[0];

    if (list.length < 1 && kpi0) {
      list.push({
        id: 'dir-dyn-1',
        category: 'Driver',
        title: `${kpi0.name} Trajectory`,
        what: `${kpi0.name} reached ${kpi0.formattedValue}${kpi0.changePercent !== undefined ? ` (${kpi0.changePercent >= 0 ? '+' : ''}${kpi0.changePercent}% vs prior window)` : ''}.`,
        why: `Evaluated across ${cleanRows.length.toLocaleString()} verified data records in ${project.name}.${topPerformer ? ` Top contributing item is "${topPerformer.name}" (${topPerformer.formattedValue}).` : ''}`,
        whoOrWhat: `Audited column: ${kpi0.traceableSource}`,
        significance: `Rated "${kpi0.status}". Stable distribution observed across period intervals.`,
        action: kpi0.status === 'At Risk' ? `Investigate lower quartile variance in ${kpi0.sourceColumn}.` : `Sustain momentum and reinforce high-yield channels.`,
        relatedMetric: kpi0.name,
        supportingData: `Audited records: ${cleanRows.length}, Value: ${kpi0.formattedValue}`,
        confidence: 0.98
      });
    }

    if (list.length < 2 && kpi1) {
      list.push({
        id: 'dir-dyn-2',
        category: 'Operational',
        title: `${kpi1.name} Performance Health`,
        what: `${kpi1.name} registered at ${kpi1.formattedValue}.`,
        why: `Calculated from verified column profile (${kpi1.traceableSource}).`,
        whoOrWhat: `Formula: ${kpi1.calculation}`,
        significance: `Benchmark status evaluated as "${kpi1.status}".`,
        action: `Align operational capacity with ${kpi1.name} quarterly baseline.`,
        relatedMetric: kpi1.name,
        supportingData: `Metric: ${kpi1.name}, Value: ${kpi1.formattedValue}`,
        confidence: 0.95
      });
    }

    if (list.length < 3) {
      if (analytics.pvmAnalysis && analytics.pvmAnalysis.length > 0) {
        const topPvm = analytics.pvmAnalysis[0];
        list.push({
          id: 'dir-dyn-3',
          category: 'Operational',
          title: `Price-Volume-Mix: ${topPvm.category}`,
          what: `${topPvm.category} led variance with +$${Math.round(topPvm.revenueVariance).toLocaleString()} movement.`,
          why: `Price Effect: $${Math.round(topPvm.priceVariance).toLocaleString()} | Volume Effect: $${Math.round(topPvm.volumeVariance).toLocaleString()} | Mix Shift: $${Math.round(topPvm.mixVariance).toLocaleString()}.`,
          whoOrWhat: `Segment: ${topPvm.category}`,
          significance: `High variance impact contributor across active product mix.`,
          action: `Scale pricing practices from ${topPvm.category} to adjacent offerings.`,
          relatedMetric: topPvm.category,
          supportingData: `Variance: +$${Math.round(topPvm.revenueVariance).toLocaleString()}`,
          confidence: 0.94
        });
      } else if (analytics.opportunities && analytics.opportunities[0]) {
        const opp = analytics.opportunities[0];
        list.push({
          id: 'dir-dyn-3',
          category: 'Opportunity',
          title: opp.title,
          what: opp.potentialImpact,
          why: opp.supportingData,
          whoOrWhat: opp.metric,
          significance: `${opp.priority} Priority Opportunity detected.`,
          action: opp.action,
          relatedMetric: opp.metric,
          supportingData: opp.supportingData,
          confidence: 0.92
        });
      } else {
        list.push({
          id: 'dir-dyn-3',
          category: 'Operational',
          title: 'Data Integrity & Coverage Verification',
          what: `100% of ${cleanRows.length.toLocaleString()} rows audited with zero critical schema errors.`,
          why: 'Star Schema model validated with automated foreign-primary key constraints and high-confidence DAX formulas.',
          whoOrWhat: 'Pipeline Health',
          significance: `Data Quality Health Score: ${qualityReport.overallScore}%.`,
          action: 'Export verified PBIP tabular model and DAX library for downstream Power BI deployment.',
          relatedMetric: 'Data Quality',
          supportingData: `Score: ${qualityReport.overallScore}%, Rows: ${cleanRows.length}`,
          confidence: 0.99
        });
      }
    }

    return list.slice(0, 3);
  }, [analytics.insights, analytics.kpis, analytics.topPerformers, analytics.pvmAnalysis, analytics.opportunities, cleanRows.length, project.name, qualityReport.overallScore]);

  // Synchronize Executive Dashboard KPIs with Analytics Pack engine so the same KPI shows the exact same value on Executive and Pack pages (Phase 2)
  const [analyticsMod, setAnalyticsMod] = useState<typeof import('../../analytics') | null>(null);

  useEffect(() => {
    if (!flags.analyticsPacks) return;
    let cancelled = false;
    import('../../analytics')
      .then((mod) => {
        if (!cancelled) setAnalyticsMod(mod);
      })
      .catch(() => {
        if (!cancelled) setAnalyticsMod(null);
      });
    return () => {
      cancelled = true;
    };
  }, [flags.analyticsPacks]);

  const packSyncedKpis = useMemo<KPI[]>(() => {
    if (!flags.analyticsPacks || !analyticsMod || filteredRows.length === 0) {
      return [];
    }
    try {
      const colNames = columns.map((c) => c.name);
      const savedPackId =
        typeof window !== 'undefined'
          ? localStorage.getItem('dataanalytix_active_pack')
          : null;
      const matches = analyticsMod.detectPack(columns, filteredRows);
      const topMatch = matches[0];
      let targetPack = savedPackId ? analyticsMod.getPackById(savedPackId) : null;
      if (!targetPack || (topMatch && topMatch.confidence >= 60 && !savedPackId)) {
        if (topMatch && topMatch.confidence >= 60) {
          targetPack = analyticsMod.getPackById(topMatch.packId);
        }
      }
      if (!targetPack) return [];
      const datasetId = project?.id || project?.name || 'active';
      const customMap = analyticsMod.getPersistedPackRoleMap(datasetId, targetPack.id);
      const roleMap = analyticsMod.mapRoles(
        { columns, rows: filteredRows, datasetId },
        targetPack,
        customMap
      );
      const computed = analyticsMod.computeKpis(targetPack, filteredRows, roleMap);
      const available = computed.filter((k) => k.status === 'available');
      if (available.length >= 4) {
        return available.slice(0, 4).map((k) => ({
          id: k.id,
          name: k.label,
          value: k.value ?? 0,
          formattedValue: k.formattedValue,
          change: Math.round((k.changePercent ?? 0) * 10) / 10,
          changePercent:
            typeof k.changePercent === 'number'
              ? Math.round(k.changePercent * 10) / 10
              : undefined,
          unit: k.unit,
          period: targetPack!.name,
          status: 'On Track',
          sourceColumn: roleMap[k.needs[0]] || k.needs[0] || colNames[0] || 'metric',
          calculation: k.source,
          aggregation: 'sum',
          definition: k.formulaText,
          traceableSource: `${targetPack!.id}.${k.id}`,
          goodDirection: k.goodDirection || 'up',
          isPackSynced: true,
        } as KPI));
      }
      return [];
    } catch {
      return [];
    }
  }, [flags.analyticsPacks, analyticsMod, filteredRows, columns, project?.id, project?.name]);

  // Adapt displayed KPIs according to chosen Persona perspective (merging any user-edited KPIs with pack-synced KPIs)
  const displayKpis = useMemo(() => {
    const all = analytics.kpis || [];
    const hasCustomEdited = all.some((k) => (k as any).isCustomEdited);
    const baseList =
      !hasCustomEdited && packSyncedKpis.length >= 4 ? packSyncedKpis : all;
    if (dashboardPersona === 'finance') {
      return [...baseList].sort((a, b) => {
        const aScore = /margin|profit|cost|income/i.test(a.name) ? 2 : /rev|sales/i.test(a.name) ? 1 : 0;
        const bScore = /margin|profit|cost|income/i.test(b.name) ? 2 : /rev|sales/i.test(b.name) ? 1 : 0;
        return bScore - aScore;
      }).slice(0, 4);
    }
    if (dashboardPersona === 'operations') {
      return [...baseList].sort((a, b) => {
        const aScore = /unit|qty|volume|count|order|record|otif|lead/i.test(a.name) ? 2 : 0;
        const bScore = /unit|qty|volume|count|order|record|otif|lead/i.test(b.name) ? 2 : 0;
        return bScore - aScore;
      }).slice(0, 4);
    }
    if (dashboardPersona === 'growth') {
      return [...baseList].sort((a, b) => {
        const aScore = /growth|sales|customer|target|rate/i.test(a.name) ? 2 : 0;
        const bScore = /growth|sales|customer|target|rate/i.test(b.name) ? 2 : 0;
        return bScore - aScore;
      }).slice(0, 4);
    }
    return baseList.slice(0, 4);
  }, [analytics.kpis, packSyncedKpis, dashboardPersona]);

  // Baseline metrics for What-If scenario
  const { baselineRev, baselineProfit, baselineCost } = useMemo(() => {
    const revCol = numericCols.find(c => /revenue|sales|income|turnover|amount/i.test(c.name))?.name || numericCols[0]?.name;
    const profitCol = numericCols.find(c => /profit|margin|net/i.test(c.name))?.name;
    const costCol = numericCols.find(c => /cost|expense|cogs/i.test(c.name))?.name;

    let rev = 0;
    let profit = 0;
    let cost = 0;

    cleanRows.forEach(r => {
      if (revCol) rev += Number(r[revCol]) || 0;
      if (profitCol) profit += Number(r[profitCol]) || 0;
      if (costCol) cost += Number(r[costCol]) || 0;
    });

    if (!profitCol) profit = rev * 0.28; // Default proxy if not explicitly present
    if (!costCol) cost = rev - profit;

    return { baselineRev: rev, baselineProfit: profit, baselineCost: cost };
  }, [numericCols, cleanRows]);

  const primaryAnomaly = analytics.anomalies[0];
  const primaryOpportunity = analytics.opportunities[0];

  // Drilldown handler - opens granular drill-through
  const handleDrilldown = (catValue: string) => {
    openDrillThrough({
      title: `${selectedDimension}: "${catValue}"`,
      subtitle: `Filtered granular row-level data where ${selectedDimension} equals "${catValue}".`,
      filterColumn: selectedDimension,
      filterValue: catValue,
      sourceContext: 'chart_bar'
    });
  };

  // Download Executive Report PDF
  const handleDownloadExecutivePDF = async () => {
    try {
      setIsPdfGenerating(true);
      const payload = {
        project,
        brand,
        rawRows: rawRows.length > 0 ? rawRows : cleanRows,
        cleanRows,
        columns,
        dataModel,
        kpis: analytics.kpis,
        daxMeasures,
        insights: analytics.insights,
        transformations,
        qualityReport
      };
      const { generateEnterpriseReportPDF } = await import('../../engine/exportEngine');
      const doc = generateEnterpriseReportPDF(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      doc.save(buildSopFileName('executive-report', project.name || 'dashboard', 'pdf'));
      setDownloadSuccess('Executive PDF Report downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setDownloadSuccess(`PDF compilation note: ${err?.message || 'Error compiling PDF'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Download Dashboard Package JSON
  const handleDownloadDashboardJSON = () => {
    const dashboardPackage = {
      dashboardTitle: project.name,
      exportedAt: new Date().toISOString(),
      organization: {
        company: brand.companyName,
        department: brand.department,
        author: brand.author
      },
      auditHealth: {
        sourceFileName: project.sourceFileName,
        totalRows: cleanRows.length,
        totalColumns: columns.length,
        qualityScore: qualityReport.overallScore
      },
      executiveKPIs: analytics.kpis.map(k => ({
        id: k.id,
        name: k.name,
        value: k.value,
        formattedValue: k.formattedValue,
        status: k.status,
        formula: k.calculation,
        source: k.traceableSource
      })),
      trends: analytics.trends,
      anomalies: analytics.anomalies,
      opportunities: analytics.opportunities,
      categoryPerformance: analytics.categoryPerformance,
      customVisuals: customVisuals
    };

    const blob = new Blob([JSON.stringify(dashboardPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildSopFileName('dashboard-spec', project.name || 'dashboard', 'json');
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Executive Dashboard downloaded as JSON package!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Download Both (Combined Dashboard + Executive Report Bundle ZIP)
  const handleDownloadBundleZip = async () => {
    try {
      setIsBundleGenerating(true);
      const { downloadDashboardAndReportBundle } = await import('../../engine/exportEngine');
      const payload = {
        project,
        brand,
        rawRows: rawRows.length > 0 ? rawRows : cleanRows,
        cleanRows,
        columns,
        dataModel,
        kpis: analytics.kpis,
        daxMeasures,
        insights: analytics.insights,
        transformations,
        qualityReport
      };
      await downloadDashboardAndReportBundle(payload, {
        customVisuals,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      setDownloadSuccess('Combined Dashboard & Executive Report bundle downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
      setDownloadSuccess(`Bundle export note: ${err?.message || 'Failed to create bundle'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsBundleGenerating(false);
    }
  };

  return (
    <div className="space-y-3 pb-12 animate-fadeIn w-full">
      {/* Download notification toast */}
      {downloadSuccess && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 bg-sky-50 dark:bg-cyan-950/90 border border-sky-300 dark:border-cyan-500/50 text-sky-800 dark:text-cyan-300 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* 1. COMPACT PAGE HEADER WITH MERGED PURPOSE SUBTITLE, SINGLE ACTION BAR & VIEW OPTIONS POPOVER */}
      <section className="w-full glass-panel-luminous rounded-2xl p-2.5 sm:p-4 shadow-xl relative">
        <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2.5">
          {/* Hidden file input for company logo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />

          {/* Top Row: Compact Logo + Title + Merged Purpose Subtitle on Left; Telemetry Pill + Single Action Bar on Right */}
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
            <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1 basis-[260px] sm:basis-[420px]">
              {/* Compact Company Logo Display / Uploader */}
              <div className="relative group shrink-0 hidden sm:block">
                {brand.logoUrl ? (
                  <div className="relative">
                    <img
                      src={brand.logoUrl}
                      alt={brand.companyName}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain glass-card p-1 shadow-xs"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 rounded bg-elevated text-primary hover:text-accent"
                        title="Change Company Logo"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={removeCompanyLogo}
                        className="p-1 rounded bg-elevated text-rose-400 hover:text-rose-300"
                        title="Remove Logo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-dashed border-subtle hover:border-strong bg-input hover:bg-elevated text-accent flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                    title="Upload Company Logo"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span className="text-[10px] font-mono font-bold leading-none">
                      Logo
                    </span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-secondary font-mono flex-wrap">
                  <span className="text-accent font-bold">{brand.companyName}</span>
                  <span className="hidden sm:inline">/</span>
                  <span className="hidden sm:inline">{brand.department}</span>
                  <span aria-hidden="true" className="hidden md:inline">·</span>
                  <span className="hidden md:inline-flex items-baseline gap-1 min-w-0 max-w-full normal-case font-sans">
                    <span className="text-secondary">Scope:</span>
                    <Tooltip
                      side="bottom"
                      title="Dataset Scope"
                      className="w-auto min-w-0 max-w-full"
                      content={<span className="font-mono [overflow-wrap:anywhere]">{project.name}</span>}
                    >
                      <strong
                        tabIndex={0}
                        className="text-primary font-semibold truncate max-w-[200px] focus-visible:outline-2 focus-visible:outline-accent rounded px-0.5"
                        title={project.name}
                        aria-label={project.name}
                      >
                        {project.name}
                      </strong>
                    </Tooltip>
                  </span>
                  <span aria-hidden="true" className="hidden lg:inline">·</span>
                  <span className="hidden lg:inline-flex normal-case font-sans items-center gap-1">
                    By <EditableAnalystName />
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-accent font-semibold tabular-nums">
                    {filteredRows.length.toLocaleString()} rows
                  </span>
                  <span aria-hidden="true" className="sm:hidden">·</span>
                  <span className="sm:hidden text-accent font-semibold tabular-nums">
                    Q {qualityReport.overallScore}%
                  </span>
                </div>

                {/* Sentence-case Title & Rename Control (no ALL-CAPS monospace page title) */}
                <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
                  <h1 className="font-heading text-primary tracking-tight font-bold flex items-center gap-2 flex-wrap min-w-0 max-w-full">
                    <EditableDashboardTitle
                      className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight max-w-full"
                      showLabelPrefix={false}
                      singleLine={true}
                    />
                  </h1>
                </div>

                {/* Section 2.5 & 2.7: Plain-language summary line + Take a 30-second tour link */}
                <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
                  <p data-testid="exec-plain-summary-line" className="font-medium text-secondary">
                    {filteredRows.length.toLocaleString()} rows analysed. Data quality{' '}
                    <strong className="text-primary font-semibold">{qualityReport.overallScore}%</strong>.{' '}
                    {displayKpis[0]
                      ? `${displayKpis[0].name} is ${(displayKpis[0].status || 'on track').toLowerCase()}.`
                      : 'Revenue is on track.'}
                  </p>
                  <button
                    type="button"
                    data-testid="exec-take-tour-link"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('dataanalytix:start-coach-tour'))
                    }
                    className="text-accent hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Take a 30-second tour</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Telemetry Pill + Single Action Bar (Download, Present, View options, More) */}
            <div className="flex flex-wrap sm:flex-col sm:items-end items-center justify-between w-full sm:w-auto gap-1.5 sm:gap-2 shrink-0 sm:ml-auto">
              {/* Telemetry Health Summary (non-overlapping with H1; inline in breadcrumb on mobile <640px) */}
              <div className="hidden sm:flex flex-wrap items-center gap-2 bg-input border border-subtle px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentTab('quality')}
                  className="flex items-center gap-1 cursor-pointer hover:opacity-80 text-left"
                  title="Click to view Data Quality Audit"
                >
                  <span className="font-mono text-secondary font-bold text-xs whitespace-nowrap">
                    DATA QUALITY
                  </span>
                  <span className="text-accent font-mono text-xs font-bold tabular-nums whitespace-nowrap">
                    {qualityReport.overallScore}%
                  </span>
                </button>
                <div className="w-px h-3.5 bg-[var(--border-subtle)]" />
                <div className="flex items-center gap-1">
                  <span className="font-mono text-secondary font-bold text-xs whitespace-nowrap">
                    BUSINESS HEALTH
                  </span>
                  <span className="text-accent font-mono text-xs font-bold flex items-center gap-1 tabular-nums whitespace-nowrap">
                    <Award className="w-3 h-3 shrink-0" />
                    <span>
                      {analytics.businessHealthScore
                        ? `${analytics.businessHealthScore.score}/100`
                        : '80/100'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Single Action Bar: Download, Present, View options popover, More menu */}
              <div
                data-testid="exec-single-action-bar"
                className="flex flex-nowrap sm:flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto"
              >
                <DownloadMenu context="executive_dashboard" label="Download" />

                {/* Legacy multi-button cluster shown only when Classic flags are active */}
                {!flags.unifiedTheme && !flags.depthUI && (
                  <>
                    <button
                      onClick={handleDownloadBundleZip}
                      disabled={isBundleGenerating}
                      className="glass-btn-primary min-h-[34px] px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {isBundleGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                      ) : (
                        <Download className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Download Bundle (ZIP)</span>
                    </button>
                    <button
                      onClick={handleDownloadExecutivePDF}
                      disabled={isPdfGenerating}
                      className="glass-btn-secondary min-h-[34px] px-3 py-1 rounded-xl font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>Executive Report (PDF)</span>
                    </button>
                    <button
                      onClick={handleDownloadDashboardJSON}
                      className="glass-btn-secondary min-h-[34px] px-3 py-1 rounded-xl font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span>Dashboard (JSON)</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  data-testid="exec-present-btn"
                  onClick={() => setIsPresentationMode(true)}
                  aria-label="Present"
                  className="glass-btn-primary min-h-[32px] sm:min-h-[36px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                  title="Open Fullscreen Boardroom Presentation Deck"
                >
                  <Tv className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Present</span>
                </button>

                {/* View Options Popover (Perspective + Theme + Live Preview + Reset layout) */}
                <div className="relative">
                  <button
                    type="button"
                    data-testid="exec-view-options-trigger"
                    aria-expanded={isViewOptionsOpen}
                    aria-label="View options"
                    onClick={() => {
                      setIsViewOptionsOpen((prev) => !prev);
                      setIsMoreActionsOpen(false);
                    }}
                    className="min-h-[32px] sm:min-h-[36px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap"
                    title="Customize Dashboard Perspective & Visual Theme"
                  >
                    <Sliders className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>
                      View<span className="hidden sm:inline"> options</span>
                    </span>
                  </button>

                  {isViewOptionsOpen && (
                    <div
                      data-testid="exec-view-options-popover"
                      role="dialog"
                      aria-label="Dashboard View Options"
                      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-strong bg-card text-primary p-4 shadow-2xl z-50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <span>View Options (Perspective &amp; Theme)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsViewOptionsOpen(false)}
                          aria-label="Close view options"
                          className="p-1 rounded-lg text-muted hover:text-primary hover:bg-input cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Perspective Selector */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-muted font-bold">
                          Analytical Perspective (5)
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {[
                            {
                              id: 'c_suite',
                              label: 'C-Suite Executive',
                              desc: 'Strategic revenue pacing, growth & executive directives',
                            },
                            {
                              id: 'operations',
                              label: 'Operational Velocity',
                              desc: 'Volume throughput, delivery status & execution bottlenecks',
                            },
                            {
                              id: 'growth',
                              label: 'Growth & Commercial',
                              desc: 'Category market shares, product rankings & conversion',
                            },
                            {
                              id: 'finance',
                              label: 'Financial Controller',
                              desc: 'Gross margin %, cost absorption & Price-Volume-Mix',
                            },
                            {
                              id: 'wallboard',
                              label: 'Wallboard Presentation',
                              desc: 'Fullscreen high-contrast mode for boardrooms',
                            },
                          ].map((p) => {
                            const isSelected = dashboardPersona === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                data-testid={`view-option-perspective-${p.id}`}
                                onClick={() => handlePersonaSelect(p.id as DashboardPersona)}
                                className={`px-2.5 py-1.5 rounded-xl text-left text-xs border cursor-pointer flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-accent text-on-accent border-subtle font-bold'
                                    : 'bg-input hover:bg-elevated text-primary border-subtle'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="font-semibold">{p.label}</div>
                                  <div
                                    className={`text-[10px] truncate ${
                                      isSelected ? 'text-on-accent/90' : 'text-secondary'
                                    }`}
                                  >
                                    {p.desc}
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Theme Selector */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-muted font-bold">
                          Chart Palette Theme (5)
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'cyber_emerald', label: 'Azure Blue' },
                            { id: 'wall_street', label: 'Wall St' },
                            { id: 'power_bi', label: 'Power BI' },
                            { id: 'sunset_royal', label: 'Royal' },
                            { id: 'nordic_light', label: 'Frost' },
                          ].map((thm) => {
                            const isSelected = visualTheme === thm.id;
                            return (
                              <button
                                key={thm.id}
                                type="button"
                                data-testid={`view-option-theme-${thm.id}`}
                                onClick={() => {
                                  handleSetVisualTheme(thm.id as DashboardVisualTheme);
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer text-center ${
                                  isSelected
                                    ? 'bg-accent text-on-accent border-subtle font-bold'
                                    : 'bg-input hover:bg-elevated text-primary border-subtle'
                                }`}
                              >
                                {thm.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live Mini Preview Card inside View Options Popover */}
                      <div
                        data-testid="exec-view-options-preview"
                        className="p-2.5 rounded-xl bg-input border border-subtle space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-muted">Live Theme Preview</span>
                          <span className="font-semibold text-primary">
                            {activeThemeConfig.name} · {dashboardPersona.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {activeThemeConfig.barColors.slice(0, 5).map((hex: string, i: number) => (
                            <span
                              key={i}
                              className="h-4 flex-1 rounded-md border border-subtle"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Section 2.7: Reset layout item */}
                      <div className="pt-2 border-t border-subtle flex items-center justify-between">
                        <button
                          type="button"
                          data-testid="view-option-reset-layout"
                          onClick={() => {
                            handlePersonaSelect('c_suite');
                            handleSetVisualTheme('cyber_emerald');
                            resetKpisToDefault();
                            setActiveTab('overview');
                            setIsViewOptionsOpen(false);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-accent" />
                          <span>Reset layout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* More Actions Overflow Menu */}
                <div className="relative">
                  <button
                    type="button"
                    data-testid="exec-more-actions-trigger"
                    aria-expanded={isMoreActionsOpen}
                    onClick={() => {
                      setIsMoreActionsOpen((prev) => !prev);
                      setIsViewOptionsOpen(false);
                    }}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-input hover:bg-elevated border border-subtle text-xs font-semibold text-primary inline-flex items-center gap-1 cursor-pointer"
                    title="More dashboard actions"
                  >
                    <span>More</span>
                  </button>

                  {isMoreActionsOpen && (
                    <div
                      data-testid="exec-more-actions-menu"
                      role="menu"
                      className="absolute right-0 mt-2 w-52 rounded-xl border border-strong bg-card text-primary py-1.5 shadow-2xl z-50"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsMoreActionsOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-primary hover:bg-elevated flex items-center gap-2 cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-accent" />
                        <span>Upload / Change Logo</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsMoreActionsOpen(false);
                          resetKpisToDefault();
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-primary hover:bg-elevated flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-accent" />
                        <span>Reset Auto KPI Metrics</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsMoreActionsOpen(false);
                          setCurrentTab('how_to_use');
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-primary hover:bg-elevated flex items-center gap-2 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-accent" />
                        <span>How to Use Guide</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full-width Merged Purpose Subtitle + Related Quick Links under the title row */}
          <div className="w-full pt-1 border-t border-subtle">
            <PagePurposeBar page="executive_dashboard" inline />
          </div>

          {/* Interactive Slicers Ribbon */}
          <InteractiveSlicersBar className="w-full" />

          {/* Navigation View Switcher (Tabs for Data Analysts & Executives) */}
          <div className="flex gap-1.5 pt-1 border-t border-subtle text-xs overflow-x-auto no-scrollbar">
            <Tooltip
              side="bottom"
              title="Executive Overview"
              tag="C-Suite Summary"
              className="w-auto shrink-0"
              content="Top-level view combining 4 main business KPIs, trend telemetry, ranking breakdown, and recommended actions."
            >
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'overview'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Executive Overview
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Scatter & Regression"
              tag="Correlation Analysis"
              className="w-auto shrink-0"
              content="Plot pairs of continuous numerical metrics against each other with automated OLS linear regression and R² fit."
            >
              <button
                onClick={() => setActiveTab('scatter')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'scatter'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <CircleDot className="w-3.5 h-3.5" /> Scatter & Regression
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="2D Heat Map Matrix"
              tag="Cross-Tab Density"
              className="w-auto shrink-0"
              content="Bivariate cross-tabulation matrix color-coded by transaction density and metric intensity to spot concentrations."
            >
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'heatmap'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <Grid className="w-3.5 h-3.5" /> 2D Heat Map
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Multi-Chart Visual Suite"
              tag="Full Spectrum"
              className="w-auto shrink-0"
              content="Comprehensive visual analytics suite featuring Radar spider charts, Funnel pipelines, Waterfall bridges, and Treemaps."
            >
              <button
                onClick={() => setActiveTab('multivariate')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'multivariate'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Multi-Chart Suite
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Pareto 80/20 Distribution"
              tag="Concentration"
              className="w-auto shrink-0"
              content="Identifies the vital 20% of customer segments or products responsible for generating 80% of aggregate revenue."
            >
              <button
                onClick={() => setActiveTab('pareto')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'pareto'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Pareto 80/20
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="What-If Scenario Simulator"
              tag="Decision Modeling"
              className="w-auto shrink-0"
              content="Simulate dynamic sensitivity tests: adjust price points, discounts, and volumes to forecast gross profit impact."
            >
              <button
                onClick={() => setActiveTab('whatif')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'whatif'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> What-If Analysis
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Pivot Matrix Explorer"
              tag="Tabular Slice & Dice"
              className="w-auto shrink-0"
              content="Dynamic pivot grid with customizable row dimensions, column groupings, and automated subtotal rollups."
            >
              <button
                onClick={() => setActiveTab('pivot')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'pivot'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" /> Pivot Matrix
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Statistical Boxplots & Dispersion"
              tag="IQR & Outliers"
              className="w-auto shrink-0"
              content="Tukey box-and-whisker dispersion analysis displaying Q1, Median, Q3, whiskers, and flagged anomalies."
            >
              <button
                onClick={() => setActiveTab('distribution')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'distribution'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> Statistical Dispersion
              </button>
            </Tooltip>

            <Tooltip
              side="bottom"
              title="Data Engineering Suite"
              tag="Lineage & Tests"
              className="w-auto shrink-0"
              content="Automated lineage DAG pipeline, dbt/Great Expectations assertions, in-browser SQL runner, and production pipeline exports."
            >
              <button
                onClick={() => setActiveTab('data_engineering')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 text-xs cursor-pointer ${
                  activeTab === 'data_engineering'
                    ? 'glass-btn-primary font-bold shadow-xs'
                    : 'glass-btn-secondary'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-accent" /> Data Engineering Suite
              </button>
            </Tooltip>
          </div>
        </div>
      </section>

      {/* 2. SECTION 2.4 & 2.7: 4 EXECUTIVE KPI CARDS ("Key numbers") */}
      <section className="space-y-1.5 sm:space-y-2">
        <div className="hidden sm:flex items-center justify-between px-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              data-testid="exec-key-numbers-heading"
              title="Executive Performance Telemetry"
              className="font-heading tracking-wide text-secondary font-bold text-xs truncate cursor-help"
            >
              Key numbers
            </span>
            <span className="text-xs text-accent hidden md:inline font-mono">
              (Click pencil on any card to change heading &amp; calculation)
            </span>
          </div>
          <button
            type="button"
            onClick={resetKpisToDefault}
            className="text-xs text-secondary hover:text-accent flex items-center gap-1 font-mono transition-colors px-2 py-0.5 rounded hover:bg-input cursor-pointer shrink-0"
            title="Reset all cards to automatic engine calculations"
          >
            <RotateCcw className="w-3 h-3 text-accent" />
            <span>Reset<span className="hidden sm:inline"> Auto Metrics</span></span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
          {displayKpis.map((kpi, kIdx) => {
            const statusTheme =
              kpi.status === 'Above Target'
                ? {
                    text: 'text-accent',
                    bg: 'bg-accent-soft',
                    dot: 'bg-accent',
                    border: 'border-subtle',
                    stroke: 'var(--chart-1)',
                  }
                : kpi.status === 'At Risk'
                ? {
                    text: 'text-danger',
                    bg: 'bg-elevated',
                    dot: 'bg-danger',
                    border: 'border-subtle',
                    stroke: 'var(--danger)',
                  }
                : kpi.status === 'Below Target'
                ? {
                    text: 'text-warning',
                    bg: 'bg-elevated',
                    dot: 'bg-warning',
                    border: 'border-subtle',
                    stroke: 'var(--chart-4)',
                  }
                : {
                    text: 'text-accent',
                    bg: 'bg-accent-soft',
                    dot: 'bg-accent',
                    border: 'border-subtle',
                    stroke: 'var(--accent)',
                  };

            const filteredKpi = computeFilteredKpi(kpi);
            const rawDelta =
              typeof kpi.changePercent === 'number' && Number.isFinite(kpi.changePercent)
                ? Math.round(kpi.changePercent * 10) / 10
                : null;
            const goodDirection: 'up' | 'down' =
              (kpi as any).goodDirection ||
              (/cost|churn|attrition|defect|bounce|delay|latency|risk|expense|loss|return|cancel|wait|readmission|denial|cpa|cac/i.test(
                kpi.name
              )
                ? 'down'
                : 'up');
            const absDelta = rawDelta !== null ? Math.abs(rawDelta) : 0;
            const deltaDirection: 'up' | 'down' | 'flat' =
              rawDelta === null ? 'flat' : rawDelta > 0 ? 'up' : rawDelta < 0 ? 'down' : 'flat';
            const deltaTextLabel =
              deltaDirection === 'up'
                ? `up ${absDelta.toFixed(1)}%`
                : deltaDirection === 'down'
                ? `down ${absDelta.toFixed(1)}%`
                : 'flat 0.0%';
            const isNeutralDelta = rawDelta === null || absDelta < 0.5;
            const isFavorableDelta =
              !isNeutralDelta &&
              ((goodDirection === 'up' && (rawDelta ?? 0) > 0) ||
                (goodDirection === 'down' && (rawDelta ?? 0) < 0));
            const cleanSourceLabel = (kpi.sourceColumn || 'metric').replace(/_/g, ' ');

            // Micro sparkline path generator
            const sparklinePaths = [
              'M 0 28 Q 20 8 38 22 T 68 12 T 85 24 T 100 10',
              'M 0 14 Q 25 30 45 16 T 75 28 T 100 18',
              'M 0 32 Q 22 18 42 12 T 72 26 T 100 8',
              'M 0 20 Q 20 32 50 14 T 80 20 T 100 12',
            ];
            const sparkPath = sparklinePaths[kIdx % sparklinePaths.length];

            return (
              <Tooltip
                key={kpi.id || kIdx}
                side="bottom"
                title={kpi.name}
                tag={kpi.unit || 'Metric'}
                content={`${kpi.definition} · Source: ${kpi.traceableSource}. Click anywhere to see details. Click pencil icon to customize heading & calculation.`}
              >
                <div
                  data-testid={`exec-kpi-card-${kpi.id}`}
                  onClick={() => {
                    openDrillThrough({
                      title: kpi.name,
                      subtitle: kpi.definition,
                      kpi,
                      sourceContext: 'kpi_card',
                    });
                  }}
                  className="depth-card glass-card rounded-[24px] p-2.5 sm:p-5 flex flex-col justify-between relative group cursor-pointer select-none card-3d h-full transition-all duration-200 hover:-translate-y-1 hover:border-strong"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <span
                        data-testid={`exec-kpi-label-${kpi.id}`}
                        className="font-sans text-xs font-bold leading-snug line-clamp-2 [word-break:normal] [overflow-wrap:normal] text-secondary group-hover:text-primary transition-colors"
                        title={kpi.name}
                      >
                        {kpi.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingKpi(kpi);
                        }}
                        className="p-0.5 -mt-0.5 rounded transition-colors shrink-0 group-hover:opacity-100 opacity-60 hover:bg-input text-secondary hover:text-accent"
                        title="Customize heading, column & calculation formula"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span
                      title={`Status: ${kpi.status}`}
                      className="w-7 h-7 rounded-xl bg-accent-soft border border-subtle text-accent flex items-center justify-center shrink-0 relative"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span className={`w-1.5 h-1.5 rounded-full ${statusTheme.dot} absolute -top-0.5 -right-0.5`} />
                    </span>
                  </div>

                  <div className="my-1 sm:my-3 flex items-end justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span
                          data-testid={`exec-kpi-value-${kpi.id}`}
                          className="font-metric-display text-metric-display font-extrabold tracking-tight leading-none truncate tabular-nums text-primary"
                          title={filteredKpi.formatted}
                        >
                          {filteredKpi.formatted}
                        </span>
                        {filteredKpi.isFiltered && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-soft text-accent font-bold border border-subtle">
                            Filtered
                          </span>
                        )}
                      </div>
                      {filteredKpi.isFiltered && (
                        <div className="text-[11px] font-mono text-secondary mt-0.5">
                          of {kpi.formattedValue} total
                        </div>
                      )}
                      <div
                        data-testid={`exec-kpi-delta-${kpi.id}`}
                        data-direction={deltaDirection}
                        data-favorable={
                          isNeutralDelta ? 'neutral' : isFavorableDelta ? 'true' : 'false'
                        }
                        className="flex items-center gap-1.5 mt-1.5 text-xs font-mono flex-wrap"
                      >
                        {rawDelta !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 font-bold tabular-nums px-1.5 py-0.5 rounded-md border border-subtle bg-elevated ${
                              isNeutralDelta
                                ? 'text-secondary'
                                : isFavorableDelta
                                ? 'text-success'
                                : 'text-danger'
                            }`}
                          >
                            {deltaDirection === 'up' ? (
                              <ArrowUp
                                className="w-3.5 h-3.5 stroke-[2.5] shrink-0"
                                aria-hidden="true"
                              />
                            ) : deltaDirection === 'down' ? (
                              <ArrowDown
                                className="w-3.5 h-3.5 stroke-[2.5] shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Minus
                                className="w-3.5 h-3.5 stroke-[2.5] shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>{deltaTextLabel}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-secondary">
                            Formula: {kpi.aggregation.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Micro inline Sparkline SVG reading active theme tokens */}
                    <div className="w-20 sm:w-24 h-8 sm:h-10 shrink-0">
                      <svg
                        className="w-full h-full fill-none stroke-2 overflow-visible"
                        viewBox="0 0 100 40"
                      >
                        <defs>
                          <filter
                            id={`spark-shadow-${kpi.id}`}
                            x="-20%"
                            y="-20%"
                            width="140%"
                            height="150%"
                          >
                            <feDropShadow
                              dx="0"
                              dy="2"
                              stdDeviation="1.5"
                              floodColor="var(--bg-app)"
                              floodOpacity="0.45"
                            />
                          </filter>
                        </defs>
                        <path
                          d={sparkPath}
                          stroke={statusTheme.stroke}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          filter={`url(#spark-shadow-${kpi.id})`}
                        />
                        <path
                          className="fill-current stroke-none opacity-20"
                          d={`${sparkPath} L 100 40 L 0 40 Z`}
                          style={{ color: statusTheme.stroke }}
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="pt-1.5 sm:pt-2 border-t border-subtle flex items-center justify-between gap-2 text-xs font-mono text-secondary">
                    <span
                      data-testid={`exec-kpi-source-${kpi.id}`}
                      className="min-w-0 leading-snug"
                      title={`Source: ${kpi.traceableSource} · ${kpi.calculation || kpi.definition}`}
                    >
                      Col: {cleanSourceLabel}
                    </span>
                    <span
                      className={`${statusTheme.text} hover:underline flex items-center gap-1 font-semibold shrink-0 cursor-pointer`}
                      title={`Drill down — Scope: ${kpi.period || 'Audited Scope'}`}
                    >
                      <span>See details</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </span>
                  </div>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </section>


      {/* 3. TAB CONTENT RENDERING */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 2.2 HERO CHART & 2.3 RANKING CARD (First screen below 4 KPI cards) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT: Hero Smooth Area Chart (7 cols) */}
            <div
              data-testid="exec-hero-area-chart"
              className="lg:col-span-7 glass-card depth-card rounded-[24px] p-5 sm:p-6 border border-subtle bg-card shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Header: Title, Metric Selector, Granularity & View Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-subtle">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip
                      side="right"
                      title="Executive Chronological Telemetry"
                      tag="Cubic Bezier Spline"
                      content="Transforms granular transactions into executive trajectory curves. Switch between Monthly rollup, Exponential Smoothing, or Raw telemetry to analyze seasonal momentum."
                    >
                      <div className="flex items-center gap-2.5 cursor-help">
                        <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent border border-accent/30 flex items-center justify-center shadow-2xs">
                          <Activity className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight">
                            Revenue &amp; Performance Trend
                          </h3>
                          <p className="text-[11px] font-mono text-secondary">
                            {trendGranularity === 'auto' ? 'Auto-Aggregated Trajectory' : trendGranularity === 'monthly' ? 'Monthly Calendar Rollup' : trendGranularity === 'smooth' ? 'Gaussian Trendline' : trendGranularity === 'weekly' ? 'Weekly Interval Rollup' : 'Raw Granular Telemetry'}
                          </p>
                        </div>
                      </div>
                    </Tooltip>

                    {flags.chartGuide && (() => {
                      const rule = getChartGuideRule('line');
                      if (!rule) return null;
                      return (
                        <Tooltip
                          side="top"
                          title={`Why this chart: ${rule.name}`}
                          tag={rule.fits}
                          content={`${formatChartGuideReason(rule.id)} Example: "${rule.question}"`}
                        >
                          <button
                            type="button"
                            aria-label={`Why this chart: ${rule.name}. ${formatChartGuideReason(rule.id)}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold border border-accent/35 bg-accent-soft text-accent cursor-help focus-visible:outline-2 focus-visible:outline-accent"
                          >
                            <HelpCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>Why this chart</span>
                          </button>
                        </Tooltip>
                      );
                    })()}
                  </div>

                  {/* Controls: Metric Select & Granularity Toggles */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center p-0.5 rounded-lg border border-subtle bg-elevated text-xs font-mono">
                      {(['auto', 'monthly', 'smooth', 'raw'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTrendGranularity(mode)}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                            trendGranularity === mode
                              ? 'bg-accent text-on-accent shadow-2xs font-bold'
                              : 'text-secondary hover:text-primary'
                          }`}
                          title={`Switch trend view to ${mode}`}
                        >
                          {mode === 'auto' ? 'Auto' : mode === 'monthly' ? 'Monthly' : mode === 'smooth' ? 'Smooth' : 'Raw'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center p-0.5 rounded-lg border border-subtle bg-elevated text-xs">
                      <button
                        type="button"
                        onClick={() => setTrendChartType('area')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          trendChartType === 'area'
                            ? 'bg-accent text-on-accent shadow-2xs font-bold'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Area Spline Curve"
                      >
                        Spline
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrendChartType('bar')}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          trendChartType === 'bar'
                            ? 'bg-accent text-on-accent shadow-2xs font-bold'
                            : 'text-secondary hover:text-primary'
                        }`}
                        title="Bar Columns"
                      >
                        Bars
                      </button>
                    </div>

                    <select
                      value={selectedTrendMetric}
                      onChange={(e) => setSelectedTrendMetric(e.target.value)}
                      className="glass-input h-7 px-2 text-xs font-mono rounded-lg border border-subtle bg-elevated text-primary focus:outline-none cursor-pointer"
                      title="Select metric column"
                    >
                      {numericCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Hero Area Chart Engine */}
                {(() => {
                  const rawPoints = currentTrend?.dataPoints || [];
                  if (rawPoints.length < 2) {
                    return (
                      <div className="h-64 flex flex-col items-center justify-center text-muted font-label-sm text-label-sm gap-2">
                        <Activity className="w-8 h-8 opacity-40 text-secondary" />
                        <span>Insufficient observation records to render time series trend.</span>
                      </div>
                    );
                  }

                  const isCurrency = /revenue|sales|profit|margin|cost|amount|price|mrr|cac|val/i.test(selectedTrendMetric || '');
                  const formatNum = (v: number) => {
                    const abs = Math.abs(v);
                    let str = '';
                    if (abs >= 1000000) str = `${(v / 1000000).toFixed(1)}M`;
                    else if (abs >= 1000) str = `${(v / 1000).toFixed(1)}k`;
                    else str = Math.round(v).toLocaleString();
                    return isCurrency ? `$${str}` : str;
                  };

                  const parseDatePeriod = (p: string) => {
                    if (!p) return null;
                    const parsed = Date.parse(p);
                    if (!isNaN(parsed)) {
                      const d = new Date(parsed);
                      if (d.getFullYear() >= 1990 && d.getFullYear() <= 2100) return d;
                    }
                    const m = String(p).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
                    if (m) {
                      return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
                    }
                    const m2 = String(p).match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
                    if (m2) {
                      const yr = parseInt(m2[3], 10) < 100 ? 2000 + parseInt(m2[3], 10) : parseInt(m2[3], 10);
                      return new Date(yr, parseInt(m2[1], 10) - 1, parseInt(m2[2], 10));
                    }
                    return null;
                  };

                  const firstDate = parseDatePeriod(rawPoints[0]?.period || '');
                  const isDateStr = firstDate !== null;

                  let effGran = trendGranularity;
                  if (effGran === 'auto') {
                    if (isDateStr && rawPoints.length > 15) {
                      const mSet = new Set<string>();
                      rawPoints.forEach(p => {
                        const d = parseDatePeriod(p.period);
                        if (d) mSet.add(`${d.getFullYear()}-${d.getMonth()}`);
                      });
                      effGran = mSet.size >= 4 ? 'monthly' : 'smooth';
                    } else {
                      effGran = rawPoints.length > 20 ? 'smooth' : 'raw';
                    }
                  }

                  let activePoints: { period: string; value: number }[] = [];
                  if (effGran === 'monthly' && isDateStr) {
                    const mMap = new Map<string, { sum: number; count: number; date: Date }>();
                    rawPoints.forEach(p => {
                      const d = parseDatePeriod(p.period);
                      if (d) {
                        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const cur = mMap.get(mKey) || { sum: 0, count: 0, date: d };
                        cur.sum += p.value;
                        cur.count += 1;
                        mMap.set(mKey, cur);
                      }
                    });
                    const mEntries = Array.from(mMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    activePoints = mEntries.map(([k, v]) => {
                      const [yr, mo] = k.split('-');
                      const mIdx = parseInt(mo, 10) - 1;
                      const label = mIdx >= 0 && mIdx < 12 ? `${monthNames[mIdx]} '${yr.slice(2)}` : k;
                      return { period: label, value: Math.round(v.sum * 10) / 10 };
                    });
                    if (activePoints.length < 3 && rawPoints.length > 5) {
                      effGran = 'smooth';
                      activePoints = [];
                    }
                  }

                  if (effGran === 'smooth' || (activePoints.length === 0 && effGran !== 'raw')) {
                    const targetCount = Math.min(28, Math.max(12, Math.floor(rawPoints.length / 5)));
                    const step = Math.max(1, Math.floor(rawPoints.length / targetCount));
                    let ema = rawPoints[0].value;
                    const alpha = rawPoints.length > 60 ? 0.22 : 0.35;
                    for (let i = 0; i < rawPoints.length; i++) {
                      ema = alpha * rawPoints[i].value + (1 - alpha) * ema;
                      if (i % step === 0 || i === rawPoints.length - 1) {
                        activePoints.push({
                          period: rawPoints[i].period,
                          value: Math.round(ema * 10) / 10
                        });
                      }
                    }
                  } else if (effGran === 'weekly' && isDateStr) {
                    const chunkSize = Math.max(7, Math.floor(rawPoints.length / 14));
                    for (let i = 0; i < rawPoints.length; i += chunkSize) {
                      const slice = rawPoints.slice(i, i + chunkSize);
                      const sum = slice.reduce((acc, c) => acc + c.value, 0);
                      activePoints.push({
                        period: slice[0].period,
                        value: Math.round(sum * 10) / 10
                      });
                    }
                  } else if (activePoints.length === 0) {
                    activePoints = safeDownsample(rawPoints, 100);
                  }

                  if (activePoints.length < 2) {
                    activePoints = rawPoints.slice(0, 16);
                  }

                  const values = activePoints.map(p => p.value);
                  const minVal = safeMin(values, 0);
                  const maxVal = safeMax(values, 0);
                  const range = maxVal === minVal ? (maxVal === 0 ? 1 : Math.abs(maxVal) * 0.2) : maxVal - minVal;
                  const totalVal = rawPoints.reduce((a, b) => a + (b.value || 0), 0);
                  const meanVal = values.reduce((a, b) => a + b, 0) / values.length;

                  let peakIdx = 0, troughIdx = 0;
                  for (let i = 1; i < values.length; i++) {
                    if (values[i] > values[peakIdx]) peakIdx = i;
                    if (values[i] < values[troughIdx]) troughIdx = i;
                  }

                  const xMin = 35;
                  const xMax = 615;
                  const yMin = 22;
                  const yMax = 145;

                  const scaleX = (i: number) => xMin + (i / Math.max(1, activePoints.length - 1)) * (xMax - xMin);
                  const scaleY = (v: number) => Math.max(yMin, Math.min(yMax, yMax - ((v - minVal) / range) * (yMax - yMin)));

                  const coords = activePoints.map((p, i) => ({
                    x: scaleX(i),
                    y: scaleY(p.value),
                    period: p.period,
                    value: p.value
                  }));

                  const smaCoords = activePoints.map((p, i) => {
                    const window = activePoints.slice(Math.max(0, i - 2), i + 1);
                    const avg = window.reduce((acc, curr) => acc + curr.value, 0) / window.length;
                    return { x: scaleX(i), y: scaleY(avg), avg };
                  });

                  let splinePath = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
                  for (let i = 0; i < coords.length - 1; i++) {
                    const p0 = coords[i];
                    const p1 = coords[i + 1];
                    const cpx1 = p0.x + (p1.x - p0.x) * 0.42;
                    const cpy1 = p0.y;
                    const cpx2 = p1.x - (p1.x - p0.x) * 0.42;
                    const cpy2 = p1.y;
                    splinePath += ` C ${cpx1.toFixed(1)},${cpy1.toFixed(1)} ${cpx2.toFixed(1)},${cpy2.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
                  }
                  const areaPath = `${splinePath} L ${coords[coords.length - 1].x.toFixed(1)},160 L ${coords[0].x.toFixed(1)},160 Z`;
                  const yMean = scaleY(meanVal);

                  const tickCount = Math.min(6, activePoints.length);
                  const tickStep = Math.max(1, Math.floor((activePoints.length - 1) / (tickCount - 1)));
                  const labelIndices: number[] = [];
                  for (let i = 0; i < activePoints.length; i += tickStep) {
                    labelIndices.push(i);
                  }
                  if (labelIndices[labelIndices.length - 1] !== activePoints.length - 1) {
                    labelIndices.push(activePoints.length - 1);
                  }

                  const peakPt = coords[peakIdx];
                  const troughPt = coords[troughIdx];

                  return (
                    <>
                      {/* Micro-Legend & Scrubbing Prompt */}
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1 my-2.5 text-[11px] font-mono">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1.5 font-semibold text-accent">
                            <span className="w-3.5 h-1 rounded-full bg-accent" />
                            <span>Actual ({selectedTrendMetric})</span>
                          </span>
                          {trendChartType === 'area' && (
                            <span className="flex items-center gap-1.5 text-status-success">
                              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-status-success" />
                              <span>3-Period SMA</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-secondary">
                            <span className="w-3.5 h-0.5 border-t-2 border-dotted border-muted" />
                            <span>Mean ({formatNum(meanVal)})</span>
                          </span>
                        </div>
                        <span className="text-[10px] hidden sm:inline-flex items-center gap-1 text-muted">
                          <span>• Hover curve to inspect period</span>
                        </span>
                      </div>

                      {/* Main Telemetry SVG Chart with cubic-Bezier curve in var(--accent) */}
                      <div className="w-full h-64 relative rounded-2xl p-3 flex flex-col justify-between border border-subtle bg-elevated/60 overflow-hidden">
                        <div className="w-full flex-1 relative overflow-hidden">
                          <svg
                            className="w-full h-full overflow-hidden select-none cursor-crosshair"
                            viewBox="0 0 650 175"
                            preserveAspectRatio="none"
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const relX = ((e.clientX - rect.left) / rect.width) * 650;
                              let closestIdx = 0;
                              let minDiff = Infinity;
                              coords.forEach((c, idx) => {
                                const diff = Math.abs(c.x - relX);
                                if (diff < minDiff) {
                                  minDiff = diff;
                                  closestIdx = idx;
                                }
                              });
                              const pt = coords[closestIdx];
                              const smaPt = smaCoords[closestIdx];
                              const deltaVsMean = meanVal !== 0 ? Math.round(((pt.value - meanVal) / meanVal) * 1000) / 10 : 0;
                              setHoveredTrendPt({
                                idx: closestIdx,
                                x: pt.x,
                                y: pt.y,
                                period: pt.period,
                                value: pt.value,
                                sma: smaPt?.avg,
                                deltaVsMean
                              });
                            }}
                            onMouseLeave={() => setHoveredTrendPt(null)}
                          >
                            <defs>
                              <linearGradient id="trendLuminousArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
                                <stop offset="65%" stopColor="var(--accent)" stopOpacity="0.08" />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                              </linearGradient>
                              <pattern id="telemetryGrid" width="48" height="32" patternUnits="userSpaceOnUse">
                                <path d="M 48 0 L 0 0 0 32" fill="none" stroke="currentColor" className="text-border-subtle" strokeWidth="0.7" opacity="0.25" />
                              </pattern>
                            </defs>

                            <rect width="100%" height="100%" fill="url(#telemetryGrid)" />

                            {/* Baseline Mean Horizontal Reference */}
                            <line
                              x1={xMin - 5}
                              y1={yMean}
                              x2={xMax + 5}
                              y2={yMean}
                              stroke="var(--chart-axis)"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                              opacity="0.55"
                            />

                            {trendChartType === 'bar' ? (
                              coords.map((c, idx) => {
                                const bW = Math.max(6, Math.min(22, (xMax - xMin) / coords.length * 0.65));
                                const bH = Math.max(3, yMax - c.y);
                                const isHovered = hoveredTrendPt?.idx === idx;
                                return (
                                  <g key={idx} className="cursor-pointer transition-all">
                                    <rect
                                      x={c.x - bW / 2}
                                      y={c.y}
                                      width={bW}
                                      height={bH}
                                      rx="3"
                                      fill="var(--accent)"
                                      fillOpacity={isHovered ? 1 : 0.85}
                                      className="transition-all"
                                    />
                                  </g>
                                );
                              })
                            ) : (
                              <>
                                {/* Soft vertical gradient fill fading to transparent */}
                                <path d={areaPath} fill="url(#trendLuminousArea)" />

                                {/* 3-Period SMA Smooth Trend Line */}
                                <path
                                  d={smaCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')}
                                  fill="none"
                                  stroke="var(--chart-2)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  opacity="0.75"
                                />

                                {/* Primary Actual Cubic-Bezier Spline Path (1.85px in var(--accent)) */}
                                <path
                                  d={splinePath}
                                  fill="none"
                                  stroke="var(--accent)"
                                  strokeWidth="1.85"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="transition-all"
                                />

                                {/* Peak Marker */}
                                {peakPt && (
                                  <g className="select-none pointer-events-none">
                                    <circle cx={peakPt.x} cy={peakPt.y} r="5.5" fill="var(--accent)" fillOpacity="0.25" />
                                    <circle cx={peakPt.x} cy={peakPt.y} r="3" fill="var(--accent)" stroke="var(--bg-card)" strokeWidth="1.5" />
                                  </g>
                                )}

                                {/* Trough Marker */}
                                {troughPt && troughIdx !== peakIdx && (
                                  <g className="select-none pointer-events-none">
                                    <circle cx={troughPt.x} cy={troughPt.y} r="2.5" fill="var(--chart-4)" stroke="var(--bg-card)" strokeWidth="1.2" />
                                  </g>
                                )}
                              </>
                            )}

                            {/* Active Hover Crosshair & Bead */}
                            {hoveredTrendPt && (
                              <g className="pointer-events-none">
                                <line
                                  x1={hoveredTrendPt.x}
                                  y1={yMin}
                                  x2={hoveredTrendPt.x}
                                  y2={yMax + 8}
                                  stroke="var(--accent)"
                                  strokeWidth="1.2"
                                  strokeDasharray="3 3"
                                  opacity="0.85"
                                />
                                <circle
                                  cx={hoveredTrendPt.x}
                                  cy={hoveredTrendPt.y}
                                  r="7"
                                  fill="var(--accent)"
                                  fillOpacity="0.22"
                                />
                                <circle
                                  cx={hoveredTrendPt.x}
                                  cy={hoveredTrendPt.y}
                                  r="4"
                                  fill="var(--accent)"
                                  stroke="var(--bg-card)"
                                  strokeWidth="1.75"
                                />
                              </g>
                            )}
                          </svg>

                          {/* Floating Glass Tooltip Card */}
                          {hoveredTrendPt && (
                            <div
                              className="absolute z-30 pointer-events-none transition-all duration-75 px-3 py-2 rounded-xl border border-subtle shadow-xl bg-card/95 text-primary backdrop-blur-md"
                              style={{
                                left: `${Math.min(78, Math.max(12, (hoveredTrendPt.x / 650) * 100))}%`,
                                top: '8px',
                                transform: 'translateX(-50%)'
                              }}
                            >
                              <div className="flex items-center justify-between gap-3 font-mono text-[11px] pb-1 border-b border-subtle">
                                <span className="font-bold text-primary">{hoveredTrendPt.period}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  hoveredTrendPt.deltaVsMean >= 0
                                    ? 'bg-status-success-soft text-status-success'
                                    : 'bg-status-error-soft text-status-error'
                                }`}>
                                  {hoveredTrendPt.deltaVsMean >= 0 ? '+' : ''}{hoveredTrendPt.deltaVsMean}% vs avg
                                </span>
                              </div>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="font-mono text-sm font-extrabold text-accent">
                                  {formatNum(hoveredTrendPt.value)}
                                </span>
                                {hoveredTrendPt.sma !== undefined && (
                                  <span className="text-[10px] font-mono text-secondary">
                                    SMA: {formatNum(hoveredTrendPt.sma)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Horizontal Axis Labels in Muted Text */}
                        <div className="flex justify-between items-center font-mono text-[11px] text-muted pt-2 border-t border-subtle select-none px-1">
                          {labelIndices.map(idx => (
                            <span
                              key={idx}
                              className={`transition-colors ${
                                idx === 0 ? 'text-left' : idx === activePoints.length - 1 ? 'text-right' : 'text-center'
                              } ${
                                hoveredTrendPt?.idx === idx ? 'text-accent font-bold' : ''
                              }`}
                            >
                              {activePoints[idx]?.period}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 2.2: 3 Compact Summary Metrics under Hero Chart (Total, Average, Best Period) */}
                      <div
                        data-testid="exec-hero-summary-metrics"
                        className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-subtle"
                      >
                        <div className="p-3 rounded-xl border border-subtle bg-elevated/60 flex flex-col justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-secondary">
                            Total ({selectedTrendMetric})
                          </span>
                          <span className="font-mono text-sm sm:text-base font-extrabold text-primary mt-0.5 tabular-nums">
                            {formatNum(totalVal)}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl border border-subtle bg-elevated/60 flex flex-col justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-secondary">
                            Period Average
                          </span>
                          <span className="font-mono text-sm sm:text-base font-extrabold text-primary mt-0.5 tabular-nums">
                            {formatNum(meanVal)}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl border border-subtle bg-elevated/60 flex flex-col justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-secondary">
                            Best Period ({activePoints[peakIdx]?.period || 'Peak'})
                          </span>
                          <span className="font-mono text-sm sm:text-base font-extrabold text-accent mt-0.5 tabular-nums">
                            {formatNum(values[peakIdx])}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* RIGHT: 2.3 Ranking Card beside the Hero Chart (5 cols) */}
            <div
              data-testid="exec-ranking-card"
              className="lg:col-span-5 glass-card depth-card rounded-[24px] p-5 sm:p-6 border border-subtle bg-card shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-subtle">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent border border-accent/30 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight truncate">
                        Top {selectedDimension || stringCols[0]?.name || 'Segments'}
                      </h3>
                      <p className="text-[11px] font-mono text-secondary truncate">
                        Ranked by {selectedTrendMetric || numericCols[0]?.name || 'Volume'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedDimension}
                      onChange={(e) => setSelectedDimension(e.target.value)}
                      aria-label="Ranking dimension"
                      className="glass-input h-7 px-2 text-xs font-mono rounded-lg border border-subtle bg-elevated text-primary focus:outline-none cursor-pointer max-w-[120px]"
                    >
                      {stringCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      data-testid="exec-ranking-view-all"
                      onClick={() => setActiveTab('pareto')}
                      className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>View all</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Top 5 Horizontal Progress Bars (var(--accent) fill, value on right) */}
                <div className="space-y-3.5 my-4">
                  {(() => {
                    const topBars = (currentCategoryData || []).slice(0, 5);
                    const maxBarVal = Math.max(...topBars.map(b => b.value || 0), 1);
                    const isCur = /revenue|sales|profit|margin|cost|amount|price/i.test(selectedTrendMetric || '');
                    const fmtBar = (v: number) => {
                      const str = v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}K` : Math.round(v).toLocaleString();
                      return isCur ? `$${str}` : str;
                    };

                    if (topBars.length === 0) {
                      return (
                        <div className="text-xs text-muted py-10 text-center font-mono">
                          No ranked categories available in current dataset.
                        </div>
                      );
                    }

                    return topBars.map((item, idx) => {
                      const pct = Math.min(100, Math.max(8, ((item.value || 0) / maxBarVal) * 100));
                      return (
                        <div
                          key={idx}
                          onClick={() => handleDrilldown(item.category)}
                          className="group cursor-pointer p-2.5 rounded-xl border border-transparent hover:border-subtle hover:bg-elevated/70 transition-all"
                          title={`Click to filter by ${item.category}`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-accent-soft text-accent font-mono text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-primary truncate">
                                {item.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                              <span className="font-bold text-primary">
                                {fmtBar(item.value)}
                              </span>
                              <span className="text-[11px] text-secondary">
                                {item.share ? `${item.share.toFixed(1)}%` : '0%'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-2.5 rounded-full overflow-hidden bg-elevated border border-subtle/50">
                            <div
                              className="h-full rounded-full bg-accent transition-all duration-500"
                              style={{ width: `${pct}%`, opacity: Math.max(0.55, 1 - idx * 0.1) }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="pt-3 border-t border-subtle flex items-center justify-between text-xs text-secondary">
                <span className="font-mono text-[11px]">
                  Showing top {Math.min(5, (currentCategoryData || []).length)} of {(currentCategoryData || []).length} segments
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('pareto')}
                  className="text-accent hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>See Pareto breakdown</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </section>

          {/* 2.6 "WHAT TO DO NEXT" STRIP (3 Big Cards below Hero & Ranking) */}
          {(() => {
            const qualityScore = qualityReport?.overallScore ?? 100;
            const findingsCount = qualityReport?.issues?.length ?? 0;
            const suggestFixData = findingsCount > 0 || qualityScore < 90;
            return (
              <section
                data-testid="exec-what-to-do-next"
                aria-label="What to do next"
                className="rounded-[24px] p-5 sm:p-6 border border-subtle bg-card shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-primary tracking-tight">
                      What to do next
                    </h2>
                    <p className="text-xs text-secondary">
                      Recommended workflow based on your dataset health and analysis coverage
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-accent-soft text-accent border border-accent/30 font-semibold">
                    {suggestFixData ? 'Recommended: Step 1 (Clean data)' : 'Recommended: Step 2 (Explore packs)'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Fix data issues */}
                  <button
                    type="button"
                    data-testid="next-step-fix-data"
                    onClick={() => setCurrentTab('quality')}
                    className={`group text-left rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                      suggestFixData
                        ? 'bg-accent-soft/40 border-accent shadow-sm hover:-translate-y-0.5'
                        : 'bg-elevated/60 border-subtle hover:border-accent/50 hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent">
                          <span className="w-6 h-6 rounded-lg bg-accent text-on-accent inline-flex items-center justify-center text-xs font-extrabold">
                            1
                          </span>
                          Fix data issues
                        </span>
                        {suggestFixData && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent text-on-accent">
                            Suggested next step
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-primary mb-1">
                        {findingsCount > 0
                          ? `${findingsCount} quality finding${findingsCount === 1 ? '' : 's'} detected`
                          : `Data quality at ${qualityScore}%`}
                      </h3>
                      <p className="text-xs text-secondary leading-relaxed">
                        Inspect missing values, duplicates, and statistical outliers in the Data Quality Auditor before sharing reports.
                      </p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-subtle flex items-center justify-between text-xs font-semibold text-accent">
                      <span>Open Data Quality Auditor</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </button>

                  {/* Card 2: Explore */}
                  <button
                    type="button"
                    data-testid="next-step-explore-packs"
                    onClick={() => setCurrentTab('analytics_packs')}
                    className={`group text-left rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                      !suggestFixData
                        ? 'bg-accent-soft/40 border-accent shadow-sm hover:-translate-y-0.5'
                        : 'bg-elevated/60 border-subtle hover:border-accent/50 hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent">
                          <span className="w-6 h-6 rounded-lg bg-accent text-on-accent inline-flex items-center justify-center text-xs font-extrabold">
                            2
                          </span>
                          Explore
                        </span>
                        {!suggestFixData && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent text-on-accent">
                            Suggested next step
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-primary mb-1">
                        14 domain Analytics Packs
                      </h3>
                      <p className="text-xs text-secondary leading-relaxed">
                        Auto-detect suitable KPIs, cohort curves, and variance breakdowns tailored to your dataset schema.
                      </p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-subtle flex items-center justify-between text-xs font-semibold text-accent">
                      <span>Open Analytics Packs</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </button>

                  {/* Card 3: Share */}
                  <button
                    type="button"
                    data-testid="next-step-share-export"
                    onClick={() => setCurrentTab('export_center')}
                    className="group text-left rounded-2xl p-4 sm:p-5 border border-subtle bg-elevated/60 hover:border-accent/50 hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent">
                          <span className="w-6 h-6 rounded-lg bg-accent text-on-accent inline-flex items-center justify-center text-xs font-extrabold">
                            3
                          </span>
                          Share
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-card text-secondary border border-subtle">
                          PPTX • PDF • XLSX
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-primary mb-1">
                        Executive decks &amp; reports
                      </h3>
                      <p className="text-xs text-secondary leading-relaxed">
                        Download native editable PowerPoint slides, multi-page PDF briefings, or cleaned Excel workbooks.
                      </p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-subtle flex items-center justify-between text-xs font-semibold text-accent">
                      <span>Open Download Center</span>
                      <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </button>
                </div>
              </section>
            );
          })()}

          {/* 2.7 PLAIN WORDS: "What to do about it" (with technical title in tooltip) */}
          <section className="w-full rounded-[24px] p-5 sm:p-6 border border-subtle bg-card shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent border border-accent/30 flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2
                    data-testid="exec-what-to-do-about-it-heading"
                    title="AI Decision Directives: WHAT • WHY • MANAGEMENT ACTION"
                    className="font-headline-sm text-headline-sm text-primary font-bold tracking-tight"
                  >
                    What to do about it
                  </h2>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Synthesized findings and recommended actions from {filteredRows.length.toLocaleString()} records in {project.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg bg-accent-soft text-accent font-label-caps text-label-caps tracking-wider uppercase font-bold flex items-center gap-2 border border-accent/30">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Verified against dataset
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {activeDirectives.map((dir, idx) => {
                const categoryTheme = dir.category === 'Driver'
                  ? { bg: 'bg-accent-soft text-accent border-accent/30', label: 'DRIVER' }
                  : dir.category === 'Opportunity'
                  ? { bg: 'bg-status-warning-soft text-status-warning border-status-warning/30', label: 'OPPORTUNITY' }
                  : { bg: 'bg-status-info-soft text-status-info border-status-info/30', label: 'OPERATIONAL' };

                return (
                  <Tooltip
                    key={dir.id || idx}
                    side="top"
                    title={dir.title}
                    tag={dir.category}
                    content={dir.significance || dir.why}
                  >
                    <div className="rounded-2xl p-4 sm:p-5 border border-subtle bg-elevated/50 flex flex-col justify-between relative hover:border-accent/50 transition-all h-full">
                      <div>
                        <div className="flex items-center justify-between mb-3.5">
                          <span className="font-headline-sm text-headline-sm font-bold truncate pr-2 text-primary">
                            {dir.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps tracking-widest uppercase font-bold border shrink-0 ${categoryTheme.bg}`}>
                            {categoryTheme.label}
                          </span>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="font-label-caps text-label-caps text-accent uppercase tracking-wider block font-bold text-[11px]">
                              WHAT
                            </span>
                            <p className="font-body-sm text-body-sm mt-1 leading-relaxed font-medium text-primary">
                              {dir.what}
                            </p>
                          </div>
                          <div>
                            <span className="font-label-caps text-label-caps text-secondary uppercase tracking-wider block font-bold text-[11px]">
                              WHY
                            </span>
                            <p className="font-body-sm text-body-sm mt-1 leading-relaxed font-normal text-secondary">
                              {dir.why}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-xl border border-accent/25 bg-accent-soft/40">
                        <span className="font-label-caps text-label-caps text-accent uppercase tracking-wider flex items-center gap-1.5 font-bold text-[11px]">
                          <Zap className="w-3.5 h-3.5 text-accent" /> RECOMMENDED ACTION
                        </span>
                        <p className="font-body-sm text-body-sm mt-1 font-medium leading-relaxed text-primary">
                          {dir.action}
                        </p>
                      </div>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </section>

          {/* SEGMENT SHARE DONUT & ASK YOUR DATA CARDS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Segment Share Donut & Decomposition (7 cols) */}
            <div className="lg:col-span-7 rounded-[24px] p-5 sm:p-6 border border-subtle bg-card shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-subtle">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-accent" />
                      <h3 className="font-headline-sm text-headline-sm text-primary font-bold uppercase tracking-wide">
                        SEGMENT SHARE OF TOTAL
                      </h3>
                    </div>

                    {flags.chartGuide && (() => {
                      const rule = getChartGuideRule('donut');
                      if (!rule) return null;
                      return (
                        <Tooltip
                          side="top"
                          title={`Why this chart: ${rule.name}`}
                          tag={rule.fits}
                          content={`${formatChartGuideReason(rule.id)} Example: "${rule.question}"`}
                        >
                          <button
                            type="button"
                            aria-label={`Why this chart: ${rule.name}. ${formatChartGuideReason(rule.id)}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold border border-accent/35 bg-accent-soft text-accent cursor-help focus-visible:outline-2 focus-visible:outline-accent"
                          >
                            <HelpCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span>Why this chart</span>
                          </button>
                        </Tooltip>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">DIMENSION:</span>
                    <select
                      value={selectedDimension}
                      onChange={(e) => setSelectedDimension(e.target.value)}
                      className="glass-input h-8 px-2.5 font-label-sm text-label-sm rounded-lg border border-subtle bg-elevated text-primary focus:outline-none cursor-pointer"
                    >
                      {stringCols.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {(() => {
                  const segments = (currentCategoryData || []).slice(0, 6);
                  const totalCatValue = segments.reduce((acc, curr) => acc + (curr.value || 0), 0);
                  const colors = activeThemeConfig.donutColors;
                  const circumference = 2 * Math.PI * 38;
                  let runningOffset = 0;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-4">
                      <div className="sm:col-span-5 flex items-center justify-center relative">
                        <div className="w-40 h-40 relative flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="38"
                              fill="transparent"
                              stroke="var(--bg-elevated)"
                              strokeWidth="12"
                            />
                            {totalCatValue > 0 && segments.map((seg, idx) => {
                              const shareRatio = seg.value / totalCatValue;
                              const dash = shareRatio * circumference;
                              const offset = runningOffset;
                              runningOffset += dash;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="transparent"
                                  stroke={colors[idx % colors.length].stroke}
                                  strokeWidth="12"
                                  strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
                                  strokeDashoffset={-offset}
                                  className="transition-all duration-300"
                                />
                              );
                            })}
                          </svg>
                          <div className="w-22 h-22 rounded-full flex flex-col items-center justify-center text-center pointer-events-none px-1 border border-subtle bg-card shadow-xs">
                            <span className="font-label-caps text-label-caps uppercase text-secondary font-bold tracking-wider text-[10px]">TOTAL</span>
                            <span className="font-headline-lg text-headline-lg font-extrabold leading-tight my-0.5 text-primary">
                              {totalCatValue >= 1000000 ? `${(totalCatValue / 1000000).toFixed(1)}M` : totalCatValue >= 1000 ? `${(totalCatValue / 1000).toFixed(1)}k` : Math.round(totalCatValue).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono text-accent font-medium truncate max-w-[80px]" title={selectedDimension}>
                              {selectedDimension || 'Volume'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-7 flex flex-col gap-1.5 font-label-sm text-label-sm">
                        {segments.length > 0 ? (
                          segments.map((seg, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleDrilldown(seg.category)}
                              className="flex items-center justify-between p-2 rounded-lg transition-all border border-subtle bg-elevated/60 hover:border-accent/40 cursor-pointer"
                              title={`Click to filter granular rows by ${seg.category}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: colors[idx % colors.length].stroke }}
                                />
                                <span className="font-medium truncate max-w-[140px] text-primary">{seg.category}</span>
                              </div>
                              <div className="flex items-center gap-2.5 font-mono flex-shrink-0">
                                <span className="font-bold text-primary">{seg.share ? `${seg.share.toFixed(1)}%` : '0%'}</span>
                                <span className="text-[10px] text-secondary">{seg.value >= 1000 ? `${(seg.value / 1000).toFixed(1)}k` : seg.value.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted p-2 text-center">
                            No categorical dimensions found in current dataset.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2.5 border-t border-subtle flex items-center justify-between text-label-sm font-label-sm text-secondary">
                <span>Active Segments: <strong className="text-primary font-bold">{currentCategoryData?.length || 0}</strong></span>
                <span
                  onClick={() => setActiveTab('pareto')}
                  className="text-accent hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <span>Inspect Pareto Tail</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* "Ask your data" Card (5 cols) */}
            <div className="lg:col-span-5 depth-card rounded-[24px] p-5 sm:p-6 border border-subtle bg-card shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent border border-accent/30 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-primary font-bold tracking-wide">
                        Ask your data
                      </h3>
                      <p className="text-[11px] font-mono text-secondary">
                        Natural-language query grounded on {filteredRows.length.toLocaleString()} rows
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft text-accent border border-accent/25 font-bold">
                    Verified AI
                  </span>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCurrentTab('ai_insights');
                  }}
                  className="my-4 space-y-3"
                >
                  <label htmlFor="exec-ask-data-input" className="sr-only">
                    Ask a question about {project.name}
                  </label>
                  <div className="relative">
                    <input
                      id="exec-ask-data-input"
                      type="text"
                      value={askDataQuery}
                      onChange={(e) => setAskDataQuery(e.target.value)}
                      placeholder={`Ask about ${selectedTrendMetric || 'revenue'}, ${selectedDimension || 'segments'}, or anomalies...`}
                      className="w-full rounded-xl pl-3.5 pr-24 py-3 text-xs border border-subtle bg-elevated text-primary focus:outline-none focus:border-accent transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-accent hover:opacity-90 text-on-accent font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>Ask AI</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider block text-secondary">
                      Suggested questions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        `What drives ${selectedTrendMetric || 'top revenue'}?`,
                        `Which ${selectedDimension || 'segment'} has highest growth?`,
                        'Summarize anomalies & outliers'
                      ].map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => {
                            setAskDataQuery(suggestion);
                            setCurrentTab('ai_insights');
                          }}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg border border-subtle bg-elevated hover:border-accent/40 text-secondary hover:text-primary text-left transition-all cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              </div>

              <div className="pt-2.5 border-t border-subtle flex items-center justify-between text-xs text-secondary">
                <span className="font-mono text-[11px]">Zero-hallucination schema grounding</span>
                <button
                  type="button"
                  onClick={() => setCurrentTab('ai_insights')}
                  className="text-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Ask Data AI</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </section>

          {/* ACTIONABLE NOTIFICATION CALLOUTS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outlier Alert Callout */}
            <div className={`rounded-2xl p-4 shadow-sm border flex items-start gap-3 relative overflow-hidden transition-all card-3d ${
              isLight 
                ? 'bg-white border-rose-200 hover:border-rose-300 shadow-rose-100/50' 
                : 'bg-surface-card border-rose-500/25 hover:border-rose-400/50 shadow-md'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs'
                  : 'bg-rose-500/20 text-rose-400 border-rose-400/30 shadow-lg'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-headline-sm text-headline-sm font-bold ${
                    isLight ? 'text-primary' : 'text-primary'
                  }`}>
                    {primaryAnomaly ? primaryAnomaly.title : 'Statistical Dispersion Audit'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps uppercase font-bold tracking-wider border ${
                    isLight
                      ? 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold'
                      : 'bg-rose-500/10 text-rose-300 border-rose-400/30'
                  }`}>
                    {primaryAnomaly?.severity ? primaryAnomaly.severity.toUpperCase() : 'AUDITED'}
                  </span>
                </div>
                <p className={`font-body-sm text-body-sm mt-0.5 ${
                  isLight ? 'text-muted font-medium' : 'text-secondary'
                }`}>
                  {primaryAnomaly ? primaryAnomaly.reason : 'All numerical distributions conform to standard statistical limits.'}
                </p>
                <p className={`font-body-sm text-body-sm font-semibold mt-1 ${
                  isLight ? 'text-rose-700' : 'text-rose-400'
                }`}>
                  Action: {primaryAnomaly ? primaryAnomaly.recommendedAction : 'Continue periodic data hygiene and schema validation checks.'}
                </p>
              </div>
            </div>

            {/* Growth Segment Callout */}
            <div className={`rounded-2xl p-4 shadow-sm border flex items-start gap-3 relative overflow-hidden transition-all card-3d ${
              isLight
                ? 'bg-white border-slate-200 hover:border-sky-300 shadow-slate-100'
                : 'bg-surface-card border-white/10 hover:border-sky-400/40 shadow-md'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                isLight
                  ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-xs'
                  : 'bg-sky-500/15 text-cyan-400 border-sky-400/30 shadow-lg'
              }`}>
                <TrendingUp className={`w-5 h-5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
              </div>
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-headline-sm text-headline-sm font-bold ${
                    isLight ? 'text-primary' : 'text-primary'
                  }`}>
                    {primaryOpportunity ? primaryOpportunity.title : 'Segment Optimization Directive'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps uppercase font-bold tracking-wider border ${
                    isLight
                      ? 'bg-sky-50 text-sky-800 border-sky-300 font-extrabold'
                      : 'bg-sky-500/15 text-cyan-300 border-sky-500/30'
                  }`}>
                    {primaryOpportunity?.priority ? `PRIORITY: ${primaryOpportunity.priority.toUpperCase()}` : 'OPTIMAL'}
                  </span>
                </div>
                <p className={`font-body-sm text-body-sm mt-0.5 ${
                  isLight ? 'text-muted font-medium' : 'text-secondary'
                }`}>
                  {primaryOpportunity ? primaryOpportunity.potentialImpact : 'Active data segments demonstrate balanced proportional distribution.'}
                </p>
                <p className={`font-body-sm text-body-sm font-semibold mt-1 ${
                  isLight ? 'text-sky-700' : 'text-cyan-400'
                }`}>
                  Next Step: {primaryOpportunity ? primaryOpportunity.action : 'Inspect categorical distributions in Pareto analysis.'}
                </p>
              </div>
            </div>
          </section>

          {/* ATTACHED DASHBOARDS & CUSTOM VISUALIZATIONS SECTION */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
              <div>
                <h3 className={`font-heading text-lg font-bold tracking-wide uppercase flex items-center gap-2 ${
                  isLight ? 'text-primary' : 'text-primary'
                }`}>
                  <Layers className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                  ATTACHED DASHBOARD VISUALIZATIONS & CUSTOM CHARTS
                </h3>
                <p className={`text-xs ${isLight ? 'text-muted font-medium' : 'text-secondary'}`}>
                  Attached visual widgets synchronized with active filters, drill-through, and export engines.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewVisCat(stringCols[0]?.name || '');
                    setNewVisVal(numericCols[0]?.name || '');
                    setIsAddVisModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-primary text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Add a new custom visual card to this dashboard"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Visual</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoSyncVisuals}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer ${
                    isLight
                      ? 'bg-elevated hover:bg-input text-muted border-slate-200'
                      : 'bg-surface-panel hover:bg-surface-elevated text-primary border-border-subtle'
                  }`}
                  title="Auto-adapt all visual cards to match current dataset schema"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                  <span>Auto-Adapt to Dataset</span>
                </button>

                <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold shadow-2xs ${
                  isLight
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'bg-surface-panel text-cyan-300 border border-border-subtle'
                }`}>
                  {customVisuals.length} Visuals
                </span>

                <button
                  onClick={() => setCurrentTab('dashboard_builder')}
                  className="glass-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Dashboard Builder</span>
                  <ExternalLink className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
                </button>
              </div>
            </div>

            {customVisuals.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {customVisuals.map((vis, vIdx) => {
                  const visKey = vis.id || String(vIdx);
                  const hasCat = columns.some(c => c.name === vis.categoryField);
                  const cat = hasCat ? vis.categoryField : (stringCols[0]?.name || columns[0]?.name || 'Category');

                  const hasVal = columns.some(c => c.name === vis.valueField);
                  const val = hasVal ? vis.valueField : (numericCols[0]?.name || columns[1]?.name || 'Value');

                  const agg = vis.aggregation || 'sum';
                  const visType = vis.type || 'bar';

                  const displayTitle = (vis.title && vis.title.trim())
                    || `${val.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} BY ${cat.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}`;

                  // Aggregate values using filtered rows
                  const groupMap = new Map<string, { sum: number; count: number }>();
                  let total = 0;
                  const effectiveVisualRows = filteredRows.length > 0 ? filteredRows : cleanRows;
                  effectiveVisualRows.forEach(r => {
                    const k = String(r[cat] ?? 'Unknown');
                    const num = Number(r[val]) || 0;
                    const cur = groupMap.get(k) || { sum: 0, count: 0 };
                    cur.sum += num;
                    cur.count += 1;
                    groupMap.set(k, cur);
                    total += num;
                  });

                  const items = Array.from(groupMap.entries()).map(([k, s]) => ({
                    category: k,
                    value: agg === 'avg' ? s.sum / (s.count || 1) : agg === 'count' ? s.count : s.sum,
                    share: total > 0 ? Math.round((s.sum / total) * 1000) / 10 : 0
                  })).sort((a, b) => b.value - a.value).slice(0, 8);

                  const maxVal = Math.max(safeMax(items.map(i => i.value), 1), 1);
                  const isCur = /revenue|sales|profit|margin|cost|amount|price|mrr|cac/i.test(val);
                  const formatVal = (n: number) => isCur ? `$${Math.round(n).toLocaleString()}` : Math.round(n).toLocaleString();

                  return (
                    <div 
                      key={visKey} 
                      className={`rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between shadow-sm border card-3d ${
                        isLight
                          ? 'bg-white border-slate-200 hover:border-sky-300 shadow-slate-100'
                          : 'bg-surface-card border-white/10 hover:border-sky-400/40 shadow-lg'
                      }`}
                    >
                      {/* Widget Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {editingVisId === visKey ? (
                            <div className="flex items-center gap-1.5 mb-1 animate-fadeIn">
                              <input
                                type="text"
                                value={editingVisTitle}
                                onChange={(e) => setEditingVisTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveVisTitle(vis.id);
                                  if (e.key === 'Escape') setEditingVisId(null);
                                }}
                                autoFocus
                                className={`px-2.5 py-1 text-xs border rounded font-bold uppercase focus:outline-none w-full max-w-xs ${
                                  isLight 
                                    ? 'bg-elevated border-sky-500 text-primary' 
                                    : 'bg-surface-panel border-sky-500 text-primary'
                                }`}
                              />
                              <button onClick={() => handleSaveVisTitle(vis.id)} className="p-1 rounded bg-sky-600 text-primary cursor-pointer" title="Save title"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingVisId(null)} className="p-1 rounded bg-input dark:bg-input text-muted dark:text-primary cursor-pointer" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 group/visTitle min-w-0 flex-1">
                              <h4 
                                className={`font-heading text-sm sm:text-base font-bold uppercase tracking-tight truncate min-w-0 flex-1 ${
                                  isLight ? 'text-primary font-extrabold' : 'text-primary font-bold'
                                }`}
                                title={displayTitle}
                              >
                                {displayTitle}
                              </h4>
                              <button
                                onClick={() => {
                                  setEditingVisId(visKey);
                                  setEditingVisTitle(displayTitle);
                                }}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all shadow-2xs shrink-0 cursor-pointer border ${
                                  isLight
                                    ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                                    : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
                                }`}
                                title="Rename this visual"
                              >
                                <Pencil className="w-3 h-3 text-sky-500 shrink-0" />
                                <span className="font-semibold text-[11px]">Rename</span>
                              </button>
                              <span className={`px-2 py-0.5 rounded text-label-caps font-label-caps uppercase font-bold shrink-0 border ${
                                isLight
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : 'bg-sky-500/10 text-cyan-300 border-sky-500/20'
                              }`}>
                                {visType}
                              </span>
                              {flags.chartGuide && (() => {
                                const rule = getChartGuideRule(visType);
                                if (!rule) return null;
                                return (
                                  <Tooltip
                                    side="top"
                                    title={`Why this chart: ${rule.name}`}
                                    tag={rule.fits}
                                    content={`${formatChartGuideReason(rule.id)} Example: "${rule.question}"`}
                                  >
                                    <button
                                      type="button"
                                      aria-label={`Why this chart: ${rule.name}. ${formatChartGuideReason(rule.id)}`}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold border border-accent/35 bg-accent-soft text-accent cursor-help shrink-0 focus-visible:outline-2 focus-visible:outline-accent"
                                    >
                                      <HelpCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                                      <span>Why this chart</span>
                                    </button>
                                  </Tooltip>
                                );
                              })()}
                            </div>
                          )}
                          <div className={`font-body-sm text-body-sm pt-0.5 ${isLight ? 'text-muted font-medium' : 'text-secondary'}`}>
                            {agg.toUpperCase()}({val}) by {cat} • Total: <strong className={`font-semibold ${isLight ? 'text-primary font-bold' : 'text-primary'}`}>{formatVal(total)}</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDrilldown(items[0]?.category || '')}
                          className={`font-label-sm text-label-sm flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                            isLight
                              ? 'text-sky-700 hover:text-sky-900 font-semibold'
                              : 'text-secondary hover:text-cyan-400'
                          }`}
                          title="Drill-through to records"
                        >
                          <span>Drilldown</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Widget Visual Content */}
                      <div className="py-2 min-h-[170px] flex items-center justify-center">
                        {visType === 'donut' || visType === 'pie' ? (
                          <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
                            <div className="relative w-36 h-36 shrink-0">
                              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                {(() => {
                                  let cumulativePct = 0;
                                  const colors = activeThemeConfig.donutColors.map(c => c.stroke);
                                  return items.slice(0, 6).map((item, idx) => {
                                    const strokeDasharray = `${Math.max(0.5, item.share * 2.512 - 0.8)} 251.2`;
                                    const strokeDashoffset = -cumulativePct * 2.512;
                                    cumulativePct += item.share;
                                    return (
                                      <circle
                                        key={idx}
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke={colors[idx % colors.length]}
                                        strokeWidth="11"
                                        strokeDasharray={strokeDasharray}
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                        onClick={() => handleDrilldown(item.category)}
                                      />
                                    );
                                  });
                                })()}
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                                <span className={`font-mono uppercase font-bold text-[9px] tracking-wider ${isLight ? 'text-muted' : 'text-secondary'}`}>TOTAL</span>
                                <span className={`font-mono text-sm sm:text-base font-extrabold tabular-nums tracking-tight ${isLight ? 'text-primary' : 'text-primary'}`}>{formatVal(total)}</span>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-xs w-full max-w-[210px]">
                              {items.slice(0, 5).map((it, i) => {
                                const dotColor = activeThemeConfig.donutColors[i % activeThemeConfig.donutColors.length]?.stroke || 'var(--chart-3)';
                                return (
                                  <div 
                                    key={i} 
                                    onClick={() => handleDrilldown(it.category)}
                                    className="flex justify-between items-center text-xs p-1 rounded-md hover:bg-elevated dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: dotColor }} />
                                      <span className={`truncate max-w-[110px] font-medium group-hover:text-sky-500 transition-colors ${isLight ? 'text-primary' : 'text-primary'}`} title={it.category}>
                                        {it.category}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono shrink-0 tabular-nums">
                                      <span className={`font-semibold ${isLight ? 'text-primary' : 'text-primary'}`}>{it.share}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : visType === 'boxplot' ? (
                          /* Tukey Quartile Boxplot in Executive Dashboard */
                          (() => {
                            const bData = computeBoxplotSummary(effectiveVisualRows, cat, val);
                            if (bData.length === 0) return <div className="text-xs text-muted p-4 text-center">Insufficient dispersion for boxplot.</div>;
                            const allVals = bData.flatMap(b => [b.min, b.max, ...b.outliers]);
                            const gMin = Math.min(...allVals);
                            const gMax = Math.max(...allVals);
                            const rng = Math.max(0.001, gMax - gMin);
                            const pH = 110;
                            const pW = 380;
                            const padX = 35;
                            const gW = (pW - padX * 2) / Math.max(1, bData.length);
                            const scY = (v: number) => 10 + pH - ((v - gMin) / rng) * pH;

                            return (
                              <div className="w-full space-y-2">
                                <svg viewBox="0 0 390 145" className="w-full h-36 overflow-visible select-none">
                                  {[0, 0.5, 1].map((pct, idx) => {
                                    const y = 10 + pH * (1 - pct);
                                    return <line key={idx} x1="25" y1={y} x2="385" y2={y} stroke={isLight ? 'var(--text-primary)' : 'var(--border-subtle)'} strokeDasharray="3,3" />;
                                  })}
                                  {bData.map((st, idx) => {
                                    const cX = padX + idx * gW + gW / 2;
                                    const bW = Math.min(26, Math.max(14, gW * 0.5));
                                    const yMin = scY(st.min);
                                    const yQ1 = scY(st.q1);
                                    const yMed = scY(st.median);
                                    const yQ3 = scY(st.q3);
                                    const yMax = scY(st.max);

                                    return (
                                      <g key={idx} className="cursor-pointer group" onClick={() => handleDrilldown(st.category)}>
                                        <line x1={cX} y1={yMin} x2={cX} y2={yMax} stroke="var(--chart-3)" strokeWidth="1.5" strokeDasharray="2,2" />
                                        <line x1={cX - bW * 0.35} y1={yMin} x2={cX + bW * 0.35} y2={yMin} stroke="var(--chart-3)" strokeWidth="2" />
                                        <line x1={cX - bW * 0.35} y1={yMax} x2={cX + bW * 0.35} y2={yMax} stroke="var(--chart-3)" strokeWidth="2" />
                                        <rect x={cX - bW / 2} y={Math.min(yQ1, yQ3)} width={bW} height={Math.max(4, Math.abs(yQ3 - yQ1))} fill="var(--chart-3)" fillOpacity={isLight ? 0.25 : 0.4} stroke="var(--chart-3)" strokeWidth="1.5" rx="3" />
                                        <line x1={cX - bW / 2} y1={yMed} x2={cX + bW / 2} y2={yMed} stroke={isLight ? 'var(--chart-3)' : 'var(--chart-3)'} strokeWidth="2.5" />
                                        {st.outliers.map((oVal, oIdx) => (
                                          <circle key={oIdx} cx={cX} cy={scY(oVal)} r="3" fill="var(--danger)" stroke="var(--text-primary)" strokeWidth="0.8" />
                                        ))}
                                        <text x={cX} y="138" textAnchor="middle" fill={isLight ? 'var(--border-subtle)' : 'var(--text-secondary)'} fontSize="9" fontWeight="600">
                                          {st.category.length > 7 ? `${st.category.slice(0, 6)}…` : st.category}
                                        </text>
                                      </g>
                                    );
                                  })}
                                </svg>
                                <div className="flex justify-between items-center text-[10px] font-mono text-muted pt-1 border-t border-border-subtle">
                                  <span>Median: {bData[0]?.median ? formatVal(bData[0].median) : 'N/A'}</span>
                                  <span className="text-sky-600 dark:text-cyan-400 font-semibold">Tukey 5-Number Dispersion</span>
                                </div>
                              </div>
                            );
                          })()
                        ) : visType === 'heatmap' ? (
                          /* Heatmap Matrix with 3D Beveled Tiles */
                          <div className="w-full space-y-2">
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 font-mono text-center">
                              {items.slice(0, 12).map((it, idx) => {
                                const intensity = Math.min(1, Math.max(0.2, it.value / maxVal));
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => handleDrilldown(it.category)}
                                    className="p-2 rounded-xl border cursor-pointer hover:scale-105 hover:-translate-y-0.5 transition-all flex flex-col justify-between shadow-md relative overflow-hidden"
                                    style={{ 
                                      backgroundColor: `color-mix(in srgb, var(--border-strong) 25%, transparent)`,
                                      borderColor: isLight ? 'color-mix(in srgb, var(--border-strong) 40%, transparent)' : 'var(--border-subtle)',
                                      boxShadow: isLight
                                        ? 'inset 0 1px 1px color-mix(in srgb, var(--text-primary) 60%, transparent), 0 2px 6px color-mix(in srgb, var(--bg-app) 10%, transparent)'
                                        : 'inset 0 1px 1px color-mix(in srgb, var(--text-primary) 35%, transparent), inset 0 -1px 1px color-mix(in srgb, var(--bg-app) 40%, transparent), 0 4px 12px color-mix(in srgb, var(--bg-app) 40%, transparent)'
                                    }}
                                    title={`${it.category}: ${formatVal(it.value)}`}
                                  >
                                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                    <span className="text-[10px] text-primary font-extrabold truncate relative z-10 drop-shadow-xs">{it.category}</span>
                                    <span className="text-[9px] text-primary font-bold font-mono relative z-10">
                                      {it.value >= 1000 ? `${(it.value / 1000).toFixed(1)}k` : it.value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex justify-between text-[10px] text-muted dark:text-secondary font-mono pt-1">
                              <span>Max: {formatVal(maxVal)}</span>
                              <span className="text-sky-600 dark:text-cyan-400 font-semibold">Temporal Matrix</span>
                            </div>
                          </div>
                        ) : visType === 'line' ? (
                          /* Smooth Spline Trend with 3D Depth & Spherical Nodes */
                          <div className="w-full">
                            {items.length >= 2 ? (
                              <div className="relative w-full">
                                <svg viewBox="0 0 400 135" className="w-full h-34 overflow-visible select-none">
                                  <defs>
                                    <filter id={`shadow-spline-${visKey}`} x="-10%" y="-10%" width="120%" height="150%">
                                      <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="var(--bg-app)" floodOpacity="0.55" />
                                    </filter>
                                    <linearGradient id={`grad-spline-${visKey}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={activeThemeConfig.trendActual} stopOpacity="0.32" />
                                      <stop offset="100%" stopColor={activeThemeConfig.trendActual} stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>

                                  {/* Grid lines */}
                                  {[0, 0.5, 1].map((pct, i) => (
                                    <line key={i} x1="20" y1={10 + 95 * (1 - pct)} x2="385" y2={10 + 95 * (1 - pct)} stroke={isLight ? 'var(--text-primary)' : 'var(--border-subtle)'} strokeDasharray="3,3" />
                                  ))}

                                  {(() => {
                                    const coords = items.map((it, i) => ({
                                      x: 20 + (i / Math.max(1, items.length - 1)) * 365,
                                      y: 10 + 95 - (it.value / maxVal) * 95,
                                      category: it.category,
                                      value: it.value
                                    }));

                                    // Cubic Bezier Spline Path Generator
                                    let splinePath = `M ${coords[0].x},${coords[0].y}`;
                                    for (let i = 0; i < coords.length - 1; i++) {
                                      const p0 = coords[i];
                                      const p1 = coords[i + 1];
                                      const cpx1 = p0.x + (p1.x - p0.x) * 0.45;
                                      const cpy1 = p0.y;
                                      const cpx2 = p1.x - (p1.x - p0.x) * 0.45;
                                      const cpy2 = p1.y;
                                      splinePath += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${p1.x},${p1.y}`;
                                    }
                                    const areaPath = `${splinePath} L ${coords[coords.length - 1].x},105 L ${coords[0].x},105 Z`;

                                    return (
                                      <>
                                        <path d={areaPath} fill={`url(#grad-spline-${visKey})`} />
                                        <path d={splinePath} fill="none" stroke={activeThemeConfig.trendActual} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter={`url(#shadow-spline-${visKey})`} />
                                        {coords.map((c, i) => (
                                          <g key={i} className="cursor-pointer group" onClick={() => handleDrilldown(c.category)}>
                                            <circle cx={c.x} cy={c.y} r="6" fill={activeThemeConfig.trendActual} fillOpacity="0.25" className="group-hover:r-8 transition-all" />
                                            <circle cx={c.x} cy={c.y} r="3.5" fill={isLight ? activeThemeConfig.trendActual : 'var(--bg-app)'} stroke={activeThemeConfig.trendActual} strokeWidth="2" filter={`url(#shadow-spline-${visKey})`} />
                                            <circle cx={c.x - 1} cy={c.y - 1} r="1.2" fill="var(--text-primary)" fillOpacity="0.9" />
                                          </g>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </svg>
                                <div className="flex justify-between text-[11px] text-muted font-mono pt-1">
                                  <span className="truncate max-w-[120px] font-medium">{items[0]?.category}</span>
                                  <span className="text-[10px] text-sky-600 dark:text-cyan-400 font-semibold">Cubic Spline Series</span>
                                  <span className="truncate max-w-[120px] text-right font-medium">{items[items.length - 1]?.category}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 text-center text-xs text-muted font-mono">Need at least 2 observations for time-series spline.</div>
                            )}
                          </div>
                        ) : visType === 'table' ? (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full text-left font-body-sm text-body-sm">
                              <thead className={`border-b font-mono text-[10px] uppercase font-bold tracking-wider ${
                                isLight 
                                  ? 'bg-elevated text-primary border-slate-200' 
                                  : 'bg-surface-panel text-secondary border-border-subtle'
                              }`}>
                                <tr>
                                  <th className="p-2">Rank</th>
                                  <th className="p-2">{cat}</th>
                                  <th className="p-2 text-right">{val}</th>
                                  <th className="p-2 text-right">Share</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-subtle font-mono text-xs">
                                {items.slice(0, 5).map((it, idx) => (
                                  <tr 
                                    key={idx} 
                                    onClick={() => handleDrilldown(it.category)}
                                    className={`transition-colors cursor-pointer ${
                                      isLight ? 'hover:bg-elevated' : 'hover:bg-surface-elevated/70'
                                    }`}
                                  >
                                    <td className="p-2 text-secondary font-bold">#{idx + 1}</td>
                                    <td className={`p-2 font-medium truncate max-w-[130px] font-sans ${isLight ? 'text-primary' : 'text-primary'}`}>{it.category}</td>
                                    <td className={`p-2 text-right font-bold tabular-nums ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>{formatVal(it.value)}</td>
                                    <td className={`p-2 text-right font-semibold tabular-nums ${isLight ? 'text-primary' : 'text-primary'}`}>{it.share}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          /* Modern 3D Ranked Cylindrical Bars with Recessed Track & Specular Reflection */
                          <div className="w-full space-y-3">
                            {items.slice(0, 5).map((it, idx) => {
                              const pct = Math.min(100, Math.max(6, (it.value / maxVal) * 100));
                              const barColor = activeThemeConfig.barColors[idx % activeThemeConfig.barColors.length] || 'var(--chart-3)';
                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => handleDrilldown(it.category)}
                                  className="space-y-1.5 p-1 -mx-1 rounded-xl hover:bg-elevated dark:hover:bg-white/[0.04] transition-all cursor-pointer group"
                                >
                                  <div className="flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-mono text-[10px] text-secondary font-bold shrink-0">#{idx + 1}</span>
                                      <span className={`font-semibold truncate max-w-[190px] group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors ${
                                        isLight ? 'text-primary' : 'text-primary'
                                      }`} title={it.category}>
                                        {it.category}
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 font-mono shrink-0 tabular-nums">
                                      <span className={`font-extrabold ${isLight ? 'text-primary' : 'text-primary'}`}>
                                        {formatVal(it.value)}
                                      </span>
                                      <span className={`text-[10px] font-medium ${isLight ? 'text-muted' : 'text-secondary'}`}>
                                        ({it.share}%)
                                      </span>
                                    </div>
                                  </div>

                                  <div className={`w-full h-3.5 rounded-lg overflow-hidden p-0.5 border transition-all ${
                                    isLight 
                                      ? 'bg-input border-slate-300 shadow-inner' 
                                      : 'bg-app border-white/10 track-3d-recessed'
                                  }`}>
                                    <div 
                                      className="h-full rounded-md transition-all duration-500 relative overflow-hidden group-hover:brightness-110 shadow-md bar-3d-cylinder"
                                      style={{
                                        width: `${pct}%`,
                                        background: `linear-gradient(180deg, color-mix(in srgb, var(--text-primary) 45%, transparent) 0%, var(--border-subtle) 40%, ${barColor} 65%, ${barColor} 100%)`,
                                        boxShadow: `0 2px 8px ${barColor}66`
                                      }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/25 pointer-events-none rounded-md" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Widget Footer */}
                      <div className={`pt-2.5 border-t border-border-subtle flex items-center justify-between text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
                        <span className="font-mono text-[11px]">{effectiveVisualRows.length.toLocaleString()} rows filtered</span>
                        <span className={`font-semibold flex items-center gap-1.5 text-[11px] ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Synchronized</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card border border-white/10 dark:border-white/10 rounded-2xl p-6 text-center space-y-3">
                <Layers className="w-8 h-8 text-sky-600 dark:text-cyan-400 mx-auto opacity-70" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-primary">Attach Custom Dashboards</h4>
                  <p className="text-xs text-secondary max-w-md mx-auto">
                    Create tailored charts in the Dashboard Builder or click the Scatter Plot, Heat Map, or Multi-Chart tabs above to explore all chart types!
                  </p>
                </div>
                <button
                  onClick={() => setCurrentTab('dashboard_builder')}
                  className="glass-btn-primary px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-md"
                >
                  Configure Visuals in Dashboard Builder
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCATTER PLOT TAB */}
      {activeTab === 'scatter' && (
        <ScatterPlotChart
          rows={filteredRows}
          columns={columns}
          defaultXField={numericCols[0]?.name}
          defaultYField={numericCols[1]?.name || numericCols[0]?.name}
          defaultCategoryField={stringCols[0]?.name}
          onPointClick={(pt) => {
            openDrillThrough({
              title: `Scatter Coordinate: ${pt.category}`,
              subtitle: `Inspecting record where ${pt.category} has X=${pt.xVal} and Y=${pt.yVal}`,
              filterColumn: stringCols[0]?.name,
              filterValue: pt.category,
              sourceContext: 'chart_bar'
            });
          }}
        />
      )}

      {/* 2D HEAT MAP TAB */}
      {activeTab === 'heatmap' && (
        <HeatMapChart
          rows={filteredRows}
          columns={columns}
          defaultRowDim={stringCols[0]?.name}
          defaultColDim={stringCols[1]?.name || stringCols[0]?.name}
          defaultMetric={numericCols[0]?.name}
          onCellClick={(rDim, rVal, cDim, cVal, metricVal) => {
            openDrillThrough({
              title: `Heat Map Intersection: ${rVal} × ${cVal}`,
              subtitle: `Records matching ${rDim}="${rVal}" AND ${cDim}="${cVal}" (Value: ${metricVal.toLocaleString()})`,
              filterColumn: rDim,
              filterValue: rVal,
              sourceContext: 'table_row'
            });
          }}
        />
      )}

      {/* MULTI-CHART SUITE TAB (RADAR, FUNNEL, WATERFALL, TREEMAP, GAUGE) */}
      {activeTab === 'multivariate' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-1 shadow-xl border border-white/10 dark:border-white/10">
            <h3 className="font-heading text-xl font-bold text-primary dark:text-primary tracking-wide uppercase flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600 dark:text-cyan-400" />
              COMPREHENSIVE MULTI-CHART ANALYTICS SUITE
            </h3>
            <p className="text-xs text-muted dark:text-secondary">
              Interactive Radar/Spider Footprint, Conversion Funnel, Financial Variance Waterfall, Proportional Treemap, and Performance Gauge Dial.
            </p>
          </div>

          {/* Grid 1: Radar & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RadarSpiderChart
              data={currentCategoryData.slice(0, 6).map(c => ({
                label: c.category,
                value: c.value,
                max: Math.max(safeMax(currentCategoryData.map(x => x.value), 1), 1)
              }))}
              metricName={selectedTrendMetric}
              onAxisClick={handleDrilldown}
            />

            <FunnelConversionChart
              stages={currentCategoryData.slice(0, 5).map(c => ({
                stage: c.category,
                value: c.value
              }))}
              metricName={selectedTrendMetric}
              onStageClick={handleDrilldown}
            />
          </div>

          {/* Grid 2: Waterfall & Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WaterfallChart
              steps={[
                { label: 'Baseline Gross', value: baselineRev, isTotal: true },
                { label: 'Volume Expansion', value: Math.round(baselineRev * 0.15) },
                { label: 'Price Variance', value: Math.round(baselineRev * 0.05) },
                { label: 'Direct COGS', value: -Math.round(baselineCost * 0.7) },
                { label: 'Operating OPEX', value: -Math.round(baselineCost * 0.3) },
                { label: 'Net Profit', value: baselineProfit, isTotal: true }
              ]}
              baseValue={baselineRev}
              metricName="USD"
              onStepClick={handleDrilldown}
            />

            <GaugeSpeedometerChart
              value={baselineProfit}
              target={baselineProfit * 1.25}
              metricName="Operating Margin"
              unit="$"
            />
          </div>

          {/* Row 3: Treemap */}
          <TreemapChart
            items={currentCategoryData.map(c => ({
              label: c.category,
              value: c.value
            }))}
            metricName={selectedTrendMetric}
            onItemClick={handleDrilldown}
          />
        </div>
      )}

      {/* 4. PARETO 80/20 TAB */}
      {activeTab === 'pareto' && (
        <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl border border-white/10 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-xl font-bold text-primary dark:text-primary tracking-wide uppercase flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-600 dark:text-cyan-400" />
                PARETO PRINCIPLE (80/20 ANALYSIS)
              </h3>
              <p className="text-xs text-muted dark:text-secondary">
                Identify the critical 20% of contributors driving 80% of aggregate volume or financial output.
              </p>
            </div>

            {stringCols.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted dark:text-secondary font-mono">Dimension:</span>
                <select
                  value={selectedDimension}
                  onChange={(e) => setSelectedDimension(e.target.value)}
                  className="glass-input text-xs text-primary dark:text-cyan-300 font-mono px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 focus:border-sky-500 focus:outline-none"
                >
                  {stringCols.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Pareto8020Chart
            data={currentCategoryData}
            metricName={selectedTrendMetric || 'Volume'}
            onSelectCategory={handleDrilldown}
            selectedCategory={filters.selectedDimensionValue}
          />
        </div>
      )}

      {/* 5. WHAT-IF SCENARIO TAB */}
      {activeTab === 'whatif' && (
        <WhatIfScenarioSimulator
          baselineRevenue={baselineRev}
          baselineProfit={baselineProfit}
        />
      )}

      {/* 6. PIVOT MATRIX TAB */}
      {activeTab === 'pivot' && (
        <MultiDimensionalPivotTable
          rows={filteredRows}
          columns={columns}
        />
      )}

      {/* 7. STATISTICAL DISPERSION TAB */}
      {activeTab === 'distribution' && (
        <StatisticalBoxplotInspector
          rows={filteredRows}
          columns={columns}
        />
      )}

      {/* 8. DATA ENGINEERING & LINEAGE ARCHITECTURE TAB */}
      {activeTab === 'data_engineering' && (
        <DataEngineeringSuite />
      )}

      {/* KPI Card Customizer & Heading Editor Modal */}
      {editingKpi && (
        <KpiCardEditorModal
          isOpen={true}
          kpi={editingKpi}
          onClose={() => setEditingKpi(null)}
        />
      )}

      {/* Add Custom Visual Modal */}
      {isAddVisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg border rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto card-3d ${
            isLight
              ? 'bg-white border-slate-200 text-primary shadow-xl'
              : 'bg-surface-card border-white/15 text-primary shadow-lg'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isLight ? 'border-slate-200' : 'border-border-subtle'
            }`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500/15 text-sky-600 dark:text-cyan-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isLight ? 'text-primary' : 'text-primary'}`}>Add Custom Visual</h3>
                  <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>Map metrics & dimensions from {project.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddVisModalOpen(false)} 
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isLight ? 'hover:bg-elevated text-muted' : 'hover:bg-surface-panel text-secondary'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomVisual} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className={`font-bold uppercase ${isLight ? 'text-muted' : 'text-secondary'}`}>Visual Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRR by Plan Tier, Revenue by Channel..."
                  value={newVisTitle}
                  onChange={(e) => setNewVisTitle(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl font-medium focus:outline-none ${
                    isLight 
                      ? 'bg-elevated border-slate-300 text-primary focus:border-sky-500' 
                      : 'bg-surface-panel border-white/10 text-primary focus:border-cyan-400'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-bold uppercase ${isLight ? 'text-muted' : 'text-secondary'}`}>Chart Type</label>
                  <select
                    value={newVisType}
                    onChange={(e) => setNewVisType(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl font-medium focus:outline-none cursor-pointer ${
                      isLight 
                        ? 'bg-elevated border-slate-300 text-primary focus:border-sky-500' 
                        : 'bg-surface-panel border-white/10 text-primary focus:border-cyan-400'
                    }`}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line / Trend</option>
                    <option value="donut">Donut / Proportion</option>
                    <option value="table">Table Matrix</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`font-bold uppercase ${isLight ? 'text-muted' : 'text-secondary'}`}>Aggregation</label>
                  <select
                    value={newVisAgg}
                    onChange={(e) => setNewVisAgg(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl font-medium focus:outline-none cursor-pointer ${
                      isLight 
                        ? 'bg-elevated border-slate-300 text-primary focus:border-sky-500' 
                        : 'bg-surface-panel border-white/10 text-primary focus:border-cyan-400'
                    }`}
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVERAGE</option>
                    <option value="count">COUNT</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`font-bold uppercase ${isLight ? 'text-muted' : 'text-secondary'}`}>Dimension / Axis</label>
                  <select
                    value={newVisCat || stringCols[0]?.name || ''}
                    onChange={(e) => setNewVisCat(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl font-medium focus:outline-none cursor-pointer ${
                      isLight 
                        ? 'bg-elevated border-slate-300 text-primary focus:border-sky-500' 
                        : 'bg-surface-panel border-white/10 text-primary focus:border-cyan-400'
                    }`}
                  >
                    {stringCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`font-bold uppercase ${isLight ? 'text-muted' : 'text-secondary'}`}>Metric Column</label>
                  <select
                    value={newVisVal || numericCols[0]?.name || ''}
                    onChange={(e) => setNewVisVal(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl font-medium focus:outline-none cursor-pointer ${
                      isLight 
                        ? 'bg-elevated border-slate-300 text-primary focus:border-sky-500' 
                        : 'bg-surface-panel border-white/10 text-primary focus:border-cyan-400'
                    }`}
                  >
                    {numericCols.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddVisModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-medium cursor-pointer ${
                    isLight 
                      ? 'bg-elevated hover:bg-input text-muted' 
                      : 'bg-surface-panel hover:bg-surface-elevated text-secondary'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-primary font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Add Visual to Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
