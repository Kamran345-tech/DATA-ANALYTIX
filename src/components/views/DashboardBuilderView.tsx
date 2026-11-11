import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Table2, 
  Sparkles,
  Download,
  RotateCcw,
  Layers,
  Settings2,
  Check,
  Pencil,
  X,
  Eye,
  Filter,
  FileText,
  FileSpreadsheet,
  Loader2,
  Package,
  CircleDot,
  Grid,
  Compass,
  Gauge,
  Activity,
  Box,
  Lightbulb,
  Calendar,
  CheckCircle2,
  Zap,
  Info,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { VisualConfig } from '../../types';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { GlobalFilterBar } from '../common/GlobalFilterBar';
import { InteractiveSlicersBar } from '../common/InteractiveSlicersBar';
import { ModernEmptyState } from '../modern/ModernEmptyState';
import { DownloadMenu } from '../common/DownloadMenu';
import { safeMax } from '../../utils/mathUtils';
import { 
  recommendChartsForFields, 
  recommendDatasetDashboard, 
  computeBoxplotSummary,
  capCategoriesWithOther,
  evaluateChartRuleFit,
  parseNumericValue,
  sampleRowsForChart,
  ChartRecommendation 
} from '../../engine/chartRecommendationEngine';
import { loadFeatureFlags, FeatureFlags } from '../../config/features';
import {
  CHART_GUIDE_RULES,
  ChartGuideId,
  ChartGuideRule,
  getChartGuideRule,
  formatChartGuideReason
} from '../../config/chartGuide';
import { HistogramChart, StackedBarChart, GuideChartRenderer } from '../charts/InteractiveCharts';
import { useToast } from '../../store/useToast';
import {
  buildGuideChartPlottedCSV,
  exportChartPlottedDataCSV,
  exportChartContainerPNG
} from '../../utils/chartExport';

const renderChartGuideIllustration = (id: ChartGuideId) => {
  switch (id) {
    case 'bar':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <rect x="6" y="22" width="10" height="14" rx="2" fill="var(--chart-1)" fillOpacity="0.45" />
          <rect x="20" y="12" width="10" height="24" rx="2" fill="var(--chart-1)" fillOpacity="0.75" />
          <rect x="34" y="5" width="10" height="31" rx="2" fill="var(--chart-1)" />
          <rect x="48" y="16" width="10" height="20" rx="2" fill="var(--chart-2)" fillOpacity="0.85" />
          <line x1="4" y1="36" x2="60" y2="36" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'line':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <path d="M 6 30 L 20 21 L 34 25 L 46 12 L 58 7 L 58 36 L 6 36 Z" fill="var(--chart-1)" fillOpacity="0.16" />
          <path d="M 6 30 L 20 21 L 34 25 L 46 12 L 58 7" fill="none" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="30" r="2.5" fill="var(--chart-1)" />
          <circle cx="20" cy="21" r="2.5" fill="var(--chart-1)" />
          <circle cx="34" cy="25" r="2.5" fill="var(--chart-1)" />
          <circle cx="46" cy="12" r="2.5" fill="var(--chart-2)" />
          <circle cx="58" cy="7" r="3" fill="var(--chart-1)" />
        </svg>
      );
    case 'scatter':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <line x1="8" y1="33" x2="56" y2="9" stroke="var(--chart-2)" strokeWidth="1.2" strokeDasharray="3,3" />
          <circle cx="12" cy="30" r="3" fill="var(--chart-1)" />
          <circle cx="21" cy="24" r="3" fill="var(--chart-1)" fillOpacity="0.85" />
          <circle cx="28" cy="27" r="2.5" fill="var(--chart-2)" />
          <circle cx="37" cy="18" r="3.2" fill="var(--chart-1)" />
          <circle cx="45" cy="15" r="2.8" fill="var(--chart-2)" />
          <circle cx="53" cy="10" r="3.2" fill="var(--chart-1)" />
        </svg>
      );
    case 'histogram':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <rect x="6" y="27" width="9" height="9" rx="1" fill="var(--chart-1)" fillOpacity="0.4" />
          <rect x="16" y="17" width="9" height="19" rx="1" fill="var(--chart-1)" fillOpacity="0.7" />
          <rect x="26" y="7" width="9" height="29" rx="1" fill="var(--chart-1)" />
          <rect x="36" y="13" width="9" height="23" rx="1" fill="var(--chart-2)" fillOpacity="0.85" />
          <rect x="46" y="24" width="9" height="12" rx="1" fill="var(--chart-2)" fillOpacity="0.5" />
          <line x1="4" y1="36" x2="58" y2="36" stroke="var(--text-muted)" strokeWidth="1.5" />
        </svg>
      );
    case 'stacked_bar':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <rect x="8" y="22" width="11" height="14" rx="1.5" fill="var(--chart-1)" />
          <rect x="8" y="12" width="11" height="9" rx="1.5" fill="var(--chart-2)" />
          <rect x="26" y="18" width="11" height="18" rx="1.5" fill="var(--chart-1)" />
          <rect x="26" y="6" width="11" height="11" rx="1.5" fill="var(--chart-2)" />
          <rect x="44" y="25" width="11" height="11" rx="1.5" fill="var(--chart-1)" />
          <rect x="44" y="14" width="11" height="10" rx="1.5" fill="var(--chart-2)" />
        </svg>
      );
    case 'donut':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <circle cx="32" cy="20" r="13" fill="none" stroke="var(--bg-card)" strokeWidth="6" />
          <circle cx="32" cy="20" r="13" fill="none" stroke="var(--chart-1)" strokeWidth="6" strokeDasharray="48 82" strokeDashoffset="15" />
          <circle cx="32" cy="20" r="13" fill="none" stroke="var(--chart-2)" strokeWidth="6" strokeDasharray="24 82" strokeDashoffset="-33" />
        </svg>
      );
    case 'heatmap':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <rect x="8" y="6" width="13" height="12" rx="2" fill="var(--chart-1)" fillOpacity="0.3" />
          <rect x="24" y="6" width="13" height="12" rx="2" fill="var(--chart-1)" fillOpacity="0.95" />
          <rect x="40" y="6" width="13" height="12" rx="2" fill="var(--chart-2)" fillOpacity="0.65" />
          <rect x="8" y="21" width="13" height="12" rx="2" fill="var(--chart-2)" fillOpacity="0.85" />
          <rect x="24" y="21" width="13" height="12" rx="2" fill="var(--chart-1)" fillOpacity="0.45" />
          <rect x="40" y="21" width="13" height="12" rx="2" fill="var(--chart-1)" />
        </svg>
      );
    case 'boxplot':
      return (
        <svg viewBox="0 0 64 40" className="w-16 h-10 shrink-0" aria-hidden="true">
          <line x1="20" y1="6" x2="20" y2="34" stroke="var(--chart-1)" strokeWidth="1.5" strokeDasharray="2,2" />
          <rect x="13" y="13" width="14" height="14" rx="2" fill="var(--chart-1)" fillOpacity="0.3" stroke="var(--chart-1)" strokeWidth="1.5" />
          <line x1="13" y1="20" x2="27" y2="20" stroke="var(--chart-1)" strokeWidth="2.2" />
          <line x1="44" y1="8" x2="44" y2="32" stroke="var(--chart-2)" strokeWidth="1.5" strokeDasharray="2,2" />
          <rect x="37" y="14" width="14" height="11" rx="2" fill="var(--chart-2)" fillOpacity="0.3" stroke="var(--chart-2)" strokeWidth="1.5" />
          <line x1="37" y1="19" x2="51" y2="19" stroke="var(--chart-2)" strokeWidth="2.2" />
        </svg>
      );
  }
};

export const DashboardBuilderView: React.FC = () => {
  const { 
    project,
    brand,
    qualityReport,
    rawRows,
    cleanRows,
    filteredRows,
    columns,
    dataModel,
    analytics,
    daxMeasures,
    transformations,
    customVisuals, 
    addCustomVisual, 
    updateCustomVisual,
    removeCustomVisual, 
    setFilters,
    openDrillThrough,
    themeMode
  } = usePlatform();

  const activeRows = filteredRows ?? cleanRows;
  const isLight = themeMode === 'light';

  const [flags, setFlags] = useState<FeatureFlags>(() => loadFeatureFlags());

  useEffect(() => {
    const syncFlags = () => setFlags(loadFeatureFlags());
    window.addEventListener('dataanalytix:features-updated', syncFlags);
    return () => window.removeEventListener('dataanalytix:features-updated', syncFlags);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');
  const [activePreset, setActivePreset] = useState<string>('custom');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Inline chart title rename state
  const [editingVisId, setEditingVisId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const toastHook = useToast();

  // Chart Guide interactive state (used when flags.chartGuide is true)
  const [selectedGuideId, setSelectedGuideId] = useState<ChartGuideId>('bar');
  const [guideCatField, setGuideCatField] = useState<string>('');
  const [guideSecondCatField, setGuideSecondCatField] = useState<string>('');
  const [guideValField, setGuideValField] = useState<string>('');
  const [guideSecondValField, setGuideSecondValField] = useState<string>('');
  const [showAllGuideFields, setShowAllGuideFields] = useState<boolean>(false);
  const [isGuidePdfGenerating, setIsGuidePdfGenerating] = useState<boolean>(false);
  const [includeDatasetRecsInPdf, setIncludeDatasetRecsInPdf] = useState<boolean>(true);

  const handleDownloadCompleteGuidePDF = async () => {
    try {
      setIsGuidePdfGenerating(true);
      const { downloadChartGuidePDF } = await import('../../engine/exportEngine');
      const { filename, pageCount } = downloadChartGuidePDF({
        datasetName: project?.name || project?.sourceFileName || undefined,
        columns,
        rows: activeRows,
        includeDatasetRecommendations: includeDatasetRecsInPdf,
      });
      toastHook.success(
        'Chart Selection Guide Downloaded',
        `Saved ${filename} (${pageCount} pages).`
      );
      setDownloadSuccess(`Downloaded ${filename} (${pageCount} pages)!`);
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
      toastHook.error(
        'Chart Guide PDF Failed',
        err?.message || 'Unable to generate the Chart Selection Guide PDF.'
      );
    } finally {
      setIsGuidePdfGenerating(false);
    }
  };

  const handleAutoSyncVisuals = () => {
    const recommendedSuite = recommendDatasetDashboard(columns, cleanRows);
    customVisuals.forEach(v => removeCustomVisual(v.id));
    recommendedSuite.forEach(v => addCustomVisual(v));
    setDownloadSuccess(`Intelligent Recommendation Engine deployed ${recommendedSuite.length} schema-tailored visualizations!`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleSaveChartTitle = (id: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      updateCustomVisual(id, { title: trimmed });
      setDownloadSuccess(`Renamed chart to "${trimmed}"`);
      setTimeout(() => setDownloadSuccess(null), 2500);
    }
    setEditingVisId(null);
  };

  // Form states for new visual modal
  const [title, setTitle] = useState('');
  const [type, setType] = useState<VisualConfig['type']>('bar');
  const [catField, setCatField] = useState(
    columns.find(c => c.dataType === 'string')?.name || columns[0]?.name || ''
  );
  const [valField, setValField] = useState(
    columns.find(c => c.dataType === 'number')?.name || columns[0]?.name || ''
  );
  const [aggregation, setAggregation] = useState<VisualConfig['aggregation']>('sum');
  const [colorTheme, setColorTheme] = useState('var(--chart-3)');

  // Local state to override chart types or metrics per card without losing chosen fields
  const [visualOverrides, setVisualOverrides] = useState<
    Record<
      string,
      {
        type?: VisualConfig['type'];
        valueField?: string;
        categoryField?: string;
        secondaryCategoryField?: string;
        secondaryValueField?: string;
      }
    >
  >({});

  // Ensure default visuals are populated if empty
  useEffect(() => {
    if (customVisuals.length === 0 && analytics.visuals && analytics.visuals.length > 0) {
      analytics.visuals.forEach(v => addCustomVisual(v));
    }
  }, [customVisuals.length, analytics.visuals, addCustomVisual]);

  // Numeric, Date, and String columns
  const numericCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);
  const dateCols = useMemo(() => columns.filter(c => c.dataType === 'date' || /date|time|month|year|day|quarter|period/i.test(c.name)), [columns]);
  const stringCols = useMemo(() => columns.filter(c => c.dataType === 'string' || c.dataType === 'date'), [columns]);
  const pureCategoryCols = useMemo(() => columns.filter(c => c.dataType === 'string'), [columns]);
  const lowCardCategoryCols = useMemo(() => {
    return pureCategoryCols.filter(c => {
      const distinct = new Set(cleanRows.map(r => String(r[c.name] ?? '')).filter(Boolean)).size;
      return distinct >= 1 && distinct <= 5;
    });
  }, [pureCategoryCols, cleanRows]);

  // Initialize guide fields when columns change
  useEffect(() => {
    if (!guideCatField && (pureCategoryCols[0]?.name || stringCols[0]?.name || columns[0]?.name)) {
      setGuideCatField(pureCategoryCols[0]?.name || stringCols[0]?.name || columns[0]?.name || '');
    }
    if (!guideSecondCatField && (pureCategoryCols[1]?.name || pureCategoryCols[0]?.name || stringCols[0]?.name)) {
      setGuideSecondCatField(pureCategoryCols[1]?.name || pureCategoryCols[0]?.name || stringCols[0]?.name || '');
    }
    if (!guideValField && (numericCols[0]?.name || columns[0]?.name)) {
      setGuideValField(numericCols[0]?.name || columns[0]?.name || '');
    }
    if (!guideSecondValField && (numericCols[1]?.name || numericCols[0]?.name)) {
      setGuideSecondValField(numericCols[1]?.name || numericCols[0]?.name || '');
    }
  }, [columns, pureCategoryCols, stringCols, numericCols, guideCatField, guideSecondCatField, guideValField, guideSecondValField]);

  // Compatible column filters when clicking a card in the Chart Guide
  const handleSelectGuideCard = (rule: ChartGuideRule) => {
    setSelectedGuideId(rule.id);
    setShowAllGuideFields(false);

    if (rule.id === 'line') {
      if (dateCols.length > 0 && !dateCols.some(d => d.name === guideCatField)) {
        setGuideCatField(dateCols[0].name);
      }
    } else if (rule.id === 'donut') {
      if (lowCardCategoryCols.length > 0 && !lowCardCategoryCols.some(c => c.name === guideCatField)) {
        setGuideCatField(lowCardCategoryCols[0].name);
      }
    } else if (rule.id === 'histogram') {
      if (numericCols.length > 0) {
        setGuideValField(numericCols[0].name);
        setGuideCatField(numericCols[0].name);
      }
    } else if (rule.id === 'scatter') {
      if (numericCols.length >= 2) {
        setGuideValField(numericCols[0].name);
        setGuideSecondValField(numericCols[1].name);
      }
    } else if (rule.id === 'stacked_bar' || rule.id === 'heatmap') {
      const cat1 = pureCategoryCols[0]?.name || stringCols[0]?.name || '';
      const cat2 = pureCategoryCols.find(c => c.name !== cat1)?.name || stringCols.find(c => c.name !== cat1)?.name || cat1;
      if (cat1) setGuideCatField(cat1);
      if (cat2) setGuideSecondCatField(cat2);
    } else {
      if (pureCategoryCols.length > 0 && !pureCategoryCols.some(c => c.name === guideCatField)) {
        setGuideCatField(pureCategoryCols[0].name);
      }
    }
  };

  // Handle creating visual from form
  const handleCreateVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newVisual: VisualConfig = {
      id: `vis-${Date.now()}`,
      title: title.trim(),
      type,
      categoryField: type === 'histogram' ? (valField || numericCols[0]?.name || 'Value') : (catField || stringCols[0]?.name || 'Category'),
      valueField: valField || numericCols[0]?.name || 'Value',
      secondaryCategoryField: (type === 'stacked_bar' || type === 'heatmap')
        ? (pureCategoryCols.find(c => c.name !== catField)?.name || stringCols[0]?.name)
        : undefined,
      secondaryValueField: type === 'scatter'
        ? (numericCols.find(c => c.name !== valField)?.name || numericCols[0]?.name)
        : undefined,
      aggregation: type === 'histogram' ? 'count' : aggregation,
      color: colorTheme,
      description: flags.chartGuide && getChartGuideRule(type)
        ? formatChartGuideReason(getChartGuideRule(type)!.id)
        : `${aggregation.toUpperCase()}(${valField}) segmented by ${catField}`
    };

    addCustomVisual(newVisual);
    setIsModalOpen(false);
    setTitle('');
  };

  // AI Prompt Synthesizer
  const handleAIGenerate = () => {
    if (!nlPrompt.trim()) return;
    const lower = nlPrompt.toLowerCase();
    
    // Choose chart type
    let chosenType: VisualConfig['type'] = 'bar';
    if (lower.includes('trend') || lower.includes('time') || lower.includes('month') || lower.includes('line')) {
      chosenType = 'line';
    } else if (lower.includes('share') || lower.includes('pie') || lower.includes('donut') || lower.includes('proportion')) {
      chosenType = 'donut';
    } else if (lower.includes('table') || lower.includes('matrix') || lower.includes('detail')) {
      chosenType = 'table';
    }

    const numCol = numericCols.find(c => lower.includes(c.name.toLowerCase()))?.name || numericCols[0]?.name || 'Value';
    const catCol = stringCols.find(c => lower.includes(c.name.toLowerCase()))?.name || stringCols[0]?.name || 'Category';

    const generated: VisualConfig = {
      id: `vis-ai-${Date.now()}`,
      title: `${numCol} Breakdown by ${catCol}`,
      type: chosenType,
      categoryField: catCol,
      valueField: numCol,
      aggregation: lower.includes('average') || lower.includes('avg') ? 'avg' : 'sum',
      color: chosenType === 'donut' ? 'var(--chart-3)' : 'var(--chart-3)',
      description: `Synthesized: "${nlPrompt}"`
    };

    addCustomVisual(generated);
    setNlPrompt('');
  };

  // Load Preset Dashboard templates
  const loadPreset = (presetName: string) => {
    setActivePreset(presetName);
    const num1 = numericCols[0]?.name || 'Revenue';
    const num2 = numericCols[1]?.name || num1;
    const str1 = stringCols[0]?.name || 'Category';
    const str2 = stringCols[1]?.name || str1;

    if (presetName === 'financial') {
      const p1: VisualConfig = {
        id: `vis-p1-${Date.now()}`,
        title: `Primary Revenue Performance (${str1})`,
        type: 'bar',
        categoryField: str1,
        valueField: num1,
        aggregation: 'sum',
        color: 'var(--chart-3)'
      };
      const p2: VisualConfig = {
        id: `vis-p2-${Date.now()}`,
        title: `Financial Share Breakdown (${str2})`,
        type: 'donut',
        categoryField: str2,
        valueField: num2,
        aggregation: 'sum',
        color: 'var(--chart-3)'
      };
      const p3: VisualConfig = {
        id: `vis-p3-${Date.now()}`,
        title: `Monthly Growth Progression`,
        type: 'line',
        categoryField: columns.find(c => c.dataType === 'date')?.name || str1,
        valueField: num1,
        aggregation: 'sum',
        color: 'var(--chart-4)'
      };
      const p4: VisualConfig = {
        id: `vis-p4-${Date.now()}`,
        title: `Operational Matrix Overview`,
        type: 'table',
        categoryField: str1,
        valueField: num1,
        aggregation: 'avg',
        color: 'var(--chart-7)'
      };
      [p1, p2, p3, p4].forEach(v => addCustomVisual(v));
    } else if (presetName === 'operations') {
      const p1: VisualConfig = {
        id: `vis-op1-${Date.now()}`,
        title: `Volume & Transaction Distribution`,
        type: 'bar',
        categoryField: str1,
        valueField: num1,
        aggregation: 'count',
        color: 'var(--chart-3)'
      };
      const p2: VisualConfig = {
        id: `vis-op2-${Date.now()}`,
        title: `Segment Channel Proportion`,
        type: 'donut',
        categoryField: str2,
        valueField: num1,
        aggregation: 'sum',
        color: 'var(--chart-5)'
      };
      [p1, p2].forEach(v => addCustomVisual(v));
    } else if (presetName === 'all_charts') {
      const suite: VisualConfig[] = [
        {
          id: `vis-scatter-${Date.now()}`,
          title: `Scatter Plot & Correlation (${num1} vs ${num2})`,
          type: 'scatter',
          categoryField: str1,
          valueField: num1,
          secondaryValueField: num2,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-heatmap-${Date.now()}`,
          title: `2D Heat Map Density (${str1} by ${str2})`,
          type: 'heatmap',
          categoryField: str1,
          secondaryCategoryField: str2,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-bar-${Date.now()}`,
          title: `Ranked Vertical Bar Comparison`,
          type: 'bar',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-hbar-${Date.now()}`,
          title: `Horizontal Progress Breakdown`,
          type: 'horizontal_bar',
          categoryField: str2,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-line-${Date.now()}`,
          title: `Chronological Trend Progression`,
          type: 'line',
          categoryField: columns.find(c => c.dataType === 'date')?.name || str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-4)'
        },
        {
          id: `vis-area-${Date.now()}`,
          title: `Cumulative Volume Area Curve`,
          type: 'area',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-donut-${Date.now()}`,
          title: `Segment Composition Donut`,
          type: 'donut',
          categoryField: str1,
          valueField: num2,
          aggregation: 'sum',
          color: 'var(--chart-5)'
        },
        {
          id: `vis-pie-${Date.now()}`,
          title: `Channel Proportional Pie`,
          type: 'pie',
          categoryField: str2,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-2)'
        },
        {
          id: `vis-radar-${Date.now()}`,
          title: `Multi-Dimensional Spider Footprint`,
          type: 'radar',
          categoryField: str1,
          valueField: num1,
          aggregation: 'avg',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-funnel-${Date.now()}`,
          title: `Conversion Pipeline Funnel`,
          type: 'funnel',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-waterfall-${Date.now()}`,
          title: `Financial Variance Waterfall`,
          type: 'waterfall',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-treemap-${Date.now()}`,
          title: `Proportional Treemap Tiles`,
          type: 'treemap',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-4)'
        },
        {
          id: `vis-gauge-${Date.now()}`,
          title: `Performance Speedometer Dial`,
          type: 'gauge',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--chart-3)'
        },
        {
          id: `vis-table-${Date.now()}`,
          title: `Granular Matrix Data Table`,
          type: 'table',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: 'var(--text-muted)'
        }
      ];
      suite.forEach(v => addCustomVisual(v));
    }
  };

  const ALL_CHART_TYPES: { type: VisualConfig['type']; label: string }[] = useMemo(() => {
    const base: { type: VisualConfig['type']; label: string }[] = [
      { type: 'bar', label: 'Bar' },
      { type: 'horizontal_bar', label: 'H-Bar' },
      { type: 'line', label: 'Line' },
      { type: 'area', label: 'Area' },
      { type: 'donut', label: 'Donut' },
      { type: 'pie', label: 'Pie' },
      { type: 'boxplot', label: 'Boxplot' },
      { type: 'scatter', label: 'Scatter' },
      { type: 'heatmap', label: 'Heatmap' },
      ...(flags.chartGuide
        ? ([
            { type: 'histogram', label: 'Histogram' },
            { type: 'stacked_bar', label: 'Stacked Bar' }
          ] as { type: VisualConfig['type']; label: string }[])
        : []),
      { type: 'radar', label: 'Radar' },
      { type: 'funnel', label: 'Funnel' },
      { type: 'waterfall', label: 'Waterfall' },
      { type: 'treemap', label: 'Treemap' },
      { type: 'gauge', label: 'Gauge' },
      { type: 'table', label: 'Table' }
    ];
    return base;
  }, [flags.chartGuide]);

  // Helper to switch type on a card
  const toggleChartType = (visId: string, currentType: VisualConfig['type']) => {
    const types = ALL_CHART_TYPES.map(t => t.type);
    const nextType = types[(types.indexOf(currentType) + 1) % types.length];
    setVisualOverrides(prev => ({
      ...prev,
      [visId]: { ...prev[visId], type: nextType }
    }));
  };

  // Helper to compute grouped data with proper aggregation, null safety, and large-data sampling
  const computeGroupedData = (
    categoryField: string, 
    valueField: string, 
    agg: VisualConfig['aggregation'] = 'sum',
    capWithOther: boolean = false
  ) => {
    const sampleInfo = sampleRowsForChart(activeRows, 5000);
    const groupMap = new Map<string, { sum: number; count: number; min: number; max: number }>();
    let grandTotal = 0;
    let totalAbs = 0;

    sampleInfo.rows.forEach(r => {
      if (!r || typeof r !== 'object') return;
      const rawCat = r[categoryField];
      const cat = rawCat === null || rawCat === undefined || String(rawCat).trim() === '' ? 'Unassigned' : String(rawCat).trim();
      const parsedVal = parseNumericValue(r[valueField]);
      if (parsedVal === null && agg !== 'count') return;
      const val = parsedVal ?? 0;
      
      const current = groupMap.get(cat) || { sum: 0, count: 0, min: val, max: val };
      current.sum += val;
      current.count += 1;
      current.min = Math.min(current.min, val);
      current.max = Math.max(current.max, val);
      groupMap.set(cat, current);

      grandTotal += val;
      totalAbs += Math.abs(val);
    });

    const entries = Array.from(groupMap.entries()).map(([cat, stats]) => {
      let finalVal = stats.sum;
      if (agg === 'avg') finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
      else if (agg === 'count') finalVal = stats.count;
      else if (agg === 'min') finalVal = stats.min;
      else if (agg === 'max') finalVal = stats.max;

      const rounded = Math.round(finalVal * 100) / 100;
      return {
        category: cat,
        value: rounded,
        count: stats.count,
        share: totalAbs > 0 ? Math.round((Math.abs(stats.sum) / totalAbs) * 1000) / 10 : 0
      };
    });

    // Sort descending by value
    entries.sort((a, b) => b.value - a.value);
    if (capWithOther && entries.length > 10) {
      return {
        items: capCategoriesWithOther(entries, 10).items,
        grandTotal: Math.round(grandTotal * 100) / 100,
        allCount: entries.length,
        sampled: sampleInfo.sampled,
        sampleNotice: sampleInfo.notice
      };
    }
    return {
      items: entries.slice(0, 10),
      grandTotal: Math.round(grandTotal * 100) / 100,
      allCount: entries.length,
      sampled: sampleInfo.sampled,
      sampleNotice: sampleInfo.notice
    };
  };

  // 1. Download Created Dashboard (JSON Specification & Visual Data)
  const handleDownloadDashboardJSON = () => {
    const visualsExport = customVisuals.map(vis => {
      const override = visualOverrides[vis.id] || {};
      const activeType = override.type || vis.type;
      const activeVal = override.valueField || vis.valueField;
      const activeCat = override.categoryField || vis.categoryField;
      const { items, grandTotal } = computeGroupedData(activeCat, activeVal, vis.aggregation);
      return {
        id: vis.id,
        title: vis.title,
        type: activeType,
        aggregation: vis.aggregation,
        categoryField: activeCat,
        valueField: activeVal,
        color: vis.color,
        grandTotal,
        items
      };
    });

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
      visualsCount: visualsExport.length,
      createdVisuals: visualsExport
    };

    const blob = new Blob([JSON.stringify(dashboardPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Dashboard_Bundle.json`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Created Dashboard downloaded as JSON package!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 2. Download Executive Report as PDF
  const handleDownloadExecutivePDF = async () => {
    try {
      setIsPdfGenerating(true);
      const { generateEnterpriseReportPDF } = await import('../../engine/exportEngine');
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
      const doc = generateEnterpriseReportPDF(payload, {
        customVisuals: customVisuals.map(vis => {
          const override = visualOverrides[vis.id] || {};
          return {
            ...vis,
            type: override.type || vis.type,
            valueField: override.valueField || vis.valueField,
            categoryField: override.categoryField || vis.categoryField
          };
        }),
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });
      doc.save(`${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Executive_Report.pdf`);
      setDownloadSuccess('Executive PDF Report downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setDownloadSuccess(`PDF generation note: ${err?.message || 'Failed to compile report'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // 3. Download Standalone Offline HTML Dashboard
  const handleDownloadDashboardHTML = () => {
    const visualsExport = customVisuals.map(vis => {
      const override = visualOverrides[vis.id] || {};
      const activeType = override.type || vis.type;
      const activeVal = override.valueField || vis.valueField;
      const activeCat = override.categoryField || vis.categoryField;
      const { items, grandTotal } = computeGroupedData(activeCat, activeVal, vis.aggregation);
      return {
        title: vis.title,
        type: activeType,
        cat: activeCat,
        val: activeVal,
        agg: vis.aggregation,
        items,
        grandTotal
      };
    });

    const kpiCardsHtml = analytics.kpis.slice(0, 4).map(k => `
      <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:14px; padding:16px;">
        <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;">${k.name}</div>
        <div style="font-size:24px; font-weight:800; color:var(--text-primary); margin:6px 0;">${k.formattedValue}</div>
        <div style="font-size:11px; color:var(--chart-3);">Status: ${k.status}</div>
      </div>
    `).join('');

    const visualCardsHtml = visualsExport.map(v => `
      <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; padding:20px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:16px; text-transform:uppercase; color:var(--text-primary);">${v.title}</h3>
          <span style="font-size:11px; background:var(--bg-card); color:var(--chart-3); padding:3px 8px; border-radius:6px; font-family:monospace;">${v.agg.toUpperCase()}(${v.val}) by ${v.cat}</span>
        </div>
        <div>
          ${v.items.map(it => `
            <div style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:var(--text-secondary);">${it.category}</span>
                <span style="color:var(--text-primary); font-family:monospace; font-weight:600;">${it.value.toLocaleString()} (${it.share}%)</span>
              </div>
              <div style="background:var(--bg-card); height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:var(--chart-3); width:${Math.min(100, Math.max(5, it.share))}%; height:100%; border-radius:4px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.name} - Executive Dashboard</title>
  <style>
    body { margin:0; padding:30px; background:var(--bg-app); color:var(--text-primary); font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .container { max-width:1100px; margin:0 auto; }
    .header { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:18px; padding:24px; margin-bottom:24px; }
    .grid-kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px; }
    .grid-visuals { display:grid; grid-template-columns:repeat(auto-fit, minmax(480px, 1fr)); gap:20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="color:var(--chart-3); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">${brand.companyName} • ${brand.department}</div>
      <h1 style="font-size:28px; margin:8px 0; color:var(--text-primary); text-transform:uppercase;">${project.name}</h1>
      <div style="color:var(--text-muted); font-size:12px;">Exported on: ${new Date().toLocaleString()} | Verified Enterprise Data Model (${cleanRows.length} rows)</div>
    </div>
    <div class="grid-kpis">${kpiCardsHtml}</div>
    <div class="grid-visuals">${visualCardsHtml}</div>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Offline_Dashboard.html`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess('Interactive HTML dashboard exported!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // Export current visual as CSV (plotted data)
  const handleExportCSV = (
    visTitle: string,
    items: { category: string; value: number; share: number }[],
    chartMeta?: {
      chartType: string;
      categoryField: string;
      secondaryCategoryField?: string;
      valueField: string;
      secondaryValueField?: string;
      aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
    }
  ) => {
    const plotted = buildGuideChartPlottedCSV({
      chartType: chartMeta?.chartType || 'bar',
      rows: activeRows,
      categoryField: chartMeta?.categoryField || 'Category',
      secondaryCategoryField: chartMeta?.secondaryCategoryField,
      valueField: chartMeta?.valueField || 'Value',
      secondaryValueField: chartMeta?.secondaryValueField,
      aggregation: chartMeta?.aggregation || 'sum',
      fallbackItems: items,
    });
    const ok = exportChartPlottedDataCSV(`${visTitle}_plotted_data.csv`, plotted.headers, plotted.rows);
    if (ok) {
      toastHook.success('Plotted CSV Exported', `Exported ${plotted.rows.length} plotted rows for "${visTitle}".`);
    }
  };

  // Export current visual as PNG
  const handleExportPNG = async (
    containerSelector: string,
    visTitle: string,
    items: { category: string; value: number; share: number }[],
    chartMeta?: {
      chartType: string;
      categoryField: string;
      secondaryCategoryField?: string;
      valueField: string;
      secondaryValueField?: string;
      aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
    }
  ) => {
    const el = typeof document !== 'undefined' ? (document.querySelector(containerSelector) as HTMLElement | null) : null;
    const plotted = buildGuideChartPlottedCSV({
      chartType: chartMeta?.chartType || 'bar',
      rows: activeRows,
      categoryField: chartMeta?.categoryField || 'Category',
      secondaryCategoryField: chartMeta?.secondaryCategoryField,
      valueField: chartMeta?.valueField || 'Value',
      secondaryValueField: chartMeta?.secondaryValueField,
      aggregation: chartMeta?.aggregation || 'sum',
      fallbackItems: items,
    });
    const ok = await exportChartContainerPNG(el, `${visTitle}_chart.png`, visTitle, isLight, plotted);
    if (ok) {
      toastHook.success('Chart PNG Exported', `Saved high-resolution PNG for "${visTitle}".`);
    } else {
      toastHook.error('PNG Export Failed', `Could not render PNG for "${visTitle}".`);
    }
  };

  // Download Both (Created Dashboard + Executive Report ZIP Bundle)
  const handleDownloadBundleZip = async () => {
    try {
      setIsBundleGenerating(true);
      const visualsExport = customVisuals.map(vis => {
        const override = visualOverrides[vis.id] || {};
        const activeType = override.type || vis.type;
        const activeVal = override.valueField || vis.valueField;
        const activeCat = override.categoryField || vis.categoryField;
        const { items, grandTotal } = computeGroupedData(activeCat, activeVal, vis.aggregation);
        return {
          id: vis.id,
          title: vis.title,
          type: activeType,
          aggregation: vis.aggregation,
          categoryField: activeCat,
          valueField: activeVal,
          color: vis.color,
          grandTotal,
          items
        };
      });

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

      const { downloadDashboardAndReportBundle } = await import('../../engine/exportEngine');
      await downloadDashboardAndReportBundle(payload, {
        customVisuals: visualsExport,
        categoryPerformance: analytics.categoryPerformance,
        trends: analytics.trends,
        anomalies: analytics.anomalies,
        opportunities: analytics.opportunities
      });

      setDownloadSuccess('Created Dashboard & Executive Report bundle downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err: any) {
      console.error(err);
      setDownloadSuccess(`Bundle export note: ${err?.message || 'Error creating ZIP package'}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } finally {
      setIsBundleGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn w-full max-w-7xl mx-auto">
      {/* Download notification toast */}
      {downloadSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-sky-950/90 border border-cyan-400 text-cyan-200 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="bg-card border-subtle text-primary shadow-sm border rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1 basis-[280px]">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
              <SlidersHorizontal className="w-4 h-4 shrink-0" /> Custom Dashboard Composition Studio
            </div>
            
            {/* EDITABLE DASHBOARD NAME */}
            <div className="flex items-center gap-2 flex-wrap min-w-0 max-w-full">
              <EditableDashboardTitle className="text-2xl sm:text-3xl font-extrabold uppercase max-w-full" showLabelPrefix={false} />
            </div>

            <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
              Build, customize, and download your analytical dashboard. Switch between Bar, Line, Donut, and Table views in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 ml-auto">
            {/* Quick Presets */}
            <div className={`hidden sm:flex items-center border rounded-xl p-1 text-xs ${isLight ? 'bg-elevated border-slate-200' : 'bg-card border-subtle'}`}>
              <button
                onClick={() => loadPreset('financial')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${isLight ? 'text-muted hover:text-primary hover:bg-white' : 'text-secondary hover:text-primary hover:bg-elevated'}`}
              >
                Executive Pack
              </button>
              <button
                onClick={() => loadPreset('operations')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${isLight ? 'text-muted hover:text-primary hover:bg-white' : 'text-secondary hover:text-primary hover:bg-elevated'}`}
              >
                Operations Pack
              </button>
            </div>

            {/* Auto-Adapt to Dataset Button */}
            <button
              onClick={handleAutoSyncVisuals}
              className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                isLight
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300 shadow-xs'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/40'
              }`}
              title="Automatically detect date, category, and numeric columns and rebuild charts"
            >
              <Sparkles className="w-4 h-4 text-sky-500 shrink-0" />
              <span>Auto-Adapt to Dataset</span>
            </button>

            {/* Intelligent Schema Recommendations Modal Trigger */}
            <button
              onClick={() => setIsRecModalOpen(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                isLight
                  ? 'bg-sky-100 hover:bg-sky-200 text-sky-900 border-sky-400 shadow-xs'
                  : 'bg-sky-500/20 hover:bg-sky-500/30 text-cyan-300 border-cyan-400/50 shadow-lg'
              }`}
              title="View intelligent multi-type visualization recommendations tailored to your dataset schema"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>AI Schema Recommendations</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-sky-600 text-primary font-bold text-xs hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Custom Visual
            </button>
          </div>
        </div>

        {/* DOWNLOAD ACTION TOOLBAR (RULE: Download created dashboard & executive report) */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${isLight ? 'border-slate-200' : 'border-subtle'}`}>
          <div className={`flex items-center gap-2 text-xs font-mono ${isLight ? 'text-muted' : 'text-secondary'}`}>
            <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
            <span>Active Visuals: <strong className={isLight ? 'text-primary' : 'text-primary'}>{customVisuals.length} widgets</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Bundle (Dashboard + Executive Report Bundle ZIP) */}
            <button
              onClick={handleDownloadBundleZip}
              disabled={isBundleGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-primary text-xs font-semibold transition-all shadow-md shrink-0 whitespace-nowrap disabled:opacity-50 cursor-pointer"
              title="Download both the created dashboard and executive report in a single ZIP package"
            >
              {isBundleGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
              ) : (
                <Package className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              )}
              <span className="whitespace-nowrap font-bold">Download Bundle (ZIP)</span>
            </button>

            {/* Download Created Dashboard as JSON */}
            <button
              onClick={handleDownloadDashboardJSON}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isLight
                  ? 'bg-elevated hover:bg-input text-primary border-slate-300'
                  : 'bg-elevated hover:bg-elevated text-primary border-subtle hover:border-cyan-400/50'
              }`}
              title="Download full created dashboard specification & data as JSON"
            >
              <Download className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
              <span>Dashboard (JSON)</span>
            </button>

            {/* Download Executive Report as PDF */}
            <button
              onClick={handleDownloadExecutivePDF}
              disabled={isPdfGenerating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-50 ${
                isLight
                  ? 'bg-elevated hover:bg-input text-primary border-slate-300'
                  : 'bg-elevated hover:bg-elevated text-primary border-subtle hover:border-cyan-400/50'
              }`}
              title="Download verified Executive PDF Report"
            >
              {isPdfGenerating ? (
                <Loader2 className={`w-3.5 h-3.5 animate-spin ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
              ) : (
                <FileText className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
              )}
              <span>Executive Report (PDF)</span>
            </button>

            {/* Download Standalone HTML Dashboard */}
            <button
              onClick={handleDownloadDashboardHTML}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isLight
                  ? 'bg-elevated hover:bg-input text-primary border-slate-300 hover:border-amber-500/50'
                  : 'bg-elevated hover:bg-elevated text-primary border-subtle hover:border-amber-400/50'
              }`}
              title="Export standalone offline HTML dashboard"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
              <span>Offline HTML</span>
            </button>

            <DownloadMenu context="dashboard_builder" label="Download" />
          </div>
        </div>
      </div>

      {/* Global Filters & Interactive Slicers for Cross-Filtering */}
      <GlobalFilterBar />
      <InteractiveSlicersBar />

      {/* 2. Natural Language Visual Composer */}
      <div className="bg-card border-subtle text-primary shadow-sm border rounded-2xl p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Sparkles className="w-4 h-4 text-accent" />
          <span>NATURAL LANGUAGE DASHBOARD SYNTHESIS</span>
          <span className="text-[10px] font-mono hidden sm:inline text-muted">(Type what you want to chart and press Enter)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="e.g. 'Show revenue by region as a donut chart' or 'Trend of sales over time'..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border bg-input text-primary border-subtle focus:border-accent focus:outline-none placeholder:text-muted"
          />
          <button
            onClick={handleAIGenerate}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border bg-elevated hover:bg-card-hover text-primary border-subtle hover:border-accent/50 transition-colors shrink-0 cursor-pointer"
          >
            Synthesize Visual
          </button>
        </div>
      </div>

      {/* 2B. "Which chart should I use?" 8-Chart Guide Panel (behind chartGuide flag) */}
      {flags.chartGuide && (() => {
        const activeRule = getChartGuideRule(selectedGuideId) || CHART_GUIDE_RULES[0];
        const effectiveCat = selectedGuideId === 'histogram' ? guideValField : guideCatField;
        const effectiveVal = guideValField;
        const effectiveSecCat = (selectedGuideId === 'stacked_bar' || selectedGuideId === 'heatmap') ? guideSecondCatField : undefined;
        const effectiveSecVal = selectedGuideId === 'scatter' ? guideSecondValField : undefined;

        const guideRecs = recommendChartsForFields(
          effectiveCat,
          effectiveVal,
          columns,
          cleanRows,
          {
            chartGuide: true,
            secondaryCategoryColName: effectiveSecCat,
            secondaryValueColName: effectiveSecVal
          }
        );
        const bestRec = guideRecs[0];
        const bestGuideRule = bestRec ? getChartGuideRule(bestRec.type) : undefined;

        const fitCheck = evaluateChartRuleFit(activeRule.id, {
          categoryCol: columns.find(c => c.name === effectiveCat),
          secondaryCategoryCol: effectiveSecCat ? columns.find(c => c.name === effectiveSecCat) : undefined,
          valueCol: columns.find(c => c.name === effectiveVal),
          secondaryValueCol: effectiveSecVal ? columns.find(c => c.name === effectiveSecVal) : undefined,
          columns,
          rows: cleanRows
        });

        // Compatible columns for the active guide card
        const compatibleCategoryCols = (() => {
          if (showAllGuideFields) return columns;
          if (activeRule.id === 'line') return dateCols.length > 0 ? dateCols : stringCols;
          if (activeRule.id === 'donut') return lowCardCategoryCols.length > 0 ? lowCardCategoryCols : pureCategoryCols;
          if (activeRule.id === 'histogram') return numericCols;
          return pureCategoryCols.length > 0 ? pureCategoryCols : stringCols;
        })();

        const compatibleNumericCols = showAllGuideFields ? columns : numericCols;

        const previewGrouped = computeGroupedData(
          effectiveCat || stringCols[0]?.name || 'Category',
          effectiveVal || numericCols[0]?.name || 'Value',
          'sum',
          activeRule.id === 'bar' || activeRule.id === 'stacked_bar'
        );
        const previewMax = Math.max(safeMax(previewGrouped.items.map(i => i.value), 1), 1);

        return (
          <section
            aria-label="Which chart should I use? Interactive 8-chart guide"
            className="rounded-[20px] p-4 sm:p-6 space-y-5 border border-subtle bg-card text-primary shadow-sm transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent">
                  <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Interactive Chart Selection Guide</span>
                </div>
                <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-primary">
                  Which chart should I use?
                </h2>
                <p className="text-xs text-secondary">
                  Select a chart pattern below to filter compatible dataset columns, inspect guard rails, and preview with live data.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {bestGuideRule && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-accent/35 bg-accent-soft text-xs font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
                    <span className="text-primary">
                      Best match for picked fields: <strong className="text-accent">{bestGuideRule.name}</strong>
                    </span>
                  </div>
                )}

                {columns.length > 0 && (
                  <label className="inline-flex items-center gap-1.5 text-xs font-mono cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDatasetRecsInPdf}
                      onChange={(e) => setIncludeDatasetRecsInPdf(e.target.checked)}
                      aria-label='Include "Recommended for your data" page in PDF'
                      className="rounded border-subtle text-accent focus:ring-accent"
                    />
                    <span className="text-secondary">
                      Include &ldquo;Recommended for your data&rdquo; page
                    </span>
                  </label>
                )}

                <button
                  type="button"
                  onClick={handleDownloadCompleteGuidePDF}
                  disabled={isGuidePdfGenerating}
                  aria-label="Download complete guide (PDF)"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs border transition-all cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent bg-accent text-on-accent border-accent hover:opacity-95 shadow-xs"
                >
                  {isGuidePdfGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Download complete guide (PDF)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2x4 Responsive Grid of 8 Chart Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label="8-chart rule cards">
              {CHART_GUIDE_RULES.map((rule) => {
                const isSelected = selectedGuideId === rule.id;
                const isRecommended = bestGuideRule?.id === rule.id;

                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => handleSelectGuideCard(rule)}
                    aria-pressed={isSelected}
                    aria-label={`${rule.number} ${rule.name}. ${rule.purpose} Example question: ${rule.question}. Tip: ${rule.tip}.${isRecommended ? ' Recommended for current fields.' : ''}`}
                    className={`group text-left rounded-[20px] p-4 flex flex-col justify-between gap-3 border transition-all motion-reduce:transition-none motion-reduce:transform-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      isSelected
                        ? 'bg-accent-soft ring-2 ring-accent border-accent shadow-md'
                        : 'bg-elevated hover:bg-card-hover border-subtle hover:shadow-sm'
                    }`}
                  >
                    <div className="space-y-2.5 w-full">
                      {/* Top row: Mono number 01-08 + Recommended Badge + SVG Illustration */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="inline-block font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/30">
                            {rule.number}
                          </span>
                          {isRecommended && (
                            <span className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-[var(--accent-2)]/15 text-[var(--accent-2)] border border-[var(--accent-2)]/40">
                              <Sparkles className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                              <span>Recommended</span>
                            </span>
                          )}
                        </div>
                        {renderChartGuideIllustration(rule.id)}
                      </div>

                      {/* Name & One-line purpose */}
                      <div>
                        <div className="font-heading text-base font-bold text-primary">
                          {rule.name}
                        </div>
                        <p className="text-xs font-medium mt-0.5 text-secondary">
                          {rule.purpose}
                        </p>
                      </div>

                      {/* Example question */}
                      <p className="text-xs italic text-muted">
                        &ldquo;{rule.question}&rdquo;
                      </p>
                    </div>

                    {/* Tip line at bottom */}
                    <div className="pt-2.5 border-t border-subtle text-[11px] space-y-1 w-full">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--accent-2)]">
                        <span>Fits: {rule.fits}</span>
                      </div>
                      <p className="text-[11px] leading-snug text-secondary">
                        <strong className="font-mono uppercase text-[10px] text-accent">Tip: </strong>
                        {rule.tip}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Field Picker & Live Preview Workbench */}
            <div
              className="rounded-[20px] p-4 sm:p-5 border border-subtle bg-elevated space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-lg bg-accent-soft text-accent border border-accent/30">
                    {activeRule.number} • {activeRule.name} Preview
                  </span>
                  {bestGuideRule?.id === activeRule.id && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-accent-soft text-accent border border-accent/40">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Recommended</span>
                    </span>
                  )}
                  <span className="text-xs font-mono text-secondary">
                    Required shape: <strong>{activeRule.fits}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAllGuideFields(prev => !prev)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer transition-colors ${
                      showAllGuideFields
                        ? 'bg-[var(--accent-2)]/15 text-[var(--accent-2)] border-[var(--accent-2)]/40'
                        : 'bg-card text-secondary border-subtle hover:border-strong'
                    }`}
                  >
                    {showAllGuideFields ? 'Showing all columns' : `Filtered to compatible columns (${compatibleCategoryCols.length})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const newVis: VisualConfig = {
                        id: `vis-guide-${Date.now()}`,
                        title: `${activeRule.name}: ${effectiveVal} by ${effectiveCat}`,
                        type: activeRule.visualType,
                        categoryField: effectiveCat || stringCols[0]?.name || 'Category',
                        valueField: effectiveVal || numericCols[0]?.name || 'Value',
                        secondaryCategoryField: effectiveSecCat,
                        secondaryValueField: effectiveSecVal,
                        aggregation: activeRule.id === 'histogram' ? 'count' : 'sum',
                        color: 'var(--chart-1)',
                        description: formatChartGuideReason(activeRule.id)
                      };
                      addCustomVisual(newVis);
                      setDownloadSuccess(`Added ${activeRule.name} to dashboard canvas!`);
                      setTimeout(() => setDownloadSuccess(null), 2800);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-accent hover:opacity-95 text-on-accent font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                    <span>Mount {activeRule.name}</span>
                  </button>
                </div>
              </div>

              {/* Field Pickers Filtered to Compatible Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {activeRule.id !== 'histogram' && (
                  <label className="space-y-1 block">
                    <span className={`font-mono text-[11px] block ${isLight ? 'text-muted' : 'text-secondary'}`}>
                      {activeRule.id === 'line' ? 'Date / Time Column' : 'Category Column'}
                    </span>
                    <select
                      aria-label="Guide primary category or date column"
                      value={guideCatField}
                      onChange={(e) => setGuideCatField(e.target.value)}
                      className={`w-full p-2 rounded-xl border font-mono text-xs focus:outline-none ${
                        isLight ? 'bg-white border-slate-200 text-primary' : 'bg-card border-slate-800 text-primary'
                      }`}
                    >
                      {(compatibleCategoryCols.length > 0 ? compatibleCategoryCols : columns).map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dataType})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {(activeRule.id === 'stacked_bar' || activeRule.id === 'heatmap') && (
                  <label className="space-y-1 block">
                    <span className={`font-mono text-[11px] block ${isLight ? 'text-muted' : 'text-secondary'}`}>
                      Second Category / Series Column
                    </span>
                    <select
                      aria-label="Guide secondary category column"
                      value={guideSecondCatField}
                      onChange={(e) => setGuideSecondCatField(e.target.value)}
                      className={`w-full p-2 rounded-xl border font-mono text-xs focus:outline-none ${
                        isLight ? 'bg-white border-slate-200 text-primary' : 'bg-card border-slate-800 text-primary'
                      }`}
                    >
                      {(pureCategoryCols.length > 0 && !showAllGuideFields ? pureCategoryCols : columns).map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dataType})
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="space-y-1 block">
                  <span className={`font-mono text-[11px] block ${isLight ? 'text-muted' : 'text-secondary'}`}>
                    {activeRule.id === 'histogram' ? 'Numeric Column (Binned)' : 'Primary Measure (Numeric)'}
                  </span>
                  <select
                    aria-label="Guide primary numeric measure column"
                    value={guideValField}
                    onChange={(e) => setGuideValField(e.target.value)}
                    className={`w-full p-2 rounded-xl border font-mono text-xs focus:outline-none ${
                      isLight ? 'bg-white border-slate-200 text-primary' : 'bg-card border-slate-800 text-accent'
                    }`}
                  >
                    {(compatibleNumericCols.length > 0 ? compatibleNumericCols : columns).map(c => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.dataType})
                      </option>
                    ))}
                  </select>
                </label>

                {activeRule.id === 'scatter' && (
                  <label className="space-y-1 block">
                    <span className={`font-mono text-[11px] block ${isLight ? 'text-muted' : 'text-secondary'}`}>
                      Second Measure (Numeric Y-Axis)
                    </span>
                    <select
                      aria-label="Guide secondary numeric measure column"
                      value={guideSecondValField}
                      onChange={(e) => setGuideSecondValField(e.target.value)}
                      className={`w-full p-2 rounded-xl border font-mono text-xs focus:outline-none ${
                        isLight ? 'bg-white border-slate-200 text-primary' : 'bg-card border-slate-800 text-primary'
                      }`}
                    >
                      {(compatibleNumericCols.length > 0 ? compatibleNumericCols : columns).map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dataType})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {/* "Why this chart" line + Gentle Mismatch Warning */}
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-subtle bg-card text-secondary text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="font-mono uppercase text-[11px] text-accent">Why this chart: </strong>
                      {formatChartGuideReason(activeRule.id)}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--accent-2)]">
                    Question: &ldquo;{activeRule.question}&rdquo;
                  </span>
                </div>

                {!fitCheck.fits && fitCheck.mismatchWarning && (
                  <div
                    role="status"
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      isLight
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="space-y-1">
                      <div className="font-semibold">
                        Gentle field mismatch notice (preview still available):
                      </div>
                      <p className="text-[11px] leading-relaxed">{fitCheck.mismatchWarning}</p>
                      {bestGuideRule && bestGuideRule.id !== activeRule.id && (
                        <button
                          type="button"
                          onClick={() => handleSelectGuideCard(bestGuideRule)}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono font-bold underline text-accent cursor-pointer"
                        >
                          Switch to recommended {bestGuideRule.name}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Chart Area (All 8 Guide Charts) */}
              <div
                role="region"
                aria-label={`Live preview of ${activeRule.name} for ${effectiveVal} and ${effectiveCat}`}
                data-guide-preview-container="true"
                className="rounded-2xl p-4 border border-subtle bg-card space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-subtle">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
                    Live Plotted Preview — {activeRule.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Export ${activeRule.name} preview as PNG`}
                      onClick={() =>
                        handleExportPNG(
                          '[data-guide-preview-container="true"]',
                          `${activeRule.name} Preview`,
                          previewGrouped.items,
                          {
                            chartType: activeRule.id,
                            categoryField: effectiveCat || stringCols[0]?.name || 'Category',
                            secondaryCategoryField: effectiveSecCat,
                            valueField: effectiveVal || numericCols[0]?.name || 'Value',
                            secondaryValueField: effectiveSecVal,
                            aggregation: activeRule.id === 'histogram' ? 'count' : 'sum',
                          }
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-subtle bg-elevated hover:bg-card-hover text-secondary font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-accent" aria-hidden="true" />
                      <span>PNG</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Export ${activeRule.name} plotted data as CSV`}
                      onClick={() =>
                        handleExportCSV(
                          `${activeRule.name}_Preview`,
                          previewGrouped.items,
                          {
                            chartType: activeRule.id,
                            categoryField: effectiveCat || stringCols[0]?.name || 'Category',
                            secondaryCategoryField: effectiveSecCat,
                            valueField: effectiveVal || numericCols[0]?.name || 'Value',
                            secondaryValueField: effectiveSecVal,
                            aggregation: activeRule.id === 'histogram' ? 'count' : 'sum',
                          }
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-subtle bg-elevated hover:bg-card-hover text-secondary font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-[var(--accent-2)]" aria-hidden="true" />
                      <span>CSV</span>
                    </button>
                  </div>
                </div>
                <GuideChartRenderer
                  chartType={activeRule.id}
                  rows={activeRows}
                  categoryField={effectiveCat || stringCols[0]?.name || columns[0]?.name || 'Category'}
                  secondaryCategoryField={effectiveSecCat || stringCols[1]?.name || effectiveCat || ''}
                  valueField={effectiveVal || numericCols[0]?.name || columns[0]?.name || 'Value'}
                  secondaryValueField={effectiveSecVal || numericCols[1]?.name || effectiveVal || ''}
                  aggregation={activeRule.id === 'histogram' ? 'count' : 'sum'}
                  isLight={isLight}
                  onDrillThrough={(filterCol, filterVal, label) =>
                    openDrillThrough({
                      title: `${activeRule.name} Preview — ${label || filterVal}`,
                      subtitle: `Granular rows where ${filterCol} = "${filterVal}"`,
                      filterColumn: filterCol,
                      filterValue: filterVal,
                      sourceContext: 'chart_bar'
                    })
                  }
                />
              </div>
            </div>
          </section>
        );
      })()}

      {/* 3. Visuals Canvas Grid */}
      {customVisuals.length === 0 ? (
        <div className={`${isLight ? 'bg-white border-slate-200 text-primary shadow-sm' : 'bg-card border-subtle text-primary'} border rounded-2xl p-12 text-center space-y-4`}>
          <Layers className={`w-12 h-12 mx-auto opacity-70 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
          <div className="space-y-1">
            <h3 className={`text-base font-bold ${isLight ? 'text-primary' : 'text-primary'}`}>Canvas Ready for Custom Analytics</h3>
            <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-muted' : 'text-secondary'}`}>
              Add custom visualizations using the button above, or click below to load pre-built executive analytical widgets.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => loadPreset('all_charts')}
              className="px-4 py-2.5 rounded-xl bg-sky-600 text-primary font-semibold text-xs hover:bg-sky-500 shadow-lg shadow-sky-600/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Complete Chart Suite (Scatter, Heatmap & All 14 Chart Types)</span>
            </button>
            <button
              onClick={() => loadPreset('financial')}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs border transition-all ${
                isLight ? 'bg-elevated text-primary hover:bg-input border-slate-300' : 'bg-elevated text-primary hover:bg-elevated border-subtle'
              }`}
            >
              Load Financial Essentials
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {customVisuals.map((vis) => {
            const override = visualOverrides[vis.id] || {};
            const activeType = override.type || vis.type;
            const rawVal = override.valueField || vis.valueField;
            const rawCat = override.categoryField || vis.categoryField;
            const rawSecCat =
              override.secondaryCategoryField ||
              vis.secondaryCategoryField ||
              pureCategoryCols.find(c => c.name !== rawCat)?.name ||
              stringCols.find(c => c.name !== rawCat)?.name;
            const rawSecVal =
              override.secondaryValueField ||
              vis.secondaryValueField ||
              numericCols.find(c => c.name !== rawVal)?.name ||
              numericCols[0]?.name;

            const hasCat = columns.some(c => c.name === rawCat);
            const hasVal = columns.some(c => c.name === rawVal);
            const resolvedCat = hasCat ? rawCat : (stringCols[0]?.name || columns[0]?.name || 'Category');
            const resolvedVal = hasVal ? rawVal : (numericCols[0]?.name || columns.find(c => c.dataType === 'number')?.name || resolvedCat);
            const resolvedSecCat = rawSecCat && columns.some(c => c.name === rawSecCat) ? rawSecCat : resolvedCat;
            const resolvedSecVal = rawSecVal && columns.some(c => c.name === rawSecVal) ? rawSecVal : resolvedVal;
            const activeCat = resolvedCat;
            const activeVal = resolvedVal;

            const shouldCapWithOther = Boolean(flags.chartGuide && (activeType === 'bar' || activeType === 'stacked_bar'));
            const { items, grandTotal } = computeGroupedData(resolvedCat, resolvedVal, vis.aggregation, shouldCapWithOther);
            const maxVal = Math.max(safeMax(items.map(i => Math.abs(i.value)), 1), 1);
            const primaryColor = vis.color && vis.color !== 'var(--chart-1)' ? vis.color : 'var(--chart-3)';
            const cardGuideRule = flags.chartGuide ? getChartGuideRule(activeType) : undefined;

            return (
              <div 
                key={vis.id}
                role="region"
                aria-label={`${vis.title} (${activeType} chart): ${vis.aggregation} of ${resolvedVal} by ${resolvedCat}`}
                className="bg-card border-subtle text-primary shadow-sm hover:border-accent/50 border rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between"
              >
                {/* Visual Header & Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {editingVisId === vis.id ? (
                        <div className="flex items-center gap-1.5 mb-1 animate-fadeIn">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveChartTitle(vis.id);
                              if (e.key === 'Escape') setEditingVisId(null);
                            }}
                            autoFocus
                            placeholder="Chart Title..."
                            className={`px-2.5 py-1 rounded-lg border font-bold text-sm focus:outline-none w-full max-w-xs ${
                              isLight ? 'bg-elevated border-sky-500 text-primary' : 'bg-app border-cyan-400 text-primary'
                            }`}
                          />
                          <button
                            onClick={() => handleSaveChartTitle(vis.id)}
                            className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-primary shrink-0 cursor-pointer shadow-xs"
                            title="Save chart title"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            onClick={() => setEditingVisId(null)}
                            className={`p-1.5 rounded-lg shrink-0 cursor-pointer ${
                              isLight ? 'bg-elevated text-muted hover:text-primary' : 'bg-elevated text-secondary hover:text-primary'
                            }`}
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/title">
                          <h3 className={`font-heading text-lg font-bold uppercase truncate ${isLight ? 'text-primary' : 'text-primary'}`}>
                            {vis.title}
                          </h3>
                          <button
                            onClick={() => {
                              setEditingVisId(vis.id);
                              setEditingTitle(vis.title);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shadow-2xs shrink-0 cursor-pointer border ${
                              isLight
                                ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                                : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
                            }`}
                            title="Rename this chart"
                          >
                            <Pencil className="w-3 h-3 text-sky-500 shrink-0" />
                            <span className="font-semibold text-[11px]">Rename</span>
                          </button>
                        </div>
                      )}
                      <div className={`flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-0.5 ${isLight ? 'text-muted' : 'text-secondary'}`}>
                        <span className={`px-1.5 py-0.5 rounded border uppercase ${
                          isLight ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-card text-cyan-400 border-subtle'
                        }`}>
                          {vis.aggregation}({resolvedVal})
                        </span>
                        <span>by</span>
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isLight ? 'bg-elevated text-primary border-slate-200' : 'bg-card text-primary border-subtle'
                        }`}>
                          {resolvedCat}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Chart Type Selector Dropdown (preserves chosen fields) */}
                      <select
                        value={activeType}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: {
                            ...prev[vis.id],
                            type: e.target.value as any,
                            categoryField: resolvedCat,
                            valueField: resolvedVal,
                            secondaryCategoryField: resolvedSecCat,
                            secondaryValueField: resolvedSecVal
                          }
                        }))}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold focus:outline-none uppercase cursor-pointer ${
                          isLight
                            ? 'bg-elevated text-sky-800 border-slate-300 hover:border-sky-500'
                            : 'bg-card border-subtle hover:border-cyan-400/50 text-cyan-400'
                        }`}
                        title="Select Chart Representation"
                      >
                        {ALL_CHART_TYPES.map(t => (
                          <option key={t.type} value={t.type} className={isLight ? 'bg-white text-primary' : 'bg-card text-primary'}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Export PNG */}
                      <button
                        type="button"
                        aria-label={`Export ${vis.title} chart as PNG`}
                        onClick={() =>
                          handleExportPNG(`[data-chart-card-body="${vis.id}"]`, vis.title, items, {
                            chartType: activeType,
                            categoryField: resolvedCat,
                            secondaryCategoryField: resolvedSecCat,
                            valueField: resolvedVal,
                            secondaryValueField: resolvedSecVal,
                            aggregation: vis.aggregation,
                          })
                        }
                        className={`px-2 py-1 rounded-lg border font-mono text-[10px] font-semibold transition-colors cursor-pointer ${
                          isLight
                            ? 'text-muted border-slate-200 hover:bg-elevated'
                            : 'text-secondary border-subtle hover:text-primary hover:bg-elevated'
                        }`}
                        title="Export Chart as PNG"
                      >
                        PNG
                      </button>

                      {/* Export CSV */}
                      <button
                        type="button"
                        aria-label={`Export ${vis.title} plotted data as CSV`}
                        onClick={() =>
                          handleExportCSV(vis.title, items, {
                            chartType: activeType,
                            categoryField: resolvedCat,
                            secondaryCategoryField: resolvedSecCat,
                            valueField: resolvedVal,
                            secondaryValueField: resolvedSecVal,
                            aggregation: vis.aggregation,
                          })
                        }
                        className={`px-2 py-1 rounded-lg border font-mono text-[10px] font-semibold transition-colors cursor-pointer ${
                          isLight
                            ? 'text-muted border-slate-200 hover:bg-elevated'
                            : 'text-secondary border-subtle hover:text-primary hover:bg-elevated'
                        }`}
                        title="Export Plotted Chart Data as CSV"
                      >
                        CSV
                      </button>

                      <DownloadMenu
                        context="chart"
                        compact
                        chartPayload={{
                          chartId: vis.id,
                          chartTitle: vis.title,
                          containerSelector: `[data-chart-card-body="${vis.id}"]`,
                          chartType: activeType,
                          categoryField: resolvedCat,
                          secondaryCategoryField: resolvedSecCat,
                          valueField: resolvedVal,
                          secondaryValueField: resolvedSecVal,
                          aggregation: vis.aggregation,
                          fallbackItems: items,
                        }}
                      />

                      {/* Remove Visual */}
                      <button
                        onClick={() => removeCustomVisual(vis.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight ? 'text-muted hover:text-red-600 hover:bg-red-50' : 'text-secondary hover:text-red-400 hover:bg-elevated'
                        }`}
                        title="Remove Visual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Field Selectors */}
                  <div className={`flex flex-wrap items-center gap-2 pt-1 border-t ${isLight ? 'border-slate-100' : 'border-subtle'}`}>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={`font-mono ${isLight ? 'text-muted' : 'text-muted'}`}>Axis:</span>
                      <select
                        value={resolvedCat}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], categoryField: e.target.value }
                        }))}
                        className={`text-xs px-2 py-0.5 rounded border focus:outline-none ${
                          isLight
                            ? 'bg-elevated text-primary border-slate-200 focus:border-sky-500'
                            : 'bg-card text-secondary border-subtle focus:border-cyan-400'
                        }`}
                      >
                        {columns.map(c => <option key={c.name} value={c.name} className={isLight ? 'bg-white text-primary' : 'bg-card text-primary'}>{c.name}</option>)}
                      </select>
                    </div>

                    {(activeType === 'stacked_bar' || activeType === 'heatmap') && (
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className={`font-mono ${isLight ? 'text-muted' : 'text-muted'}`}>Split:</span>
                        <select
                          value={resolvedSecCat}
                          onChange={(e) => setVisualOverrides(prev => ({
                            ...prev,
                            [vis.id]: { ...prev[vis.id], secondaryCategoryField: e.target.value }
                          }))}
                          className={`text-xs px-2 py-0.5 rounded border focus:outline-none ${
                            isLight
                              ? 'bg-elevated text-primary border-slate-200 focus:border-sky-500'
                              : 'bg-card text-secondary border-subtle focus:border-cyan-400'
                          }`}
                        >
                          {columns.map(c => <option key={c.name} value={c.name} className={isLight ? 'bg-white text-primary' : 'bg-card text-primary'}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={`font-mono ${isLight ? 'text-muted' : 'text-muted'}`}>Metric:</span>
                      <select
                        value={resolvedVal}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], valueField: e.target.value }
                        }))}
                        className={`text-xs font-mono px-2 py-0.5 rounded border focus:outline-none ${
                          isLight
                            ? 'bg-sky-50 text-sky-800 border-sky-200 focus:border-sky-500'
                            : 'bg-card text-cyan-400 border-subtle focus:border-cyan-400'
                        }`}
                      >
                        {numericCols.map(c => <option key={c.name} value={c.name} className={isLight ? 'bg-white text-primary' : 'bg-card text-primary'}>{c.name}</option>)}
                      </select>
                    </div>

                    {activeType === 'scatter' && (
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className={`font-mono ${isLight ? 'text-muted' : 'text-muted'}`}>Y-Metric:</span>
                        <select
                          value={resolvedSecVal}
                          onChange={(e) => setVisualOverrides(prev => ({
                            ...prev,
                            [vis.id]: { ...prev[vis.id], secondaryValueField: e.target.value }
                          }))}
                          className={`text-xs font-mono px-2 py-0.5 rounded border focus:outline-none ${
                            isLight
                              ? 'bg-sky-50 text-sky-800 border-sky-200 focus:border-sky-500'
                              : 'bg-card text-primary border-subtle focus:border-subtle'
                          }`}
                        >
                          {numericCols.map(c => <option key={c.name} value={c.name} className={isLight ? 'bg-white text-primary' : 'bg-card text-primary'}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Intelligent Chart Recommendation Banner */}
                  {(() => {
                    const secCatName = resolvedSecCat;
                    const secValName = resolvedSecVal;
                    const cardRecs = recommendChartsForFields(
                      resolvedCat,
                      resolvedVal,
                      columns,
                      activeRows,
                      flags.chartGuide
                        ? {
                            chartGuide: true,
                            secondaryCategoryColName: secCatName,
                            secondaryValueColName: secValName
                          }
                        : undefined
                    );
                    const topRec = cardRecs[0];

                    // When chartGuide is active, also check if current chart type has a gentle mismatch warning
                    const mismatchEval = flags.chartGuide && cardGuideRule
                      ? evaluateChartRuleFit(cardGuideRule.id, {
                          categoryCol: columns.find(c => c.name === resolvedCat),
                          secondaryCategoryCol: secCatName ? columns.find(c => c.name === secCatName) : undefined,
                          valueCol: columns.find(c => c.name === resolvedVal),
                          secondaryValueCol: secValName ? columns.find(c => c.name === secValName) : undefined,
                          columns,
                          rows: activeRows
                        })
                      : { fits: true, mismatchWarning: undefined };

                    return (
                      <div className="space-y-1.5 mt-2">
                        {flags.chartGuide && cardGuideRule && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {topRec && topRec.type === activeType && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold uppercase bg-accent-soft text-accent border border-accent/30">
                                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                <span>Recommended</span>
                              </span>
                            )}
                            <span className="text-secondary">
                              <strong className="font-mono text-accent">Why this chart:</strong> {formatChartGuideReason(cardGuideRule)}
                            </span>
                          </div>
                        )}

                        {flags.chartGuide && !mismatchEval.fits && mismatchEval.mismatchWarning && (
                          <div
                            role="status"
                            className={`p-2 rounded-xl text-[11px] flex items-center gap-2 border ${
                              isLight
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-amber-950/35 border-amber-500/35 text-amber-200'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                            <span>{mismatchEval.mismatchWarning}</span>
                          </div>
                        )}

                        {topRec && topRec.type !== activeType && (
                          <div className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all ${
                            isLight 
                              ? 'bg-sky-50/90 border-sky-200 text-primary' 
                              : 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                          }`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="font-bold text-[11px] shrink-0 text-sky-700 dark:text-cyan-400">
                                {flags.chartGuide ? 'Recommended:' : 'AI Suggestion:'}
                              </span>
                              <span className="truncate text-[11px] text-muted dark:text-secondary">
                                {topRec.label} ({topRec.score}% fit) — {topRec.reason}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setVisualOverrides(prev => ({
                                  ...prev,
                                  [vis.id]: { 
                                    ...prev[vis.id], 
                                    type: topRec.type,
                                    categoryField: resolvedCat,
                                    valueField: resolvedVal
                                  }
                                }));
                                if (!vis.isCustomRenamed) {
                                  updateCustomVisual(vis.id, { title: topRec.suggestedTitle });
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-primary font-bold text-[11px] whitespace-nowrap shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title={`Switch visualization to ${topRec.label}`}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Switch to {topRec.label}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* REAL CHART RENDERING ENGINE */}
                <div className="py-2 min-h-[200px] flex items-center justify-center" data-chart-card-body={vis.id}>
                  {flags.chartGuide && cardGuideRule ? (
                    <div className="w-full">
                      <GuideChartRenderer
                        chartType={cardGuideRule.id}
                        rows={activeRows}
                        categoryField={resolvedCat}
                        secondaryCategoryField={resolvedSecCat}
                        valueField={resolvedVal}
                        secondaryValueField={resolvedSecVal}
                        aggregation={vis.aggregation}
                        isLight={isLight}
                        onDrillThrough={(filterCol, filterVal, subtitle) => {
                          openDrillThrough({
                            title: `${vis.title} - ${filterVal}`,
                            subtitle,
                            filterColumn: filterCol,
                            filterValue: filterVal,
                            sourceContext: 'chart_bar',
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <>
                  {/* BAR CHART */}
                  {activeType === 'bar' && (
                    <div className="w-full space-y-2.5">
                      {items.map((item, idx) => {
                        const pct = Math.min(100, Math.max(6, (item.value / maxVal) * 100));
                        return (
                          <div 
                            key={idx} 
                            onClick={() => openDrillThrough({
                              title: `${vis.title} - ${item.category}`,
                              subtitle: `Granular rows where ${activeCat} = "${item.category}" (${vis.aggregation}(${activeVal}))`,
                              filterColumn: activeCat,
                              filterValue: item.category,
                              sourceContext: 'chart_bar'
                            })}
                            className="space-y-1 group cursor-pointer p-1 -m-1 rounded-lg hover:bg-card transition-colors"
                            title="Click bar to drill-through to granular records"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-secondary font-medium truncate max-w-[200px] group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                                {item.category}
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-cyan-400 font-mono">↗</span>
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-primary font-semibold">{item.value.toLocaleString()}</span>
                                <span className="text-[10px] text-muted">({item.share}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-card h-3 rounded-full overflow-hidden border border-subtle p-0.5">
                              <div 
                                className="h-full rounded-full transition-all duration-500 group-hover:brightness-125"
                                style={{ 
                                  width: `${pct}%`,
                                  backgroundColor: idx === 0 ? primaryColor : idx === 1 ? 'var(--chart-3)' : idx === 2 ? 'var(--chart-4)' : 'var(--text-muted)'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LINE / AREA CHART */}
                  {activeType === 'line' && (
                    <div className="w-full">
                      {items.length >= 2 ? (
                        <div className="relative w-full">
                          <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                            <defs>
                              <linearGradient id={`grad-${vis.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Gridlines */}
                            {[0, 0.5, 1].map((pct, i) => (
                              <line 
                                key={i} 
                                x1="40" 
                                y1={20 + 150 * (1 - pct)} 
                                x2="480" 
                                y2={20 + 150 * (1 - pct)} 
                                stroke="var(--border-subtle)" 
                                strokeDasharray="3,3" 
                              />
                            ))}

                            {/* Line & Area */}
                            {(() => {
                              const coords = items.map((it, i) => ({
                                x: 40 + (i / (items.length - 1)) * 440,
                                y: 20 + 150 - (it.value / maxVal) * 150
                              }));
                              const pathD = coords.reduce((acc, curr, i) => i === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, '');
                              const areaD = `${pathD} L ${coords[coords.length - 1].x},170 L ${coords[0].x},170 Z`;
                              
                              return (
                                <>
                                  <path d={areaD} fill={`url(#grad-${vis.id})`} />
                                  <path d={pathD} fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  {coords.map((c, i) => (
                                    <circle key={i} cx={c.x} cy={c.y} r="4" fill="var(--bg-card)" stroke={primaryColor} strokeWidth="2" />
                                  ))}
                                </>
                              );
                            })()}
                          </svg>

                          {/* X-axis Labels */}
                          <div className="flex justify-between text-[10px] text-secondary font-mono pt-1">
                            <span className="truncate max-w-[100px]">{items[0]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[Math.floor(items.length / 2)]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[items.length - 1]?.category}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-muted">Need at least 2 points to render line chart.</div>
                      )}
                    </div>
                  )}

                  {/* DONUT CHART */}
                  {activeType === 'donut' && (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {(() => {
                            let cumulativePct = 0;
                            const colors = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-7)', 'var(--text-muted)'];
                            return items.slice(0, 6).map((item, idx) => {
                              const strokeDasharray = `${item.share * 2.512} 251.2`;
                              const strokeDashoffset = -cumulativePct * 2.512;
                              cumulativePct += item.share;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="40"
                                  fill="transparent"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth="14"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  className="transition-all hover:opacity-80"
                                />
                              );
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className={`text-[10px] uppercase font-mono ${isLight ? 'text-muted' : 'text-secondary'}`}>Total</span>
                          <span className={`text-xs font-bold font-mono ${isLight ? 'text-primary' : 'text-primary'}`}>{grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5 text-xs w-full max-w-[200px]">
                        {items.slice(0, 5).map((item, idx) => {
                          const colors = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-7)', 'var(--text-muted)'];
                          return (
                            <div 
                              key={idx} 
                              onClick={() => openDrillThrough({
                                title: `${vis.title} - ${item.category}`,
                                subtitle: `Granular rows where ${resolvedCat} = "${item.category}"`,
                                filterColumn: resolvedCat,
                                filterValue: item.category,
                                sourceContext: 'donut_slice'
                              })}
                              className={`flex items-center justify-between cursor-pointer p-1 -m-1 rounded group transition-colors ${
                                isLight ? 'hover:bg-elevated' : 'hover:bg-card'
                              }`}
                              title="Click to drill-through"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                <span className={`transition-colors truncate ${
                                  isLight ? 'text-muted group-hover:text-sky-700' : 'text-secondary group-hover:text-cyan-400'
                                }`}>{item.category}</span>
                              </div>
                              <span className={`font-mono text-[11px] ${
                                isLight ? 'text-muted group-hover:text-primary' : 'text-secondary group-hover:text-primary'
                              }`}>{item.share}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* HORIZONTAL BAR CHART */}
                  {activeType === 'horizontal_bar' && (
                    <div className="w-full space-y-2.5">
                      {items.map((item, idx) => {
                        const pct = Math.min(100, Math.max(6, (item.value / maxVal) * 100));
                        return (
                          <div 
                            key={idx} 
                            onClick={() => openDrillThrough({
                              title: `${vis.title} - ${item.category}`,
                              subtitle: `Granular rows where ${activeCat} = "${item.category}"`,
                              filterColumn: activeCat,
                              filterValue: item.category,
                              sourceContext: 'chart_bar'
                            })}
                            className="space-y-1 group cursor-pointer p-1 -m-1 rounded-lg hover:bg-card transition-colors"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-secondary font-medium truncate max-w-[200px] group-hover:text-cyan-400 transition-colors">
                                {item.category}
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-primary font-semibold">{item.value.toLocaleString()}</span>
                                <span className="text-[10px] text-muted">({item.share}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-card h-3 rounded-full overflow-hidden border border-subtle p-0.5">
                              <div 
                                className="h-full rounded-full transition-all duration-500 group-hover:brightness-125"
                                style={{ 
                                  width: `${pct}%`,
                                  backgroundColor: primaryColor
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AREA CHART */}
                  {activeType === 'area' && (
                    <div className="w-full">
                      {items.length >= 2 ? (
                        <div className="relative w-full">
                          <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
                            <defs>
                              <linearGradient id={`grad-area-${vis.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.6" />
                                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {[0, 0.5, 1].map((pct, i) => (
                              <line 
                                key={i} 
                                x1="40" 
                                y1={20 + 150 * (1 - pct)} 
                                x2="480" 
                                y2={20 + 150 * (1 - pct)} 
                                stroke="var(--border-subtle)" 
                                strokeDasharray="3,3" 
                              />
                            ))}
                            {(() => {
                              const coords = items.map((it, i) => ({
                                x: 40 + (i / (items.length - 1)) * 440,
                                y: 20 + 150 - (it.value / maxVal) * 150
                              }));
                              const pathD = coords.reduce((acc, curr, i) => i === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`, '');
                              const areaD = `${pathD} L ${coords[coords.length - 1].x},170 L ${coords[0].x},170 Z`;
                              return (
                                <>
                                  <path d={areaD} fill={`url(#grad-area-${vis.id})`} />
                                  <path d={pathD} fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                  {coords.map((c, i) => (
                                    <circle key={i} cx={c.x} cy={c.y} r="4" fill="var(--bg-card)" stroke={primaryColor} strokeWidth="2" />
                                  ))}
                                </>
                              );
                            })()}
                          </svg>
                          <div className="flex justify-between text-[10px] text-secondary font-mono pt-1">
                            <span className="truncate max-w-[100px]">{items[0]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[items.length - 1]?.category}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-muted">Need at least 2 points to render area chart.</div>
                      )}
                    </div>
                  )}

                  {/* PIE CHART */}
                  {activeType === 'pie' && (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-around gap-4">
                      <div className="relative w-36 h-36 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          {(() => {
                            let cumulativePct = 0;
                            const colors = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-7)', 'var(--text-muted)'];
                            return items.slice(0, 6).map((item, idx) => {
                              const strokeDasharray = `${item.share * 1.57} 157`;
                              const strokeDashoffset = -cumulativePct * 1.57;
                              cumulativePct += item.share;
                              return (
                                <circle
                                  key={idx}
                                  cx="50"
                                  cy="50"
                                  r="25"
                                  fill="transparent"
                                  stroke={colors[idx % colors.length]}
                                  strokeWidth="50"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  className="transition-all hover:opacity-80"
                                />
                              );
                            });
                          })()}
                        </svg>
                      </div>
                      <div className="space-y-1.5 text-xs w-full max-w-[200px] font-mono">
                        {items.slice(0, 5).map((it, idx) => {
                          const colors = ['var(--chart-3)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-7)', 'var(--text-muted)'];
                          return (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span className="flex items-center gap-1.5 text-secondary truncate max-w-[120px]">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                                {it.category}
                              </span>
                              <span className="text-primary font-bold">{it.share}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SCATTER PLOT */}
                  {activeType === 'scatter' && (
                    <div className="w-full">
                      <div className="relative w-full">
                        <svg viewBox="0 0 460 180" className="w-full h-44 overflow-visible select-none">
                          {[0, 0.5, 1].map((pct, i) => (
                            <line key={i} x1="35" y1={15 + 130 * (1 - pct)} x2="445" y2={15 + 130 * (1 - pct)} stroke="var(--border-subtle)" strokeDasharray="3,3" />
                          ))}
                          <line x1="35" y1="135" x2="445" y2="25" stroke="var(--chart-4)" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7" />
                          {items.map((it, idx) => {
                            const cx = 45 + (idx / Math.max(1, items.length - 1)) * 390;
                            const cy = 145 - (it.value / maxVal) * 125;
                            return (
                              <g 
                                key={idx} 
                                onClick={() => openDrillThrough({
                                  title: `${vis.title} - ${it.category}`,
                                  subtitle: `Scatter Point: ${it.category} (${it.value.toLocaleString()})`,
                                  filterColumn: activeCat,
                                  filterValue: it.category,
                                  sourceContext: 'chart_bar'
                                })} 
                                className="cursor-pointer group"
                              >
                                <circle cx={cx} cy={cy} r="6" fill="var(--bg-card)" stroke="var(--chart-3)" strokeWidth="2" className="group-hover:scale-125 transition-transform" />
                                <text x={cx} y={cy - 9} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontFamily="monospace" className="opacity-0 group-hover:opacity-100">
                                  {it.value.toLocaleString()}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                        <div className="flex justify-between text-[10px] text-secondary font-mono pt-1">
                          <span className="text-amber-400">Linear Trendline Fit</span>
                          <span className="text-cyan-400">Click coordinate to drilldown</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOXPLOT (Tukey 5-Number Distribution & Outlier Detection) */}
                  {activeType === 'boxplot' && (() => {
                    const boxplotData = computeBoxplotSummary(activeRows, resolvedCat, resolvedVal);
                    if (boxplotData.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-muted">
                          Insufficient numerical variance to compute quartile distributions.
                        </div>
                      );
                    }

                    const allValues = boxplotData.flatMap(b => [b.min, b.max, ...b.outliers]);
                    const globalMin = Math.min(...allValues);
                    const globalMax = Math.max(...allValues);
                    const range = Math.max(0.001, globalMax - globalMin);
                    const plotH = 135;
                    const plotW = 460;
                    const paddingX = 45;
                    const groupW = (plotW - paddingX * 2) / Math.max(1, boxplotData.length);
                    const scaleY = (v: number) => 15 + plotH - ((v - globalMin) / range) * plotH;

                    return (
                      <div className="w-full space-y-2">
                        <div className="relative w-full">
                          <svg viewBox="0 0 470 190" className="w-full h-48 overflow-visible select-none">
                            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                              const yPos = 15 + plotH * (1 - pct);
                              const valLabel = globalMin + range * pct;
                              return (
                                <g key={idx}>
                                  <line x1="35" y1={yPos} x2="465" y2={yPos} stroke={isLight ? 'var(--text-primary)' : 'var(--border-subtle)'} strokeDasharray="3,3" />
                                  <text x="30" y={yPos + 3} textAnchor="end" fill={isLight ? 'var(--text-muted)' : 'var(--text-muted)'} fontSize="9" fontFamily="monospace">
                                    {valLabel >= 1000 ? `${(valLabel / 1000).toFixed(1)}k` : Math.round(valLabel)}
                                  </text>
                                </g>
                              );
                            })}

                            {boxplotData.map((stat, idx) => {
                              const centerX = paddingX + idx * groupW + groupW / 2;
                              const boxWidth = Math.min(34, Math.max(16, groupW * 0.52));
                              const yMin = scaleY(stat.min);
                              const yQ1 = scaleY(stat.q1);
                              const yMedian = scaleY(stat.median);
                              const yQ3 = scaleY(stat.q3);
                              const yMax = scaleY(stat.max);
                              const yMean = scaleY(stat.mean);

                              return (
                                <g 
                                  key={idx}
                                  className="group cursor-pointer"
                                  onClick={() => openDrillThrough({
                                    title: `${vis.title} - ${stat.category}`,
                                    subtitle: `Quartile Summary for ${stat.category}: Median ${stat.median.toLocaleString()}, IQR ${stat.iqr.toLocaleString()}`,
                                    filterColumn: resolvedCat,
                                    filterValue: stat.category,
                                    sourceContext: 'chart_bar'
                                  })}
                                >
                                  {/* Whisker dashed line */}
                                  <line x1={centerX} y1={yMin} x2={centerX} y2={yMax} stroke={primaryColor} strokeWidth="1.5" strokeDasharray="2,2" />

                                  {/* Whiskers End Caps */}
                                  <line x1={centerX - boxWidth * 0.35} y1={yMin} x2={centerX + boxWidth * 0.35} y2={yMin} stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
                                  <line x1={centerX - boxWidth * 0.35} y1={yMax} x2={centerX + boxWidth * 0.35} y2={yMax} stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />

                                  {/* Interquartile Box (Q1 to Q3) */}
                                  <rect 
                                    x={centerX - boxWidth / 2} 
                                    y={Math.min(yQ1, yQ3)} 
                                    width={boxWidth} 
                                    height={Math.max(4, Math.abs(yQ3 - yQ1))} 
                                    fill={primaryColor} 
                                    fillOpacity={isLight ? 0.22 : 0.35}
                                    stroke={primaryColor} 
                                    strokeWidth="2" 
                                    rx="3"
                                    className="group-hover:fill-opacity-50 transition-all"
                                  />

                                  {/* Median Line */}
                                  <line 
                                    x1={centerX - boxWidth / 2} 
                                    y1={yMedian} 
                                    x2={centerX + boxWidth / 2} 
                                    y2={yMedian} 
                                    stroke={isLight ? 'var(--chart-3)' : 'var(--chart-3)'} 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                  />

                                  {/* Mean Diamond */}
                                  <polygon 
                                    points={`${centerX},${yMean - 3} ${centerX + 3},${yMean} ${centerX},${yMean + 3} ${centerX - 3},${yMean}`}
                                    fill="var(--chart-4)"
                                  />

                                  {/* Outliers */}
                                  {stat.outliers.map((outlierVal, oIdx) => {
                                    const yOutlier = scaleY(outlierVal);
                                    return (
                                      <circle 
                                        key={oIdx} 
                                        cx={centerX} 
                                        cy={yOutlier} 
                                        r="3.5" 
                                        fill="var(--danger)" 
                                        stroke="var(--text-primary)" 
                                        strokeWidth="1"
                                      />
                                    );
                                  })}

                                  {/* Category Label */}
                                  <text 
                                    x={centerX} 
                                    y="172" 
                                    textAnchor="middle" 
                                    fill={isLight ? 'var(--bg-card)' : 'var(--text-secondary)'} 
                                    fontSize="10" 
                                    fontWeight="600"
                                    fontFamily="sans-serif"
                                  >
                                    {stat.category.length > 8 ? `${stat.category.slice(0, 7)}…` : stat.category}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* Boxplot Metrics Ribbon */}
                        <div className={`p-2 rounded-xl border text-[11px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 ${
                          isLight ? 'bg-elevated border-slate-200 text-muted' : 'bg-card border-teal-500/40 text-secondary'
                        }`}>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                            <span>Median: <strong>{boxplotData[0]?.median.toLocaleString()}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                            <span>Mean: <strong>{boxplotData[0]?.mean.toFixed(1)}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
                            <span>IQR: <strong>{boxplotData[0]?.iqr.toLocaleString()}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                            <span>Outliers: <strong>{boxplotData.reduce((acc, b) => acc + b.outliers.length, 0)} detected</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {activeType === 'heatmap' && (
                    <div className="w-full space-y-1.5">
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 font-mono text-center">
                        {items.map((it, idx) => {
                          const intensity = Math.min(1, Math.max(0.15, it.value / maxVal));
                          return (
                            <div
                              key={idx}
                              onClick={() => openDrillThrough({
                                title: `${vis.title} - ${it.category}`,
                                subtitle: `Heatmap Cell: ${it.category}`,
                                filterColumn: activeCat,
                                filterValue: it.category,
                                sourceContext: 'table_row'
                              })}
                              className="p-2 rounded-lg border border-subtle cursor-pointer hover:border-white transition-all flex flex-col justify-between"
                              style={{ backgroundColor: `color-mix(in srgb, var(--border-strong) 25%, transparent)` }}
                              title={`${it.category}: ${it.value.toLocaleString()}`}
                            >
                              <span className="text-[10px] text-primary font-extrabold truncate">{it.category}</span>
                              <span className="text-[9px] text-primary font-bold font-mono">
                                {it.value >= 1000 ? `${(it.value / 1000).toFixed(1)}k` : it.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-secondary font-mono pt-1">
                        <span>Intensity Scale: 0 to {maxVal.toLocaleString()}</span>
                        <span className="text-cyan-400">2D Heat Density Grid</span>
                      </div>
                    </div>
                  )}

                  {/* RADAR / SPIDER CHART */}
                  {activeType === 'radar' && (
                    <div className="w-full flex items-center justify-center py-1">
                      <svg viewBox="0 0 200 200" className="w-44 h-44 overflow-visible select-none">
                        {[0.33, 0.66, 1].map((lvl, lIdx) => {
                          const pts = items.slice(0, 6).map((_, i) => {
                            const angle = (i * 2 * Math.PI) / Math.min(6, items.length) - Math.PI / 2;
                            const r = lvl * 75;
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                          }).join(' ');
                          return <polygon key={lIdx} points={pts} fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="2,2" />;
                        })}
                        {(() => {
                          const polyPts = items.slice(0, 6).map((it, i) => {
                            const angle = (i * 2 * Math.PI) / Math.min(6, items.length) - Math.PI / 2;
                            const r = (it.value / maxVal) * 75;
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                          }).join(' ');
                          return <polygon points={polyPts} fill="var(--chart-3)" fillOpacity="0.25" stroke="var(--chart-3)" strokeWidth="2" />;
                        })()}
                      </svg>
                    </div>
                  )}

                  {/* FUNNEL CHART */}
                  {activeType === 'funnel' && (
                    <div className="w-full space-y-1.5">
                      {items.slice(0, 5).map((it, idx) => {
                        const w = Math.max(20, Math.min(100, (it.value / maxVal) * 100));
                        return (
                          <div 
                            key={idx} 
                            onClick={() => openDrillThrough({
                              title: `${vis.title} - ${it.category}`,
                              subtitle: `Funnel Stage: ${it.category}`,
                              filterColumn: activeCat,
                              filterValue: it.category,
                              sourceContext: 'chart_bar'
                            })} 
                            className="cursor-pointer group space-y-0.5"
                          >
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-secondary group-hover:text-accent">{idx + 1}. {it.category}</span>
                              <span className="text-primary font-bold">{it.value.toLocaleString()} ({it.share}%)</span>
                            </div>
                            <div className="flex justify-center w-full">
                              <div 
                                className="h-6 rounded-md bg-sky-600 text-primary text-[10px] font-bold font-mono flex items-center justify-center transition-all group-hover:brightness-125" 
                                style={{ width: `${w}%` }}
                              >
                                {it.value.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* WATERFALL CHART */}
                  {activeType === 'waterfall' && (
                    <div className="w-full">
                      <div className="flex items-end justify-between gap-1.5 h-44 pt-4 pb-4 border-b border-subtle">
                        {items.slice(0, 6).map((it, idx) => {
                          const h = Math.max(6, (it.value / maxVal) * 110);
                          const isPos = idx % 2 === 0;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => openDrillThrough({
                                title: `${vis.title} - ${it.category}`,
                                subtitle: `Waterfall Step: ${it.category}`,
                                filterColumn: activeCat,
                                filterValue: it.category,
                                sourceContext: 'chart_bar'
                              })} 
                              className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                            >
                              <span className="text-[9px] font-mono text-primary mb-1">{it.value.toLocaleString()}</span>
                              <div 
                                className={`w-full max-w-[36px] rounded transition-all group-hover:brightness-125 ${isPos ? 'bg-sky-500' : 'bg-rose-500'}`} 
                                style={{ height: `${h}px` }} 
                              />
                              <span className="text-[9px] text-muted font-mono truncate max-w-[50px] mt-1.5">{it.category}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TREEMAP CHART */}
                  {activeType === 'treemap' && (
                    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                      {items.slice(0, 6).map((it, idx) => {
                        const colors = ['var(--chart-3)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)', 'var(--danger)', 'var(--chart-7)'];
                        const c = colors[idx % colors.length];
                        const isBig = idx === 0 || idx === 1;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => openDrillThrough({
                              title: `${vis.title} - ${it.category}`,
                              subtitle: `Treemap Tile: ${it.category}`,
                              filterColumn: activeCat,
                              filterValue: it.category,
                              sourceContext: 'chart_bar'
                            })} 
                            className={`p-2.5 rounded-xl border border-subtle cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between ${isBig ? 'sm:col-span-2' : ''}`} 
                            style={{ backgroundColor: `${c}18`, borderColor: `${c}44` }}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-primary text-xs font-bold truncate">{it.category}</span>
                              <span className="text-[10px] font-bold" style={{ color: c }}>{it.share}%</span>
                            </div>
                            <span className="text-sm font-bold text-primary mt-2">{it.value.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* GAUGE CHART */}
                  {activeType === 'gauge' && (
                    <div className="w-full flex flex-col items-center justify-center">
                      <div className="relative w-44 h-24">
                        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible select-none">
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--chart-grid)" strokeWidth="16" strokeLinecap="round" />
                          <path 
                            d="M 20 100 A 80 80 0 0 1 180 100" 
                            fill="none" 
                            stroke="var(--chart-1)" 
                            strokeWidth="16" 
                            strokeLinecap="round" 
                            strokeDasharray="251" 
                            strokeDashoffset={251 - (Math.min(100, (grandTotal / (maxVal * items.length || 1)) * 100) / 100) * 251} 
                          />
                          <circle cx="100" cy="100" r="6" fill="var(--text-primary)" />
                          <line x1="100" y1="100" x2="100" y2="35" stroke="var(--text-primary)" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="text-center font-mono mt-1">
                        <span className="text-lg font-extrabold text-primary">{grandTotal.toLocaleString()}</span>
                        <span className="text-[10px] text-accent block">Aggregate Total Target Attainment</span>
                      </div>
                    </div>
                  )}

                  {/* HISTOGRAM CHART */}
                  {activeType === 'histogram' && (
                    <div className="w-full">
                      <HistogramChart
                        rows={activeRows}
                        valueField={activeVal}
                        isLight={isLight}
                      />
                    </div>
                  )}

                  {/* STACKED BAR CHART */}
                  {activeType === 'stacked_bar' && (
                    <div className="w-full">
                      <StackedBarChart
                        rows={activeRows}
                        primaryCategoryField={activeCat}
                        secondaryCategoryField={resolvedSecCat}
                        valueField={activeVal}
                        isLight={isLight}
                      />
                    </div>
                  )}
                    </>
                  )}

                  {/* DATA TABLE */}
                  {activeType === 'table' && (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-elevated text-secondary border-b border-subtle">
                          <tr>
                            <th className="p-2">Rank</th>
                            <th className="p-2">{activeCat}</th>
                            <th className="p-2 text-right">{activeVal}</th>
                            <th className="p-2 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle">
                          {items.map((it, idx) => (
                            <tr 
                              key={idx} 
                              onClick={() => openDrillThrough({
                                title: `${vis.title} - ${it.category}`,
                                subtitle: `Granular rows where ${activeCat} = "${it.category}"`,
                                filterColumn: activeCat,
                                filterValue: it.category,
                                sourceContext: 'table_row'
                              })}
                              className="transition-colors cursor-pointer group hover:bg-card-hover"
                              title="Click row to drill-through to granular records"
                            >
                              <td className="p-2 text-muted font-bold">#{idx + 1}</td>
                              <td className="p-2 font-sans transition-colors flex items-center gap-1 text-primary group-hover:text-accent">
                                {it.category}
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-accent">↗</span>
                              </td>
                              <td className="p-2 text-right font-semibold text-accent">{it.value.toLocaleString()}</td>
                              <td className="p-2 text-right text-muted">{it.share}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Accessible Text Summary & Footer Insight */}
                <div className={`pt-2 border-t space-y-1 text-[10px] font-mono ${
                  isLight ? 'border-slate-100 text-muted' : 'border-subtle text-secondary'
                }`}>
                  {flags.chartGuide && items.length > 0 && activeType !== 'histogram' && activeType !== 'stacked_bar' && (
                    <p className={isLight ? 'text-muted' : 'text-secondary'}>
                      Summary: {items[0]?.category} leads with {items[0]?.value.toLocaleString()} ({items[0]?.share}% share) across {items.length} displayed groups.
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Aggregation: {vis.aggregation.toUpperCase()}</span>
                    <span>Top {items.length} segments analyzed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Visual Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`${isLight ? 'bg-white border-slate-200 text-primary shadow-2xl' : 'bg-card border-subtle text-primary'} border rounded-3xl p-6 max-w-lg w-full space-y-5 animate-scaleUp`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-subtle'}`}>
              <h3 className={`font-heading text-xl font-bold uppercase flex items-center gap-2 ${isLight ? 'text-primary' : 'text-primary'}`}>
                <Plus className="w-5 h-5 text-sky-500" />
                COMPOSE NEW VISUAL
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${isLight ? 'text-secondary hover:text-primary' : 'text-secondary hover:text-primary'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisual} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className={isLight ? 'text-muted font-semibold' : 'text-secondary font-medium'}>Visualization Title</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Sales Volume Breakdown"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                    isLight
                      ? 'bg-elevated text-primary border-slate-200 focus:border-sky-500'
                      : 'bg-card text-primary border-subtle focus:border-cyan-400'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={isLight ? 'text-muted font-semibold' : 'text-secondary font-medium'}>Chart Representation</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-elevated text-primary border-slate-200 focus:border-sky-500'
                        : 'bg-card text-primary border-subtle focus:border-cyan-400'
                    }`}
                  >
                    <option value="bar">Vertical Bar Chart (Ranking & Comparison)</option>
                    <option value="horizontal_bar">Horizontal Bar Chart (Ranked Progress)</option>
                    <option value="line">Line / Trend Curve (Chronological)</option>
                    <option value="area">Area Fill Chart (Volume Growth)</option>
                    <option value="donut">Donut Ring (Part-to-Whole)</option>
                    <option value="pie">Pie Chart (Proportional Sectors)</option>
                    <option value="boxplot">Quartile Boxplot (Variance & Outlier Discovery)</option>
                    <option value="scatter">Scatter Plot (Correlation & Bivariate)</option>
                    <option value="heatmap">2D Heat Map (Density & Co-occurrence)</option>
                    {flags.chartGuide && (
                      <>
                        <option value="histogram">Histogram (Numeric Distribution Bins)</option>
                        <option value="stacked_bar">Stacked Bar Chart (Totals & Parts)</option>
                      </>
                    )}
                    <option value="radar">Radar / Spider Chart (Multi-Axis Footprint)</option>
                    <option value="funnel">Funnel Conversion (Stage Drop-off & Retention)</option>
                    <option value="waterfall">Waterfall Chart (Variance Walk)</option>
                    <option value="treemap">Proportional Treemap (Area Tiles)</option>
                    <option value="gauge">Performance Gauge (Speedometer Dial)</option>
                    <option value="table">Data Table (Detailed Matrix)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={isLight ? 'text-muted font-semibold' : 'text-secondary font-medium'}>Aggregation Function</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-elevated text-primary border-slate-200 focus:border-sky-500'
                        : 'bg-card text-primary border-subtle focus:border-cyan-400'
                    }`}
                  >
                    <option value="sum">SUM (Total Aggregate)</option>
                    <option value="avg">AVERAGE (Mean Value)</option>
                    <option value="count">COUNT (Number of Records)</option>
                    <option value="max">MAX (Peak Value)</option>
                    <option value="min">MIN (Lowest Value)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={isLight ? 'text-muted font-semibold' : 'text-secondary font-medium'}>Dimension (Category Axis)</label>
                  <select
                    value={catField}
                    onChange={(e) => setCatField(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-elevated text-primary border-slate-200 focus:border-sky-500'
                        : 'bg-card text-primary border-subtle focus:border-cyan-400'
                    }`}
                  >
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={isLight ? 'text-muted font-semibold' : 'text-secondary font-medium'}>Metric (Numerical Value)</label>
                  <select
                    value={valField}
                    onChange={(e) => setValField(e.target.value)}
                    className={`w-full font-mono p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-sky-50 text-sky-800 border-sky-200 focus:border-sky-500'
                        : 'bg-card text-cyan-400 border-subtle focus:border-cyan-400'
                    }`}
                  >
                    {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* DYNAMIC AI SCHEMA RECOMMENDATIONS PANEL */}
              {(() => {
                const modalSecCat = pureCategoryCols.find(c => c.name !== catField)?.name;
                const modalSecVal = numericCols.find(c => c.name !== valField)?.name;
                const modalRecs = recommendChartsForFields(
                  catField,
                  valField,
                  columns,
                  cleanRows,
                  flags.chartGuide
                    ? {
                        chartGuide: true,
                        secondaryCategoryColName: modalSecCat,
                        secondaryValueColName: modalSecVal
                      }
                    : undefined
                );
                if (modalRecs.length === 0) return null;
                const topFit = modalRecs[0];
                const modalRule = flags.chartGuide ? getChartGuideRule(type) : undefined;
                const modalFitCheck = flags.chartGuide && modalRule
                  ? evaluateChartRuleFit(modalRule.id, {
                      categoryCol: columns.find(c => c.name === catField),
                      secondaryCategoryCol: modalSecCat ? columns.find(c => c.name === modalSecCat) : undefined,
                      valueCol: columns.find(c => c.name === valField),
                      secondaryValueCol: modalSecVal ? columns.find(c => c.name === modalSecVal) : undefined,
                      columns,
                      rows: cleanRows
                    })
                  : { fits: true, mismatchWarning: undefined };

                return (
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-elevated border-subtle'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-500" />
                        <span className={`font-bold text-xs uppercase tracking-wide ${isLight ? 'text-sky-900' : 'text-sky-300'}`}>
                          Schema Recommendations
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setType(topFit.type);
                          setTitle(topFit.suggestedTitle);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-primary font-bold text-[11px] shadow-xs cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Apply Best Fit ({topFit.label})</span>
                      </button>
                    </div>

                    {flags.chartGuide && modalRule && (
                      <div className="text-[11px] flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
                        <span>
                          <strong className="font-mono text-accent">Why this chart:</strong> {formatChartGuideReason(modalRule)}
                        </span>
                      </div>
                    )}

                    {flags.chartGuide && !modalFitCheck.fits && modalFitCheck.mismatchWarning && (
                      <div
                        role="status"
                        className={`p-2 rounded-xl border text-[11px] flex items-start gap-2 ${
                          isLight
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{modalFitCheck.mismatchWarning}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modalRecs.slice(0, 4).map((rec, idx) => {
                        const isSelected = type === rec.type;
                        return (
                          <div
                            key={rec.type}
                            onClick={() => {
                              setType(rec.type);
                              setTitle(rec.suggestedTitle);
                            }}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? isLight
                                  ? 'bg-white border-sky-500 ring-2 ring-sky-400 shadow-xs'
                                  : 'bg-sky-950/80 border-cyan-400 ring-2 ring-cyan-400 shadow-md'
                                : isLight
                                  ? 'bg-white/80 border-slate-200 hover:border-sky-300 hover:bg-white'
                                  : 'bg-card border-subtle hover:border-strong hover:bg-card-hover'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`font-bold text-xs ${isSelected ? (isLight ? 'text-sky-900' : 'text-cyan-300') : (isLight ? 'text-primary' : 'text-primary')}`}>
                                {rec.label}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                rec.badge === 'Best Fit' || idx === 0
                                  ? 'bg-sky-500/20 text-sky-600 dark:text-cyan-300 border border-sky-400/40'
                                  : 'bg-input dark:bg-input text-muted dark:text-secondary'
                              }`}>
                                {flags.chartGuide && idx === 0 ? 'Recommended' : `${rec.score}% Match`}
                              </span>
                            </div>
                            <p className={`text-[11px] line-clamp-2 leading-relaxed ${isLight ? 'text-muted' : 'text-secondary'}`}>
                              {rec.reason}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className={isLight ? 'text-muted font-semibold' : 'text-secondary font-medium'}>Accent Color Theme</label>
                <div className="flex items-center gap-3 pt-1">
                  {[
                    { color: 'var(--chart-3)', label: 'Azure Blue' },
                    { color: 'var(--chart-3)', label: 'Cyan' },
                    { color: 'var(--chart-3)', label: 'Sky' },
                    { color: 'var(--chart-2)', label: 'Indigo' },
                    { color: 'var(--chart-4)', label: 'Amber' }
                  ].map(c => (
                    <button
                      type="button"
                      key={c.color}
                      onClick={() => setColorTheme(c.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${colorTheme === c.color ? 'border-sky-500 scale-110 shadow-sm' : 'border-transparent opacity-70'}`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {colorTheme === c.color && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-subtle'}`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                    isLight ? 'bg-elevated hover:bg-input text-muted border border-slate-200' : 'bg-elevated text-secondary hover:bg-elevated'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 text-primary font-semibold hover:bg-sky-500 transition-all cursor-pointer shadow-md shadow-sky-600/20"
                >
                  Create & Mount Visual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Intelligent Multi-Chart Recommendation Engine Modal */}
      {isRecModalOpen && (() => {
        const recommendedSuite = recommendDatasetDashboard(columns, cleanRows);
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className={`${isLight ? 'bg-white border-slate-200 text-primary shadow-2xl' : 'bg-card border-subtle text-primary'} border rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 animate-scaleUp`}>
              <div className={`flex items-start justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-subtle'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-cyan-400 border border-sky-500/20">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                    </span>
                    <h3 className={`font-heading text-xl font-bold uppercase tracking-tight ${isLight ? 'text-primary' : 'text-primary'}`}>
                      AI Schema Recommendation Suite
                    </h3>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
                    Analyzed {columns.length} columns & {cleanRows.length.toLocaleString()} rows in <strong>{project.name}</strong>. The recommendation engine identified optimal visualization types based on temporal continuity, cardinality, and numerical dispersion.
                  </p>
                </div>
                <button
                  onClick={() => setIsRecModalOpen(false)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${isLight ? 'text-secondary hover:text-primary' : 'text-secondary hover:text-primary'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Banner: Deploy Complete Suite */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                isLight ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/40 border-sky-800/60'
              }`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-sky-700 dark:text-cyan-300">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    <span>Balanced 5-Chart Adaptive Suite</span>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
                    Deploy a diverse ensemble of Heatmaps, Boxplots, Donut shares, Ranked Bars, and Scatter plots.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    customVisuals.forEach(v => removeCustomVisual(v.id));
                    recommendedSuite.forEach(v => addCustomVisual(v));
                    setIsRecModalOpen(false);
                    setDownloadSuccess(`Deployed ${recommendedSuite.length} recommended schema charts!`);
                    setTimeout(() => setDownloadSuccess(null), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-primary font-bold text-xs shadow-md shadow-sky-600/25 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Deploy Complete Suite</span>
                </button>
              </div>

              {/* Recommended Visuals List */}
              <div className="space-y-3">
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono ${isLight ? 'text-muted' : 'text-secondary'}`}>
                  Recommended Visuals ({recommendedSuite.length})
                </h4>

                <div className="space-y-2.5">
                  {recommendedSuite.map((recVis, idx) => (
                    <div 
                      key={recVis.id || idx}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                        isLight 
                          ? 'bg-elevated border-slate-200 hover:border-sky-300 hover:bg-white' 
                          : 'bg-card border-teal-500/40 hover:border-cyan-400/50 hover:bg-card'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-primary dark:text-primary uppercase truncate">
                            {recVis.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sky-500/10 text-sky-700 dark:text-cyan-300 border border-sky-500/20">
                            {recVis.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-muted dark:text-secondary">
                            {recVis.aggregation.toUpperCase()}({recVis.valueField}) by {recVis.categoryField}
                          </span>
                        </div>
                        <p className={`text-xs ${isLight ? 'text-muted' : 'text-secondary'}`}>
                          {recVis.description || 'Analyzed data distribution and field semantics to maximize cognitive clarity.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addCustomVisual(recVis);
                          setIsRecModalOpen(false);
                          setDownloadSuccess(`Added ${recVis.title}!`);
                          setTimeout(() => setDownloadSuccess(null), 2500);
                        }}
                        className="px-3 py-1.5 rounded-xl border font-bold text-xs shrink-0 cursor-pointer transition-all flex items-center gap-1 bg-white dark:bg-surface-panel hover:bg-sky-50 dark:hover:bg-cyan-500/15 text-sky-700 dark:text-cyan-300 border-slate-200 dark:border-border-subtle"
                        title="Add this visual to your active dashboard canvas"
                      >
                        <Plus className="w-3.5 h-3.5 text-sky-500" />
                        <span>Add Visual</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`flex justify-end pt-3 border-t ${isLight ? 'border-slate-200' : 'border-subtle'}`}>
                <button
                  type="button"
                  onClick={() => setIsRecModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isLight ? 'bg-elevated hover:bg-input text-muted' : 'bg-elevated text-secondary hover:bg-elevated'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
