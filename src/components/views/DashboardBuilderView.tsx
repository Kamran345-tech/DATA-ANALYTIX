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
  Info
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { VisualConfig } from '../../types';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { generateEnterpriseReportPDF, downloadDashboardAndReportBundle } from '../../engine/exportEngine';
import { safeMax } from '../../utils/mathUtils';
import { 
  recommendChartsForFields, 
  recommendDatasetDashboard, 
  computeBoxplotSummary,
  ChartRecommendation 
} from '../../engine/chartRecommendationEngine';

export const DashboardBuilderView: React.FC = () => {
  const { 
    project,
    brand,
    qualityReport,
    rawRows,
    cleanRows,
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

  const isLight = themeMode === 'light';

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
  const [colorTheme, setColorTheme] = useState('#0284C7');

  // Local state to override chart types or metrics per card
  const [visualOverrides, setVisualOverrides] = useState<Record<string, { type?: VisualConfig['type']; valueField?: string; categoryField?: string }>>({});

  // Ensure default visuals are populated if empty
  useEffect(() => {
    if (customVisuals.length === 0 && analytics.visuals && analytics.visuals.length > 0) {
      analytics.visuals.forEach(v => addCustomVisual(v));
    }
  }, [customVisuals.length, analytics.visuals, addCustomVisual]);

  // Numeric and String columns
  const numericCols = useMemo(() => columns.filter(c => c.dataType === 'number'), [columns]);
  const stringCols = useMemo(() => columns.filter(c => c.dataType === 'string' || c.dataType === 'date'), [columns]);

  // Handle creating visual from form
  const handleCreateVisual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newVisual: VisualConfig = {
      id: `vis-${Date.now()}`,
      title: title.trim(),
      type,
      categoryField: catField || stringCols[0]?.name || 'Category',
      valueField: valField || numericCols[0]?.name || 'Value',
      aggregation,
      color: colorTheme,
      description: `${aggregation.toUpperCase()}(${valField}) segmented by ${catField}`
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
      color: chosenType === 'donut' ? '#00d8f6' : '#0284C7',
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
        color: '#0284C7'
      };
      const p2: VisualConfig = {
        id: `vis-p2-${Date.now()}`,
        title: `Financial Share Breakdown (${str2})`,
        type: 'donut',
        categoryField: str2,
        valueField: num2,
        aggregation: 'sum',
        color: '#00d8f6'
      };
      const p3: VisualConfig = {
        id: `vis-p3-${Date.now()}`,
        title: `Monthly Growth Progression`,
        type: 'line',
        categoryField: columns.find(c => c.dataType === 'date')?.name || str1,
        valueField: num1,
        aggregation: 'sum',
        color: '#f59e0b'
      };
      const p4: VisualConfig = {
        id: `vis-p4-${Date.now()}`,
        title: `Operational Matrix Overview`,
        type: 'table',
        categoryField: str1,
        valueField: num1,
        aggregation: 'avg',
        color: '#a855f7'
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
        color: '#0284C7'
      };
      const p2: VisualConfig = {
        id: `vis-op2-${Date.now()}`,
        title: `Segment Channel Proportion`,
        type: 'donut',
        categoryField: str2,
        valueField: num1,
        aggregation: 'sum',
        color: '#ec4899'
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
          color: '#0284C7'
        },
        {
          id: `vis-heatmap-${Date.now()}`,
          title: `2D Heat Map Density (${str1} by ${str2})`,
          type: 'heatmap',
          categoryField: str1,
          secondaryCategoryField: str2,
          valueField: num1,
          aggregation: 'sum',
          color: '#00d8f6'
        },
        {
          id: `vis-bar-${Date.now()}`,
          title: `Ranked Vertical Bar Comparison`,
          type: 'bar',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#0284C7'
        },
        {
          id: `vis-hbar-${Date.now()}`,
          title: `Horizontal Progress Breakdown`,
          type: 'horizontal_bar',
          categoryField: str2,
          valueField: num1,
          aggregation: 'sum',
          color: '#00d8f6'
        },
        {
          id: `vis-line-${Date.now()}`,
          title: `Chronological Trend Progression`,
          type: 'line',
          categoryField: columns.find(c => c.dataType === 'date')?.name || str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#f59e0b'
        },
        {
          id: `vis-area-${Date.now()}`,
          title: `Cumulative Volume Area Curve`,
          type: 'area',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#0284C7'
        },
        {
          id: `vis-donut-${Date.now()}`,
          title: `Segment Composition Donut`,
          type: 'donut',
          categoryField: str1,
          valueField: num2,
          aggregation: 'sum',
          color: '#ec4899'
        },
        {
          id: `vis-pie-${Date.now()}`,
          title: `Channel Proportional Pie`,
          type: 'pie',
          categoryField: str2,
          valueField: num1,
          aggregation: 'sum',
          color: '#818cf8'
        },
        {
          id: `vis-radar-${Date.now()}`,
          title: `Multi-Dimensional Spider Footprint`,
          type: 'radar',
          categoryField: str1,
          valueField: num1,
          aggregation: 'avg',
          color: '#0284C7'
        },
        {
          id: `vis-funnel-${Date.now()}`,
          title: `Conversion Pipeline Funnel`,
          type: 'funnel',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#00d8f6'
        },
        {
          id: `vis-waterfall-${Date.now()}`,
          title: `Financial Variance Waterfall`,
          type: 'waterfall',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#0284C7'
        },
        {
          id: `vis-treemap-${Date.now()}`,
          title: `Proportional Treemap Tiles`,
          type: 'treemap',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#f59e0b'
        },
        {
          id: `vis-gauge-${Date.now()}`,
          title: `Performance Speedometer Dial`,
          type: 'gauge',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#0284C7'
        },
        {
          id: `vis-table-${Date.now()}`,
          title: `Granular Matrix Data Table`,
          type: 'table',
          categoryField: str1,
          valueField: num1,
          aggregation: 'sum',
          color: '#64748b'
        }
      ];
      suite.forEach(v => addCustomVisual(v));
    }
  };

  const ALL_CHART_TYPES: { type: VisualConfig['type']; label: string }[] = [
    { type: 'bar', label: 'Bar' },
    { type: 'horizontal_bar', label: 'H-Bar' },
    { type: 'line', label: 'Line' },
    { type: 'area', label: 'Area' },
    { type: 'donut', label: 'Donut' },
    { type: 'pie', label: 'Pie' },
    { type: 'boxplot', label: 'Boxplot' },
    { type: 'scatter', label: 'Scatter' },
    { type: 'heatmap', label: 'Heatmap' },
    { type: 'radar', label: 'Radar' },
    { type: 'funnel', label: 'Funnel' },
    { type: 'waterfall', label: 'Waterfall' },
    { type: 'treemap', label: 'Treemap' },
    { type: 'gauge', label: 'Gauge' },
    { type: 'table', label: 'Table' }
  ];

  // Helper to switch type on a card
  const toggleChartType = (visId: string, currentType: VisualConfig['type']) => {
    const types = ALL_CHART_TYPES.map(t => t.type);
    const nextType = types[(types.indexOf(currentType) + 1) % types.length];
    setVisualOverrides(prev => ({
      ...prev,
      [visId]: { ...prev[visId], type: nextType }
    }));
  };

  // Helper to compute grouped data with proper aggregation
  const computeGroupedData = (
    categoryField: string, 
    valueField: string, 
    agg: VisualConfig['aggregation'] = 'sum'
  ) => {
    const groupMap = new Map<string, { sum: number; count: number; min: number; max: number }>();
    let grandTotal = 0;

    cleanRows.forEach(r => {
      const cat = String(r[categoryField] ?? 'Unassigned');
      const val = Number(r[valueField]) || 0;
      
      const current = groupMap.get(cat) || { sum: 0, count: 0, min: val, max: val };
      current.sum += val;
      current.count += 1;
      current.min = Math.min(current.min, val);
      current.max = Math.max(current.max, val);
      groupMap.set(cat, current);

      grandTotal += val;
    });

    const entries = Array.from(groupMap.entries()).map(([cat, stats]) => {
      let finalVal = stats.sum;
      if (agg === 'avg') finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
      else if (agg === 'count') finalVal = stats.count;
      else if (agg === 'min') finalVal = stats.min;
      else if (agg === 'max') finalVal = stats.max;

      return {
        category: cat,
        value: Math.round(finalVal * 100) / 100,
        count: stats.count,
        share: grandTotal > 0 ? Math.round((stats.sum / grandTotal) * 1000) / 10 : 0
      };
    });

    // Sort descending by value
    entries.sort((a, b) => b.value - a.value);
    return { items: entries.slice(0, 10), grandTotal, allCount: entries.length };
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
  const handleDownloadExecutivePDF = () => {
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
      <div style="background:#1c1c1c; border:1px solid #333; border-radius:14px; padding:16px;">
        <div style="font-size:11px; color:#888; text-transform:uppercase;">${k.name}</div>
        <div style="font-size:24px; font-weight:800; color:#fff; margin:6px 0;">${k.formattedValue}</div>
        <div style="font-size:11px; color:#0284C7;">Status: ${k.status}</div>
      </div>
    `).join('');

    const visualCardsHtml = visualsExport.map(v => `
      <div style="background:#1c1c1c; border:1px solid #333; border-radius:16px; padding:20px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:16px; text-transform:uppercase; color:#fff;">${v.title}</h3>
          <span style="font-size:11px; background:#141414; color:#0284C7; padding:3px 8px; border-radius:6px; font-family:monospace;">${v.agg.toUpperCase()}(${v.val}) by ${v.cat}</span>
        </div>
        <div>
          ${v.items.map(it => `
            <div style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:#ccc;">${it.category}</span>
                <span style="color:#fff; font-family:monospace; font-weight:600;">${it.value.toLocaleString()} (${it.share}%)</span>
              </div>
              <div style="background:#141414; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:#0284C7; width:${Math.min(100, Math.max(5, it.share))}%; height:100%; border-radius:4px;"></div>
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
    body { margin:0; padding:30px; background:#121212; color:#eee; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .container { max-width:1100px; margin:0 auto; }
    .header { background:#1a1a1a; border:1px solid #2e2e2e; border-radius:18px; padding:24px; margin-bottom:24px; }
    .grid-kpis { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:24px; }
    .grid-visuals { display:grid; grid-template-columns:repeat(auto-fit, minmax(480px, 1fr)); gap:20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="color:#0284C7; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">${brand.companyName} • ${brand.department}</div>
      <h1 style="font-size:28px; margin:8px 0; color:#fff; text-transform:uppercase;">${project.name}</h1>
      <div style="color:#888; font-size:12px;">Exported on: ${new Date().toLocaleString()} | Verified Enterprise Data Model (${cleanRows.length} rows)</div>
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

  // Export current visual as CSV
  const handleExportCSV = (visTitle: string, items: { category: string; value: number; share: number }[]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      ['Category,Value,SharePct', ...items.map(i => `"${i.category}",${i.value},${i.share}%`)].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `${visTitle.replace(/[^a-zA-Z0-9]/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1c1c1c] border-[#2d2d2d] text-white'} border rounded-2xl p-4 sm:p-6 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
              <SlidersHorizontal className="w-4 h-4" /> Custom Dashboard Composition Studio
            </div>
            
            {/* EDITABLE DASHBOARD NAME */}
            <div className="flex items-center gap-2 flex-wrap">
              <EditableDashboardTitle className="text-2xl sm:text-3xl font-extrabold uppercase" showLabelPrefix={false} />
            </div>

            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Build, customize, and download your analytical dashboard. Switch between Bar, Line, Donut, and Table views in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className={`hidden sm:flex items-center border rounded-xl p-1 text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#141414] border-[#333]'}`}>
              <button
                onClick={() => loadPreset('financial')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${isLight ? 'text-slate-700 hover:text-slate-900 hover:bg-white' : 'text-gray-300 hover:text-white hover:bg-[#252525]'}`}
              >
                Executive Pack
              </button>
              <button
                onClick={() => loadPreset('operations')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${isLight ? 'text-slate-700 hover:text-slate-900 hover:bg-white' : 'text-gray-300 hover:text-white hover:bg-[#252525]'}`}
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
                  : 'bg-sky-500/20 hover:bg-sky-500/30 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
              }`}
              title="View intelligent multi-type visualization recommendations tailored to your dataset schema"
            >
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>AI Schema Recommendations</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Custom Visual
            </button>
          </div>
        </div>

        {/* DOWNLOAD ACTION TOOLBAR (RULE: Download created dashboard & executive report) */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 ${isLight ? 'border-slate-200' : 'border-[#262626]'}`}>
          <div className={`flex items-center gap-2 text-xs font-mono ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
            <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
            <span>Active Visuals: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{customVisuals.length} widgets</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Bundle (Dashboard + Executive Report Bundle ZIP) */}
            <button
              onClick={handleDownloadBundleZip}
              disabled={isBundleGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold transition-all shadow-md shrink-0 whitespace-nowrap disabled:opacity-50 cursor-pointer"
              title="Download both the created dashboard and executive report in a single ZIP package"
            >
              {isBundleGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white shrink-0" />
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
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-[#222] hover:bg-[#2a2a2a] text-white border-[#333] hover:border-cyan-400/50'
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
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-[#222] hover:bg-[#2a2a2a] text-white border-[#333] hover:border-cyan-400/50'
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
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-amber-500/50'
                  : 'bg-[#222] hover:bg-[#2a2a2a] text-white border-[#333] hover:border-amber-400/50'
              }`}
              title="Export standalone offline HTML dashboard"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
              <span>Offline HTML</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Natural Language Visual Composer */}
      <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1c1c1c] border-[#2d2d2d] text-white'} border rounded-2xl p-4 sm:p-5 space-y-2.5`}>
        <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <Sparkles className={`w-4 h-4 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
          <span>NATURAL LANGUAGE DASHBOARD SYNTHESIS</span>
          <span className={`text-[10px] font-mono hidden sm:inline ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>(Type what you want to chart and press Enter)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="e.g. 'Show revenue by region as a donut chart' or 'Trend of sales over time'..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            className={`flex-1 text-xs px-3.5 py-2.5 rounded-xl border focus:outline-none ${
              isLight
                ? 'bg-slate-50 text-slate-900 border-slate-200 focus:border-sky-500 placeholder-slate-400'
                : 'bg-[#141414] text-white border-[#333] focus:border-cyan-400 placeholder-gray-500'
            }`}
          />
          <button
            onClick={handleAIGenerate}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 hover:border-sky-400'
                : 'bg-[#252525] hover:bg-[#2f2f2f] text-white border-[#3d3d3d] hover:border-cyan-400/50'
            }`}
          >
            Synthesize Visual
          </button>
        </div>
      </div>

      {/* 3. Visuals Canvas Grid */}
      {customVisuals.length === 0 ? (
        <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#1c1c1c] border-[#2d2d2d] text-white'} border rounded-2xl p-12 text-center space-y-4`}>
          <Layers className={`w-12 h-12 mx-auto opacity-70 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
          <div className="space-y-1">
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Canvas Ready for Custom Analytics</h3>
            <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
              Add custom visualizations using the button above, or click below to load pre-built executive analytical widgets.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => loadPreset('all_charts')}
              className="px-4 py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-xs hover:bg-sky-500 shadow-lg shadow-sky-600/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Complete Chart Suite (Scatter, Heatmap & All 14 Chart Types)</span>
            </button>
            <button
              onClick={() => loadPreset('financial')}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs border transition-all ${
                isLight ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300' : 'bg-[#222] text-white hover:bg-[#2a2a2a] border-[#333]'
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

            const hasCat = columns.some(c => c.name === rawCat);
            const hasVal = columns.some(c => c.name === rawVal);
            const resolvedCat = hasCat ? rawCat : (stringCols[0]?.name || columns[0]?.name || 'Category');
            const resolvedVal = hasVal ? rawVal : (numericCols[0]?.name || columns.find(c => c.dataType === 'number')?.name || resolvedCat);
            const activeCat = resolvedCat;
            const activeVal = resolvedVal;

            const { items, grandTotal } = computeGroupedData(resolvedCat, resolvedVal, vis.aggregation);
            const maxVal = Math.max(safeMax(items.map(i => i.value), 1), 1);
            const primaryColor = vis.color && vis.color !== '#21F1A8' ? vis.color : '#0284C7';

            return (
              <div 
                key={vis.id}
                className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-sky-400' : 'bg-[#1c1c1c] border-[#2d2d2d] text-white hover:border-cyan-500/40'} border rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between`}
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
                              isLight ? 'bg-slate-50 border-sky-500 text-slate-900' : 'bg-[#121212] border-cyan-400 text-white'
                            }`}
                          />
                          <button
                            onClick={() => handleSaveChartTitle(vis.id)}
                            className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white shrink-0 cursor-pointer shadow-xs"
                            title="Save chart title"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            onClick={() => setEditingVisId(null)}
                            className={`p-1.5 rounded-lg shrink-0 cursor-pointer ${
                              isLight ? 'bg-slate-100 text-slate-600 hover:text-slate-900' : 'bg-[#282828] text-gray-400 hover:text-white'
                            }`}
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/title">
                          <h3 className={`font-heading text-lg font-bold uppercase truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
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
                      <div className={`flex flex-wrap items-center gap-1.5 text-[10px] font-mono pt-0.5 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        <span className={`px-1.5 py-0.5 rounded border uppercase ${
                          isLight ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-[#141414] text-cyan-400 border-[#2d2d2d]'
                        }`}>
                          {vis.aggregation}({resolvedVal})
                        </span>
                        <span>by</span>
                        <span className={`px-1.5 py-0.5 rounded border ${
                          isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-[#141414] text-white border-[#2d2d2d]'
                        }`}>
                          {resolvedCat}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Chart Type Selector Dropdown */}
                      <select
                        value={activeType}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], type: e.target.value as any }
                        }))}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold focus:outline-none uppercase cursor-pointer ${
                          isLight
                            ? 'bg-slate-100 text-sky-800 border-slate-300 hover:border-sky-500'
                            : 'bg-[#141414] border-[#333] hover:border-cyan-400/50 text-cyan-400'
                        }`}
                        title="Select Chart Representation"
                      >
                        {ALL_CHART_TYPES.map(t => (
                          <option key={t.type} value={t.type} className={isLight ? 'bg-white text-slate-900' : 'bg-[#181818] text-white'}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Export CSV */}
                      <button
                        onClick={() => handleExportCSV(vis.title, items)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-[#252525]'
                        }`}
                        title="Export Chart Data as CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove Visual */}
                      <button
                        onClick={() => removeCustomVisual(vis.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isLight ? 'text-slate-600 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-[#252525]'
                        }`}
                        title="Remove Visual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Field Selectors */}
                  <div className={`flex flex-wrap items-center gap-2 pt-1 border-t ${isLight ? 'border-slate-100' : 'border-[#262626]'}`}>
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Axis:</span>
                      <select
                        value={resolvedCat}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], categoryField: e.target.value }
                        }))}
                        className={`text-xs px-2 py-0.5 rounded border focus:outline-none ${
                          isLight
                            ? 'bg-slate-50 text-slate-800 border-slate-200 focus:border-sky-500'
                            : 'bg-[#141414] text-gray-300 border-[#2e2e2e] focus:border-cyan-400'
                        }`}
                      >
                        {columns.map(c => <option key={c.name} value={c.name} className={isLight ? 'bg-white text-slate-900' : 'bg-[#181818] text-white'}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className={`font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>Metric:</span>
                      <select
                        value={resolvedVal}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], valueField: e.target.value }
                        }))}
                        className={`text-xs font-mono px-2 py-0.5 rounded border focus:outline-none ${
                          isLight
                            ? 'bg-sky-50 text-sky-800 border-sky-200 focus:border-sky-500'
                            : 'bg-[#141414] text-cyan-400 border-[#2e2e2e] focus:border-cyan-400'
                        }`}
                      >
                        {numericCols.map(c => <option key={c.name} value={c.name} className={isLight ? 'bg-white text-slate-900' : 'bg-[#181818] text-white'}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Intelligent Chart Recommendation Banner */}
                  {(() => {
                    const cardRecs = recommendChartsForFields(resolvedCat, resolvedVal, columns, cleanRows);
                    const topRec = cardRecs[0];
                    if (!topRec || topRec.type === activeType) return null;

                    return (
                      <div className={`mt-2 p-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all ${
                        isLight 
                          ? 'bg-sky-50/90 border-sky-200 text-slate-800' 
                          : 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                      }`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-bold text-[11px] shrink-0 text-sky-700 dark:text-cyan-400">AI Suggestion:</span>
                          <span className="truncate text-[11px] text-slate-600 dark:text-slate-300">
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
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] whitespace-nowrap shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                          title={`Switch visualization to ${topRec.label}`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Switch to {topRec.label}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* REAL CHART RENDERING ENGINE */}
                <div className="py-2 min-h-[200px] flex items-center justify-center">
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
                            className="space-y-1 group cursor-pointer p-1 -m-1 rounded-lg hover:bg-[#141414] transition-colors"
                            title="Click bar to drill-through to granular records"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-300 font-medium truncate max-w-[200px] group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                                {item.category}
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-cyan-400 font-mono">↗</span>
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-white font-semibold">{item.value.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-500">({item.share}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-[#141414] h-3 rounded-full overflow-hidden border border-[#282828] p-0.5">
                              <div 
                                className="h-full rounded-full transition-all duration-500 group-hover:brightness-125"
                                style={{ 
                                  width: `${pct}%`,
                                  backgroundColor: idx === 0 ? primaryColor : idx === 1 ? '#00d8f6' : idx === 2 ? '#f59e0b' : '#6b7280'
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
                                stroke="#282828" 
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
                                    <circle key={i} cx={c.x} cy={c.y} r="4" fill="#171717" stroke={primaryColor} strokeWidth="2" />
                                  ))}
                                </>
                              );
                            })()}
                          </svg>

                          {/* X-axis Labels */}
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                            <span className="truncate max-w-[100px]">{items[0]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[Math.floor(items.length / 2)]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[items.length - 1]?.category}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-gray-500">Need at least 2 points to render line chart.</div>
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
                            const colors = ['#0284C7', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
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
                          <span className={`text-[10px] uppercase font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>Total</span>
                          <span className={`text-xs font-bold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5 text-xs w-full max-w-[200px]">
                        {items.slice(0, 5).map((item, idx) => {
                          const colors = ['#0284C7', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
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
                                isLight ? 'hover:bg-slate-100' : 'hover:bg-[#1f1f1f]'
                              }`}
                              title="Click to drill-through"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                <span className={`transition-colors truncate ${
                                  isLight ? 'text-slate-700 group-hover:text-sky-700' : 'text-gray-300 group-hover:text-cyan-400'
                                }`}>{item.category}</span>
                              </div>
                              <span className={`font-mono text-[11px] ${
                                isLight ? 'text-slate-500 group-hover:text-slate-900' : 'text-gray-400 group-hover:text-white'
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
                            className="space-y-1 group cursor-pointer p-1 -m-1 rounded-lg hover:bg-[#141414] transition-colors"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-300 font-medium truncate max-w-[200px] group-hover:text-cyan-400 transition-colors">
                                {item.category}
                              </span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-white font-semibold">{item.value.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-500">({item.share}%)</span>
                              </div>
                            </div>
                            <div className="w-full bg-[#141414] h-3 rounded-full overflow-hidden border border-[#282828] p-0.5">
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
                                stroke="#282828" 
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
                                    <circle key={i} cx={c.x} cy={c.y} r="4" fill="#171717" stroke={primaryColor} strokeWidth="2" />
                                  ))}
                                </>
                              );
                            })()}
                          </svg>
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                            <span className="truncate max-w-[100px]">{items[0]?.category}</span>
                            <span className="truncate max-w-[100px]">{items[items.length - 1]?.category}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center text-xs text-gray-500">Need at least 2 points to render area chart.</div>
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
                            const colors = ['#0284C7', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
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
                          const colors = ['#0284C7', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
                          return (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span className="flex items-center gap-1.5 text-gray-300 truncate max-w-[120px]">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                                {it.category}
                              </span>
                              <span className="text-white font-bold">{it.share}%</span>
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
                            <line key={i} x1="35" y1={15 + 130 * (1 - pct)} x2="445" y2={15 + 130 * (1 - pct)} stroke="#262626" strokeDasharray="3,3" />
                          ))}
                          <line x1="35" y1="135" x2="445" y2="25" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7" />
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
                                <circle cx={cx} cy={cy} r="6" fill="#141414" stroke="#0284C7" strokeWidth="2" className="group-hover:scale-125 transition-transform" />
                                <text x={cx} y={cy - 9} textAnchor="middle" fill="#ccc" fontSize="9" fontFamily="monospace" className="opacity-0 group-hover:opacity-100">
                                  {it.value.toLocaleString()}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                          <span className="text-amber-400">Linear Trendline Fit</span>
                          <span className="text-cyan-400">Click coordinate to drilldown</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BOXPLOT (Tukey 5-Number Distribution & Outlier Detection) */}
                  {activeType === 'boxplot' && (() => {
                    const boxplotData = computeBoxplotSummary(cleanRows, resolvedCat, resolvedVal);
                    if (boxplotData.length === 0) {
                      return (
                        <div className="p-8 text-center text-xs text-slate-500">
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
                                  <line x1="35" y1={yPos} x2="465" y2={yPos} stroke={isLight ? '#e2e8f0' : '#282828'} strokeDasharray="3,3" />
                                  <text x="30" y={yPos + 3} textAnchor="end" fill={isLight ? '#64748b' : '#6b7280'} fontSize="9" fontFamily="monospace">
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
                                    stroke={isLight ? '#0284c7' : '#38bdf8'} 
                                    strokeWidth="2.5" 
                                    strokeLinecap="round" 
                                  />

                                  {/* Mean Diamond */}
                                  <polygon 
                                    points={`${centerX},${yMean - 3} ${centerX + 3},${yMean} ${centerX},${yMean + 3} ${centerX - 3},${yMean}`}
                                    fill="#f59e0b"
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
                                        fill="#ef4444" 
                                        stroke="#fff" 
                                        strokeWidth="1"
                                      />
                                    );
                                  })}

                                  {/* Category Label */}
                                  <text 
                                    x={centerX} 
                                    y="172" 
                                    textAnchor="middle" 
                                    fill={isLight ? '#1e293b' : '#cbd5e1'} 
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
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#151515] border-[#292929] text-gray-300'
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
                              className="p-2 rounded-lg border border-[#282828] cursor-pointer hover:border-white transition-all flex flex-col justify-between"
                              style={{ backgroundColor: `rgba(2, 132, 199, ${intensity})` }}
                              title={`${it.category}: ${it.value.toLocaleString()}`}
                            >
                              <span className="text-[10px] text-white font-extrabold truncate">{it.category}</span>
                              <span className="text-[9px] text-white font-bold font-mono">
                                {it.value >= 1000 ? `${(it.value / 1000).toFixed(1)}k` : it.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
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
                          return <polygon key={lIdx} points={pts} fill="none" stroke="#333" strokeWidth="1" strokeDasharray="2,2" />;
                        })}
                        {(() => {
                          const polyPts = items.slice(0, 6).map((it, i) => {
                            const angle = (i * 2 * Math.PI) / Math.min(6, items.length) - Math.PI / 2;
                            const r = (it.value / maxVal) * 75;
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                          }).join(' ');
                          return <polygon points={polyPts} fill="#0284C7" fillOpacity="0.25" stroke="#0284C7" strokeWidth="2" />;
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
                              <span className="text-gray-300 group-hover:text-cyan-400">{idx + 1}. {it.category}</span>
                              <span className="text-white font-bold">{it.value.toLocaleString()} ({it.share}%)</span>
                            </div>
                            <div className="flex justify-center w-full">
                              <div 
                                className="h-6 rounded-md bg-sky-600 text-white text-[10px] font-bold font-mono flex items-center justify-center transition-all group-hover:brightness-125" 
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
                      <div className="flex items-end justify-between gap-1.5 h-44 pt-4 pb-4 border-b border-[#282828]">
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
                              <span className="text-[9px] font-mono text-white mb-1">{it.value.toLocaleString()}</span>
                              <div 
                                className={`w-full max-w-[36px] rounded transition-all group-hover:brightness-125 ${isPos ? 'bg-sky-500' : 'bg-rose-500'}`} 
                                style={{ height: `${h}px` }} 
                              />
                              <span className="text-[9px] text-gray-400 font-mono truncate max-w-[50px] mt-1.5">{it.category}</span>
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
                        const colors = ['#0284C7', '#00d8f6', '#38bdf8', '#818cf8', '#f59e0b', '#ec4899'];
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
                            className={`p-2.5 rounded-xl border border-[#2d2d2d] cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between ${isBig ? 'sm:col-span-2' : ''}`} 
                            style={{ backgroundColor: `${c}18`, borderColor: `${c}44` }}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-white text-xs font-bold truncate">{it.category}</span>
                              <span className="text-[10px] font-bold" style={{ color: c }}>{it.share}%</span>
                            </div>
                            <span className="text-sm font-bold text-white mt-2">{it.value.toLocaleString()}</span>
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
                          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#262626" strokeWidth="16" strokeLinecap="round" />
                          <path 
                            d="M 20 100 A 80 80 0 0 1 180 100" 
                            fill="none" 
                            stroke="#0284C7" 
                            strokeWidth="16" 
                            strokeLinecap="round" 
                            strokeDasharray="251" 
                            strokeDashoffset={251 - (Math.min(100, (grandTotal / (maxVal * items.length || 1)) * 100) / 100) * 251} 
                          />
                          <circle cx="100" cy="100" r="6" fill="#fff" />
                          <line x1="100" y1="100" x2="100" y2="35" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="text-center font-mono mt-1">
                        <span className="text-lg font-extrabold text-white">{grandTotal.toLocaleString()}</span>
                        <span className="text-[10px] text-cyan-400 block">Aggregate Total Target Attainment</span>
                      </div>
                    </div>
                  )}

                  {/* DATA TABLE */}
                  {activeType === 'table' && (
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-[#141414] text-gray-400 border-b border-[#2d2d2d]">
                          <tr>
                            <th className="p-2">Rank</th>
                            <th className="p-2">{activeCat}</th>
                            <th className="p-2 text-right">{activeVal}</th>
                            <th className="p-2 text-right">Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#252525]">
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
                              className={`transition-colors cursor-pointer group ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1f1f1f]'}`}
                              title="Click row to drill-through to granular records"
                            >
                              <td className="p-2 text-gray-400 font-bold">#{idx + 1}</td>
                              <td className={`p-2 font-sans transition-colors flex items-center gap-1 ${
                                isLight ? 'text-slate-800 group-hover:text-sky-700' : 'text-white group-hover:text-cyan-400'
                              }`}>
                                {it.category}
                                <span className={`opacity-0 group-hover:opacity-100 text-[10px] ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>↗</span>
                              </td>
                              <td className={`p-2 text-right font-semibold ${isLight ? 'text-sky-800' : 'text-cyan-400'}`}>{it.value.toLocaleString()}</td>
                              <td className={`p-2 text-right ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{it.share}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer Insight */}
                <div className={`pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                  isLight ? 'border-slate-100 text-slate-500' : 'border-[#262626] text-gray-400'
                }`}>
                  <span>Aggregation: {vis.aggregation.toUpperCase()}</span>
                  <span>Top {items.length} segments analyzed</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Add Visual Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-[#1c1c1c] border-[#333] text-white'} border rounded-3xl p-6 max-w-lg w-full space-y-5 animate-scaleUp`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-[#2d2d2d]'}`}>
              <h3 className={`font-heading text-xl font-bold uppercase flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Plus className="w-5 h-5 text-sky-500" />
                COMPOSE NEW VISUAL
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${isLight ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisual} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className={isLight ? 'text-slate-700 font-semibold' : 'text-gray-300 font-medium'}>Visualization Title</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Sales Volume Breakdown"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                    isLight
                      ? 'bg-slate-50 text-slate-900 border-slate-200 focus:border-sky-500'
                      : 'bg-[#141414] text-white border-[#333] focus:border-cyan-400'
                  }`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={isLight ? 'text-slate-700 font-semibold' : 'text-gray-300 font-medium'}>Chart Representation</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 text-slate-900 border-slate-200 focus:border-sky-500'
                        : 'bg-[#141414] text-white border-[#333] focus:border-cyan-400'
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
                    <option value="radar">Radar / Spider Chart (Multi-Axis Footprint)</option>
                    <option value="funnel">Funnel Conversion (Stage Drop-off & Retention)</option>
                    <option value="waterfall">Waterfall Chart (Variance Walk)</option>
                    <option value="treemap">Proportional Treemap (Area Tiles)</option>
                    <option value="gauge">Performance Gauge (Speedometer Dial)</option>
                    <option value="table">Data Table (Detailed Matrix)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={isLight ? 'text-slate-700 font-semibold' : 'text-gray-300 font-medium'}>Aggregation Function</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 text-slate-900 border-slate-200 focus:border-sky-500'
                        : 'bg-[#141414] text-white border-[#333] focus:border-cyan-400'
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
                  <label className={isLight ? 'text-slate-700 font-semibold' : 'text-gray-300 font-medium'}>Dimension (Category Axis)</label>
                  <select
                    value={catField}
                    onChange={(e) => setCatField(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-slate-50 text-slate-900 border-slate-200 focus:border-sky-500'
                        : 'bg-[#141414] text-white border-[#333] focus:border-cyan-400'
                    }`}
                  >
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className={isLight ? 'text-slate-700 font-semibold' : 'text-gray-300 font-medium'}>Metric (Numerical Value)</label>
                  <select
                    value={valField}
                    onChange={(e) => setValField(e.target.value)}
                    className={`w-full font-mono p-2.5 rounded-xl border focus:outline-none ${
                      isLight
                        ? 'bg-sky-50 text-sky-800 border-sky-200 focus:border-sky-500'
                        : 'bg-[#141414] text-cyan-400 border-[#333] focus:border-cyan-400'
                    }`}
                  >
                    {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* DYNAMIC AI SCHEMA RECOMMENDATIONS PANEL */}
              {(() => {
                const modalRecs = recommendChartsForFields(catField, valField, columns, cleanRows);
                if (modalRecs.length === 0) return null;
                const topFit = modalRecs[0];

                return (
                  <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-[#141d26] border-sky-900/60'
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
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shadow-xs cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Apply Best Fit ({topFit.label})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modalRecs.slice(0, 4).map((rec) => {
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
                                  : 'bg-[#111720] border-[#202b38] hover:border-sky-700 hover:bg-[#15202b]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`font-bold text-xs ${isSelected ? (isLight ? 'text-sky-900' : 'text-cyan-300') : (isLight ? 'text-slate-800' : 'text-white')}`}>
                                {rec.label}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                rec.badge === 'Best Fit'
                                  ? 'bg-sky-500/20 text-sky-600 dark:text-cyan-300 border border-sky-400/40'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {rec.score}% Match
                              </span>
                            </div>
                            <p className={`text-[11px] line-clamp-2 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
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
                <label className={isLight ? 'text-slate-700 font-semibold' : 'text-gray-300 font-medium'}>Accent Color Theme</label>
                <div className="flex items-center gap-3 pt-1">
                  {[
                    { color: '#0284C7', label: 'Azure Blue' },
                    { color: '#00d8f6', label: 'Cyan' },
                    { color: '#38bdf8', label: 'Sky' },
                    { color: '#818cf8', label: 'Indigo' },
                    { color: '#f59e0b', label: 'Amber' }
                  ].map(c => (
                    <button
                      type="button"
                      key={c.color}
                      onClick={() => setColorTheme(c.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${colorTheme === c.color ? 'border-sky-500 scale-110 shadow-sm' : 'border-transparent opacity-70'}`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {colorTheme === c.color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-[#2d2d2d]'}`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-[#262626] text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-all cursor-pointer shadow-md shadow-sky-600/20"
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
            <div className={`${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-2xl' : 'bg-[#181818] border-[#333] text-white'} border rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 animate-scaleUp`}>
              <div className={`flex items-start justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-[#2d2d2d]'}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-cyan-400 border border-sky-500/20">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                    </span>
                    <h3 className={`font-heading text-xl font-bold uppercase tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      AI Schema Recommendation Suite
                    </h3>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Analyzed {columns.length} columns & {cleanRows.length.toLocaleString()} rows in <strong>{project.name}</strong>. The recommendation engine identified optimal visualization types based on temporal continuity, cardinality, and numerical dispersion.
                  </p>
                </div>
                <button
                  onClick={() => setIsRecModalOpen(false)}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}
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
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
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
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/25 whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Deploy Complete Suite</span>
                </button>
              </div>

              {/* Recommended Visuals List */}
              <div className="space-y-3">
                <h4 className={`text-xs font-bold uppercase tracking-wider font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Recommended Visuals ({recommendedSuite.length})
                </h4>

                <div className="space-y-2.5">
                  {recommendedSuite.map((recVis, idx) => (
                    <div 
                      key={recVis.id || idx}
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                        isLight 
                          ? 'bg-slate-50/80 border-slate-200 hover:border-sky-300 hover:bg-white' 
                          : 'bg-[#141414] border-[#292929] hover:border-cyan-400/50 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 dark:text-white uppercase truncate">
                            {recVis.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-sky-500/10 text-sky-700 dark:text-cyan-300 border border-sky-500/20">
                            {recVis.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {recVis.aggregation.toUpperCase()}({recVis.valueField}) by {recVis.categoryField}
                          </span>
                        </div>
                        <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
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

              <div className={`flex justify-end pt-3 border-t ${isLight ? 'border-slate-200' : 'border-[#2d2d2d]'}`}>
                <button
                  type="button"
                  onClick={() => setIsRecModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-[#252525] text-slate-300 hover:bg-[#303030]'
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
