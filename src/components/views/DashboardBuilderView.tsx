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
  Activity
} from 'lucide-react';
import { usePlatform } from '../../store/usePlatformStore';
import { VisualConfig } from '../../types';
import { EditableDashboardTitle } from '../common/EditableDashboardTitle';
import { generateEnterpriseReportPDF, downloadDashboardAndReportBundle } from '../../engine/exportEngine';

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
    removeCustomVisual, 
    setFilters,
    openDrillThrough
  } = usePlatform();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nlPrompt, setNlPrompt] = useState('');
  const [activePreset, setActivePreset] = useState<string>('custom');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isBundleGenerating, setIsBundleGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

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
  const [colorTheme, setColorTheme] = useState('#21F1A8');

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
      color: chosenType === 'donut' ? '#00d8f6' : '#21F1A8',
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
        color: '#21F1A8'
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
        color: '#21F1A8'
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
          color: '#21F1A8'
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
          color: '#21F1A8'
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
          color: '#21F1A8'
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
          color: '#21F1A8'
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
          color: '#10b981'
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
          color: '#21F1A8'
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
      alert('PDF generation error: ' + (err?.message || 'Failed to compile report'));
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
        <div style="font-size:11px; color:#21F1A8;">Status: ${k.status}</div>
      </div>
    `).join('');

    const visualCardsHtml = visualsExport.map(v => `
      <div style="background:#1c1c1c; border:1px solid #333; border-radius:16px; padding:20px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h3 style="margin:0; font-size:16px; text-transform:uppercase; color:#fff;">${v.title}</h3>
          <span style="font-size:11px; background:#141414; color:#21F1A8; padding:3px 8px; border-radius:6px; font-family:monospace;">${v.agg.toUpperCase()}(${v.val}) by ${v.cat}</span>
        </div>
        <div>
          ${v.items.map(it => `
            <div style="margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                <span style="color:#ccc;">${it.category}</span>
                <span style="color:#fff; font-family:monospace; font-weight:600;">${it.value.toLocaleString()} (${it.share}%)</span>
              </div>
              <div style="background:#141414; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:#21F1A8; width:${Math.min(100, Math.max(5, it.share))}%; height:100%; border-radius:4px;"></div>
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
      <div style="color:#21F1A8; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">${brand.companyName} • ${brand.department}</div>
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
      alert('Bundle export failed: ' + (err?.message || 'Error creating ZIP package'));
    } finally {
      setIsBundleGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn w-full max-w-7xl mx-auto">
      {/* Download notification toast */}
      {downloadSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-[#162920] border border-[#21F1A8] text-[#21F1A8] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#21F1A8] font-mono">
              <SlidersHorizontal className="w-4 h-4" /> Custom Dashboard Composition Studio
            </div>
            
            {/* EDITABLE DASHBOARD NAME */}
            <div className="flex items-center gap-2 flex-wrap">
              <EditableDashboardTitle className="text-2xl sm:text-3xl font-extrabold uppercase" showLabelPrefix={false} />
            </div>

            <p className="text-xs text-gray-400">
              Build, customize, and download your analytical dashboard. Switch between Bar, Line, Donut, and Table views in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Presets */}
            <div className="hidden sm:flex items-center bg-[#141414] border border-[#333] rounded-xl p-1 text-xs">
              <button
                onClick={() => loadPreset('financial')}
                className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#252525] transition-colors"
              >
                Executive Pack
              </button>
              <button
                onClick={() => loadPreset('operations')}
                className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#252525] transition-colors"
              >
                Operations Pack
              </button>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] hover:glow-neon transition-all"
            >
              <Plus className="w-4 h-4" /> Add Custom Visual
            </button>
          </div>
        </div>

        {/* DOWNLOAD ACTION TOOLBAR (RULE: Download created dashboard & executive report) */}
        <div className="pt-3 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <Layers className="w-3.5 h-3.5 text-[#21F1A8]" />
            <span>Active Visuals: <strong className="text-white">{customVisuals.length} widgets</strong></span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Both (Dashboard + Executive Report Bundle ZIP) */}
            <button
              onClick={handleDownloadBundleZip}
              disabled={isBundleGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21F1A8] hover:bg-[#1cdb97] text-black text-xs font-semibold hover:glow-neon transition-all shadow-md shadow-[#21F1A8]/20 disabled:opacity-50"
              title="Download both the created dashboard and executive report in a single ZIP package"
            >
              {isBundleGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              ) : (
                <Package className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span>Download Both (Dashboard + Report)</span>
            </button>

            {/* Download Created Dashboard as JSON */}
            <button
              onClick={handleDownloadDashboardJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-white text-xs font-medium border border-[#333] hover:border-[#21F1A8]/50 transition-colors"
              title="Download full created dashboard specification & data as JSON"
            >
              <Download className="w-3.5 h-3.5 text-[#21F1A8]" />
              <span>Dashboard (JSON)</span>
            </button>

            {/* Download Executive Report as PDF */}
            <button
              onClick={handleDownloadExecutivePDF}
              disabled={isPdfGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-white text-xs font-medium border border-[#333] hover:border-cyan-400/50 transition-colors disabled:opacity-50"
              title="Download verified Executive PDF Report"
            >
              {isPdfGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Executive Report (PDF)</span>
            </button>

            {/* Download Standalone HTML Dashboard */}
            <button
              onClick={handleDownloadDashboardHTML}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-white text-xs font-medium border border-[#333] hover:border-amber-400/50 transition-colors"
              title="Export standalone offline HTML dashboard"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Offline HTML</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Natural Language Visual Composer */}
      <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sparkles className="w-4 h-4 text-[#21F1A8]" />
          <span>NATURAL LANGUAGE DASHBOARD SYNTHESIS</span>
          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">(Type what you want to chart and press Enter)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="e.g. 'Show revenue by region as a donut chart' or 'Trend of sales over time'..."
            value={nlPrompt}
            onChange={(e) => setNlPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            className="flex-1 bg-[#141414] text-xs text-white px-3.5 py-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
          />
          <button
            onClick={handleAIGenerate}
            className="px-4 py-2.5 rounded-xl bg-[#252525] hover:bg-[#2f2f2f] text-white text-xs font-medium border border-[#3d3d3d] hover:border-[#21F1A8]/50 transition-colors shrink-0"
          >
            Synthesize Visual
          </button>
        </div>
      </div>

      {/* 3. Visuals Canvas Grid */}
      {customVisuals.length === 0 ? (
        <div className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-[#21F1A8] mx-auto opacity-70" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Canvas Ready for Custom Analytics</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Add custom visualizations using the button above, or click below to load pre-built executive analytical widgets.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => loadPreset('all_charts')}
              className="px-4 py-2.5 rounded-xl bg-[#21F1A8] text-black font-semibold text-xs hover:bg-[#1cdb97] shadow-lg shadow-[#21F1A8]/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Complete Chart Suite (Scatter, Heatmap & All 14 Chart Types)</span>
            </button>
            <button
              onClick={() => loadPreset('financial')}
              className="px-4 py-2.5 rounded-xl bg-[#222] text-white font-medium text-xs hover:bg-[#2a2a2a] border border-[#333] transition-all"
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
            const activeVal = override.valueField || vis.valueField;
            const activeCat = override.categoryField || vis.categoryField;

            const { items, grandTotal } = computeGroupedData(activeCat, activeVal, vis.aggregation);
            const maxVal = Math.max(...items.map(i => i.value), 1);
            const primaryColor = vis.color || '#21F1A8';

            return (
              <div 
                key={vis.id}
                className="bg-[#1c1c1c] border border-[#2d2d2d] rounded-2xl p-5 space-y-4 hover:border-[#21F1A8]/40 transition-all flex flex-col justify-between"
              >
                {/* Visual Header & Toolbar */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-bold text-white uppercase truncate">
                        {vis.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 font-mono pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-[#21F1A8] border border-[#2d2d2d] uppercase">
                          {vis.aggregation}({activeVal})
                        </span>
                        <span>by</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#141414] text-white border border-[#2d2d2d]">
                          {activeCat}
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
                        className="px-2 py-1 rounded-lg bg-[#141414] border border-[#333] hover:border-[#21F1A8]/50 text-[#21F1A8] text-[11px] font-mono font-bold focus:outline-none uppercase cursor-pointer"
                        title="Select Chart Representation"
                      >
                        {ALL_CHART_TYPES.map(t => (
                          <option key={t.type} value={t.type} className="bg-[#181818] text-white">
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Export CSV */}
                      <button
                        onClick={() => handleExportCSV(vis.title, items)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                        title="Export Chart Data as CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove Visual */}
                      <button
                        onClick={() => removeCustomVisual(vis.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[#252525] transition-colors"
                        title="Remove Visual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Field Selectors */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#262626]">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-500 font-mono">Axis:</span>
                      <select
                        value={activeCat}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], categoryField: e.target.value }
                        }))}
                        className="bg-[#141414] text-xs text-gray-300 px-2 py-0.5 rounded border border-[#2e2e2e] focus:border-[#21F1A8] focus:outline-none"
                      >
                        {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-gray-500 font-mono">Metric:</span>
                      <select
                        value={activeVal}
                        onChange={(e) => setVisualOverrides(prev => ({
                          ...prev,
                          [vis.id]: { ...prev[vis.id], valueField: e.target.value }
                        }))}
                        className="bg-[#141414] text-xs text-[#21F1A8] font-mono px-2 py-0.5 rounded border border-[#2e2e2e] focus:border-[#21F1A8] focus:outline-none"
                      >
                        {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
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
                              <span className="text-gray-300 font-medium truncate max-w-[200px] group-hover:text-[#21F1A8] transition-colors flex items-center gap-1">
                                {item.category}
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#21F1A8] font-mono">↗</span>
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
                            const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
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
                          <span className="text-[10px] text-gray-400 uppercase font-mono">Total</span>
                          <span className="text-xs font-bold text-white font-mono">{grandTotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-1.5 text-xs w-full max-w-[200px]">
                        {items.slice(0, 5).map((item, idx) => {
                          const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
                          return (
                            <div 
                              key={idx} 
                              onClick={() => openDrillThrough({
                                title: `${vis.title} - ${item.category}`,
                                subtitle: `Granular rows where ${activeCat} = "${item.category}"`,
                                filterColumn: activeCat,
                                filterValue: item.category,
                                sourceContext: 'donut_slice'
                              })}
                              className="flex items-center justify-between cursor-pointer p-1 -m-1 rounded hover:bg-[#1f1f1f] group transition-colors"
                              title="Click to drill-through"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                                <span className="text-gray-300 group-hover:text-[#21F1A8] transition-colors truncate">{item.category}</span>
                              </div>
                              <span className="font-mono text-gray-400 group-hover:text-white text-[11px]">{item.share}%</span>
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
                              <span className="text-gray-300 font-medium truncate max-w-[200px] group-hover:text-[#21F1A8] transition-colors">
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
                            const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
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
                          const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#a855f7', '#64748b'];
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
                                <circle cx={cx} cy={cy} r="6" fill="#141414" stroke="#21F1A8" strokeWidth="2" className="group-hover:scale-125 transition-transform" />
                                <text x={cx} y={cy - 9} textAnchor="middle" fill="#ccc" fontSize="9" fontFamily="monospace" className="opacity-0 group-hover:opacity-100">
                                  {it.value.toLocaleString()}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                          <span className="text-amber-400">Linear Trendline Fit</span>
                          <span className="text-[#21F1A8]">Click coordinate to drilldown</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2D HEAT MAP */}
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
                              style={{ backgroundColor: `rgba(33, 241, 168, ${intensity})` }}
                              title={`${it.category}: ${it.value.toLocaleString()}`}
                            >
                              <span className="text-[10px] text-black font-extrabold truncate">{it.category}</span>
                              <span className="text-[9px] text-black font-bold font-mono">
                                {it.value >= 1000 ? `${(it.value / 1000).toFixed(1)}k` : it.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                        <span>Intensity Scale: 0 to {maxVal.toLocaleString()}</span>
                        <span className="text-[#21F1A8]">2D Heat Density Grid</span>
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
                          return <polygon points={polyPts} fill="#21F1A8" fillOpacity="0.25" stroke="#21F1A8" strokeWidth="2" />;
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
                              <span className="text-gray-300 group-hover:text-[#21F1A8]">{idx + 1}. {it.category}</span>
                              <span className="text-white font-bold">{it.value.toLocaleString()} ({it.share}%)</span>
                            </div>
                            <div className="flex justify-center w-full">
                              <div 
                                className="h-6 rounded-md bg-[#21F1A8] text-black text-[10px] font-bold font-mono flex items-center justify-center transition-all group-hover:brightness-125" 
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
                                className={`w-full max-w-[36px] rounded transition-all group-hover:brightness-125 ${isPos ? 'bg-[#21F1A8]' : 'bg-red-400'}`} 
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
                        const colors = ['#21F1A8', '#00d8f6', '#f59e0b', '#ec4899', '#818cf8', '#10b981'];
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
                            stroke="#21F1A8" 
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
                        <span className="text-[10px] text-[#21F1A8] block">Aggregate Total Target Attainment</span>
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
                              className="hover:bg-[#1f1f1f] transition-colors cursor-pointer group"
                              title="Click row to drill-through to granular records"
                            >
                              <td className="p-2 text-gray-500 font-bold">#{idx + 1}</td>
                              <td className="p-2 text-white font-sans group-hover:text-[#21F1A8] transition-colors flex items-center gap-1">
                                {it.category}
                                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-[#21F1A8]">↗</span>
                              </td>
                              <td className="p-2 text-right text-[#21F1A8] font-semibold">{it.value.toLocaleString()}</td>
                              <td className="p-2 text-right text-gray-400">{it.share}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Footer Insight */}
                <div className="pt-2 border-t border-[#262626] flex items-center justify-between text-[10px] text-gray-400 font-mono">
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
          <div className="bg-[#1c1c1c] border border-[#333] rounded-3xl p-6 max-w-lg w-full space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#2d2d2d] pb-3">
              <h3 className="font-heading text-xl font-bold text-white uppercase flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#21F1A8]" />
                COMPOSE NEW VISUAL
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisual} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium">Visualization Title</label>
                <input
                  type="text"
                  placeholder="e.g. Regional Sales Volume Breakdown"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Chart Representation</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    <option value="bar">Vertical Bar Chart (Ranking & Comparison)</option>
                    <option value="horizontal_bar">Horizontal Bar Chart (Ranked Progress)</option>
                    <option value="line">Line / Trend Curve (Chronological)</option>
                    <option value="area">Area Fill Chart (Volume Growth)</option>
                    <option value="donut">Donut Ring (Part-to-Whole)</option>
                    <option value="pie">Pie Chart (Proportional Sectors)</option>
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
                  <label className="text-gray-300 font-medium">Aggregation Function</label>
                  <select
                    value={aggregation}
                    onChange={(e) => setAggregation(e.target.value as any)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
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
                  <label className="text-gray-300 font-medium">Dimension (Category Axis)</label>
                  <select
                    value={catField}
                    onChange={(e) => setCatField(e.target.value)}
                    className="w-full bg-[#141414] text-white p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-medium">Metric (Numerical Value)</label>
                  <select
                    value={valField}
                    onChange={(e) => setValField(e.target.value)}
                    className="w-full bg-[#141414] text-[#21F1A8] font-mono p-2.5 rounded-xl border border-[#333] focus:border-[#21F1A8] focus:outline-none"
                  >
                    {numericCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-gray-300 font-medium">Accent Color Theme</label>
                <div className="flex items-center gap-3 pt-1">
                  {[
                    { color: '#21F1A8', label: 'Tiffany Neon' },
                    { color: '#00d8f6', label: 'Cyan' },
                    { color: '#f59e0b', label: 'Amber' },
                    { color: '#ec4899', label: 'Rose' },
                    { color: '#a855f7', label: 'Purple' }
                  ].map(c => (
                    <button
                      type="button"
                      key={c.color}
                      onClick={() => setColorTheme(c.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${colorTheme === c.color ? 'border-white scale-110' : 'border-transparent opacity-70'}`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    >
                      {colorTheme === c.color && <Check className="w-3.5 h-3.5 text-black" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2d2d2d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#262626] text-gray-300 hover:bg-[#333] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#21F1A8] text-black font-semibold hover:bg-[#1cdb97] transition-all"
                >
                  Create & Mount Visual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
